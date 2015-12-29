var util = require("util");
var Promise = require("bluebird");
var models  = require("../../models");
function getAllQueryHelpers() { return require("../../utils/rfcx-query"); }

exports.guardianAudioStatus = {

  allCoverage: function(guardianId) {
    return new Promise(function(resolve, reject) {

        try {

          var queryHelpers = getAllQueryHelpers();

          queryHelpers.guardianAudioStatus.singleCoverage(guardianId, 3).then(function(coverage_3hours){
            queryHelpers.guardianAudioStatus.singleCoverage(guardianId, 6).then(function(coverage_6hours){
              queryHelpers.guardianAudioStatus.singleCoverage(guardianId, 12).then(function(coverage_12hours){
                queryHelpers.guardianAudioStatus.singleCoverage(guardianId, 24).then(function(coverage_24hours){

                  resolve({
                    "3hrs": coverage_3hours, "6hrs": coverage_6hours, "12hrs": coverage_12hours, "24hrs": coverage_24hours
                  });

                });
              });
            });
          });

        } catch(err) {
            console.log(err);
            reject(new Error(err));
        }
    }.bind(this));
  },

  singleCoverage: function(guardianId, intervalInHours) {
    return new Promise(function(resolve, reject) {

        try {
            var dbWhere = { guardian_id: guardianId, measured_at: {} };
            dbWhere.measured_at["$lt"] = new Date();
            dbWhere.measured_at["$gt"] = new Date(new Date()).valueOf()-(parseInt(intervalInHours)*3600000);

            models.GuardianAudio
              .findOne({
                where: dbWhere,
                attributes: [
                    [ models.sequelize.fn("SUM", models.sequelize.col("duration")), "duration_sum" ]
                ]
              }).then(function(dbStatus){

                resolve(Math.round(10000*parseInt(dbStatus.dataValues.duration_sum)/(parseInt(intervalInHours)*3600000))/100);

              }).catch(function(err){
                console.log(err);
                reject(new Error(err));
              });

        } catch(err) {
            console.log(err);
            reject(new Error(err));
        }
    }.bind(this));
  }



};


