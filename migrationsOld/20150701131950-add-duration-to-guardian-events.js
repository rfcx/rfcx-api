'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    migration.addColumn(
      'GuardianEvents',
      'duration',
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: true,
          min: 1
        }
      }
    )

    done()
  },

  down: function (migration, DataTypes, done) {
    migration.removeColumn('GuardianEvents', 'duration')

    done()
  }
}
