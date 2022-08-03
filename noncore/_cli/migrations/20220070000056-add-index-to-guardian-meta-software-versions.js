'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addIndex('GuardianMetaSoftwareVersions', ['software_id', 'last_checkin_at'])
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropIndex('GuardianMetaSoftwareVersions', 'guardian_meta_software_versions_software_id_last_checkin_at')
  }
}
