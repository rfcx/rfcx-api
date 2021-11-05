module.exports = {
  auth0: [
    require('./auth0/users')
  ],
  assets: [
    require('./assets/streams')
  ],
  cognition: [
    require('./cognition/aggregated-detections')
  ],
  cron: [
    require('./cron/streams')
  ],
  checkin: [
    require('./checkin/index')
  ],
  console: [
    require('./console/stream')
  ],
  explorer: [
    require('./explorer/indices-heatmap'),
    require('./explorer/stream'),
    require('./explorer/stream-classifications')
  ],
  ingest: [
    require('./ingest/stream')
  ],
  prediction: [
    require('./prediction/classifier-deployments'),
    require('./prediction/detections'),
    require('./prediction/indices')
  ],
  arbimon: [
    require('./arbimon/stream'),
    require('./arbimon/project')
  ],
  'ai-hub': [
    require('./ai-hub')
  ]
}
