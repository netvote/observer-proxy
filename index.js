const http = require('http');
const express = require('express');
const proxy = require('http-proxy-middleware')
const bodyParser = require('body-parser')
const uuid = require('uuid/v4');
const xmlParseString = require('xml2js').parseString;
const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const network = process.env.NETWORK ? process.env.NETWORK : "ropsten";
const lambdaName = (network === "ropsten") ? "netvote-add-observation" : "private-add-observation";

//just for health check
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('OK!');
  res.end();
}).listen(8080);

const submitObservation = (payload) => {
    const lambda = new AWS.Lambda({ region: "us-east-1", apiVersion: '2015-03-31' });
    const lambdaParams = {
        FunctionName: lambdaName,
        InvocationType: 'Event',
        LogType: 'None',
        Payload: JSON.stringify(payload)
    };
    let callback = (err, data) =>{
        if (err) {
            console.error("error invoking lambda: ", err);
        } else {
            console.log("invocation completed, data:" + JSON.stringify(data))
        }
    };
    lambda.invoke(lambdaParams, callback);
}

const printBody = function(proxyReq, req, res, options) {
    if (req.body) {
        if(req.body instanceof Buffer){
            proxyReq.write(req.body);
        }
    } else {
        console.log("no body")
    }
}   

const app = express();
app.use(bodyParser.raw({ type: '*/*' }))
app.use('/', proxy({
    target: process.env.TARGET_URL, 
    changeOrigin: true,
    onProxyReq: printBody,
    onProxyRes: (proxyRes, req, res) => {
        try{
            delete proxyRes.headers['location'];       
            if(req.url == "/submission" && req.body){
                const result = req.body.toString('utf8');
                if(result && result.indexOf("xml_submission_file") > -1) {
                    const xml = result.substring(result.indexOf("<?xml"), result.lastIndexOf(">")+1)
                    xmlParseString(xml, (err, result)=>{
                        submitObservation( {
                            scope:`${process.env.TARGET_URL}${result.data.$.id}`,
                            submitId: uuid(),
                            timestamp: new Date().getTime(),
                            payload: xml
                        })
                    });
                    console.log("xml = "+xml);
                }
            }
            
            var snifferData ={
                request:{
                    body: req.body,
                    headers:req.headers,
                    url:req.url,
                    method:req.method},
                response:{
                    headers:proxyRes.headers,
                    statusCode:proxyRes.statusCode}
            };

            console.log(snifferData);

        } catch(e) {
            console.error("error in onProxyRes", e)
        }
    }
}));


app.listen(8015);

console.log("proxy listening on 8015")