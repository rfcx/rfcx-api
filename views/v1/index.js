const { adoptProtectDonations } = require('./models/adopt-protect').models
const { DataFilterAudioGuidToJson } = require('./models/datafilters').models
const { guardianAudioEventsJson, guardianAudioEventsByGuardianJson, guardianAudioEventsByDatesJson, guardianAudioEventsCSV, guardianAudioEventsByGuardianCSV, guardianAudioEventsByDatesCSV } = require('./models/guardian-audio-events').models
const { guardianAudioHighlights } = require('./models/guardian-audio-highlights').models
const { baseInclude, guardianAudioFile, guardianAudioAmplitude, guardianAudioSpectrogram, guardianAudioJson, guardianAudioLabels, transformCreateAudioRequestToModel } = require('./models/guardian-audio').models
const { guardianCheckIns } = require('./models/guardian-checkins').models
const { guardianEvents, guardianEventsLite } = require('./models/guardian-events').models
const { guardianSites } = require('./models/guardian-sites').models
const { guardian, guardianPublicInfo } = require('./models/guardians').models
const { groupTagsByCreator, countTagsByGuid } = require('./models/tags').models
const { users, usersPublic } = require('./models/users').models
const { audioAnalysisMethods } = require('./models/audio-analysis/audio-analysis-methods').models
const { audioAnalysisTrainingSet, audioAnalysisTrainingSets } = require('./models/audio-analysis/audio-analysis-training-set').models
const { guardianAudioCollection } = require('./models/guardian-audio/guardian-audio-collection').models
const { guardianMetaMessages } = require('./models/guardian-meta/guardian-messages').models
const { guardianMetaAccelerometer } = require('./models/guardian-meta/guardian-meta-accelerometer').models
const { guardianMetaBattery } = require('./models/guardian-meta/guardian-meta-battery').models
const { guardianMetaCheckIns } = require('./models/guardian-meta/guardian-meta-checkins').models
const { guardianMetaCPU } = require('./models/guardian-meta/guardian-meta-cpu').models
const { guardianMetaDataTransfer } = require('./models/guardian-meta/guardian-meta-datatransfer').models
const { guardianMetaDiskUsage } = require('./models/guardian-meta/guardian-meta-diskusage').models
const { guardianMetaLightMeter } = require('./models/guardian-meta/guardian-meta-lightmeter').models
const { guardianMetaNetwork } = require('./models/guardian-meta/guardian-meta-network').models
const { guardianMetaOffline } = require('./models/guardian-meta/guardian-meta-offline').models
const { guardianMetaPower } = require('./models/guardian-meta/guardian-meta-power').models
const { guardianMetaReboots } = require('./models/guardian-meta/guardian-meta-reboots').models
const { guardianMetaScreenshots, guardianMetaScreenshotFile } = require('./models/guardian-meta/guardian-meta-screenshots').models
const { generateValueArrayAverages, populateValueArrays, constructValueArrays, finalizeValueArraysForOutput, guardianMeta } = require('./models/guardian-meta/guardian-meta').models
const { guardianSoftwareVersions } = require('./models/guardian-software/guardian-software-versions').models
const { guardianSoftware } = require('./models/guardian-software/guardian-software').models

module.exports = { models: { adoptProtectDonations, DataFilterAudioGuidToJson, guardianAudioEventsJson, guardianAudioEventsByGuardianJson, guardianAudioEventsByDatesJson, guardianAudioEventsCSV, guardianAudioEventsByGuardianCSV, guardianAudioEventsByDatesCSV, guardianAudioHighlights, baseInclude, guardianAudioFile, guardianAudioAmplitude, guardianAudioSpectrogram, guardianAudioJson, guardianAudioLabels, transformCreateAudioRequestToModel, guardianCheckIns, guardianEvents, guardianEventsLite, guardianSites, guardian, guardianPublicInfo, groupTagsByCreator, countTagsByGuid, users, usersPublic, audioAnalysisMethods, audioAnalysisTrainingSet, audioAnalysisTrainingSets, guardianAudioCollection, guardianMetaMessages, guardianMetaAccelerometer, guardianMetaBattery, guardianMetaCheckIns, guardianMetaCPU, guardianMetaDataTransfer, guardianMetaDiskUsage, guardianMetaLightMeter, guardianMetaNetwork, guardianMetaOffline, guardianMetaPower, guardianMetaReboots, guardianMetaScreenshots, guardianMetaScreenshotFile, generateValueArrayAverages, populateValueArrays, constructValueArrays, finalizeValueArraysForOutput, guardianMeta, guardianSoftwareVersions, guardianSoftware } }
