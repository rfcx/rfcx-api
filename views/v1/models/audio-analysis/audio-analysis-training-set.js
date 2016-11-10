var util    = require("util"),
    Promise = require("bluebird");

exports.models = {

  audioAnalysisTrainingSet: function(req,res,dbAudioAnalysisTrainingSet, trainingSet, testSet) {

    return new Promise(function(resolve,reject) {

      try {

        function getCollectionData(collection, collectionAudios) {
          var data = {
            guid: collection.guid,
            audios: []
          };
          for (var i = 0; i < collectionAudios.length; i++) {
            var item = collectionAudios[i];
            data.audios.push({
              guid: item.guid,
              note: item.GuardianAudioCollectionsRelation.note,
              position: item.GuardianAudioCollectionsRelation.position
            });
          }
          return data;
        }

        var json = {
          name: dbAudioAnalysisTrainingSet.name,
          //eventValue: dbAudioAnalysisTrainingSet.GuardianAudioEventValue.value,
          eventValue: dbAudioAnalysisTrainingSet.event_value,
          trainingSet: getCollectionData(dbAudioAnalysisTrainingSet.TrainingSet, trainingSet),
          testSet: getCollectionData(dbAudioAnalysisTrainingSet.TestSet, testSet)
        };

        resolve(json);

      }
      catch (err) {
        reject(err);
      }

    })

  },

  audioAnalysisTrainingSets: function(req,res,dbAudioAnalysisTrainingSets) {

    return new Promise(function(resolve,reject) {

      try {

        if (!util.isArray(dbAudioAnalysisTrainingSets)) { dbAudioAnalysisTrainingSets = [dbAudioAnalysisTrainingSets]; }

        var json = {
          trainingSets: []
        };

        for (var i = 0; i < dbAudioAnalysisTrainingSets.length; i++) {

          var dbRow = dbAudioAnalysisTrainingSets[i];
          json.trainingSets.push({
            name: dbRow.name,
            guid: dbRow.guid
          })

        }

        resolve(json);

      }
      catch (err) {
        reject(err);
      }

    })

  }

};

