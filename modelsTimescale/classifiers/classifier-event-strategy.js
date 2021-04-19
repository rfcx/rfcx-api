const includeBuilder = require('../../utils/sequelize/include-builder')

module.exports = (sequelize, DataTypes) => {
  const ClassifierEventStrategy = sequelize.define('ClassifierEventStrategy', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    classifierId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    eventStrategyId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    parameters: {
      type: DataTypes.STRING
    },
    lastExecutedAt: {
      type: DataTypes.DATE(3)
    }
  }, {
    underscored: true,
    timestamps: false
  })
  ClassifierEventStrategy.associate = function (models) {
    ClassifierEventStrategy.belongsTo(models.Classifier, { as: 'classifier', foreignKey: 'classifier_id' })
    ClassifierEventStrategy.belongsTo(models.EventStrategy, { as: 'event_strategy', foreignKey: 'event_strategy_id' })
  }
  ClassifierEventStrategy.attributes = {
    full: ['event_strategy_id', 'active', 'parameters', 'last_executed_at'],
    lite: ['event_strategy_id', 'active']
  }
  ClassifierEventStrategy.include = includeBuilder(ClassifierEventStrategy, 'classifier_event_strategy', ClassifierEventStrategy.attributes.lite)
  return ClassifierEventStrategy
}
