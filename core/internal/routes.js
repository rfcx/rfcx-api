module.exports = {
  auth0: [
    require('./auth0/users')
  ],
  assets: [
    require('./assets/streams')
  ],
  'classifier-jobs': [
    require('./classifier-jobs')
  ],
  cognition: [
    require('./cognition/aggregated-detections')
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
  ingest: [
    require('./ingest')
  ],
  prediction: [
    require('./prediction/classifier-deployments'),
    require('./prediction/detections'),
    require('./prediction/indices'),
    require('./prediction/stream')
  ],
  arbimon: [
    require('./arbimon/stream'),
    require('./arbimon/project'),
    require('./arbimon/recordings')
  ],
  'ai-hub': [
    require('./ai-hub')
  ]
}
