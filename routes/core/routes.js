module.exports = {
  'annotations': [
    require("./annotations")
  ],
  'classifications': [
    require("./classifications")
  ],
  'detections': [
    require("./detections")
  ],
  'streams': [
    require("./streams"),
    require("./annotations/stream"),
    require("./classifications/stream"),
    require("./detections/stream")
  ],
  'clustered-annotations': [
    require('./annotations/clustered')
  ],
  'clustered-detections': [
    require('./detections/clustered')
  ]
}
