function findOrCreateItem (model, where, defaults, opts = {}) {
  const transaction = opts.transaction || null
  return model.findOrCreate({ where, defaults, transaction })
    .spread((item, created) => {
      return item
    })
}

module.exports = {
  findOrCreateItem
}
