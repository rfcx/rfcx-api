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
  'master-segments': [
    require('./master-segments')
  ],
  streams: [
    require("./streams"),
    require("./annotations/stream"),
    require("./classifications/stream"),
    require("./detections/stream"),
    require("./master-segments/stream")
  ],
  'clustered-annotations': [
    require('./annotations/clustered')
  ],
  'clustered-detections': [
    require('./detections/clustered')
  ]
}
