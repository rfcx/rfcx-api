'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    migration.addColumn(
      'GuardianEvents',
      'fingerprint',
      {
        type: DataTypes.TEXT,
        allowNull: true,
        unique: false,
        validate: {
        }
      }
    )

    migration.removeColumn('GuardianEvents', 'harmonic_intervals')

    done()
  },

  down: function (migration, DataTypes, done) {
    migration.removeColumn('GuardianEvents', 'fingerprint')

    migration.addColumn(
      'GuardianEvents',
      'harmonic_intervals',
      {
        type: DataTypes.STRING,
        allowNull: true,
        unique: false,
        validate: {
        }
      }
    )

    done()
  }
}
