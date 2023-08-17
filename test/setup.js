const coreModels = require('../core/_models')
const noncoreModels = require('../noncore/_models')
const { migrate, seed, truncate } = require('../common/testing/sequelize')

module.exports = async () => {
  await migrate(coreModels.sequelize, coreModels.Sequelize)
  await migrate(noncoreModels.sequelize, noncoreModels.Sequelize)
  await truncate(coreModels)
  await truncate(noncoreModels)
  await seed(coreModels)
}
