function defineRelationships (models) {
  models.Attachment.belongsTo(models.AttachmentType, { as: "Type", foreignKey: "type_id" });
  models.Attachment.belongsTo(models.User, { as: "User", foreignKey: "user_id" });
  models.Attachment.belongsToMany(models.Report, { through: models.ReportAttachmentRelation });

  models.AudioAnalysisEntry.belongsTo(models.GuardianAudio, { as: "Audio", foreignKey: "guardian_audio_id" });
  models.AudioAnalysisEntry.belongsTo(models.AudioAnalysisModel, { as: "AI", foreignKey: "audio_analysis_model_id" });
  models.AudioAnalysisEntry.belongsTo(models.AudioAnalysisState, { as: "State", foreignKey: "state" });

  models.AudioAnalysisLog.belongsTo(models.GuardianAudio, { as: "Audio", foreignKey: "audio_id" });
  models.AudioAnalysisLog.belongsTo(models.AudioAnalysisModel, { as: "Model", foreignKey: "model_id" });

  models.AudioAnalysisModel.belongsTo(models.GuardianAudioEventType, { foreignKey: "event_type" });
  models.AudioAnalysisModel.belongsTo(models.GuardianAudioEventValue, { foreignKey: "event_value" });

  models.AudioAnalysisTrainingSet.belongsTo(models.GuardianAudioCollection, { foreignKey: "training_set", as: 'TrainingSet' });
  models.AudioAnalysisTrainingSet.belongsTo(models.GuardianAudioCollection, { foreignKey: "test_set", as: 'TestSet' });

  models.Classification.belongsTo(models.ClassificationType, { as: 'Type', foreignKey: "type" });
  models.Classification.belongsTo(models.ClassificationSource, { as: 'Source', foreignKey: "source" });
  models.Classification.belongsTo(models.Classification, { as: 'Parent', foreignKey: "parent" });
  models.Classification.hasMany(models.SpeciesName, { as: "Name", foreignKey: "species" });

  models.SpeciesName.belongsTo(models.Language, { as: 'Language', foreignKey: "language" });
  models.SpeciesName.belongsTo(models.Classification, { as: 'Species', foreignKey: 'species' });

  models.FilterPreset.belongsTo(models.User, { foreignKey: 'created_by', as: 'UserCreated' });
  models.FilterPreset.belongsTo(models.User, { foreignKey: 'updated_by', as: 'UserUpdated' });

  models.GuardianAudioBox.belongsTo(models.GuardianAudio, { as: 'Audio', foreignKey: "audio_id" });
  models.GuardianAudioBox.belongsTo(models.GuardianAudioEventValue, { as: 'Value', foreignKey: "value" });
  models.GuardianAudioBox.belongsTo(models.User, { as: "User", foreignKey: "created_by" });

  models.GuardianAudioCollection.belongsToMany(models.GuardianAudio, { through: 'GuardianAudioCollectionsRelation' });

  models.GuardianAudioEventType.belongsToMany(models.GuardianGroup, { through: models.GuardianGroupGuardianAudioEventTypeRelation });

  models.GuardianAudioEventValueHighLevelKey.hasMany(models.GuardianAudioEventValue, { as: "Value", foreignKey: "high_level_key" });

  models.GuardianAudioEventValue.belongsToMany(models.GuardianGroup, { through: models.GuardianGroupGuardianAudioEventValueRelation });
  models.GuardianAudioEventValue.belongsTo(models.GuardianAudioEventValueHighLevelKey, { as: 'HighLevelKey', foreignKey: "high_level_key" });

  models.GuardianAudioEvent.belongsTo(models.GuardianAudio, { as: 'Audio', foreignKey: "audio_id" });
  models.GuardianAudioEvent.belongsTo(models.GuardianAudioEventType, { as: 'Type', foreignKey: "type" });
  models.GuardianAudioEvent.belongsTo(models.GuardianAudioEventValue, { as: 'Value', foreignKey: "value" });
  models.GuardianAudioEvent.belongsTo(models.AudioAnalysisModel, { as: 'Model', foreignKey: "model" });
  models.GuardianAudioEvent.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: "guardian" });
  models.GuardianAudioEvent.belongsTo(models.User, { as: "User", foreignKey: "reviewed_by" });
  models.GuardianAudioEvent.belongsTo(models.GuardianAudioEventReasonForCreation, { as: "Reason", foreignKey: "reason_for_creation" });

  models.GuardianAudioHighlight.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianAudioHighlight.belongsTo(models.GuardianSite, { as: 'Site', foreignKey: 'site_id' });

  models.GuardianAudioTag.belongsTo(models.User, { as: "User", foreignKey: "tagged_by_user" });
  models.GuardianAudioTag.belongsTo(models.AudioAnalysisModel, { as: "Model", foreignKey: "tagged_by_model" });
  models.GuardianAudioTag.belongsTo(models.GuardianAudio, { as: "Audio", foreignKey: "audio_id" });

  models.GuardianAudio.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianAudio.belongsTo(models.GuardianSite, { as: 'Site', foreignKey: 'site_id' });
  models.GuardianAudio.hasMany(models.GuardianEvent, { as: "Event", foreignKey: "audio_id" });
  models.GuardianAudio.belongsTo(models.GuardianCheckIn, { as: "CheckIn", foreignKey: "check_in_id" });
  models.GuardianAudio.belongsTo(models.GuardianAudioFormat, { as: "Format", foreignKey: "format_id" });
  models.GuardianAudio.belongsToMany(models.GuardianAudioCollection, { through: 'GuardianAudioCollectionsRelation' });

  models.GuardianEvent.belongsTo(models.GuardianSite, { as: "Site", foreignKey: "site_id" });
  models.GuardianEvent.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianEvent.belongsTo(models.GuardianCheckIn, { as: "CheckIn", foreignKey: "check_in_id" });
  models.GuardianEvent.belongsTo(models.GuardianAudio, { as: "Audio", foreignKey: "audio_id" });
  models.GuardianEvent.belongsTo(models.User, { as: "Reviewer", foreignKey: "reviewer_id" });

  models.GuardianMetaAccelerometer.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaAssetExchangeLog.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaBattery.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaCheckInStatus.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaCPU.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaDataTransfer.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaDateTimeOffset.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaDiskUsage.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaGeoLocation.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaGeoPosition.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaHardware.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaInstructionsLog.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaInstructionsQueue.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaLightMeter.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaLog.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaMessage.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaMqttBrokerConnection.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaNetwork.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaOffline.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaPhoto.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaPower.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaReboot.belongsTo(models.Guardian, { as: "Guardian", foreignKey: 'guardian_id' });
  models.GuardianMetaReboot.belongsTo(models.GuardianSite, { as: "Site", foreignKey: 'site_id' });
  models.GuardianMetaScreenShot.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianMetaSoftwareVersion.belongsTo(models.GuardianSoftware, { as: "Role", foreignKey: "software_id" });
  models.GuardianMetaSoftwareVersion.belongsTo(models.GuardianSoftwareVersion, { as: "Version", foreignKey: "version_id" });
  models.GuardianMetaSoftwareVersion.belongsTo(models.Guardian, { as: "Guardian", foreignKey: "guardian_id" });
  models.GuardianMetaUpdateCheckIn.belongsTo(models.Guardian, { as: "Guardian", foreignKey: 'guardian_id' });
  models.GuardianMetaUpdateCheckIn.belongsTo(models.GuardianSoftwareVersion, { as: "Version", foreignKey: 'version_id' });
  models.GuardianMetaUpdateCheckIn.belongsTo(models.GuardianSoftware, { as: "Role", foreignKey: 'role_id' });
  models.GuardianMetaVideo.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });

  models.GuardianMetaSentinelPower.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });

  models.GuardianSoftwarePrefs.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });
  models.GuardianSoftwareVersion.belongsTo(models.GuardianSoftware, { as: 'SoftwareRole', foreignKey: "software_role_id" });
  models.GuardianSoftware.belongsTo(models.GuardianSoftwareVersion, { as: "CurrentVersion", foreignKey: "current_version_id", constraints: false });

  models.Message.belongsTo(models.MessageType, { as: 'Type', foreignKey: "type" });
  models.Message.belongsTo(models.User, { as: "UserFrom", foreignKey: "from_user" });
  models.Message.belongsTo(models.User, { as: "UserTo", foreignKey: "to_user" });

  models.Organization.hasMany(models.GuardianSite, { as: "Site", foreignKey: "organization" });

  models.Annotation.belongsTo(models.Stream, { as: 'Stream', foreignKey: "stream" });
  models.Annotation.belongsTo(models.GuardianAudioEventValue, { as: 'Value', foreignKey: "value" });
  models.Annotation.belongsTo(models.User, { as: "User", foreignKey: "created_by" });

  models.MasterSegment.belongsTo(models.Stream, { as: 'Stream', foreignKey: "stream" });
  models.MasterSegment.belongsTo(models.Codec, { as: 'Codec', foreignKey: "codec" });
  models.MasterSegment.belongsTo(models.Format, { as: 'Format', foreignKey: "format" });
  models.MasterSegment.belongsTo(models.SampleRate, { as: 'SampleRate', foreignKey: "sample_rate" });
  models.MasterSegment.belongsTo(models.ChannelLayout, { as: 'ChannelLayout', foreignKey: "channel_layout" });

  models.Segment.belongsTo(models.Stream, { as: 'Stream', foreignKey: "stream" });
  models.Segment.belongsTo(models.MasterSegment, { as: "MasterSegment", foreignKey: "master_segment" });
  models.Segment.belongsTo(models.FileExtension, { as: 'FileExtension', foreignKey: "file_extension" });

  models.Stream.belongsTo(models.StreamVisibility, { as: 'Visibility', foreignKey: "visibility" });
  models.Stream.belongsTo(models.User, { as: "User", foreignKey: "created_by" });
  models.Stream.belongsTo(models.Location, { as: 'Location', foreignKey: "location" });
  models.Stream.belongsTo(models.SampleRate, { as: 'SampleRate', foreignKey: "max_sample_rate" });
  models.Stream.belongsTo(models.GuardianSite, { as: 'Site', foreignKey: "site" });

  models.ResetPasswordToken.belongsTo(models.User, { as: 'User', foreignKey: "user_id" });

  models.UserLocation.belongsTo(models.User, { as: 'Location', foreignKey: 'user_id' });

  models.User.hasMany(models.UserToken, { as: "Token", foreignKey: "user_id" });
  models.User.belongsToMany(models.GuardianSite, { through: 'UserSiteRelation' });
  models.User.belongsTo(models.GuardianSite, { as: 'DefaultSite', foreignKey: "default_site" });
  models.User.belongsToMany(models.GuardianGroup, { through: 'UserGuardianGroupSubscription' });

  models.AdoptProtectDonation.belongsTo(models.GuardianSite, { as: "AreaSite", foreignKey: "area_site_id" });

  models.Device.belongsTo(models.User, { as: 'User', foreignKey: "user_id" });

  models.GuardianAudioUpload.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' });

  models.GuardianCheckIn.belongsTo(models.Guardian, { as: "Guardian", foreignKey: 'guardian_id' });
  models.GuardianCheckIn.hasMany(models.GuardianAudio, { as: "Audio", foreignKey: "check_in_id" });
  models.GuardianCheckIn.hasMany(models.GuardianMetaCPU, { as: "MetaCPU", foreignKey: "check_in_id" });
  models.GuardianCheckIn.hasMany(models.GuardianMetaBattery, { as: "MetaBattery", foreignKey: "check_in_id" });
  models.GuardianCheckIn.hasMany(models.GuardianMetaDataTransfer, { as: "MetaDataTransfer", foreignKey: "check_in_id" });
  models.GuardianCheckIn.hasMany(models.GuardianMetaLightMeter, { as: "MetaLightMeter", foreignKey: "check_in_id" });
  models.GuardianCheckIn.hasMany(models.GuardianMetaGeoLocation, { as: "MetaGeoLocation", foreignKey: "check_in_id" });
  models.GuardianCheckIn.hasMany(models.GuardianMetaGeoPosition, { as: "MetaGeoPosition", foreignKey: "check_in_id" });
  models.GuardianCheckIn.hasMany(models.GuardianMetaDateTimeOffset, { as: "MetaDateTimeOffset", foreignKey: "check_in_id" });
  models.GuardianCheckIn.hasMany(models.GuardianMetaMqttBrokerConnection, { as: "MetaMqttBrokerConnection", foreignKey: "check_in_id" });
  models.GuardianCheckIn.hasMany(models.GuardianMetaNetwork, { as: "MetaNetwork", foreignKey: "check_in_id" });
  models.GuardianCheckIn.hasMany(models.GuardianMetaOffline, { as: "MetaOffline", foreignKey: "check_in_id" });
  models.GuardianCheckIn.hasMany(models.GuardianMetaPower, { as: "MetaPower", foreignKey: "check_in_id" });
  models.GuardianCheckIn.hasMany(models.GuardianMetaMessage, { as: "MetaMessages", foreignKey: "check_in_id" });
  models.GuardianCheckIn.hasMany(models.GuardianEvent, { as: "Event", foreignKey: "check_in_id" });
  models.GuardianCheckIn.hasMany(models.GuardianMetaSentinelPower, { as: "GuardianMetaSentinelPower", foreignKey: "check_in_id" });

  models.GuardianGroup.belongsTo(models.GuardianSite, { as: 'Site', foreignKey: "site" });
  models.GuardianGroup.belongsToMany(models.Guardian, { through: models.GuardianGroupRelation });
  models.GuardianGroup.belongsToMany(models.GuardianAudioEventValue, { through: models.GuardianGroupGuardianAudioEventValueRelation });
  models.GuardianGroup.belongsToMany(models.GuardianAudioEventType, { through: models.GuardianGroupGuardianAudioEventTypeRelation });
  models.GuardianGroup.belongsToMany(models.User, { through: 'UserGuardianGroupSubscription' });

  models.GuardianSite.hasMany(models.Guardian, { as: "Guardian", foreignKey: "site_id" });
  models.GuardianSite.hasMany(models.GuardianCheckIn, { as: "CheckIn", foreignKey: "site_id" });
  models.GuardianSite.hasMany(models.GuardianAudio, { as: "Audio", foreignKey: "site_id" });
  models.GuardianSite.hasMany(models.GuardianEvent, { as: "Event", foreignKey: "site_id" });
  models.GuardianSite.hasMany(models.GuardianGroup, { as: "GuardianGroup", foreignKey: "site" });
  models.GuardianSite.belongsToMany(models.User, { through: 'UserSiteRelation' });
  models.GuardianSite.belongsTo(models.User, { as: 'User', foreignKey: "user_id", constraints: false });

  models.Guardian.belongsTo(models.GuardianSite, { as: 'Site', foreignKey: 'site_id' });
  models.Guardian.belongsToMany(models.GuardianGroup, { through: models.GuardianGroupRelation });
  models.Guardian.belongsTo(models.User, { as: 'User', foreignKey: "creator" });

  models.Report.belongsTo(models.GuardianSite, { as: "Site", foreignKey: "site" });
  models.Report.belongsTo(models.GuardianAudioEventValue, { as: 'Value', foreignKey: "value" });
  models.Report.belongsTo(models.User, { foreignKey: 'reporter' });
  models.Report.belongsToMany(models.Attachment, { through: models.ReportAttachmentRelation });
}

module.exports = defineRelationships