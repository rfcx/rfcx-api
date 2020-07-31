function includedRelationReducer (relation) {
  return (acc, x) => {
      const index = acc.findIndex(y => y.value == x.value)
      if (index === -1) {
        if (Object.values(x[relation]).every(x => (x === null))) {
          x[relation] = []
        } else {
          x[relation] = [x[relation]]
        }
        acc.push(x)
      } else {
        acc[index][relation].push(x[relation])
      }
      return acc
    }
}

module.exports = includedRelationReducer