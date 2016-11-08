var util    = require("util"),
    Promise = require("bluebird");

exports.models = {

  audioAnalysisTrainingSet: function(req,res,dbAudioAnalysisTrainingSet) {

    return new Promise(function(resolve,reject) {

      try {

        var json = {
          name: dbAudioAnalysisTrainingSet.name,
          //eventValue: dbAudioAnalysisTrainingSet.GuardianAudioEventValue.value,
          eventValue: dbAudioAnalysisTrainingSet.event_value,
          trainingSet: dbAudioAnalysisTrainingSet.TrainingSet.guid,
          testSet: dbAudioAnalysisTrainingSet.TestSet.guid
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

