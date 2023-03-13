const coreModels = require('../core/_models')
const { migrate, seed, truncate, muteConsole } = require('../common/testing/sequelize')

module.exports = async () => {
  await migrate(coreModels.sequelize, coreModels.Sequelize)
  await truncate(coreModels)
  await seed(coreModels)
}
