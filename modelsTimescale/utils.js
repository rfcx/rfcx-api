const ValidationError = require('../utils/converter/validation-error');

function formatModeiItem (model, item, format) {
  if (!model.attributes || !model.attributes[format]) {
    throw new ValidationError(`${model.name} model does not have "${format}" attributes set.`);
  }
  return model.attributes[format].reduce((acc, attribute) => {
    acc[attribute] = item[attribute]
    return acc
  }, {})
}


module.exports = {
  formatModeiItem,
}
