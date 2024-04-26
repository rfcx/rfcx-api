module.exports = {
  annotations: [
    require('./annotations')
  ],
  classifications: [
    require('./classifications')
  ],
  classifiers: [
    require('./classifiers')
  ],
  'classifier-jobs': [
    require('./classifier-jobs'),
    require('./detections/best-detections')
  ],
  detections: [
    require('./detections'),
    require('./detections/list-summary')
  ],
  'event-strategies': [
    require('./events/strategies')
  ],
  events: [
    require('./events')
  ],
  'stream-source-files': [
    require('./stream-source-files')
  ],
  organizations: [
    require('./organizations')
  ],
  projects: [
    require('./projects'),
    require('./subscriptions/project'),
    require('./roles/project')
  ],
  streams: [
    require('./streams'),
    require('./annotations/stream'),
    require('./classifications/stream'),
    require('./detections/stream'),
    require('./detections/review'),
    require('./indices/stream'),
    require('./stream-source-files/stream'),
    require('./stream-segments'),
    require('./roles/stream')
  ],
  'clustered-annotations': [
    require('./annotations/clustered')
  ],
  'clustered-detections': [
    require('./detections/clustered')
  ],
  'clustered-events': [
    require('./events/clustered')
  ],
  indices: [
    require('./indices')
  ],
  users: [
    require('./users')
  ]
}
