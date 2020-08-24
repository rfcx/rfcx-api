const models = require('../../modelsTimescale')

const timeBucketFunction = 'time_bucket'
const timeAggregatedQueryAttributes = function (timeInterval, func, field, modelName, modelTimeField, timeBucketAttribute = 'time_bucket', aggregatedValueAttribute = 'aggregated_value', includeFirstLast = true) {
  const defaultCols = [
    [models.Sequelize.fn(timeBucketFunction, timeInterval, models.Sequelize.col(modelTimeField)), timeBucketAttribute],
    [models.Sequelize.fn(func, models.Sequelize.col(modelName + '.' + field)), aggregatedValueAttribute]
  ]
  const firstLastCols = [
    [models.Sequelize.fn('min', models.Sequelize.col(modelTimeField)), 'first_' + modelTimeField],
    [models.Sequelize.fn('max', models.Sequelize.col(modelTimeField)), 'last_' + modelTimeField]
  ]
  return includeFirstLast ? defaultCols.concat(firstLastCols) : defaultCols
}

module.exports = { timeAggregatedQueryAttributes }
