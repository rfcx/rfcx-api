'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    migration.addColumn(
      'GuardianAudioFormats',
      'target_bit_rate',
      {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: false,
        validate: {
          isInt: true,
          min: 0
        }
      }
    )

    done()
  },

  down: function (migration, DataTypes, done) {
    migration.removeColumn('GuardianAudioFormats', 'target_bit_rate')

    done()
  }
}
