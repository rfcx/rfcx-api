module.exports = {
  parseClassifierOutputMapping (str) {
    const components = str.split(':')
    return { from: components[0], to: components.length === 1 ? components[0] : components[1] }
  }
}
