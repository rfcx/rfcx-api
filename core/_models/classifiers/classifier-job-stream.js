module.exports = (sequelize, DataTypes) => {
  const ClassifierJobStream = sequelize.define('ClassifierJobStream', {
    classifierJobId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    streamId: {
      type: DataTypes.STRING(12),
      allowNull: false,
      primaryKey: true
    }
  }, {
    underscored: true,
    timestamps: false
  })
  return ClassifierJobStream
}
