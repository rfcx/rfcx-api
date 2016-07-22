'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'GuardianAudioTags',
      'confidence',
      {
        type: DataTypes.FLOAT,
        defaultValue: 1.0,
        allowNull: false,
        validate: {
          isFloat: true,
          min: 0.0,
          max: 1.0
        }
      }
    );

    done();
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('GuardianAudioTags', 'confidence');

    done();
  }
};
