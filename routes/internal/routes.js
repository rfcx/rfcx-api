module.exports = {
  cron: [
    require('./cron/streams')
  ],
  explorer: [
    require('./explorer/stream'),
    require('./explorer/stream-classifications')
  ],
  prediction: [
    require('./prediction/detections')
  ]
}
