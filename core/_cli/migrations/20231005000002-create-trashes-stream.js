'use strict'

// const { create } = require('../../streams/dao/index')

module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async transaction => {
      const userId = await queryInterface.sequelize.query('insert into users (firstname, lastname, email) values ("Internal", "Trashes", "internal-trashes@rfcx.org") returning id;', { transaction })
      return queryInterface.sequelize.query(`insert into streams (id, name, created_by_id) values ('trashes00000', 'Trashes', ${userId})`, { transaction })
    })
  },
  down: (queryInterface) => {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.sequelize.query('DELETE FROM streams WHERE id = "trashes00000"', { transaction })
      await queryInterface.sequelize.query('DELETE FROM users WHERE email = "internal-trashes@rfcx.org"', { transaction })
    })
  }
}
