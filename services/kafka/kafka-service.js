const kafka    = require('kafka-node');
const Promise  = require('bluebird');
const loggers  = require('../../utils/logger');
const util     = require('util');

const Producer = kafka.Producer;
const client   = new kafka.KafkaClient({
  kafkaHost: process.env.KAFKA_HOST
});
const producer = new Producer(client, {
  partitionerType: 3
});
const KeyedMessage = kafka.KeyedMessage;

const logDebug = loggers.debugLogger.log;
const logError = loggers.errorLogger.log;
let isReady = false;

producer.on('ready', function () {
  isReady = true;
  logDebug('Kafka Service: ready.');
});

producer.on('error', (err) => {
  isReady = false;
  logError('Kafka Service: initialize error.', { err });
});

function preparePayloadItem(topic, text, key) {
  return new Promise((resolve, reject) => {
    try {
      let item = {
        topic,
        messages: key? new KeyedMessage(key, text) : text
      };
      if (key) {
        item.key = key;
      }
      resolve(item);
    } catch(e) {
      reject(e);
    }
  });
}

function arePayloadsValid(payloads) {
  if (!util.isArray(payloads)) return false;
  return !payloads.some((payload) => {
    return !payload.topic || !payload.messages
  });
}

/**
 * Sends messages to Kafka server
 * @param {{topic: String, text: String, key: String}[]} payloads - An array with messages in payload format
 */
function send(payloads) {
  return new Promise((resolve, reject) => {
    if (!this.isReady) {
      let msg = 'Kafka Service: service is not ready to send messages.'
      logError(msg);
      return reject(new Error(msg));
    }
    payloads = util.isArray(payloads)? payloads : [payloads];
    if (!arePayloadsValid(payloads)) {
      let msg = 'Kafka Service: some of payloads have invalid format.';
      logError(msg);
      return reject(new Error(msg));
    }
    producer.send(payloads, (err, data) => {
      if (err) {
        logError('Kafka Service: error', { err });
        return reject(err);
      }
      logDebug('Kafka Service: success', { data });
      resolve(data);
    });
  });
}

module.exports = {
  preparePayloadItem,
  arePayloadsValid,
  send
}
