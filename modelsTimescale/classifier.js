module.exports = (sequelize, DataTypes) => {
  const Classifier = sequelize.define('Classifier', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    min_confidence: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        isFloat: true,
        min: {
          args: [ 0 ],
          msg: 'min_windows_count should be equal to or greater than 0'
        }
      }
    },
    min_windows_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isFloat: true,
        min: {
          args: [ 1 ],
          msg: 'min_windows_count should be equal to or greater than 1'
        }
      }
    },
  })
  Classifier.associate = function (models) {
  }
  Classifier.attributes = {
    full: ['uuid', 'name', 'version', 'min_confidence', 'min_windows_count'],
    lite: ['uuid', 'name', 'version']
  }
  return Classifier
}
