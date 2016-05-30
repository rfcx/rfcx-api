'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {


    migration.addColumn(
      "GuardianAudio",
      "encode_duration",
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: true,
          min: 0
        }
      }
    );

  done();
    
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('GuardianAudio', 'encode_duration');

  done();

  }
};
