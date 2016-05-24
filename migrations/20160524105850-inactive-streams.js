'use strict';

module.exports = {
  up: function (migration, DataTypes, done) {

    migration.addColumn(
      "GuardianAudioHighlights",
      "is_active",
      {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        validate: {}
      }
    );

    done();

  },

  down: function (migration, DataTypes, done) {

    migration.removeColumn('GuardianAudioHighlights', 'is_active');

    done();

  }

};
