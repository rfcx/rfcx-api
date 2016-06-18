'use strict';

// Available Classification Types 
// Each 
module.exports = function(sequelize, DataTypes) {
    var ClassificationType = sequelize.define('ClassificationType', {
        id: {
            type:DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey:true
        },
        name: DataTypes.STRING
    });
    return ClassificationType;
};