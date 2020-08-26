'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    migration.addColumn(
      'Guardians',
      'sim_card_id',
      {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
        }
      }
    )

    done()
  },

  down: function (migration, DataTypes, done) {
    migration.removeColumn('Guardians', 'sim_card_id')

    done()
  }
}
