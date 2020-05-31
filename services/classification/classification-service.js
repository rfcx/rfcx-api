const Promise = require("bluebird");
const models = require('../../modelsTimescale');
const ForbiddenError = require("../../utils/converter/forbidden-error");
const ValidationError = require('../../utils/converter/validation-error');
const EmptyResultError = require('../../utils/converter/empty-result-error');

function getClassificationByValue(value, ignoreMissing) {
  return models.Classification
    .findOne({
      where: { value },
      include: [{ all: true }],
    })
    .then((item) => {
      if (!item && !ignoreMissing) { throw new EmptyResultError('Classification with given value not found.'); }
      return item;
    });
}

function search(opts) {
  let typeClause = {};
  if (opts.levels) {
    typeClause = {
      value: {
        [models.Sequelize.Op.in]: opts.levels
      }
    };
  }
  return models.Classification
    .findAll({
      where: {
        title: {
          [models.Sequelize.Op.iLike]: `%${opts.q}%`
        }
      },
      include: [
        {
          model: models.ClassificationType,
          as: 'Type',
          where: typeClause,
        },
        {
          model: models.SpeciesName,
          as: 'Name',
          include: [
            {
              model: models.Language,
              as: 'Language'
            }
          ]
        }
      ],
    });
}

function getCharacteristicsForClassification(value) {
  return models.Classification
    .findAll({
      include: [
        {
          model: models.Classification,
          as: 'Parent',
          where: { value },
        },
        {
          model: models.ClassificationType,
          as: 'Type',
          where: {
            value: 'characteristic'
          },
        },
      ],
    });
}

function formatClassification(classification) {
  return {
    id: classification.id,
    value: classification.value,
    title: classification.title,
    description: classification.description,
    image: classification.image,
    reference_audio: classification.reference_audio,
    reference_spectrogram: classification.reference_spectrogram,
    type: classification.Type? classification.Type.value : null,
    common_names: extractCommonNames(classification),
  };
}

function extractCommonNames(classification) {
  if (!classification.Name || !classification.Name.length) {
    return null;
  }
  return classification.Name.map((name) => {
    return {
      title: name.name,
      language: name.Language? name.Language.value : name.language,
    }
  });
}

function formatClassifications(classifications) {
  return classifications.map(formatClassification);
}

module.exports = {
  getClassificationByValue,
  search,
  getCharacteristicsForClassification,
  formatClassifications,
  formatClassification,
};
