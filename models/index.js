"use strict";

var fs        = require("fs");
var path      = require("path");
var Sequelize = require("sequelize");
var env = process.env.NODE_ENV || "development";

let options = {
  dialect: 'mysql',
  host: process.env.DB_HOSTNAME,
  port: process.env.DB_PORT,
  define: {
    timestamps: false
  }
}
if (env === 'development') {
  options.logging = function (str) {
    console.log('\nSQL QUERY----------------------------------\n', str, '\n----------------------------------');
  }
}

var sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, options);
var db = {};

sequelize
  .authenticate()
  .then(() => {
    console.log('Connected to MySQL.');
  })
  .catch(err => {
    console.error('Unable to connect to MySQL:', err);
  });

// get file listing in 'models' directory, filtered by those we know to ignore...
fs.readdirSync(__dirname).filter(function(file) {
    return (file.indexOf(".") !== 0) && (file !== "index.js") && !fs.statSync(path.join(__dirname,file)).isDirectory();
  }).forEach(function(file) { importSequelizeModelFile(file); });

// get file listings from inner directories in models
fs.readdirSync(__dirname).filter(function(file) {
    return (file.indexOf(".") !== 0) && fs.statSync(path.join(__dirname,file)).isDirectory();
  }).forEach(function(file) {
    fs.readdirSync(path.join(__dirname,file)).filter(function(fileInDir) {
      return (fileInDir.indexOf(".") !== 0);
    }).forEach(function(fileInDir) { importSequelizeModelFile(path.join(file,fileInDir)); });
  });

Object.keys(db).forEach(function(modelName) {
  if ("associate" in db[modelName]) {
    db[modelName].associate(db);
  }
});

defineRelationships();

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;

function importSequelizeModelFile(file) {
  var model = sequelize.import(path.join(__dirname, file));
  db[model.name] = model;
}

