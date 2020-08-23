'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    migration.addColumn(
      'GuardianAudio',
      'analysis_queued_at',
      {
        type: DataTypes.DATE,
        validate: {
          isDate: true
        }
      }
    )

    migration.removeColumn('GuardianAudio', 'analysis_aws_queue_id')

    done()
  },

  down: function (migration, DataTypes, done) {
    migration.removeColumn('GuardianAudio', 'analysis_queued_at')

    migration.addColumn(
      'GuardianAudio',
      'analysis_aws_queue_id',
      {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: false,
        allowNull: true,
        validate: {
        }
      }
    )

    done()
  }
}
