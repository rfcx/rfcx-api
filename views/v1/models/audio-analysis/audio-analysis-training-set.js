var util    = require("util"),
    Promise = require("bluebird");

exports.models = {

  audioAnalysisTrainingSet: function(req,res,dbAudioAnalysisTrainingSet) {

    return new Promise(function(resolve,reject) {

      try {

        var json = {
          name: dbAudioAnalysisTrainingSet.name,
          eventValue: dbAudioAnalysisTrainingSet.GuardianAudioEventValue.value,
          trainingSet: dbAudioAnalysisTrainingSet.TrainingSet.guid,
          testSet: dbAudioAnalysisTrainingSet.TestSet.guid
        };

        resolve(json);

      }
      catch (err) {
        reject(err);
      }

    })

  }

};

