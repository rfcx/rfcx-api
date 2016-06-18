'use strict';

// Creates a repository of reports for incidents 
// like 'heard a chainsaw' or 'poacher sighting'
module.exports = function(sequelize, DataTypes) {
    var Classifications = sequelize.define('Classifications', {
        id: {
            type:DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey:true
        },
        start: { type: DataTypes.FLOAT, unsigned: true },
        end: { type: DataTypes.FLOAT, unsigned: true },
        value: DataTypes.INTEGER
    }, {
        classMethods: {
            associate: function(models) {
                Classifications.belongsTo(models.ClassificationTypes,{ foreignKey:'classification_type'});
                Classifications.belongsTo(models.User, {foreignKey: 'analyst'});
            }
        }
    });
    return Classifications;
};