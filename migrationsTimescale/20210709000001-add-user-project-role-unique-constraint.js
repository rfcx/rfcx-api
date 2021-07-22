'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return await queryInterface.sequelize.query(
      'ALTER TABLE user_project_roles ADD CONSTRAINT user_project_roles_unique UNIQUE (project_id, user_id, role_id);'
    )
  },
  down: async (queryInterface, Sequelize) => {
    return await queryInterface.sequelize.quert(
      'ALTER TABLE user_project_roles DROP CONSTRAINT user_project_roles_unique;'
    )
  }
}
