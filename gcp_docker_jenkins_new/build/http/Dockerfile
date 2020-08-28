FROM gcr.io/prj-p-gke-01-59b8/rfcx_api_base_image:latest AS builder
ADD package*.json /tmp/
WORKDIR /tmp
RUN npm install
RUN mkdir -p /usr/src/app && cp -a /tmp/node_modules /usr/src/app
FROM gcr.io/prj-p-gke-01-59b8/rfcx_api_base_image:latest
COPY . /usr/src/app
COPY --from=builder /usr/src/app /usr/src/app
WORKDIR /usr/src/app
RUN mv rfcx.sh /etc/profile.d/
EXPOSE 3000
CMD npm start
