const { sequelize, Sequelize, options } = require('../../common/db')('noncore')
const coreDb = require('../../common/db')('core')

module.exports = { sequelize, Sequelize, options, coreSequelize: coreDb.sequelize, coreOptions: coreDb.options }
