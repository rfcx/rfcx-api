'use strict'

module.exports = function (sequelize, DataTypes) {
  const User = sequelize.define('User', {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    firstname: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
    },
    lastname: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    subscription_email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
        isEmail: true
      }
    },
    is_email_validated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    last_login_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: { msg: 'last_login_at for Users should have type Date' }
      }
    },
    auth_password_salt: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    auth_password_hash: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    auth_password_updated_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: { msg: 'auth_password_updated_at for Users should have type Date' }
      }
    },
    rfcx_system: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    picture: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_super: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'Users'
  })
  User.associate = function (models) {
    User.hasMany(models.UserToken, { as: 'Token', foreignKey: 'user_id' })
    User.belongsTo(models.GuardianSite, { as: 'DefaultSite', foreignKey: 'default_site' })
  }
  return User
}
