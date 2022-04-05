FROM 887044485231.dkr.ecr.eu-west-1.amazonaws.com/api_base:latest

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
EXPOSE 3000
CMD ["npm", "start"]
