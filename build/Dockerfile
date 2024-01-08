FROM linuxserver/ffmpeg:version-6.1-cli
FROM node:20.9.0 as base

RUN echo ${PWD} && ls -lR usr/

COPY --from=0 /usr/lib/aarch64-linux-gnu/libv4l2.so.0 /usr/lib/aarch64-linux-gnu/libv4l2.so.0
COPY --from=0 /usr/lib/aarch64-linux-gnu/libv4lconvert.so.0 /usr/lib/aarch64-linux-gnu/libv4lconvert.so.0
COPY --from=0 /usr/lib/aarch64-linux-gnu/libjpeg.so.8 /usr/lib/aarch64-linux-gnu/libjpeg.so.8
COPY --from=0 /usr/local/lib /usr/local/lib
COPY --from=0 /usr/local/bin /usr/local/bin

RUN apt update && apt install -y sox libsox-fmt-mp3 pngcrush imagemagick

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
COPY package.json yarn.lock /app/
RUN yarn --production --frozen-lockfile

# Application code (TODO move core and noncore below)
COPY common /app/common
COPY core /app/core
COPY noncore /app/noncore

# -- Core --
FROM build as core-api
EXPOSE 8080
CMD ["yarn", "start:core"]

FROM build as core-tasks
COPY tasks /app/tasks
CMD ["yarn", "start:tasks"]


# -- Non-core --
FROM build as noncore-api
EXPOSE 8080
CMD ["yarn", "start:noncore"]

FROM build as noncore-mqtt
COPY mqtt /app/mqtt
EXPOSE 8080
CMD ["yarn", "start:mqtt"]
