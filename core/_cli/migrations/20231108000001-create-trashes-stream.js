'use strict'
module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async transaction => {
      const [[user]] = await queryInterface.sequelize.query("insert into users (firstname, lastname, email, guid, created_at, updated_at) values ('Internal', 'Trashes', 'internal-trashes@rfcx.org', '837f4324-6f33-423f-8e97-2b40cfc83c82', NOW(), NOW()) returning id;", { transaction })
      return queryInterface.sequelize.query(`insert into streams (id, name, created_by_id, created_at, updated_at) values ('trashes00000', 'Trashes', ${user.id}, NOW(), NOW())`, { transaction })
    })
  },
  down: (queryInterface) => {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.sequelize.query("DELETE FROM streams WHERE id = 'trashes00000'", { transaction })
      await queryInterface.sequelize.query("DELETE FROM users WHERE email = 'internal-trashes@rfcx.org'", { transaction })
    })
  }
}
