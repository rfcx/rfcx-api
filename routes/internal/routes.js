module.exports = {
  assets: [
    require('./assets/streams')
  ],
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
