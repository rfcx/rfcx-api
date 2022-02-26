const models = require('../../../_models')
function getAllQueryHelpers () { return require('..') }

exports.guardianStatusAudio = {

  allCoverage: function (guardianId, realTimeOffsetInMinutes) {
    const queryHelpers = getAllQueryHelpers()

    return queryHelpers.guardianStatusAudio.singleCoverage(guardianId, 3, realTimeOffsetInMinutes).then(function (coverage3hours) {
      return queryHelpers.guardianStatusAudio.singleCoverage(guardianId, 6, realTimeOffsetInMinutes).then(function (coverage6hours) {
        return queryHelpers.guardianStatusAudio.singleCoverage(guardianId, 12, realTimeOffsetInMinutes).then(function (coverage12hours) {
          return queryHelpers.guardianStatusAudio.singleCoverage(guardianId, 24, realTimeOffsetInMinutes).then(function (coverage24hours) {
            return {
              '3hrs': coverage3hours, '6hrs': coverage6hours, '12hrs': coverage12hours, '24hrs': coverage24hours
            }
          })
        })
      })
    })
  },

  singleCoverage: function (guardianId, intervalInHours, realTimeOffsetInMinutes) {
    const dbWhere = { guardian_id: guardianId, measured_at: {} }
    dbWhere.measured_at[models.Sequelize.Op.lt] = new Date((new Date()).valueOf() - (parseInt(realTimeOffsetInMinutes) * 60000))
    dbWhere.measured_at[models.Sequelize.Op.gt] = new Date((new Date()).valueOf() - (parseInt(intervalInHours) * 3600000) - (parseInt(realTimeOffsetInMinutes) * 60000))

    return models.GuardianAudio.findOne({
      where: dbWhere,
      attributes: [
        [models.sequelize.fn('SUM', models.sequelize.col('capture_sample_count')), 'sample_count_sum']
      ]
    }).then(function (dbStatus) {
      return models.GuardianAudio.findOne({
        where: dbWhere,
        include: [
          {
            model: models.GuardianAudioFormat,
            as: 'Format',
            attributes: ['sample_rate']
          }
        ]
      }).then(function (dbAudio) {
        if (!dbAudio) {
          return null
        }
        return Math.round(10000 * parseInt(1000 * dbStatus.dataValues.sample_count_sum / dbAudio.Format.sample_rate) / (parseInt(intervalInHours) * 3600000)) / 100
      })
    })
  }

}
