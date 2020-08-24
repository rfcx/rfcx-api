'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    migration.addColumn(
      'GuardianAudio',
      'analysis_sqs_msg_id',
      {
        type: DataTypes.UUID,
        allowNull: true,
        unique: true
      }
    )

    done()
  },

  down: function (migration, DataTypes, done) {
    migration.removeColumn('GuardianAudio', 'analysis_sqs_msg_id')

    done()
  }
}
