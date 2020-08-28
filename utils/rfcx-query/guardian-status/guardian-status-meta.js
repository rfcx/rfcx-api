var Promise = require('bluebird')
var models = require('../../../models')
function getAllQueryHelpers () { return require('../../../utils/rfcx-query') }

exports.guardianStatusMeta = {

  allTotalDataTransfer: function (guardianId, realTimeOffsetInMinutes) {
    return new Promise(function (resolve, reject) {
      try {
        var queryHelpers = getAllQueryHelpers()

        queryHelpers.guardianStatusMeta.singleTotalDataTransfer(guardianId, 3, realTimeOffsetInMinutes).then(function (data3hours) {
          queryHelpers.guardianStatusMeta.singleTotalDataTransfer(guardianId, 6, realTimeOffsetInMinutes).then(function (data6hours) {
            queryHelpers.guardianStatusMeta.singleTotalDataTransfer(guardianId, 12, realTimeOffsetInMinutes).then(function (data12hours) {
              queryHelpers.guardianStatusMeta.singleTotalDataTransfer(guardianId, 24, realTimeOffsetInMinutes).then(function (data24hours) {
                resolve({
                  '3hrs': data3hours, '6hrs': data6hours, '12hrs': data12hours, '24hrs': data24hours
                })
              })
            })
          })
        })
      } catch (err) {
        console.log(err)
        reject(new Error(err))
      }
    })
  },

  singleTotalDataTransfer: function (guardianId, intervalInHours, realTimeOffsetInMinutes) {
    return new Promise(function (resolve, reject) {
      try {
        var dbWhere = { guardian_id: guardianId, ended_at: {} }
        dbWhere.ended_at[models.Sequelize.Op.lt] = new Date((new Date()).valueOf() - (parseInt(realTimeOffsetInMinutes) * 60000))
        dbWhere.ended_at[models.Sequelize.Op.gt] = new Date((new Date()).valueOf() - (parseInt(intervalInHours) * 3600000) - (parseInt(realTimeOffsetInMinutes) * 60000))

        models.GuardianMetaDataTransfer
          .findOne({
            where: dbWhere,
            attributes: [
              [models.sequelize.fn('SUM', models.sequelize.col('bytes_sent')), 'sum_bytes_sent'],
              [models.sequelize.fn('SUM', models.sequelize.col('bytes_received')), 'sum_bytes_received']
            ]
          }).then(function (dbStatus) {
            resolve({
              bytes_sent: parseInt(dbStatus.dataValues.sum_bytes_sent),
              bytes_received: parseInt(dbStatus.dataValues.sum_bytes_received)
            })
          }).catch(function (err) {
            console.log(err)
            reject(new Error(err))
          })
      } catch (err) {
        console.log(err)
        reject(new Error(err))
      }
    })
  }

}
