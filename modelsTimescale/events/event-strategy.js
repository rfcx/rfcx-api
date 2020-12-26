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
    function_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    function_parameters: {
      type: DataTypes.STRING
    }
  })
  EventStrategy.associate = function (models) {
  }
  EventStrategy.attributes = {
    full: ['name', 'function_name', 'function_parameters'],
    lite: ['name']
  }
  return EventStrategy
}
