var Promise = require('bluebird')

exports.models = {

  guardianAudioCollection: function (req, res, dbGuardianAudioCollection) {
    return new Promise(function (resolve, reject) {
      try {
        if (Array.isArray(dbGuardianAudioCollection)) { dbGuardianAudioCollection = dbGuardianAudioCollection[0] }

        var json = {
          audios: []
        }

        for (var i = 0; i < dbGuardianAudioCollection.GuardianAudios.length; i++) {
          var dbRow = dbGuardianAudioCollection.GuardianAudios[i]

          var note = (dbRow.GuardianAudioCollectionsRelation && dbRow.GuardianAudioCollectionsRelation.note)
            ? dbRow.GuardianAudioCollectionsRelation.note : null

          json.audios.push({
            guid: dbRow.guid,
            note: note,
            position: dbRow.GuardianAudioCollectionsRelation.position
          })
        }

        resolve(json)
      } catch (err) {
        reject(err)
      }
    })
  }

}
