'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    migration.removeColumn('GuardianEvents', 'measured_at')

    migration.removeColumn('GuardianEvents', 'duration')

    migration.removeColumn('GuardianEvents', 'classification')

    done()
  },

  down: function (migration, DataTypes, done) {
    migration.addColumn(
      'GuardianEvents',
      'measured_at',
      {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: true,
        validate: {
          isDate: true
        }
      }
    )

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

    migration.addColumn(
      'GuardianEvents',
      'classification',
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
