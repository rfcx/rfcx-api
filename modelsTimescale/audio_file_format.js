module.exports = (sequelize, DataTypes) => {
  const AudioFileFormat = sequelize.define('AudioFileFormat', {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  }, {
    timestamps: false,
  })
  AudioFileFormat.associate = function (models) {
  }
  AudioFileFormat.attributes = {
    lite: ['value']
  }
  return AudioFileFormat
}
