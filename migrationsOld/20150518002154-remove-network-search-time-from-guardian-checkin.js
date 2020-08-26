'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    migration.removeColumn('GuardianCheckIns', 'network_search_time')

    done()
  },

  down: function (migration, DataTypes, done) {
    migration.addColumn(
      'GuardianCheckIns',
      'network_search_time',
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: true,
          min: 0
        }
      }
    )

    done()
  }
}
