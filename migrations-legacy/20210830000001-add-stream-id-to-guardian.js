'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.sequelize.query(`
        IF NOT EXISTS( 
          SELECT NULL FROM information_schema.COLUMNS 
          WHERE table_name = 'Guardians' AND column_name = 'stream_id' AND table_schema = 'rfcx_api'
        ) THEN
          ALTER TABLE Guardians ADD stream_id varchar(12) NULL;
        END IF;`, { transaction: t })
      await queryInterface.sequelize.query('UPDATE Guardians SET stream_id = guid', { transaction: t })
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Guardians', 'stream_id')
  }
}