function defineRelationships() {
  sequelize.models.Attachment.belongsTo(sequelize.models.AttachmentType, { as: "Type", foreignKey: "type_id" });
  sequelize.models.Attachment.belongsTo(sequelize.models.User, { as: "User", foreignKey: "user_id"} );
  sequelize.models.Attachment.belongsToMany(sequelize.models.Report, { through: sequelize.models.ReportAttachmentRelation });

  sequelize.models.AudioAnalysisEntry.belongsTo(sequelize.models.GuardianAudio, {as: "Audio", foreignKey: "guardian_audio_id"});
  sequelize.models.AudioAnalysisEntry.belongsTo(sequelize.models.AudioAnalysisModel, {as: "AI", foreignKey: "audio_analysis_model_id"});
  sequelize.models.AudioAnalysisEntry.belongsTo(sequelize.models.AudioAnalysisState, {as: "State", foreignKey: "state"});

  sequelize.models.AudioAnalysisLog.belongsTo(sequelize.models.GuardianAudio, { as: "Audio", foreignKey: "audio_id" });
  sequelize.models.AudioAnalysisLog.belongsTo(sequelize.models.AudioAnalysisModel, { as: "Model", foreignKey: "model_id" });

  sequelize.models.AudioAnalysisModel.belongsTo(sequelize.models.GuardianAudioEventType, { foreignKey: "event_type" });
  sequelize.models.AudioAnalysisModel.belongsTo(sequelize.models.GuardianAudioEventValue, { foreignKey: "event_value" });

  sequelize.models.AudioAnalysisTrainingSet.belongsTo(sequelize.models.GuardianAudioCollection, { foreignKey: "training_set", as: 'TrainingSet' });
  sequelize.models.AudioAnalysisTrainingSet.belongsTo(sequelize.models.GuardianAudioCollection, { foreignKey: "test_set", as: 'TestSet' });

  sequelize.models.Classification.belongsTo(sequelize.models.ClassificationType, { as: 'Type', foreignKey: "type" });
  sequelize.models.Classification.belongsTo(sequelize.models.ClassificationSource, { as: 'Source', foreignKey: "source" });
  sequelize.models.Classification.belongsTo(sequelize.models.Classification, { as: 'Parent', foreignKey: "parent" });
  sequelize.models.Classification.hasMany(sequelize.models.SpeciesName, { as: "Name", foreignKey: "species" });

  sequelize.models.SpeciesName.belongsTo(sequelize.models.Language, { as: 'Language', foreignKey: "language" });
  sequelize.models.SpeciesName.belongsTo(sequelize.models.Classification, { as: 'Species', foreignKey: 'species' });

  sequelize.models.FilterPreset.belongsTo(sequelize.models.User, { foreignKey: 'created_by', as: 'UserCreated' });
  sequelize.models.FilterPreset.belongsTo(sequelize.models.User, { foreignKey: 'updated_by', as: 'UserUpdated' });

  sequelize.models.GuardianAudioBox.belongsTo(sequelize.models.GuardianAudio, { as: 'Audio', foreignKey: "audio_id" });
  sequelize.models.GuardianAudioBox.belongsTo(sequelize.models.GuardianAudioEventValue, { as: 'Value', foreignKey: "value" });
  sequelize.models.GuardianAudioBox.belongsTo(sequelize.models.User, { as: "User", foreignKey: "created_by" });

  sequelize.models.GuardianAudioCollection.belongsToMany(sequelize.models.GuardianAudio, { through: 'GuardianAudioCollectionsRelation' });

  sequelize.models.GuardianAudioEventType.belongsToMany(sequelize.models.GuardianGroup, { through: sequelize.models.GuardianGroupGuardianAudioEventTypeRelation });

  sequelize.models.GuardianAudioEventValueHighLevelKey.hasMany(sequelize.models.GuardianAudioEventValue, { as: "Value", foreignKey: "high_level_key"});

  sequelize.models.GuardianAudioEventValue.belongsToMany(sequelize.models.GuardianGroup, { through: sequelize.models.GuardianGroupGuardianAudioEventValueRelation });
  sequelize.models.GuardianAudioEventValue.belongsTo(sequelize.models.GuardianAudioEventValueHighLevelKey, { as: 'HighLevelKey', foreignKey: "high_level_key" });

  sequelize.models.GuardianAudioEvent.belongsTo(sequelize.models.GuardianAudio, { as: 'Audio', foreignKey: "audio_id" });
  sequelize.models.GuardianAudioEvent.belongsTo(sequelize.models.GuardianAudioEventType, { as: 'Type', foreignKey: "type" });
  sequelize.models.GuardianAudioEvent.belongsTo(sequelize.models.GuardianAudioEventValue, { as: 'Value', foreignKey: "value" });
  sequelize.models.GuardianAudioEvent.belongsTo(sequelize.models.AudioAnalysisModel, { as: 'Model', foreignKey: "model" });
  sequelize.models.GuardianAudioEvent.belongsTo(sequelize.models.Guardian, { as: 'Guardian', foreignKey: "guardian" });
  sequelize.models.GuardianAudioEvent.belongsTo(sequelize.models.User, { as: "User", foreignKey: "reviewed_by" });
  sequelize.models.GuardianAudioEvent.belongsTo(sequelize.models.GuardianAudioEventReasonForCreation, { as: "Reason", foreignKey: "reason_for_creation" });

  sequelize.models.GuardianAudioHighlight.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianAudioHighlight.belongsTo(sequelize.models.GuardianSite, {as: 'Site', foreignKey: 'site_id'});

  sequelize.models.GuardianAudioTag.belongsTo(sequelize.models.User, { as: "User", foreignKey: "tagged_by_user" });
  sequelize.models.GuardianAudioTag.belongsTo(sequelize.models.AudioAnalysisModel, { as: "Model", foreignKey: "tagged_by_model" });
  sequelize.models.GuardianAudioTag.belongsTo(sequelize.models.GuardianAudio, { as: "Audio", foreignKey: "audio_id" });

  sequelize.models.GuardianAudio.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianAudio.belongsTo(sequelize.models.GuardianSite, {as: 'Site', foreignKey: 'site_id'});
  sequelize.models.GuardianAudio.hasMany(sequelize.models.GuardianEvent, {as: "Event", foreignKey: "audio_id"});
  sequelize.models.GuardianAudio.belongsTo(sequelize.models.GuardianCheckIn, {as: "CheckIn", foreignKey: "check_in_id"});
  sequelize.models.GuardianAudio.belongsTo(sequelize.models.GuardianAudioFormat, {as: "Format", foreignKey: "format_id"});
  sequelize.models.GuardianAudio.belongsToMany(sequelize.models.GuardianAudioCollection, { through: 'GuardianAudioCollectionsRelation' });

  sequelize.models.GuardianEvent.belongsTo(sequelize.models.GuardianSite, {as: "Site", foreignKey: "site_id"});
  sequelize.models.GuardianEvent.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianEvent.belongsTo(sequelize.models.GuardianCheckIn, {as: "CheckIn", foreignKey: "check_in_id"});
  sequelize.models.GuardianEvent.belongsTo(sequelize.models.GuardianAudio, {as: "Audio", foreignKey: "audio_id"});
  sequelize.models.GuardianEvent.belongsTo(sequelize.models.User, {as: "Reviewer", foreignKey: "reviewer_id"});

  sequelize.models.GuardianMetaAccelerometer.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaAssetExchangeLog.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaBattery.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaCheckInStatus.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaCPU.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaDataTransfer.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaDateTimeOffset.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaDiskUsage.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaGeoLocation.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaGeoPosition.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaHardware.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaInstructionsLog.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaInstructionsQueue.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaLightMeter.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaLog.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaMessage.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaMqttBrokerConnection.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaNetwork.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaOffline.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaPhoto.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaPower.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaReboot.belongsTo(sequelize.models.Guardian, {as: "Guardian", foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaReboot.belongsTo(sequelize.models.GuardianSite, {as: "Site", foreignKey: 'site_id'});
  sequelize.models.GuardianMetaScreenShot.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaSoftwareVersion.belongsTo(sequelize.models.GuardianSoftware, {as: "Role", foreignKey: "software_id"});
  sequelize.models.GuardianMetaSoftwareVersion.belongsTo(sequelize.models.GuardianSoftwareVersion, {as: "Version", foreignKey: "version_id"});
  sequelize.models.GuardianMetaSoftwareVersion.belongsTo(sequelize.models.Guardian, {as: "Guardian", foreignKey: "guardian_id"});
  sequelize.models.GuardianMetaUpdateCheckIn.belongsTo(sequelize.models.Guardian, {as: "Guardian", foreignKey: 'guardian_id'});
  sequelize.models.GuardianMetaUpdateCheckIn.belongsTo(sequelize.models.GuardianSoftwareVersion, {as: "Version", foreignKey: 'version_id'});
  sequelize.models.GuardianMetaUpdateCheckIn.belongsTo(sequelize.models.GuardianSoftware, {as: "Role", foreignKey: 'role_id'});
  sequelize.models.GuardianMetaVideo.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});

  sequelize.models.GuardianSoftwarePrefs.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});
  sequelize.models.GuardianSoftwareVersion.belongsTo(sequelize.models.GuardianSoftware, { as: 'SoftwareRole', foreignKey: "software_role_id" });
  sequelize.models.GuardianSoftware.belongsTo(sequelize.models.GuardianSoftwareVersion, {as: "CurrentVersion", foreignKey: "current_version_id", constraints: false});

  sequelize.models.Message.belongsTo(sequelize.models.MessageType, { as: 'Type', foreignKey: "type" });
  sequelize.models.Message.belongsTo(sequelize.models.User, { as: "UserFrom", foreignKey: "from_user" });
  sequelize.models.Message.belongsTo(sequelize.models.User, { as: "UserTo", foreignKey: "to_user" });

  sequelize.models.Organization.hasMany(sequelize.models.GuardianSite, { as: "Site", foreignKey: "organization" });

  sequelize.models.Annotation.belongsTo(sequelize.models.Stream, { as: 'Stream', foreignKey: "stream" });
  sequelize.models.Annotation.belongsTo(sequelize.models.GuardianAudioEventValue, { as: 'Value', foreignKey: "value" });
  sequelize.models.Annotation.belongsTo(sequelize.models.User, { as: "User", foreignKey: "created_by" });

  sequelize.models.MasterSegment.belongsTo(sequelize.models.Stream, { as: 'Stream', foreignKey: "stream" });
  sequelize.models.MasterSegment.belongsTo(sequelize.models.Codec, { as: 'Codec', foreignKey: "codec" });
  sequelize.models.MasterSegment.belongsTo(sequelize.models.Format, { as: 'Format', foreignKey: "format" });
  sequelize.models.MasterSegment.belongsTo(sequelize.models.SampleRate, { as: 'SampleRate', foreignKey: "sample_rate" });
  sequelize.models.MasterSegment.belongsTo(sequelize.models.ChannelLayout, { as: 'ChannelLayout', foreignKey: "channel_layout" });

  sequelize.models.Segment.belongsTo(sequelize.models.Stream, { as: 'Stream', foreignKey: "stream" });
  sequelize.models.Segment.belongsTo(sequelize.models.MasterSegment, { as: "MasterSegment", foreignKey: "master_segment" });
  sequelize.models.Segment.belongsTo(sequelize.models.FileExtension, { as: 'FileExtension', foreignKey: "file_extension" });

  sequelize.models.Stream.belongsTo(sequelize.models.StreamVisibility, { as: 'Visibility', foreignKey: "visibility" });
  sequelize.models.Stream.belongsTo(sequelize.models.User, { as: "User", foreignKey: "created_by" });
  sequelize.models.Stream.belongsTo(sequelize.models.Location, { as: 'Location', foreignKey: "location" });
  sequelize.models.Stream.belongsTo(sequelize.models.SampleRate, { as: 'SampleRate', foreignKey: "max_sample_rate" });
  sequelize.models.Stream.belongsTo(sequelize.models.GuardianSite, { as: 'Site', foreignKey: "site" });

  sequelize.models.ResetPasswordToken.belongsTo(sequelize.models.User, {as: 'User', foreignKey: "user_id"});

  sequelize.models.UserLocation.belongsTo(sequelize.models.User, { as: 'Location', foreignKey: 'user_id' });

  sequelize.models.User.hasMany(sequelize.models.UserToken, {as: "Token", foreignKey: "user_id"});
  sequelize.models.User.belongsToMany(sequelize.models.GuardianSite, { through: 'UserSiteRelation' });
  sequelize.models.User.belongsTo(sequelize.models.GuardianSite, { as: 'DefaultSite', foreignKey: "default_site" });
  sequelize.models.User.belongsToMany(sequelize.models.GuardianGroup, { through: 'UserGuardianGroupSubscription' });

  sequelize.models.AdoptProtectDonation.belongsTo(sequelize.models.GuardianSite, {as: "AreaSite", foreignKey: "area_site_id"});

  sequelize.models.Device.belongsTo(sequelize.models.User, { as: 'User', foreignKey: "user_id" });

  sequelize.models.GuardianAudioUpload.belongsTo(sequelize.models.Guardian, {as: 'Guardian', foreignKey: 'guardian_id'});

  sequelize.models.GuardianCheckIn.belongsTo(sequelize.models.Guardian, {as: "Guardian", foreignKey: 'guardian_id'});
  sequelize.models.GuardianCheckIn.hasMany(sequelize.models.GuardianAudio, {as: "Audio", foreignKey: "check_in_id"});
  sequelize.models.GuardianCheckIn.hasMany(sequelize.models.GuardianMetaCPU, {as: "MetaCPU", foreignKey: "check_in_id"});
  sequelize.models.GuardianCheckIn.hasMany(sequelize.models.GuardianMetaBattery, {as: "MetaBattery", foreignKey: "check_in_id"});
  sequelize.models.GuardianCheckIn.hasMany(sequelize.models.GuardianMetaDataTransfer, {as: "MetaDataTransfer", foreignKey: "check_in_id"});
  sequelize.models.GuardianCheckIn.hasMany(sequelize.models.GuardianMetaLightMeter, {as: "MetaLightMeter", foreignKey: "check_in_id"});
  sequelize.models.GuardianCheckIn.hasMany(sequelize.models.GuardianMetaGeoLocation, {as: "MetaGeoLocation", foreignKey: "check_in_id"});
  sequelize.models.GuardianCheckIn.hasMany(sequelize.models.GuardianMetaGeoPosition, {as: "MetaGeoPosition", foreignKey: "check_in_id"});
  sequelize.models.GuardianCheckIn.hasMany(sequelize.models.GuardianMetaDateTimeOffset, {as: "MetaDateTimeOffset", foreignKey: "check_in_id"});
  sequelize.models.GuardianCheckIn.hasMany(sequelize.models.GuardianMetaMqttBrokerConnection, {as: "MetaMqttBrokerConnection", foreignKey: "check_in_id"});
  sequelize.models.GuardianCheckIn.hasMany(sequelize.models.GuardianMetaNetwork, {as: "MetaNetwork", foreignKey: "check_in_id"});
  sequelize.models.GuardianCheckIn.hasMany(sequelize.models.GuardianMetaOffline, {as: "MetaOffline", foreignKey: "check_in_id"});
  sequelize.models.GuardianCheckIn.hasMany(sequelize.models.GuardianMetaPower, {as: "MetaPower", foreignKey: "check_in_id"});
  sequelize.models.GuardianCheckIn.hasMany(sequelize.models.GuardianMetaMessage, {as: "MetaMessages", foreignKey: "check_in_id"});
  sequelize.models.GuardianCheckIn.hasMany(sequelize.models.GuardianEvent, {as: "Event", foreignKey: "check_in_id"});

  sequelize.models.GuardianGroup.belongsTo(sequelize.models.GuardianSite, { as: 'Site', foreignKey: "site" });
  sequelize.models.GuardianGroup.belongsToMany(sequelize.models.Guardian, { through: sequelize.models.GuardianGroupRelation });
  sequelize.models.GuardianGroup.belongsToMany(sequelize.models.GuardianAudioEventValue, { through: sequelize.models.GuardianGroupGuardianAudioEventValueRelation });
  sequelize.models.GuardianGroup.belongsToMany(sequelize.models.GuardianAudioEventType, { through: sequelize.models.GuardianGroupGuardianAudioEventTypeRelation });
  sequelize.models.GuardianGroup.belongsToMany(sequelize.models.User, { through: 'UserGuardianGroupSubscription' });

  sequelize.models.GuardianSite.hasMany(sequelize.models.Guardian, {as: "Guardian", foreignKey: "site_id"});
  sequelize.models.GuardianSite.hasMany(sequelize.models.GuardianCheckIn, {as: "CheckIn", foreignKey: "site_id"});
  sequelize.models.GuardianSite.hasMany(sequelize.models.GuardianAudio, {as: "Audio", foreignKey: "site_id"});
  sequelize.models.GuardianSite.hasMany(sequelize.models.GuardianEvent, {as: "Event", foreignKey: "site_id"});
  sequelize.models.GuardianSite.hasMany(sequelize.models.GuardianGroup, {as: "GuardianGroup", foreignKey: "site"});
  sequelize.models.GuardianSite.belongsToMany(sequelize.models.User, { through: 'UserSiteRelation' });
  sequelize.models.GuardianSite.belongsTo(sequelize.models.User, { as: 'User', foreignKey: "user_id", constraints: false });

  sequelize.models.Guardian.belongsTo(sequelize.models.GuardianSite, {as: 'Site', foreignKey: 'site_id'});
  sequelize.models.Guardian.belongsToMany(sequelize.models.GuardianGroup, { through: sequelize.models.GuardianGroupRelation });
  sequelize.models.Guardian.belongsTo(sequelize.models.User, { as: 'User', foreignKey: "creator" });

  sequelize.models.Report.belongsTo(sequelize.models.GuardianSite, { as: "Site", foreignKey: "site" });
  sequelize.models.Report.belongsTo(sequelize.models.GuardianAudioEventValue, { as: 'Value', foreignKey: "value" });
  sequelize.models.Report.belongsTo(sequelize.models.User, { foreignKey: 'reporter' });
  sequelize.models.Report.belongsToMany(sequelize.models.Attachment, { through: sequelize.models.ReportAttachmentRelation });
}
