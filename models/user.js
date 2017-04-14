"use strict";

module.exports = function(sequelize, DataTypes) {
  var User = sequelize.define("User", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
      }
    },
    firstname: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    lastname: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    is_email_validated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      validate: {
      }
    },
    last_login_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true
      }
    },
    auth_password_salt: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
      }
    },
    auth_password_hash: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
      }
    },
    auth_password_updated_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        User.hasMany(models.UserToken, {as: "Token", foreignKey: "user_id"});
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "Users"
  });

  return User;
};

