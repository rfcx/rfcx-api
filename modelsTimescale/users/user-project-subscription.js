module.exports = function (sequelize, DataTypes) {
  const UserProjectSubscription = sequelize.define('UserProjectSubscription', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    project_id: {
      type: DataTypes.STRING(12),
      allowNull: false,
      primaryKey: true
    },
    subscription_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    }
  })
  UserProjectSubscription.associate = function (models) {
    UserProjectSubscription.belongsTo(models.User, { as: 'user', foreign_key: 'user_id' })
    UserProjectSubscription.belongsTo(models.Project, { as: 'project', foreign_key: 'project_id' })
  }
  UserProjectSubscription.attributes = {
    full: ['user_id', 'project_id', 'subscription_type_id'],
    lite: ['user_id', 'project_id', 'subscription_type_id']
  }
  return UserProjectSubscription
}
