const rp = require("request-promise");
const auth0Service = require('../auth0/auth0-service');
const ValidationError = require('../../utils/converter/validation-error').ValidationError;

function requestUpload(data) {
  let missingAttrs = ['filename', 'timestamp', 'stream', 'checksum'].filter(x => data[x] === undefined);
  if (missingAttrs.length) {
    throw new ValidationError(`The following attrs are required for requestUpload function call: ${missingAttrs.join(', ')}`);
  }
  let body = {
    filename: data.filename,
    timestamp: data.timestamp,
    stream: data.stream,
    checksum: data.checksum,
  };
  if (data.sampleRate) { body.sampleRate = data.sampleRate }
  if (data.targetBitrate) { body.targetBitrate = data.targetBitrate }

  const options = {
    method: 'POST',
    url: `${process.env.INGEST_SERVICE_BASE_URL}uploads`,
    headers: {},
    body,
    json: true
  };

  return auth0Service.getClientToken()
    .then((token) => {
      options.headers.authorization = `Bearer ${token}`;
      return rp(options);
    })
}

module.exports = {
  requestUpload,
}
