const ValidationError = require('../utils/converter/validation-error');

function formatModelItem (model, item, format) {
  if (!model.attributes || !model.attributes[format]) {
    throw new ValidationError(`${model.name} model does not have "${format}" attributes set.`);
  }
  return model.attributes[format].reduce((acc, attribute) => {
    acc[attribute] = item[attribute]
    return acc
  }, {})
}


module.exports = {
  formatModelItem,
}
