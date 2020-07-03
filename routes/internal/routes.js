module.exports = {
  explorer: [
    require('./explorer/indices-heatmap'),
    require('./explorer/stream-classifications')
  ],
  prediction: [
    require('./prediction/detections'),
    require('./prediction/indices')
  ]
}
