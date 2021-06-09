const cache = require('./audio-cache').audioUtils
const serve = require('./audio-serve').audioUtils
const transcode = require('./audio-transcode').audioUtils

module.exports = { audioUtils: { ...cache, ...serve, ...transcode } }
