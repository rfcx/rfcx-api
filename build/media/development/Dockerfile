FROM 887044485231.dkr.ecr.eu-west-1.amazonaws.com/api_base:latest
EXPOSE 3000
CMD [ "/bin/bash", "-c", "source /etc/profile.d/rfcx.sh && npm start" ]

WORKDIR /usr/src/app
COPY . /usr/src/app
RUN rm config/env_vars.js
RUN npm install
