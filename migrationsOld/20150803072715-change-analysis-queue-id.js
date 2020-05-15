'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'GuardianAudio',
      'analysis_aws_queue_id',
      {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: false,
        validate: {
        }
      }
    );

    migration.removeColumn('GuardianAudio', 'analysis_sqs_msg_id');

    done();
    
  },

  down: function(migration, DataTypes, done) {

    migration.addColumn(
      'GuardianAudio',
      'analysis_sqs_msg_id',
      {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
        }
      }
    );

    migration.removeColumn('GuardianAudio', 'analysis_aws_queue_id');

    done();

  }
};


