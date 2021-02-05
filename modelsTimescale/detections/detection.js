module.exports = (sequelize, DataTypes) => {
  const Detection = sequelize.define('Detection', {
    start: {
      // Hypertable key
      type: DataTypes.DATE(3)
    },
    end: {
      type: DataTypes.DATE(3)
    },
    stream_id: {
      type: DataTypes.STRING(12)
    },
    classifier_id: {
      type: DataTypes.INTEGER
    },
    classification_id: {
      type: DataTypes.INTEGER
    },
    confidence: {
      type: DataTypes.FLOAT
    }
  }, {
    timestamps: false
  })
  Detection.removeAttribute('id') // https://github.com/sequelize/sequelize/issues/1026#issuecomment-54877327
  Detection.associate = function (models) {
    Detection.belongsTo(models.Stream, { as: 'stream', foreignKey: 'stream_id' })
    Detection.belongsTo(models.Classification, { as: 'classification', foreignKey: 'classification_id' })
    Detection.belongsTo(models.Classifier, { as: 'classifier', foreignKey: 'classifier_id' })
  }
  Detection.attributes = {
    lite: ['stream_id', 'start', 'end', 'confidence'],
    full: ['stream_id', 'start', 'end', 'confidence']
  }
  return Detection
}
