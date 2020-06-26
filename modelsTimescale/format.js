module.exports = (sequelize, DataTypes) => {
  const Format = sequelize.define('Format', {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  }, {
    timestamps: false,
  })
  Format.associate = function (models) {
  }
  Format.attributes = {
    lite: ['value']
  }
  return Format
}
