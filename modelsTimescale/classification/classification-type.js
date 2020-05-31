module.exports = function (sequelize, DataTypes) {
  const ClassificationType = sequelize.define("ClassificationType", {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    timestamps: false
  })
  ClassificationType.attributes = {
    lite: ['value']
  }
  return ClassificationType
}
