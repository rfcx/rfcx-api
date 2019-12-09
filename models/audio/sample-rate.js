"use strict";

module.exports = function(sequelize, DataTypes) {
  var SampleRate = sequelize.define("SampleRate", {
    value: {
      type: DataTypes.INTEGER.UNSIGNED,
      validate: {
        isInt: true,
        min: {
          args: [ 1 ],
          msg: 'sample_rate should be equal to or greater than 1'
        },
      }
    }
  }, {
    classMethods: {
      indexes: [{
        unique: true,
        fields: ["value"]
      }]
    },
    tableName: "SampleRates"
  });

  return SampleRate;
};
