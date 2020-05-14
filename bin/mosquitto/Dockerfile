FROM debian:10

RUN apt update && \
    apt install -y mosquitto mosquitto-clients
ADD mosquitto.conf /etc/mosquitto/mosquitto.conf
ADD certs /etc/mosquitto/certs
RUN rm -rf /var/lib/apt/lists/* && \
    touch /var/log/mosquitto/mosquitto.log 

EXPOSE 1883 8883

CMD ["/usr/sbin/mosquitto", "-c", "/etc/mosquitto/mosquitto.conf"]
