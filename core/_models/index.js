const { sequelize, Sequelize, options } = require('./db')

const models = {
  Annotation: require('./annotations/annotation')(sequelize, Sequelize),
  ClassificationAlternativeName: require('./classifications/classification-alternative-name')(sequelize, Sequelize),
  ClassificationSource: require('./classifications/classification-source')(sequelize, Sequelize),
  ClassificationType: require('./classifications/classification-type')(sequelize, Sequelize),
  Classification: require('./classifications/classification')(sequelize, Sequelize),
  Language: require('./classifications/language')(sequelize, Sequelize),
  ClassifierActiveProject: require('./classifiers/classifier-active-project')(sequelize, Sequelize),
  ClassifierActiveStream: require('./classifiers/classifier-active-stream')(sequelize, Sequelize),
  ClassifierDeployment: require('./classifiers/classifier-deployment')(sequelize, Sequelize),
  ClassifierEventStrategy: require('./classifiers/classifier-event-strategy')(sequelize, Sequelize),
  ClassifierJob: require('./classifiers/classifier-job')(sequelize, Sequelize),
  ClassifierOutput: require('./classifiers/classifier-output')(sequelize, Sequelize),
  Classifier: require('./classifiers/classifier')(sequelize, Sequelize),
  Detection: require('./detections/detection')(sequelize, Sequelize),
  DetectionReview: require('./detections/detection-review')(sequelize, Sequelize),
  EventStrategy: require('./events/event-strategy')(sequelize, Sequelize),
  Event: require('./events/event')(sequelize, Sequelize),
  IndexType: require('./indices/index-type')(sequelize, Sequelize),
  IndexValue: require('./indices/index-value')(sequelize, Sequelize),
  Index: require('./indices/index')(sequelize, Sequelize),
  Organization: require('./projects/organization')(sequelize, Sequelize),
  Project: require('./projects/project')(sequelize, Sequelize),
  Stream: require('./streams/stream')(sequelize, Sequelize),
  StreamSegment: require('./streams/stream-segment')(sequelize, Sequelize),
  StreamSourceFile: require('./streams/stream-source-file')(sequelize, Sequelize),
  AudioCodec: require('./to-be-removed/audio_codec')(sequelize, Sequelize),
  AudioFileFormat: require('./to-be-removed/audio_file_format')(sequelize, Sequelize),
  FileExtension: require('./to-be-removed/file_extension')(sequelize, Sequelize),
  RolePermission: require('./users/role-permission')(sequelize, Sequelize),
  Role: require('./users/role')(sequelize, Sequelize),
  UserOrganizationRole: require('./users/user-organization-role')(sequelize, Sequelize),
  UserProjectRole: require('./users/user-project-role')(sequelize, Sequelize),
  UserProjectSubscription: require('./users/user-project-subscription')(sequelize, Sequelize),
  UserStreamRole: require('./users/user-stream-role')(sequelize, Sequelize),
  User: require('./users/user')(sequelize, Sequelize)
}

// Create associations
Object.keys(models).forEach(function (modelName) {
  if ('associate' in models[modelName]) {
    models[modelName].associate(models)
  }
})

module.exports = { ...models, sequelize, Sequelize, options }
