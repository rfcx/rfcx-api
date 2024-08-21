const { sequelize, Sequelize, options } = require('../../common/db')('noncore')
const { coreSequelize, coreOptions } = require('../../common/db')('noncore')

module.exports = { sequelize, Sequelize, options, coreSequelize, coreOptions }
