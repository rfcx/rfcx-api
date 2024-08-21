const { sequelize, Sequelize, options, coreSequelize, coreOptions } = require('./db')

const models = {
  GuardianSite: require('./guardian-sites/guardian-site')(sequelize, Sequelize),
  User: require('./users/user')(sequelize, Sequelize),
  Guardian: require('./guardians/guardian')(sequelize, Sequelize),
  GuardianCheckIn: require('./guardian-meta/guardian-checkin')(sequelize, Sequelize),
  GuardianMetaAccelerometer: require('./guardian-meta/guardian-meta-accelerometer')(sequelize, Sequelize),
  GuardianMetaAssetExchangeLog: require('./guardian-meta/guardian-meta-asset-exchange-log')(sequelize, Sequelize),
  GuardianMetaBattery: require('./guardian-meta/guardian-meta-battery')(sequelize, Sequelize),
  GuardianMetaCheckInStatus: require('./guardian-meta/guardian-meta-checkin-status')(sequelize, Sequelize),
  GuardianMetaCPU: require('./guardian-meta/guardian-meta-cpu')(sequelize, Sequelize),
  GuardianMetaDataTransfer: require('./guardian-meta/guardian-meta-datatransfer')(sequelize, Sequelize),
  GuardianMetaDateTimeOffset: require('./guardian-meta/guardian-meta-datetime-offset')(sequelize, Sequelize),
  GuardianMetaDiskUsage: require('./guardian-meta/guardian-meta-diskusage')(sequelize, Sequelize),
  GuardianMetaGeoLocation: require('./guardian-meta/guardian-meta-geolocation')(sequelize, Sequelize),
  GuardianMetaGeoPosition: require('./guardian-meta/guardian-meta-geoposition')(sequelize, Sequelize),
  GuardianMetaHardware: require('./guardian-meta/guardian-meta-hardware')(sequelize, Sequelize),
  GuardianMetaInstructionsLog: require('./guardian-meta/guardian-meta-instructions-log')(sequelize, Sequelize),
  GuardianMetaInstructionsQueue: require('./guardian-meta/guardian-meta-instructions-queue')(sequelize, Sequelize),
  GuardianMetaLightMeter: require('./guardian-meta/guardian-meta-lightmeter')(sequelize, Sequelize),
  GuardianMetaLog: require('./guardian-meta/guardian-meta-log')(sequelize, Sequelize),
  GuardianMetaMemory: require('./guardian-meta/guardian-meta-memory')(sequelize, Sequelize),
  GuardianMetaMessage: require('./guardian-meta/guardian-meta-message')(sequelize, Sequelize),
  GuardianMetaMqttBrokerConnection: require('./guardian-meta/guardian-meta-mqtt-broker-connection')(sequelize, Sequelize),
  GuardianMetaNetwork: require('./guardian-meta/guardian-meta-network')(sequelize, Sequelize),
  GuardianMetaOffline: require('./guardian-meta/guardian-meta-offline')(sequelize, Sequelize),
  GuardianMetaPhoto: require('./guardian-meta/guardian-meta-photo')(sequelize, Sequelize),
  GuardianMetaPower: require('./guardian-meta/guardian-meta-power')(sequelize, Sequelize),
  GuardianMetaReboot: require('./guardian-meta/guardian-meta-reboot')(sequelize, Sequelize),
  GuardianMetaScreenShot: require('./guardian-meta/guardian-meta-screenshot')(sequelize, Sequelize),
  GuardianMetaSegmentsGroupLog: require('./guardian-meta/guardian-meta-segments-group-log')(sequelize, Sequelize),
  GuardianMetaSegmentsGroup: require('./guardian-meta/guardian-meta-segments-group')(sequelize, Sequelize),
  GuardianMetaSegmentsQueue: require('./guardian-meta/guardian-meta-segments-queue')(sequelize, Sequelize),
  GuardianMetaSegmentsReceived: require('./guardian-meta/guardian-meta-segments-received')(sequelize, Sequelize),
  GuardianMetaSensorComponent: require('./guardian-meta/guardian-meta-sensor-component')(sequelize, Sequelize),
  GuardianMetaSensor: require('./guardian-meta/guardian-meta-sensor')(sequelize, Sequelize),
  GuardianMetaSensorValue: require('./guardian-meta/guardian-meta-sensor-value')(sequelize, Sequelize),
  GuardianMetaSentinelAccelerometer: require('./guardian-meta/guardian-meta-sentinel-accelerometer')(sequelize, Sequelize),
  GuardianMetaSentinelCompass: require('./guardian-meta/guardian-meta-sentinel-compass')(sequelize, Sequelize),
  GuardianMetaSentinelPower: require('./guardian-meta/guardian-meta-sentinel-power')(sequelize, Sequelize),
  GuardianSoftwarePrefs: require('./guardian-software/guardian-software-prefs')(sequelize, Sequelize),
  GuardianSoftwareVersion: require('./guardian-software/guardian-software-version')(sequelize, Sequelize),
  GuardianSoftware: require('./guardian-software/guardian-software')(sequelize, Sequelize),
  GuardianMetaSoftwareVersion: require('./guardian-meta/guardian-meta-software-version')(sequelize, Sequelize),
  GuardianMetaUpdateCheckIn: require('./guardian-meta/guardian-meta-update-checkin')(sequelize, Sequelize),
  GuardianMetaVideo: require('./guardian-meta/guardian-meta-video')(sequelize, Sequelize),
  ContactMessage: require('./contact-message/contact-message')(sequelize, Sequelize),
  GuardianAudioFormat: require('./guardian-audio/guardian-audio-format')(sequelize, Sequelize),
  GuardianAudio: require('./guardian-audio/guardian-audio')(sequelize, Sequelize),
  AnonymousToken: require('./tokens/anonymous-token')(sequelize, Sequelize),
  RegistrationToken: require('./tokens/registration-token')(sequelize, Sequelize),
  UserToken: require('./tokens/user-token')(sequelize, Sequelize),
  AdoptProtectDonation: require('./misc/adopt-protect-donation')(sequelize, Sequelize),
  ShortLink: require('./misc/shortlink')(sequelize, Sequelize)
}

const coreModels = {
  StreamSegment: require('../../core/_models/streams/stream-segment')(coreSequelize, Sequelize)
}

// Create associations
Object.keys(models).forEach(function (modelName) {
  if ('associate' in models[modelName]) {
    models[modelName].associate(models)
  }
})

module.exports = { ...models, sequelize, Sequelize, options, ...coreModels, coreOptions }
