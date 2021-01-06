module.exports = function (sequelize, DataTypes) {
  const SubscriptionType = sequelize.define('SubscriptionType', {
    name: {
      type: DataTypes.STRING,
      unique: true
    },
    description: {
      type: DataTypes.STRING
    }
  })
  SubscriptionType.attributes = {
    full: ['id', 'name', 'description'],
    lite: ['id', 'name']
  }
  return SubscriptionType
}
