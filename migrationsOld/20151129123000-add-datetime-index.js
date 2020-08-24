'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    migration.addIndex('GuardianAudio', ['measured_at'], { indicesType: 'BTREE' })

    done()
  },

  down: function (migration, DataTypes, done) {
    done()
  }
}
