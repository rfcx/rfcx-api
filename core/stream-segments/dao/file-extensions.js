const { FileExtension } = require('../../_models')

/**
 * Find or create model for FileExtension based on input value
 * Returns object with model item ids
 * @param {*} data object with values
 * @returns {*} object with mappings between attribute keys and ids
 */
async function findOrCreate (data, options = {}) {
  const transaction = options.transaction || null
  const where = data
  const defaults = data
  const [item] = await FileExtension.findOrCreate({ where, defaults, transaction })
  return item
}

async function findAll () {
  return FileExtension.findAll()
}

module.exports = { findOrCreate, findAll }
