'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    migration.addColumn(
      'GuardianSites',
      'cartodb_map_id',
      {
        type: DataTypes.UUID,
        unique: false,
        allowNull: true,
        validate: {
        }
      }
    )

    done()
  },

  down: function (migration, DataTypes, done) {
    migration.removeColumn('GuardianSites', 'cartodb_map_id')

    done()
  }
}
