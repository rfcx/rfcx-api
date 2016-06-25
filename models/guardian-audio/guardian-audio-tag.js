'use strict';

// Creates a repository of reports for incidents 
// like 'heard a chainsaw' or 'poacher sighting'
module.exports = function(sequelize, DataTypes) {
    var GuardianAudioTag = sequelize.define('GuardianAudioTag', {
        guid: {
            type:DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            unique: true
        },
        begins_at: { type: DataTypes.INTEGER, unsigned: true },
        ends_at: { type: DataTypes.INTEGER, unsigned: true },
        utc_begins_at: {type: DataTypes.DATE },
        utc_ends_at: {type: DataTypes.DATE },
        type: DataTypes.STRING,
        value: DataTypes.STRING
    }, {
        classMethods: {
            associate: function(models) {
                GuardianAudioTag.belongsTo(models.User, {foreignKey: 'tagged_by_user'});
                GuardianAudioTag.belongsTo(models.AudioAnalysisModel, {foreignKey: 'tagged_by_model'});
                GuardianAudioTag.belongsTo(models.GuardianAudio, {as:'audioId', foreignKey: 'audio_id'});
            }
        }
    });
    return GuardianAudioTag;
};