module.exports = (sequelize, DataTypes) => {
  const Codec = sequelize.define('Codec', {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  }, {
    timestamps: false,
  })
  Codec.associate = function (models) {
  }
  Codec.attributes = {
    lite: ['value']
  }
  return Codec
}
