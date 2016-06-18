'use strict';

// Available Classification Types 
// Each 
module.exports = function(sequelize, DataTypes) {
    var ClassificationTypes = sequelize.define('ClassificationTypes', {
        id: {
            type:DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey:true
        },
        name: DataTypes.STRING
    });
    return ClassificationTypes;
};