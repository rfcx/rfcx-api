FROM ubuntu:18.04 as base

RUN apt update \
    && apt install -y \
        curl \
        gnupg \
        gcc \
        g++ \
        make \
        sox \
        pngcrush \
        imagemagick \
        python-minimal \
        software-properties-common \
        libsox-fmt-all \
        libsox-dev \
        libvorbis-dev \
        libogg-dev \
        vorbis-tools \
        libopus-dev \
        libopusfile-dev \
        libtool \
        opus-tools \
        pkg-config \
        libflac-dev \
        autoconf \
        automake \
        git \
        libvorbis-ocaml

RUN  add-apt-repository ppa:jonathonf/ffmpeg-4 && \
     apt update && \
     apt install -y  ffmpeg libsox-fmt-all && \
     curl -sL https://deb.nodesource.com/setup_16.x | bash - && \
     apt update && \
     apt install -y nodejs && \
     curl -o /tmp/sox-14.4.2.tar.gz https://jztkft.dl.sourceforge.net/project/sox/sox/14.4.2/sox-14.4.2.tar.gz && \
     tar xzf /tmp/sox-14.4.2.tar.gz -C /tmp && \
     curl -o /tmp/libogg-1.3.4.tar.gz https://ftp.osuosl.org/pub/xiph/releases/ogg/libogg-1.3.4.tar.gz && \
     tar xzf /tmp/libogg-1.3.4.tar.gz -C /tmp && \
     curl -o /tmp/libvorbis-1.3.7.tar.gz https://ftp.osuosl.org/pub/xiph/releases/vorbis/libvorbis-1.3.7.tar.gz && \
     tar xzf /tmp/libvorbis-1.3.7.tar.gz -C /tmp && \
     curl -o /tmp/vorbis-tools-1.4.2.tar.gz https://ftp.osuosl.org/pub/xiph/releases/vorbis/vorbis-tools-1.4.2.tar.gz && \
     tar xf /tmp/vorbis-tools-1.4.2.tar.gz -C /tmp && \
     curl -o /tmp/flac-1.3.2.tar.xz https://ftp.osuosl.org/pub/xiph/releases/flac/flac-1.3.2.tar.xz && \
     tar xf /tmp/flac-1.3.2.tar.xz -C /tmp && \
     apt -y remove sox && \
     rm -f /usr/local/bin/sox /usr/bin/sox

WORKDIR /tmp/libogg-1.3.4
RUN ./configure && make && make install

WORKDIR /tmp/libvorbis-1.3.7
RUN ./configure && make && make install

WORKDIR /tmp/vorbis-tools-1.4.2
RUN ./configure && make && make install

WORKDIR /tmp/flac-1.3.2
RUN ./configure && make && make install

WORKDIR /tmp/sox-14.4.2/
RUN ./configure --with-opus=yes  --with-flac=yes --with-oggvorbis=yes && make -s && make install
ENV SOX_PATH="/usr/bin/sox"
ENV FFMPEG_PATH="/usr/bin/ffmpeg"
ENV IMAGEMAGICK_PATH="/usr/bin/convert"
ENV PNGCRUSH_PATH="/usr/bin/pngcrush"

WORKDIR /tmp
RUN apt -y upgrade && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /tmp/* && \
    /bin/bash -c "mkdir -p /tmp/{uploads,test-assets,ffmpeg,zip}"
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
