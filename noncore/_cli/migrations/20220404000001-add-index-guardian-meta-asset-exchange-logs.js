'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.query('CREATE INDEX guardian_asset_type_asset_id ON GuardianMetaAssetExchangeLogs(guardian_id, asset_type, asset_id);')
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.query('DROP INDEX guardian_asset_type_asset_id ON GuardianMetaAssetExchangeLogs;')
  }
}
