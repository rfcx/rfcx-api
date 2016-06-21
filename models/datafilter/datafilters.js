'use strict';

// Creates a repository of reports for incidents 
// like 'heard a chainsaw' or 'poacher sighting'
module.exports = function(sequelize, DataTypes) {
    var Datafilters = sequelize.define('Datafilters', {
        id: {
            type:DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey:true
        },

        name: {
            type:DataTypes.STRING,
            unique:true
        },
        type: DataTypes.STRING,
        start: DataTypes.DATE,
        end: DataTypes.DATE,
        tod_start: DataTypes.STRING,
        tod_end: DataTypes.STRING,
        sites: DataTypes.STRING,
        guardians: DataTypes.STRING,
        classificationGoal: DataTypes.INTEGER,
        limit: DataTypes.INTEGER,
        model: DataTypes.UUID,
        classes: DataTypes.STRING,
        reports: DataTypes.STRING,
        analyst: DataTypes.INTEGER,
        classification_type: DataTypes.UUID
    });
    return Datafilters;
};