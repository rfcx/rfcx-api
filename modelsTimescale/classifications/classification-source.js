module.exports = function (sequelize, DataTypes) {
  const ClassificationSource = sequelize.define('ClassificationSource', {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    timestamps: false
  })

  return ClassificationSource
}
