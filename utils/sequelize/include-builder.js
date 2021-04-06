module.exports = (model, defaultAs, defaultAttibutes) => {
  return (options = {}) => {
    const defaults = {
      as: defaultAs,
      attributes: model.attributes.lite,
      required: true
    }
    return { model, ...defaults, ...options }
  }
}
