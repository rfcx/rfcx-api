const { findOrCreateItem } = require('../../utils/sequelize')
const { FileExtension } = require('../../modelsTimescale')

/**
 * Find or create model for FileExtension based on input value
 * Returns object with model item ids
 * @param {*} data object with values
 * @returns {*} object with mappings between attribute keys and ids
 */
async function findOrCreate (data, options = {}) {
  return await findOrCreateItem(FileExtension, data, data, options)
}

module.exports = { findOrCreate }
