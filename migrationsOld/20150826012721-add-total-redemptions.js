'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    migration.addColumn(
      'RegistrationTokens',
      'total_redemptions',
      {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          isInt: true,
          min: 0
        }
      }
    )

    done()
  },

  down: function (migration, DataTypes, done) {
    migration.removeColumn('RegistrationTokens', 'total_redemptions')

    done()
  }
}
