build:
	docker build -t netvote/observer-proxy .
	docker tag netvote/observer-proxy:latest 891335278704.dkr.ecr.us-east-1.amazonaws.com/netvote/observer-proxy:latest

push:
	docker push 891335278704.dkr.ecr.us-east-1.amazonaws.com/netvote/observer-proxy:latest
	
publish: build push