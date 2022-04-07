FROM 887044485231.dkr.ecr.eu-west-1.amazonaws.com/api_base:latest as build

RUN ["/bin/bash", "-c", "mkdir -p /tmp/rfcx-api/{uploads,test-assets,ffmpeg,zip}"]
ENV SOX_PATH="/usr/bin/sox"
ENV FFMPEG_PATH="/usr/bin/ffmpeg"
ENV CACHE_DIRECTORY="/tmp/rfcx-api/"

# Dependencies
WORKDIR /usr/src/app
COPY package.json package-lock.json /usr/src/app/
RUN npm ci

# Application code
COPY . /usr/src/app


# -- Core --
FROM build as core-api
EXPOSE 8080
CMD ["npm", "run", "start:core"]

FROM build as core-tasks
CMD ["npm", "run", "start:tasks"]


# -- Non-core --
FROM build as noncore-api
EXPOSE 8080
CMD ["npm", "run", "start:noncore"]

FROM build as noncore-mqtt
EXPOSE 8080
CMD ["npm", "run", "start:mqtt"]
