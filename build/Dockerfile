
FROM gcr.io/prj-p-gke-01-59b8/api_base:latest AS builder
ADD package*.json /tmp/
WORKDIR /tmp
RUN npm install
RUN mkdir -p /usr/src/app && cp -a /tmp/node_modules /usr/src/app
FROM gcr.io/prj-p-gke-01-59b8/api_base:latest
COPY . /usr/src/app
COPY --from=builder /usr/src/app /usr/src/app
WORKDIR /usr/src/app

EXPOSE 3000
