const Promise = require('bluebird')

exports.models = {

  audioAnalysisTrainingSet: function (req, res, dbAudioAnalysisTrainingSet, trainingSet, testSet) {
    return new Promise(function (resolve, reject) {
      function getCollectionData (collection, collectionAudios) {
        const data = {
          guid: collection.guid,
          audios: []
        }
        for (let i = 0; i < collectionAudios.length; i++) {
          const item = collectionAudios[i]
          data.audios.push({
            guid: item.guid,
            note: item.GuardianAudioCollectionsRelation.note,
            position: item.GuardianAudioCollectionsRelation.position
          })
        }
        return data
      }
      try {
        const json = {
          name: dbAudioAnalysisTrainingSet.name,
          // eventValue: dbAudioAnalysisTrainingSet.GuardianAudioEventValue.value,
          eventValue: dbAudioAnalysisTrainingSet.event_value,
          trainingSet: getCollectionData(dbAudioAnalysisTrainingSet.TrainingSet, trainingSet),
          testSet: getCollectionData(dbAudioAnalysisTrainingSet.TestSet, testSet)
        }

        resolve(json)
      } catch (err) {
        reject(err)
      }
    })
  },

  audioAnalysisTrainingSets: function (req, res, dbAudioAnalysisTrainingSets) {
    return new Promise(function (resolve, reject) {
      try {
        if (!Array.isArray(dbAudioAnalysisTrainingSets)) { dbAudioAnalysisTrainingSets = [dbAudioAnalysisTrainingSets] }

        const json = {
          trainingSets: []
        }

        for (let i = 0; i < dbAudioAnalysisTrainingSets.length; i++) {
          const dbRow = dbAudioAnalysisTrainingSets[i]
          json.trainingSets.push({
            name: dbRow.name,
            guid: dbRow.guid
          })
        }

        resolve(json)
      } catch (err) {
        reject(err)
      }
    })
  }

}
