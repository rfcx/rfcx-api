'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    migration.addColumn(
      'GuardianSoftware',
      'role',
      {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: [['installer', 'updater', 'system', 'audio', 'admin', 'api', 'carrier', 'hardware', 'xguardian']]
        }
      }
    )

    migration.removeColumn('GuardianSoftware', 'package')

    done()
  },

  down: function (migration, DataTypes, done) {
    migration.removeColumn('GuardianSoftware', 'role')

    migration.addColumn(
      'GuardianSoftware',
      'package',
      {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
        }
      }
    )

    done()
  }
}
