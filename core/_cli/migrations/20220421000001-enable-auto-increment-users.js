'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.sequelize.query('CREATE SEQUENCE users_id_seq;', { transaction })
      await queryInterface.sequelize.query("ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');", { transaction })
      await queryInterface.sequelize.query('ALTER SEQUENCE users_id_seq OWNED BY users.id;', { transaction })
      await queryInterface.sequelize.query("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users) + 1);", { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return true
  }
}
