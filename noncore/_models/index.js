// const Sequelize = require('sequelize')
// const defineRelationships = require('./relationships')
// const env = process.env.NODE_ENV || 'development'

// const options = env === 'test'
//   ? {
//       dialect: 'sqlite',
//       logging: false
//     }
//   : {
//       dialect: 'mysql',
//       host: process.env.DB_HOSTNAME,
//       port: process.env.DB_PORT,
//       logging: false,
//       define: {
//         underscored: true,
//         timestamps: true,
//         charset: 'utf8',
//         dialectOptions: {
//           collate: 'utf8_general_ci'
//         }
//       }
//     }
// if (env === 'development') {
//   options.logging = function (str) {
//     console.info('\nSQL QUERY----------------------------------\n', str, '\n----------------------------------')
//   }
// }

// const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, options)
// sequelize.authenticate() // check connection

// const db = {
//   AudioAnalysisEntry: require('./audio-analysis/audio-analysis-entry')(sequelize, Sequelize),
//   AudioAnalysisLog: require('./audio-analysis/audio-analysis-log')(sequelize, Sequelize),
//   AudioAnalysisModel: require('./audio-analysis/audio-analysis-model')(sequelize, Sequelize),
//   AudioAnalysisState: require('./audio-analysis/audio-analysis-state')(sequelize, Sequelize),
//   AudioAnalysisTrainingSet: require('./audio-analysis/audio-analysis-training-set')(sequelize, Sequelize),
//   ClassificationSource: require('./classification/classification-source')(sequelize, Sequelize),
//   ClassificationType: require('./classification/classification-type')(sequelize, Sequelize),
//   Classification: require('./classification/classification')(sequelize, Sequelize),
//   SpeciesName: require('./classification/species-name')(sequelize, Sequelize),
//   ContactMessage: require('./contact-message/contact-message')(sequelize, Sequelize),
//   GuardianAudioBox: require('./guardian-audio/guardian-audio-box')(sequelize, Sequelize),
//   GuardianAudioCollection: require('./guardian-audio/guardian-audio-collection')(sequelize, Sequelize),
//   GuardianAudioCollectionsRelations: require('./guardian-audio/guardian-audio-collections-relations')(sequelize, Sequelize),
//   GuardianAudioEventReasonForCreation: require('./guardian-audio/guardian-audio-event-reason-for-creation')(sequelize, Sequelize),
//   GuardianAudioEventType: require('./guardian-audio/guardian-audio-event-type')(sequelize, Sequelize),
//   GuardianAudioEventValue: require('./guardian-audio/guardian-audio-event-value')(sequelize, Sequelize),
//   GuardianAudioEventValueHighLevelKey: require('./guardian-audio/guardian-audio-event-value-high-level-key')(sequelize, Sequelize),
//   GuardianAudioEvent: require('./guardian-audio/guardian-audio-events')(sequelize, Sequelize),
//   GuardianAudioFormat: require('./guardian-audio/guardian-audio-format')(sequelize, Sequelize),
//   GuardianAudioHighlight: require('./guardian-audio/guardian-audio-highlights')(sequelize, Sequelize),
//   GuardianAudioTag: require('./guardian-audio/guardian-audio-tag')(sequelize, Sequelize),
//   GuardianAudio: require('./guardian-audio/guardian-audio')(sequelize, Sequelize),
//   GuardianEvent: require('./guardian-event/guardian-event')(sequelize, Sequelize),
//   GuardianMetaAccelerometer: require('./guardian-meta/guardian-meta-accelerometer')(sequelize, Sequelize),
//   GuardianMetaAssetExchangeLog: require('./guardian-meta/guardian-meta-asset-exchange-log')(sequelize, Sequelize),
//   GuardianMetaBattery: require('./guardian-meta/guardian-meta-battery')(sequelize, Sequelize),
//   GuardianMetaCheckInStatus: require('./guardian-meta/guardian-meta-checkin-status')(sequelize, Sequelize),
//   GuardianMetaCPU: require('./guardian-meta/guardian-meta-cpu')(sequelize, Sequelize),
//   GuardianMetaDataTransfer: require('./guardian-meta/guardian-meta-datatransfer')(sequelize, Sequelize),
//   GuardianMetaDateTimeOffset: require('./guardian-meta/guardian-meta-datetime-offset')(sequelize, Sequelize),
//   GuardianMetaDiskUsage: require('./guardian-meta/guardian-meta-diskusage')(sequelize, Sequelize),
//   GuardianMetaGeoLocation: require('./guardian-meta/guardian-meta-geolocation')(sequelize, Sequelize),
//   GuardianMetaGeoPosition: require('./guardian-meta/guardian-meta-geoposition')(sequelize, Sequelize),
//   GuardianMetaHardware: require('./guardian-meta/guardian-meta-hardware')(sequelize, Sequelize),
//   GuardianMetaInstructionsLog: require('./guardian-meta/guardian-meta-instructions-log')(sequelize, Sequelize),
//   GuardianMetaInstructionsQueue: require('./guardian-meta/guardian-meta-instructions-queue')(sequelize, Sequelize),
//   GuardianMetaLightMeter: require('./guardian-meta/guardian-meta-lightmeter')(sequelize, Sequelize),
//   GuardianMetaLog: require('./guardian-meta/guardian-meta-log')(sequelize, Sequelize),
//   GuardianMetaMemory: require('./guardian-meta/guardian-meta-memory')(sequelize, Sequelize),
//   GuardianMetaMessage: require('./guardian-meta/guardian-meta-message')(sequelize, Sequelize),
//   GuardianMetaMqttBrokerConnection: require('./guardian-meta/guardian-meta-mqtt-broker-connection')(sequelize, Sequelize),
//   GuardianMetaNetwork: require('./guardian-meta/guardian-meta-network')(sequelize, Sequelize),
//   GuardianMetaOffline: require('./guardian-meta/guardian-meta-offline')(sequelize, Sequelize),
//   GuardianMetaPhoto: require('./guardian-meta/guardian-meta-photo')(sequelize, Sequelize),
//   GuardianMetaPower: require('./guardian-meta/guardian-meta-power')(sequelize, Sequelize),
//   GuardianMetaReboot: require('./guardian-meta/guardian-meta-reboot')(sequelize, Sequelize),
//   GuardianMetaScreenShot: require('./guardian-meta/guardian-meta-screenshot')(sequelize, Sequelize),
//   GuardianMetaSegmentsGroup: require('./guardian-meta/guardian-meta-segments-group')(sequelize, Sequelize),
//   GuardianMetaSegmentsGroupLog: require('./guardian-meta/guardian-meta-segments-group-log')(sequelize, Sequelize),
//   GuardianMetaSegmentsQueue: require('./guardian-meta/guardian-meta-segments-queue')(sequelize, Sequelize),
//   GuardianMetaSegmentsReceived: require('./guardian-meta/guardian-meta-segments-received')(sequelize, Sequelize),
//   GuardianMetaSensor: require('./guardian-meta/guardian-meta-sensor')(sequelize, Sequelize),
//   GuardianMetaSensorComponent: require('./guardian-meta/guardian-meta-sensor-component')(sequelize, Sequelize),
//   GuardianMetaSensorValue: require('./guardian-meta/guardian-meta-sensor-value')(sequelize, Sequelize),
//   GuardianMetaSentinelAccelerometer: require('./guardian-meta/guardian-meta-sentinel-accelerometer')(sequelize, Sequelize),
//   GuardianMetaSentinelCompass: require('./guardian-meta/guardian-meta-sentinel-compass')(sequelize, Sequelize),
//   GuardianMetaSentinelPower: require('./guardian-meta/guardian-meta-sentinel-power')(sequelize, Sequelize),
//   GuardianMetaSoftwareVersion: require('./guardian-meta/guardian-meta-software')(sequelize, Sequelize),
//   GuardianMetaUpdateCheckIn: require('./guardian-meta/guardian-meta-updatecheckin')(sequelize, Sequelize),
//   GuardianMetaVideo: require('./guardian-meta/guardian-meta-video')(sequelize, Sequelize),
//   GuardianSoftwarePrefs: require('./guardian-software/guardian-software-prefs')(sequelize, Sequelize),
//   GuardianSoftwareVersion: require('./guardian-software/guardian-software-version')(sequelize, Sequelize),
//   GuardianSoftware: require('./guardian-software/guardian-software')(sequelize, Sequelize),
//   Organization: require('./organization/organization')(sequelize, Sequelize),
//   AnonymousToken: require('./token/anonymous-token')(sequelize, Sequelize),
//   RegistrationToken: require('./token/registration-token')(sequelize, Sequelize),
//   UserToken: require('./token/user-token')(sequelize, Sequelize),
//   User: require('./user/user')(sequelize, Sequelize),
//   UserGuardianGroupSubscription: require('./user/user-group-subscriptions')(sequelize, Sequelize),
//   UserSiteRelation: require('./user/user-relations')(sequelize, Sequelize),
//   AdoptProtectDonation: require('./adopt-protect-donation')(sequelize, Sequelize),
//   Device: require('./device')(sequelize, Sequelize),
//   GuardianAudioUpload: require('./guardian-audio-upload')(sequelize, Sequelize),
//   GuardianCheckIn: require('./guardian-checkin')(sequelize, Sequelize),
//   GuardianGroupGuardianAudioEventTypeRelation: require('./guardian-group-event-type-relation')(sequelize, Sequelize),
//   GuardianGroupGuardianAudioEventValueRelation: require('./guardian-group-event-value-relation')(sequelize, Sequelize),
//   GuardianGroupRelation: require('./guardian-group-relation')(sequelize, Sequelize),
//   GuardianGroup: require('./guardian-group')(sequelize, Sequelize),
//   GuardianSite: require('./guardian-site')(sequelize, Sequelize),
//   Guardian: require('./guardian')(sequelize, Sequelize),
//   HealthCheck: require('./health-check')(sequelize, Sequelize),
//   Language: require('./language')(sequelize, Sequelize),
//   ShortLink: require('./shortlink')(sequelize, Sequelize),
//   SourceType: require('./source-type')(sequelize, Sequelize)
// }

