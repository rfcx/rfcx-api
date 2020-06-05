module.exports = function (sequelize, DataTypes) {
  var Language = sequelize.define("Language", {
    id: {
      primaryKey: true,
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    timestamps: false
  })
  return Language
}
