'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    migration.renameTable('GuardianAlerts', 'GuardianEvents')
    migration.dropTable('GuardianAlerts')
    done()
  },

  down: function (migration, DataTypes, done) {
    migration.renameTable('GuardianEvents', 'GuardianAlerts')
    done()
  }
}
