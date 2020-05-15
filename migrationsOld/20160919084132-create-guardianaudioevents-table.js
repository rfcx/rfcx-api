'use strict';

module.exports = {
  up: function (migration, DataTypes, done) {

    migration.createTable('GuardianAudioEventTypes', {

      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },

      value: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      }

    });

    migration.createTable('GuardianAudioEventValues', {

      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },

      value: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      }

    });

    migration.createTable('GuardianAudioEvents', {

      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      guid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true
      },
      audio_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'Audio',
          key: 'audio_id'
        }
      },
      confidence: {
        type: DataTypes.FLOAT,
        defaultValue: 1.0,
        allowNull: false,
        validate: {
          isFloat: true,
          min: 0.0,
          max: 1.0
        }
      },
      type: {
        type: DataTypes.INTEGER,
        references: {
          model: 'GuardianAudioEventType',
          key: 'id'
        }
      },
      value: {
        type: DataTypes.INTEGER,
        references: {
          model: 'GuardianAudioEventValue',
          key: 'id'
        }
      },
      windows: {
        type: DataTypes.INTEGER,
        allowNull: false
      }

    });

    done();
  },

  down: function (migration, DataTypes, done) {

    migration.dropTable('GuardianAudioEventTypes');
    migration.dropTable('GuardianAudioEventValues');
    migration.dropTable('GuardianAudioEvents');

    done();
  }
};
