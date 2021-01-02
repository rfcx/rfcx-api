module.exports = {
  ais: [
    require('./ais/ais')
  ],
  events: [
    require('./events/events')
  ],
  guardians: [
    require('./guardians/guardians'),
    require('./guardians/guardians-pings'),
    require('./guardians/guardians-segments'),
    require('./guardians/guardians-software')
  ],
  tags: [
    require('./tags/tags')
  ]
}
