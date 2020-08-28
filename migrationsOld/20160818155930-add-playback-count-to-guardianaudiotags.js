'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    migration.addColumn(
      'GuardianAudioTags',
      'playback_count',
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
    migration.removeColumn('GuardianAudioTags', 'playback_count')

    done()
  }
}
