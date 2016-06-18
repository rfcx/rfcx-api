'use strict';

// Creates a repository of reports for incidents 
// like 'heard a chainsaw' or 'poacher sighting'
module.exports = function(sequelize, DataTypes) {
    var ClassificationType = sequelize.define('Report', {
        id: {
            type:DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey:true
        },
        start_time: DataTypes.DATE,
        end_time: DataTypes.DATE,
        long: DataTypes.REAL,
        lat: DataTypes.REAL,
        type: DataTypes.STRING
    }, {
        classMethods: {
            associate: function(models) {
                Report.belongsTo(models.Guardian,{ foreignKey:'closest_guardian'});
                Report.belongsTo(models.User, {foreignKey: 'reporter'});
            }
        }
    });
    return Report;
};