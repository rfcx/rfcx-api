FROM jrottenberg/ffmpeg:4.1-ubuntu
FROM node:20.9.0 as base

COPY --from=0 / /

RUN apt update && apt install -y sox pngcrush imagemagick

WORKDIR /tmp
RUN rm -rf /var/lib/apt/lists/* && \
    rm -rf /tmp/* && \
    /bin/bash -c "mkdir -p /tmp/{uploads,test-assets,ffmpeg,zip}"

ENV SOX_PATH="/usr/bin/sox"
ENV FFMPEG_PATH="/usr/local/bin/ffmpeg"
ENV IMAGEMAGICK_PATH="/usr/bin/convert"
ENV PNGCRUSH_PATH="/usr/bin/pngcrush"
ENV CACHE_DIRECTORY="/tmp/"


# -- Application build --
FROM base as build

# Dependencies
WORKDIR /app
COPY package.json package-lock.json /app/
RUN npm ci

# Application code (TODO move core and noncore below)
COPY common /app/common
COPY core /app/core
COPY noncore /app/noncore

# -- Core --
FROM build as core-api
EXPOSE 8080
CMD ["npm", "run", "start:core"]

FROM build as core-tasks
COPY tasks /app/tasks
CMD ["npm", "run", "start:tasks"]


# -- Non-core --
FROM build as noncore-api
EXPOSE 8080
CMD ["npm", "run", "start:noncore"]

FROM build as noncore-mqtt
COPY mqtt /app/mqtt
EXPOSE 8080
CMD ["npm", "run", "start:mqtt"]
