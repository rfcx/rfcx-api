const includeBuilder = require('../../_utils/db/include-builder')

module.exports = function (sequelize, DataTypes) {
  const Classification = sequelize.define('Classification', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false
    },
    typeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    source_external_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    frequency_min: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    frequency_max: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  })
  Classification.associate = function (models) {
    Classification.belongsTo(models.ClassificationType, { as: 'type', foreignKey: 'type_id' })
    Classification.belongsTo(models.ClassificationSource, { as: 'source', foreignKey: 'source_id' })
    Classification.belongsTo(models.Classification, { as: 'parent', foreignKey: 'parent_id' })
    Classification.hasMany(models.ClassificationAlternativeName, { as: 'alternative_names', foreignKey: 'classification_id' })
    Classification.hasMany(models.Classification, { as: 'children', foreignKey: 'parent_id' })
    Classification.belongsToMany(models.Annotation, { as: 'reference_annotations', through: 'classification_references', timestamps: false })
  }
  Classification.attributes = {
    full: ['id', 'value', 'title', 'image', 'description', 'frequency_min', 'frequency_max'],
    lite: ['value', 'title', 'image']
  }
  Classification.include = includeBuilder(Classification, 'classification', Classification.attributes.lite)
  return Classification
}
