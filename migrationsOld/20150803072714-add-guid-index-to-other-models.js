'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    migration.addIndex('Guardians', ['guid'], { indicesType: 'UNIQUE' })
    migration.addIndex('GuardianAudio', ['guid'], { indicesType: 'UNIQUE' })
    migration.addIndex('GuardianEvents', ['guid'], { indicesType: 'UNIQUE' })
    migration.addIndex('GuardianMessages', ['guid'], { indicesType: 'UNIQUE' })
    migration.addIndex('GuardianSites', ['guid'], { indicesType: 'UNIQUE' })
    migration.addIndex('Users', ['guid'], { indicesType: 'UNIQUE' })

    done()
  },

  down: function (migration, DataTypes, done) {
    migration.removeIndex('Guardians', ['guid'])
    migration.removeIndex('GuardianAudio', ['guid'])
    migration.removeIndex('GuardianEvents', ['guid'])
    migration.removeIndex('GuardianMessages', ['guid'])
    migration.removeIndex('GuardianSites', ['guid'])
    migration.removeIndex('Users', ['guid'])

    done()
  }
}
