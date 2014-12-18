"use strict";

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'GuardianAudio',
      'sqs_ingestion_request_id',
      {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
      }
    );

    done();
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('GuardianAudio', 'sqs_ingestion_request_id');

    done();
  }
};

