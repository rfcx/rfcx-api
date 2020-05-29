module.exports = {
  ais: [
    require("./ais/ais"),
  ],
  events: [
    require("./events/events"),
  ],
  guardians: [
    require("./guardians/guardians"),
  ],
  streams: [
    require("./streams/streams"),
    require("./streams/streams-assets"),
    require("./streams/streams-detections"),
  ],
  tags: [
    require("./tags/tags"),
  ],
}