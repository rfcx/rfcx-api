'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    migration.removeColumn('GuardianAudioFormats', 'container')

    done()
  },

  down: function (migration, DataTypes, done) {
    migration.addColumn(
      'GuardianAudioFormats',
      'container',
      {
        type: DataTypes.STRING,
        allowNull: false,
        unique: false,
        validate: {
        }
      }
    )

    done()
  }
}
