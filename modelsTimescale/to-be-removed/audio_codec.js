module.exports = (sequelize, DataTypes) => {
  const AudioCodec = sequelize.define('AudioCodec', {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    timestamps: false
  })
  AudioCodec.associate = function (models) {
  }
  AudioCodec.attributes = {
    lite: ['value']
  }
  return AudioCodec
}
