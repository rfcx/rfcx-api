'use strict';

// Available Classification Types 
// Each 
module.exports = function(sequelize, DataTypes) {
    var ClassificationValues = sequelize.define('ClassificationValues', {

        value: {
            type: DataTypes.INTEGER,
            primaryKey: true
        },
        classifier: DataTypes.STRING,
        classification_type: {
            type: DataTypes.UUID,
            primaryKey: true,
            references: {
                model: 'ClassificationTypes',
                key: 'id'
            }
        }
    }
    );
    return ClassificationValues;
};