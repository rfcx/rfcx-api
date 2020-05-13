'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.removeColumn('GuardianMessages', 'received_at');

    migration.addColumn(
      'GuardianMessages',
      'received_at',
      {
        type: DataTypes.DATE,
        allowNull: true,
        validate: {
          isDate: true
        }
      }
    );

    migration.addColumn(
      'GuardianMessages',
      'sent_at',
      {
        type: DataTypes.DATE,
        allowNull: true,
        validate: {
          isDate: true
        }
      }
    );

    done();
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('GuardianMessages', 'sent_at');


    migration.removeColumn('GuardianMessages', 'received_at');
        migration.addColumn(
      'GuardianMessages',
      'received_at',
      {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        validate: {
          isDate: true
        }
      }
    );

    done();
  }
};
