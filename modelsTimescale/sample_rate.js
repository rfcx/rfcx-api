module.exports = function (sequelize, DataTypes) {
  const SampleRate = sequelize.define("SampleRate", {
    value: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      validate: {
        isInt: true,
        min: {
          args: [ 1 ],
          msg: 'sample_rate should be greater than 0'
        },
      }
    },
  }, {
    timestamps: false,
  })
  SampleRate.attributes = {
    full: ['value'],
    lite: ['value'],
  }
  return SampleRate
};
