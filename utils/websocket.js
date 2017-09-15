const io = require('socket.io-client');
const Promise = require('bluebird');
const loggers = require('./logger');
const websocketUrl = process.env.WEBSOCKET_URL;
let socket = io.connect(websocketUrl);
let isConnected = false;

socket.on('connect', () => {
  isConnected = true;
  loggers.infoLogger.log('Websocket connected to url ' + websocketUrl);
});

socket.on('disconnect', () => {
  loggers.infoLogger.log('Websocket disconneted from url ' + websocketUrl);
});

socket.on('connect_error', () => { printError(new Error('Socket connection error')); });
socket.on('connect_timeout', () => { printError(new Error('Socket connection timeout')); });
socket.on('error', (error) => { printError(error); });

socket.connect();

function send(event, opts) {
  opts = opts || {};
  loggers.debugLogger.log('Websocket: send ', { event: event, message: opts, WSConnected: isConnected });
  socket.emit(event, opts);
}

function on() {

}

function off(event) {
  socket.off(event);
}

function ready() {

}

function connect() {
  socket.connect();
}

function disconnect() {
  socket.disconnect;
}

function printError(err) {
  loggers.errorLogger.log('Websocket error', err);
}

module.exports = {
  send: send,
  on: on,
  off: off,
  ready: ready,
  connect: connect,
  disconnect: disconnect,
};
