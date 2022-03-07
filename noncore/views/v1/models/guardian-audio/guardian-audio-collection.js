const Promise = require('bluebird')

exports.models = {

  guardianAudioCollection: function (req, res, dbGuardianAudioCollection) {
    return new Promise(function (resolve, reject) {
      try {
        if (Array.isArray(dbGuardianAudioCollection)) { dbGuardianAudioCollection = dbGuardianAudioCollection[0] }

        const json = {
          audios: []
        }

        for (let i = 0; i < dbGuardianAudioCollection.GuardianAudios.length; i++) {
          const dbRow = dbGuardianAudioCollection.GuardianAudios[i]

          const note = (dbRow.GuardianAudioCollectionsRelation && dbRow.GuardianAudioCollectionsRelation.note)
            ? dbRow.GuardianAudioCollectionsRelation.note
            : null

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
