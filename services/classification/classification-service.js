const models = require('../../modelsTimescale');
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

function getByStream (streamId, limit, offset) {
  limit = limit || 100
  offset = offset || 0
  const columns = models.Classification.attributes.full.map(col => `c."${col}"`).join(', ')
  const sql = `SELECT DISTINCT ${columns} FROM "Classifications" c 
               JOIN "Annotations" a ON c.id = a."classificationId" 
               WHERE a."streamId" = $streamId LIMIT $limit OFFSET $offset`
  const options = {
    model: models.Classification,
    mapToModel: true,
    bind: { streamId, limit, offset }
  }
  return models.sequelize.query(sql, options)
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
  getByStream,
  formatClassifications,
  formatClassification,
};
