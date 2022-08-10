'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addIndex('GuardianCheckIns', ['guid'])
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropIndex('GuardianCheckIns', 'guardian_check_ins_guid')
  }
}
