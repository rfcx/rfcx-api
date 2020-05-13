"use strict";

module.exports = {
  up: function(migration, DataTypes, done) {
    migration.renameColumn('GuardianAudio','ingestion_sqs_msg_id','analysis_sqs_msg_id');
    done();
  },

  down: function(migration, DataTypes, done) {
    migration.renameColumn('GuardianAudio','analysis_sqs_msg_id','ingestion_sqs_msg_id');
    done();
  }
};
