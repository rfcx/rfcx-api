"use strict";
module.exports = {
  up: function(migration, DataTypes, done) {
    migration.createTable("Users", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
        }
      },
      guid: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
        }
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
        }
      },
      lastCheckIn: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        validate: {
          isDate: true
        }
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
      }
    }).done(done);
  },
  down: function(migration, DataTypes, done) {
    migration.dropTable("Users").done(done);
  }
};