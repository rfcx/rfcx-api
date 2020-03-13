FROM 887044485231.dkr.ecr.eu-west-1.amazonaws.com/node:latest AS builder
ADD package*.json /tmp/
WORKDIR /tmp
RUN npm install
RUN mkdir -p /usr/src/app && cp -a /tmp/node_modules /usr/src/app
FROM 887044485231.dkr.ecr.eu-west-1.amazonaws.com/node:latest
COPY . /usr/src/app
COPY --from=builder /usr/src/app /usr/src/app
WORKDIR /usr/src/app
RUN mv rfcx.sh /etc/profile.d/
EXPOSE 3000
CMD [ "/bin/bash", "-c", "source /etc/profile.d/rfcx.sh && npm start.mqtt" ]
