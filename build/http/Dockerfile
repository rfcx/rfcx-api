FROM 887044485231.dkr.ecr.eu-west-1.amazonaws.com/api_base:latest AS builder
COPY package*.json /tmp/
WORKDIR /tmp
RUN npm install && \
    npm install newrelic --save 
RUN mkdir -p /usr/src/app && \
    cp -a /tmp/node_modules /usr/src/app && \
    cp /root/newrelic.js node_modules/newrelic/newrelic.js && \
    mv /root/newrelic.js /usr/src/app
FROM 887044485231.dkr.ecr.eu-west-1.amazonaws.com/api_base:latest
COPY . /usr/src/app
COPY --from=builder /usr/src/app /usr/src/app
WORKDIR /usr/src/app

EXPOSE 3000
CMD [ "npm", "start" ]