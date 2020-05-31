module.exports = {
  'annotations': [
    require("./annotations")
  ],
  'classifications': [
    require("./classifications")
  ],
  'streams': [
    require("./annotations/stream"),
    require("./classifications/stream")
  ],
  'clustered-annotations': [
    require('./annotations/clustered')
  ]
}