module.exports = {
  guardians: [
    require('./guardians/guardians-groups'),
    require('./guardians/guardians'),
    require('./guardians/guardians-software'),
    require('./guardians/guardians-checkins'),
    require('./guardians/guardians-audio'),
    require('./guardians/guardians-audio-uploads'),
    require('./guardians/guardians-events'),
    require('./guardians/guardians-meta'),
    require('./guardians/guardians-screenshots'),
    require('./guardians/guardians-status')
  ],
  sites: [
    require('./sites/sites'),
    require('./sites/sites-audio'),
    require('./sites/sites-guardians'),
    require('./sites/sites-events'),
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
  player: [
    require('./player/player')
  ],
  assets: [
    require('./assets/assets')
  ],
  reports: [
    require('./reports/reports')
  ],
  'filter-presets': [
    require('./filter-presets/filter-presets')
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
