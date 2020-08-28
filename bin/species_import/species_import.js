/**
 * STEP 0: make sure you use node.js version 6 or higher
 */
/**
 * STEP 1: define env var values or paste their values right here if you didn't set env vars:
 */
const DB_HOSTNAME = process.env.DB_HOSTNAME || 'host_value'
const DB_NAME = process.env.DB_NAME || 'rfcx_api'
const DB_USERNAME = process.env.DB_USERNAME || 'rfcx'
const DB_PASSWORD = process.env.DB_PASSWORD || 'secret_password'

const Sequelize = require('sequelize')
const sequelize = new Sequelize(DB_NAME, DB_USERNAME, DB_PASSWORD, {
  host: DB_HOSTNAME,
  dialect: 'mysql',
  logging: function (str) {
    console.log('\nSQL QUERY----------------------------------\n', str, '\n----------------------------------')
  },
  define: {
    underscored: true,
    charset: 'utf8',
    collate: 'utf8_general_ci',
    timestamps: true
  }
})

/**
 * STEP 2: put species values into ./bin/species_import/species.json file with the following format:
 * [
 *   {
 *     "value": "american_dipper",
 *     "label": "American Dipper [AMDI]"
 *   },
 *   {
 *     "value": "coyote_mammal",
 *     "label": "Coyote (mammal)"
 *   }
 * ]
 */
const species = require('./species')

species.forEach(sp => {
  sequelize.query(
    `SELECT value.id as value_id, hlk.id as hlk_id FROM GuardianAudioEventValues value
      LEFT JOIN GuardianAudioEventValueHighLevelKeys as hlk ON value.high_level_key = hlk.id
      WHERE value.value = "${sp.value}";`,
    { replacements: {}, type: sequelize.QueryTypes.SELECT }
  )
    .then((eventValueData) => {
      const item = eventValueData[0]
      if (!item) {
        return sequelize.query(
        `INSERT INTO GuardianAudioEventValueHighLevelKeys (value) VALUES ("${sp.label}");`,
        { replacements: {}, type: sequelize.QueryTypes.INSERT }
        )
          .then((highLevelKey) => {
            return sequelize.query(
          `INSERT INTO GuardianAudioEventValues (value, high_level_key) VALUES ("${sp.value}", ${highLevelKey});`,
          { replacements: {}, type: sequelize.QueryTypes.INSERT }
            )
          })
      } else {
        return sequelize.query(
        `UPDATE GuardianAudioEventValueHighLevelKeys SET value = "${sp.label}" WHERE id = ${item.hlk_id};`,
        { replacements: {}, type: sequelize.QueryTypes.UPDATE }
        )
      }
    })
    .catch((err) => {
      console.log('\n\nError', err, '\n\n')
    })
})

/**
 * STEP 3: run this script with the following command: `node bin/species_import/species_import.js`
 */
