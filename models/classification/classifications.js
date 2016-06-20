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
        start: { type: DataTypes.INTEGER, unsigned: true },
        end: { type: DataTypes.INTEGER, unsigned: true },
        class: DataTypes.STRING
    }, {
        classMethods: {
            associate: function(models) {
                Classifications.belongsTo(models.ClassificationTypes,{ as:'classificationType', foreignKey:'classification_type'});
                Classifications.belongsTo(models.User, {foreignKey: 'analyst'});
                Classifications.belongsTo(models.GuardianAudio, {as:'audioId', foreignKey: 'audio_id',  targetKey: 'guid'});
            }
        }
    });
    return Classifications;
};