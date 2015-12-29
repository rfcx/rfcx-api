var util = require("util");
var Promise = require("bluebird");
var models  = require("../../models");
function getAllQueryHelpers() { return require("../../utils/rfcx-query"); }

exports.guardianMetaStatus = {

  allTotalDataTransfer: function(guardianId, realTimeOffsetInMinutes) {
    return new Promise(function(resolve, reject) {

        try {

          var queryHelpers = getAllQueryHelpers();

          queryHelpers.guardianMetaStatus.singleTotalDataTransfer(guardianId, 3, realTimeOffsetInMinutes).then(function(data_3hours){
            queryHelpers.guardianMetaStatus.singleTotalDataTransfer(guardianId, 6, realTimeOffsetInMinutes).then(function(data_6hours){
              queryHelpers.guardianMetaStatus.singleTotalDataTransfer(guardianId, 12, realTimeOffsetInMinutes).then(function(data_12hours){
                queryHelpers.guardianMetaStatus.singleTotalDataTransfer(guardianId, 24, realTimeOffsetInMinutes).then(function(data_24hours){

                  resolve({
                    "3hrs": data_3hours, "6hrs": data_6hours, "12hrs": data_12hours, "24hrs": data_24hours
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

  singleTotalDataTransfer: function(guardianId, intervalInHours, realTimeOffsetInMinutes) {
    return new Promise(function(resolve, reject) {

        try {
            var dbWhere = { guardian_id: guardianId, ended_at: {} };
            dbWhere.ended_at["$lt"] = new Date((new Date()).valueOf()-(parseInt(realTimeOffsetInMinutes)*60000));
            dbWhere.ended_at["$gt"] = new Date((new Date()).valueOf()-(parseInt(intervalInHours)*3600000)-(parseInt(realTimeOffsetInMinutes)*60000));

            models.GuardianMetaDataTransfer
              .findOne({
                where: dbWhere,
                attributes: [
                    [ models.sequelize.fn("SUM", models.sequelize.col("bytes_sent")), "sum_bytes_sent" ],
                    [ models.sequelize.fn("SUM", models.sequelize.col("bytes_received")), "sum_bytes_received" ]
                ]
              }).then(function(dbStatus){
                resolve({
                  bytes_sent: parseInt(dbStatus.dataValues.sum_bytes_sent),
                  bytes_received: parseInt(dbStatus.dataValues.sum_bytes_received)
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


