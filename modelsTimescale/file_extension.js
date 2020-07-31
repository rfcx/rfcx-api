module.exports = (sequelize, DataTypes) => {
  const FileExtension = sequelize.define('FileExtension', {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    timestamps: false
  })
  FileExtension.associate = function (models) {
  }
  FileExtension.attributes = {
    lite: ['value']
  }
  return FileExtension
}
