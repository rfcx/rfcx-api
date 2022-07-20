module.exports = {
  guardians: [
    require('./guardians/guardians-groups'),
    require('./guardians/guardians'),
    require('./guardians/guardians-software'),
    require('./guardians/guardians-checkins'),
    require('./guardians/guardians-audio'),
    require('./guardians/guardians-meta'),
    require('./guardians/guardians-screenshots'),
    require('./guardians/guardians-status')
  ],
  sites: [
    require('./sites/sites'),
    require('./sites/sites-audio'),
    require('./sites/sites-images')
  ],
  audio: [
    require('./audio/audio')
  ],
  users: [
    require('./users/users'),
    require('./users/users-internal')
  ],
  shortlinks: [
    require('./shortlinks/shortlinks')
  ],
  assets: [
    require('./assets/assets')
  ],
  metrics: [
    require('./metrics/metrics')
  ],
  'adopt-protect': [
    require('./adopt-protect/donations')
  ],
  forms: [
    require('./forms/contact')
  ],
  pdf: [
    require('./pdf/pdf')
  ]
}
