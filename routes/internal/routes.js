module.exports = {
  explorer: [
    require('./explorer/stream-classifications')
  ],
  prediction: [
    require('./prediction/detections'),
    require('./prediction/indices')
  ]
}
