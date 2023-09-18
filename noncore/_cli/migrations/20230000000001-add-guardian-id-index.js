'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.query('CREATE INDEX guardians_id ON public."Guardians" USING btree (id);')
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.query('DROP INDEX guardians_id')
  }
}
