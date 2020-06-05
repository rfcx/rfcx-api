const models = require('../../modelsTimescale')

const timeBucketFunction = 'time_bucket'
const timeBucketAttribute = 'time_bucket'
const aggregatedValueAttribute = 'aggregated_value'
const timeAggregatedQueryAttributes = function (timeInterval, func, field, modelName, modelTimeField) {
  return [
    [models.Sequelize.fn(timeBucketFunction, timeInterval, models.Sequelize.col(modelTimeField)), timeBucketAttribute],
    [models.Sequelize.fn(func, models.Sequelize.col(modelName + '.' + field)), aggregatedValueAttribute],
    [models.Sequelize.fn('min', models.Sequelize.col(modelTimeField)), 'first_' + modelTimeField],
    [models.Sequelize.fn('max', models.Sequelize.col(modelTimeField)), 'last_' + modelTimeField]
  ]
}

module.exports = { timeBucketAttribute, aggregatedValueAttribute, timeAggregatedQueryAttributes }