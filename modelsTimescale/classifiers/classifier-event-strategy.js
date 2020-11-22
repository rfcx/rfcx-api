module.exports = (sequelize, DataTypes) => {
  const ClassifierEventStrategy = sequelize.define('ClassifierEventStrategy', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    classifier_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    event_strategy_id: {
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
    last_executed_at: {
      type: DataTypes.DATE(3)
    }
  })
  ClassifierEventStrategy.associate = function (models) {
    ClassifierEventStrategy.belongsTo(models.Classifier, { as: 'classifier', foreignKey: 'classifier_id' })
    ClassifierEventStrategy.belongsTo(models.EventStrategy, { as: 'event_strategy', foreignKey: 'event_strategy_id' })
  }
  ClassifierEventStrategy.attributes = {
    full: ['event_strategy_id', 'active', 'parameters', 'last_executed_at'],
    lite: ['event_strategy_id', 'active']
  }
  return ClassifierEventStrategy
}
