function findOrCreateItem (model, where, defaults) {
  return model.findOrCreate({ where, defaults })
    .spread((item, created) => {
      return item
    })
}

module.exports = {
  findOrCreateItem
}
