module.exports = function (sequelize, DataTypes) {
  const Organization = sequelize.define('Organization', {
    name: {
      type: DataTypes.STRING,
      unique: true
    }
  })
  Organization.attributes = {
    full: ['name'],
    lite: ['name']
  }
  return Organization
}
