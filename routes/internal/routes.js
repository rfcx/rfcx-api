module.exports = {
  assets: [
    require('./assets/streams')
  ],
  cron: [
    require('./cron/streams')
  ],
  console: [
    require('./console/stream')
  ],
  explorer: [
    require('./explorer/indices-heatmap'),
    require('./explorer/stream'),
    require('./explorer/stream-classifications')
  ],
  prediction: [
    require('./prediction/classifier-deployments'),
    require('./prediction/detections'),
    require('./prediction/indices')
  ],
  arbimon: [
    require('./arbimon/stream'),
    require('./arbimon/project')
  ]
}
