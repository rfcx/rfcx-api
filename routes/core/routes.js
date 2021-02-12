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
  detections: [
    require('./detections')
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
  'stream-segments': [
    require('./stream-segments')
  ],
  organizations: [
    require('./organizations')
  ],
  projects: [
    require('./projects'),
    require('./subscriptions/project')
  ],
  streams: [
    require('./streams'),
    require('./streams/assets'),
    require('./annotations/stream'),
    require('./classifications/stream'),
    require('./detections/stream'),
    require('./indices/stream'),
    require('./stream-source-files/stream'),
    require('./stream-segments/stream'),
    require('./roles/stream')
  ],
  'clustered-annotations': [
    require('./annotations/clustered')
  ],
  'clustered-detections': [
    require('./detections/clustered')
  ],
  indices: [
    require('./indices')
  ]
}
