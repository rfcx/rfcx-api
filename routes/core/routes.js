module.exports = {
  annotations: [
    require('./annotations')
  ],
  classifications: [
    require('./classifications')
  ],
  detections: [
    require('./detections')
  ],
  'stream-source-files': [
    require('./stream-source-files')
  ],
  'stream-segments': [
    require('./stream-segments')
  ],
  streams: [
    require("./streams"),
    require("./annotations/stream"),
    require("./classifications/stream"),
    require("./detections/stream"),
    require("./stream-source-files/stream"),
    require("./stream-segments/stream")
  ],
  'clustered-annotations': [
    require('./annotations/clustered')
  ],
  'clustered-detections': [
    require('./detections/clustered')
  ]
}
