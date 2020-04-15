"use strict";

module.exports = function(sequelize, DataTypes) {
  var Classification = sequelize.define("Classification", {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reference_audio: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reference_spectrogram: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    source_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    classMethods: {
      associate: function(models) {
        Classification.belongsTo(models.ClassificationType, { as: 'Type', foreignKey: "type" });
        Classification.belongsTo(models.ClassificationSource, { as: 'Source', foreignKey: "source" });
        Classification.belongsTo(models.Classification, { as: 'Parent', foreignKey: "parent" });
        Classification.belongsToMany(models.SpeciesName, { through: models.ClassificationSpeciesNameRelation });
      },
      indexes: [
      ]
    },
    tableName: "Classifications"
  });

  return Classification;
};
