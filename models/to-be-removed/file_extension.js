const includeBuilder = require('../../core/_utils/db/include-builder')

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
  FileExtension.include = includeBuilder(FileExtension, 'file_extension', FileExtension.attributes.lite)
  return FileExtension
}
