'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    migration.removeColumn('AnonymousTokens', 'remaining_uses')
    migration.removeColumn('AnonymousTokens', 'max_uses')

    done()
  },

  down: function (migration, DataTypes, done) {
    migration.addColumn(
      'AnonymousTokens',
      'remaining_uses',
      {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
          isInt: true,
          min: 0
        }
      }
    )

    migration.addColumn(
      'AnonymousTokens',
      'max_uses',
      {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        validate: {
          isInt: true,
          min: 1
        }
      }
    )

    done()
  }
}
