'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    migration.addColumn(
      'GuardianCheckIns',
      'software_versions',
      {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
        }
      }
    )

    migration.removeColumn('GuardianCheckIns', 'version_id')

    done()
  },

  down: function (migration, DataTypes, done) {
    migration.removeColumn('GuardianCheckIns', 'software_versions')

    done()
  }
}
