
function defineRelationships (models) {
  models.Annotation.belongsTo(models.Classification, { as: 'classification', foreignKey: 'classification_id' });

  models.Classification.belongsTo(models.ClassificationType, { as: 'Type', foreignKey: "type" });
  models.Classification.belongsTo(models.ClassificationSource, { as: 'Source', foreignKey: "source" });
  models.Classification.belongsTo(models.Classification, { as: 'Parent', foreignKey: "parent" });
  models.Classification.hasMany(models.SpeciesName, { as: "Name", foreignKey: "species" });

  models.SpeciesName.belongsTo(models.Language, { as: 'Language', foreignKey: "language" });
  models.SpeciesName.belongsTo(models.Classification, { as: 'Species', foreignKey: 'species' });
}

module.exports = defineRelationships
