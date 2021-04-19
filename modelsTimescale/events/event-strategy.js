const includeBuilder = require('../../utils/sequelize/include-builder')

module.exports = (sequelize, DataTypes) => {
  const EventStrategy = sequelize.define('EventStrategy', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    functionName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    functionParameters: {
      type: DataTypes.STRING
    }
  }, {
    underscored: true,
    timestamps: false
  })
  EventStrategy.associate = function (models) {
    EventStrategy.belongsToMany(models.Classifier, { as: 'classifiers', through: 'classifier_event_strategies', timestamps: false })
  }
  EventStrategy.attributes = {
    full: ['id', 'name', 'function_name', 'function_parameters'],
    lite: ['id', 'name']
  }
  EventStrategy.include = includeBuilder(EventStrategy, 'event_strategy', EventStrategy.attributes.lite)
  return EventStrategy
}
