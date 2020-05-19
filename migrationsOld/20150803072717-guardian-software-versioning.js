'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'GuardianSoftware',
      'is_updatable',
      {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        validate: {
        }
      }
    );

    migration.removeColumn('GuardianSoftware', 'number');
    migration.removeColumn('GuardianSoftware', 'sha1_checksum');
    migration.removeColumn('GuardianSoftware', 'url');
    migration.removeColumn('GuardianSoftware', 'release_date');

    done();
    
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('GuardianAudio', 'analysis_aws_queue_id');

    done();

  }
};


