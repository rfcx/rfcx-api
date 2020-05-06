"use strict";

module.exports = function(sequelize, DataTypes) {
  var SpeciesName = sequelize.define("SpeciesName", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    rank: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    }
  }, {
    classMethods: {
      associate: function(models) {
        SpeciesName.belongsTo(models.Language, { as: 'Language', foreignKey: "language" });
        SpeciesName.belongsTo(models.Classification, { as: 'Species', foreignKey: 'species' });
      },
      indexes: [
        { unique: true, fields: ["name"] }
      ]
    },
    tableName: "SpeciesNames"
  });

  return SpeciesName;
};