// Object.keys(db).forEach(function (modelName) {
//   if ('associate' in db[modelName]) {
//     db[modelName].associate(db)
//   }
// })

// defineRelationships(sequelize.models)

// db.sequelize = sequelize
// db.Sequelize = Sequelize
// db.options = options

// module.exports = db

const { sequelize, Sequelize, options } = require('./db')

const models = {
  GuardianSite: require('./guardian-sites/guardian-site')(sequelize, Sequelize),
  User: require('./users/user')(sequelize, Sequelize),
  Guardian: require('./guardians/guardian')(sequelize, Sequelize),
  GuardianCheckIn: require('./guardian-meta/guardian-checkin')(sequelize, Sequelize),
  GuardianMetaAccelerometer: require('./guardian-meta/guardian-meta-accelerometer')(sequelize, Sequelize),
  GuardianMetaAssetExchangeLog: require('./guardian-meta/guardian-meta-asset-exchange-log')(sequelize, Sequelize),
  GuardianMetaBattery: require('./guardian-meta/guardian-meta-battery')(sequelize, Sequelize),
  GuardianMetaCheckInStatus: require('./guardian-meta/guardian-meta-checkin-status')(sequelize, Sequelize)
//   AudioAnalysisEntry: require('./audio-analysis/audio-analysis-entry')(sequelize, Sequelize),
//   AudioAnalysisLog: require('./audio-analysis/audio-analysis-log')(sequelize, Sequelize),
//   AudioAnalysisModel: require('./audio-analysis/audio-analysis-model')(sequelize, Sequelize),
//   AudioAnalysisState: require('./audio-analysis/audio-analysis-state')(sequelize, Sequelize),
//   AudioAnalysisTrainingSet: require('./audio-analysis/audio-analysis-training-set')(sequelize, Sequelize),
//   ClassificationSource: require('./classification/classification-source')(sequelize, Sequelize),
//   ClassificationType: require('./classification/classification-type')(sequelize, Sequelize),
//   Classification: require('./classification/classification')(sequelize, Sequelize),
//   SpeciesName: require('./classification/species-name')(sequelize, Sequelize),
//   ContactMessage: require('./contact-message/contact-message')(sequelize, Sequelize),
//   GuardianAudioBox: require('./guardian-audio/guardian-audio-box')(sequelize, Sequelize),
//   GuardianAudioCollection: require('./guardian-audio/guardian-audio-collection')(sequelize, Sequelize),
//   GuardianAudioCollectionsRelations: require('./guardian-audio/guardian-audio-collections-relations')(sequelize, Sequelize),
//   GuardianAudioEventReasonForCreation: require('./guardian-audio/guardian-audio-event-reason-for-creation')(sequelize, Sequelize),
//   GuardianAudioEventType: require('./guardian-audio/guardian-audio-event-type')(sequelize, Sequelize),
//   GuardianAudioEventValue: require('./guardian-audio/guardian-audio-event-value')(sequelize, Sequelize),
//   GuardianAudioEventValueHighLevelKey: require('./guardian-audio/guardian-audio-event-value-high-level-key')(sequelize, Sequelize),
//   GuardianAudioEvent: require('./guardian-audio/guardian-audio-events')(sequelize, Sequelize),
//   GuardianAudioFormat: require('./guardian-audio/guardian-audio-format')(sequelize, Sequelize),
//   GuardianAudioHighlight: require('./guardian-audio/guardian-audio-highlights')(sequelize, Sequelize),
//   GuardianAudioTag: require('./guardian-audio/guardian-audio-tag')(sequelize, Sequelize),
//   GuardianAudio: require('./guardian-audio/guardian-audio')(sequelize, Sequelize),
//   GuardianEvent: require('./guardian-event/guardian-event')(sequelize, Sequelize),
//   GuardianMetaCPU: require('./guardian-meta/guardian-meta-cpu')(sequelize, Sequelize),
//   GuardianMetaDataTransfer: require('./guardian-meta/guardian-meta-datatransfer')(sequelize, Sequelize),
//   GuardianMetaDateTimeOffset: require('./guardian-meta/guardian-meta-datetime-offset')(sequelize, Sequelize),
//   GuardianMetaDiskUsage: require('./guardian-meta/guardian-meta-diskusage')(sequelize, Sequelize),
//   GuardianMetaGeoLocation: require('./guardian-meta/guardian-meta-geolocation')(sequelize, Sequelize),
//   GuardianMetaGeoPosition: require('./guardian-meta/guardian-meta-geoposition')(sequelize, Sequelize),
//   GuardianMetaHardware: require('./guardian-meta/guardian-meta-hardware')(sequelize, Sequelize),
//   GuardianMetaInstructionsLog: require('./guardian-meta/guardian-meta-instructions-log')(sequelize, Sequelize),
//   GuardianMetaInstructionsQueue: require('./guardian-meta/guardian-meta-instructions-queue')(sequelize, Sequelize),
//   GuardianMetaLightMeter: require('./guardian-meta/guardian-meta-lightmeter')(sequelize, Sequelize),
//   GuardianMetaLog: require('./guardian-meta/guardian-meta-log')(sequelize, Sequelize),
//   GuardianMetaMemory: require('./guardian-meta/guardian-meta-memory')(sequelize, Sequelize),
//   GuardianMetaMessage: require('./guardian-meta/guardian-meta-message')(sequelize, Sequelize),
//   GuardianMetaMqttBrokerConnection: require('./guardian-meta/guardian-meta-mqtt-broker-connection')(sequelize, Sequelize),
//   GuardianMetaNetwork: require('./guardian-meta/guardian-meta-network')(sequelize, Sequelize),
//   GuardianMetaOffline: require('./guardian-meta/guardian-meta-offline')(sequelize, Sequelize),
//   GuardianMetaPhoto: require('./guardian-meta/guardian-meta-photo')(sequelize, Sequelize),
//   GuardianMetaPower: require('./guardian-meta/guardian-meta-power')(sequelize, Sequelize),
//   GuardianMetaReboot: require('./guardian-meta/guardian-meta-reboot')(sequelize, Sequelize),
//   GuardianMetaScreenShot: require('./guardian-meta/guardian-meta-screenshot')(sequelize, Sequelize),
//   GuardianMetaSegmentsGroup: require('./guardian-meta/guardian-meta-segments-group')(sequelize, Sequelize),
//   GuardianMetaSegmentsGroupLog: require('./guardian-meta/guardian-meta-segments-group-log')(sequelize, Sequelize),
//   GuardianMetaSegmentsQueue: require('./guardian-meta/guardian-meta-segments-queue')(sequelize, Sequelize),
//   GuardianMetaSegmentsReceived: require('./guardian-meta/guardian-meta-segments-received')(sequelize, Sequelize),
//   GuardianMetaSensor: require('./guardian-meta/guardian-meta-sensor')(sequelize, Sequelize),
//   GuardianMetaSensorComponent: require('./guardian-meta/guardian-meta-sensor-component')(sequelize, Sequelize),
//   GuardianMetaSensorValue: require('./guardian-meta/guardian-meta-sensor-value')(sequelize, Sequelize),
//   GuardianMetaSentinelAccelerometer: require('./guardian-meta/guardian-meta-sentinel-accelerometer')(sequelize, Sequelize),
//   GuardianMetaSentinelCompass: require('./guardian-meta/guardian-meta-sentinel-compass')(sequelize, Sequelize),
//   GuardianMetaSentinelPower: require('./guardian-meta/guardian-meta-sentinel-power')(sequelize, Sequelize),
//   GuardianMetaSoftwareVersion: require('./guardian-meta/guardian-meta-software')(sequelize, Sequelize),
//   GuardianMetaUpdateCheckIn: require('./guardian-meta/guardian-meta-updatecheckin')(sequelize, Sequelize),
//   GuardianMetaVideo: require('./guardian-meta/guardian-meta-video')(sequelize, Sequelize),
//   GuardianSoftwarePrefs: require('./guardian-software/guardian-software-prefs')(sequelize, Sequelize),
//   GuardianSoftwareVersion: require('./guardian-software/guardian-software-version')(sequelize, Sequelize),
//   GuardianSoftware: require('./guardian-software/guardian-software')(sequelize, Sequelize),
//   Organization: require('./organization/organization')(sequelize, Sequelize),
//   AnonymousToken: require('./token/anonymous-token')(sequelize, Sequelize),
//   RegistrationToken: require('./token/registration-token')(sequelize, Sequelize),
//   UserToken: require('./token/user-token')(sequelize, Sequelize),
//   UserGuardianGroupSubscription: require('./user/user-group-subscriptions')(sequelize, Sequelize),
//   UserSiteRelation: require('./user/user-relations')(sequelize, Sequelize),
//   AdoptProtectDonation: require('./adopt-protect-donation')(sequelize, Sequelize),
//   Device: require('./device')(sequelize, Sequelize),
//   GuardianAudioUpload: require('./guardian-audio-upload')(sequelize, Sequelize),
//   GuardianGroupGuardianAudioEventTypeRelation: require('./guardian-group-event-type-relation')(sequelize, Sequelize),
//   GuardianGroupGuardianAudioEventValueRelation: require('./guardian-group-event-value-relation')(sequelize, Sequelize),
//   GuardianGroupRelation: require('./guardian-group-relation')(sequelize, Sequelize),
//   GuardianGroup: require('./guardian-group')(sequelize, Sequelize),
//   HealthCheck: require('./health-check')(sequelize, Sequelize),
//   Language: require('./language')(sequelize, Sequelize),
//   ShortLink: require('./shortlink')(sequelize, Sequelize),
//   SourceType: require('./source-type')(sequelize, Sequelize)
}

// Create associations
Object.keys(models).forEach(function (modelName) {
  if ('associate' in models[modelName]) {
    models[modelName].associate(models)
  }
})

module.exports = { ...models, sequelize, Sequelize, options }
