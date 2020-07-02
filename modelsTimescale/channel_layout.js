module.exports = (sequelize, DataTypes) => {
  const ChannelLayout = sequelize.define('ChannelLayout', {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  }, {
    timestamps: false,
  })
  ChannelLayout.associate = function (models) {
  }
  ChannelLayout.attributes = {
    lite: ['value']
  }
  return ChannelLayout
}
