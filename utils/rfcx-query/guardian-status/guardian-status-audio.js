var util = require("util");
var Promise = require("bluebird");
var models  = require("../../../models");
function getAllQueryHelpers() { return require("../../../utils/rfcx-query"); }

exports.guardianStatusAudio = {

  allCoverage: function(guardianId, realTimeOffsetInMinutes) {
    return new Promise(function(resolve, reject) {

        try {

          var queryHelpers = getAllQueryHelpers();

          return queryHelpers.guardianStatusAudio.singleCoverage(guardianId, 3, realTimeOffsetInMinutes).then(function(coverage_3hours){
            return queryHelpers.guardianStatusAudio.singleCoverage(guardianId, 6, realTimeOffsetInMinutes).then(function(coverage_6hours){
              return queryHelpers.guardianStatusAudio.singleCoverage(guardianId, 12, realTimeOffsetInMinutes).then(function(coverage_12hours){
                return queryHelpers.guardianStatusAudio.singleCoverage(guardianId, 24, realTimeOffsetInMinutes).then(function(coverage_24hours){

                  resolve({
                    "3hrs": coverage_3hours, "6hrs": coverage_6hours, "12hrs": coverage_12hours, "24hrs": coverage_24hours
                  });

                  return null;

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

  singleCoverage: function(guardianId, intervalInHours, realTimeOffsetInMinutes) {
    return new Promise(function(resolve, reject) {

        try {
            var dbWhere = { guardian_id: guardianId, measured_at: {} };
            dbWhere.measured_at["$lt"] = new Date((new Date()).valueOf()-(parseInt(realTimeOffsetInMinutes)*60000));
            dbWhere.measured_at["$gt"] = new Date((new Date()).valueOf()-(parseInt(intervalInHours)*3600000)-(parseInt(realTimeOffsetInMinutes)*60000));

            models.GuardianAudio
              .findOne({
                where: dbWhere,
                attributes: [
                    [ models.sequelize.fn("SUM", models.sequelize.col("capture_sample_count")), "sample_count_sum" ]
                ]
              }).then(function(dbStatus){

                  return models.GuardianAudio
                    .findOne({ 
                      where: dbWhere, 
                      include: [{ all: true }]
                    }).then(function(dbAudio){

                      resolve(Math.round(10000*parseInt(1000*dbStatus.dataValues.sample_count_sum/dbAudio.Format.sample_rate)/(parseInt(intervalInHours)*3600000))/100);

                      return null;

                    }).catch(function(err){
                      console.log(err);
                      reject(new Error(err));
                    });       
                               
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


