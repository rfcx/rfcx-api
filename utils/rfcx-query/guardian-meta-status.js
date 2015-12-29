var util = require("util");
var Promise = require("bluebird");
var models  = require("../../models");

exports.guardianMetaStatus = {

  dataTransfer: function(guardianId, intervalInHours) {
    return new Promise(function(resolve, reject) {

        try {
            var dbWhere = { guardian_id: guardianId, ended_at: {} };
            dbWhere.ended_at["$lt"] = new Date();
            dbWhere.ended_at["$gt"] = new Date(new Date()).valueOf()-(parseInt(intervalInHours)*3600000);

            models.GuardianMetaDataTransfer
              .findOne({
                where: dbWhere,
                attributes: [
                    [ models.sequelize.fn("SUM", models.sequelize.col("bytes_sent")), "sum_bytes_sent" ],
                    [ models.sequelize.fn("SUM", models.sequelize.col("bytes_received")), "sum_bytes_received" ]
                ]
              }).then(function(dbStatus){
                console.log(dbStatus.dataValues);
                resolve({
                  bytes_sent: dbStatus.dataValues.sum_bytes_sent,
                  bytes_received: dbStatus.dataValues.sum_bytes_received
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


