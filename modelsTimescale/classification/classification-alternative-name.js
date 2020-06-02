module.exports = function (sequelize, DataTypes) {
  const ClassificationAlternativeName = sequelize.define("ClassificationAlternativeName", {
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
    timestamps: false
  })
  ClassificationAlternativeName.associate = function (models) {
    ClassificationAlternativeName.belongsTo(models.Language, { as: 'language', foreignKey: "language_id" })
    ClassificationAlternativeName.belongsTo(models.Classification, { as: 'classification', foreignKey: 'classification_id' })
  }
  ClassificationAlternativeName.attributes = {
    lite: ['name', 'language_id']
  }
  return ClassificationAlternativeName
}
