var util = require("util");
var Promise = require("bluebird");
var models  = require("../../../models");
function getAllQueryHelpers() { return require("../../../utils/rfcx-query"); }

exports.guardianStatusCheckIns = {

  checkInSummary: function(guardianId, intervalInHours, realTimeOffsetInMinutes) {
    return new Promise(function(resolve, reject) {

        try {
            var dbWhere = { guardian_id: guardianId/*, measured_at: {}*/ };
       //     dbWhere.measured_at["$lt"] = new Date((new Date()).valueOf()-(parseInt(realTimeOffsetInMinutes)*60000));
       //     dbWhere.measured_at["$gt"] = new Date((new Date()).valueOf()-(parseInt(intervalInHours)*3600000)-(parseInt(realTimeOffsetInMinutes)*60000));

            // var dbWhereUpdater = dbWhere;
            // var dbWhereInstaller = dbWhere;
            // dbWhereUpdater.role_id = 181;
            // dbWhereInstaller.role_id = 180;

            models.GuardianCheckIn
              .findOne({
                where: { guardian_id: guardianId },
                attributes: [
                    [ models.sequelize.fn("COUNT", models.sequelize.col("id")), "checkin_count" ],
                    [ models.sequelize.fn("MAX", models.sequelize.col("updated_at")), "checkin_latest" ]
                ]
              }).then(function(dbCheckInStatus){



                models.GuardianMetaUpdateCheckIn
                  .findOne({
                    where: { guardian_id: guardianId, role_id: 181 },
                    attributes: [
                        [ models.sequelize.fn("COUNT", models.sequelize.col("id")), "checkin_count" ],
                        [ models.sequelize.fn("MAX", models.sequelize.col("updated_at")), "checkin_latest" ]
                    ]
                  }).then(function(dbUpdaterCheckInStatus){

                    models.GuardianMetaUpdateCheckIn
                      .findOne({
                        where: { guardian_id: guardianId, role_id: 180 },
                        attributes: [
                            [ models.sequelize.fn("COUNT", models.sequelize.col("id")), "checkin_count" ],
                            [ models.sequelize.fn("MAX", models.sequelize.col("updated_at")), "checkin_latest" ]
                        ]
                      }).then(function(dbInstallerCheckInStatus){
                      
                        resolve({
                          checkins: {
                            guardian: {
                              count: dbCheckInStatus.dataValues.checkin_count,
                              last_checkin_at: dbCheckInStatus.dataValues.checkin_latest
                            },
                            updater: {
                              count: dbUpdaterCheckInStatus.dataValues.checkin_count,
                              last_checkin_at: dbUpdaterCheckInStatus.dataValues.checkin_latest
                            },
                            installer: {
                              count: dbInstallerCheckInStatus.dataValues.checkin_count,
                              last_checkin_at: dbInstallerCheckInStatus.dataValues.checkin_latest
                            }
                          }
                        });

                    }).catch(function(err){
                      console.log(err);
                      reject(new Error(err));
                    });

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


