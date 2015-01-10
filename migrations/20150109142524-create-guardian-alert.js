"use strict";
module.exports = {
  up: function(migration, DataTypes, done) {
    migration.createTable("GuardianAlerts", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      service_key: {
        type: DataTypes.STRING
      },
      incident_key: {
        type: DataTypes.STRING
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
    migration.dropTable("GuardianAlerts").done(done);
  }
};