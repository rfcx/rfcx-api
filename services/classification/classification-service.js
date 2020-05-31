const models = require('../../modelsTimescale');
const EmptyResultError = require('../../utils/converter/empty-result-error');
const streamsAssetsService = require('../streams/streams-assets-service');

function getByValue (value, ignoreMissing) {
  return models.Classification
    .findOne({
      where: { value },
      include: [
        {
          model: models.ClassificationType,
          as: 'type',
          attributes: ['value']
        },
        {
          model: models.ClassificationAlternativeName,
          as: 'alternative_names',
          attributes: models.ClassificationAlternativeName.attributes.lite,
          order: ['rank']
        },
        {
          model: models.Annotation,
          as: 'reference_annotation',
          attributes: models.Annotation.attributes.lite
        },
      ],
      attributes: models.Classification.attributes.full
    })
    .then((item) => {
      if (!item && !ignoreMissing) { throw new EmptyResultError('Classification with given value not found.'); }
      return item;
    });
}

function queryByKeyword (opts) {
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
          as: 'type',
          where: typeClause,
          attributes: models.ClassificationType.attributes.lite
        },
        {
          model: models.ClassificationAlternativeName,
          as: 'alternative_names',
          attributes: []
        }
      ],
      attributes: models.Classification.attributes.lite
    });
}

function queryByStream (streamId, limit, offset) {
  const columns = models.Classification.attributes.lite.map(col => `c.${col} AS ${col}`).join(', ')
  const typeColumns = models.ClassificationType.attributes.lite.map(col => `"type".${col} AS "type.${col}"`).join(', ')
  const sql = `SELECT DISTINCT ${columns}, ${typeColumns} FROM classifications c
               JOIN annotations a ON c.id = a.classification_id
               JOIN classification_types "type" ON c.type_id = "type".id
               WHERE a.stream_id = $streamId LIMIT $limit OFFSET $offset`
  const options = {
    raw: true,
    nest: true,
    bind: { streamId, limit, offset }
  }
  return models.sequelize.query(sql, options)
}

function queryByParent (value, type) {
  const typeCondition = type !== undefined ? { value: type } : {}
  return models.Classification
    .findAll({
      include: [
        {
          model: models.Classification,
          as: 'parent',
          where: { value },
          attributes: []
        },
        {
          model: models.ClassificationType,
          as: 'type',
          where: typeCondition,
          attributes: []
        },
      ],
      attributes: models.Classification.attributes.lite
    })
}

function getReferenceMediaUrls (classification) {
  let urls = {
    reference_audio: null,
    reference_spectrogram: null
  };
  if (classification.reference_annotation_id) {
    urls.reference_audio = streamsAssetsService.combineUrlForAnnotation(classification.reference_annotation_id, 'mp3', 'mp3')
    urls.reference_spectrogram = streamsAssetsService.combineUrlForAnnotation(classification.reference_annotation_id, 'spec', 'png', 200, 200);
  }
  return urls;
}

function formatClassifications (classifications) {
  return classifications.map(formatClassification);
}

function formatClassification (classification) {
  return {
    ...classification.toJSON(),
    ...getReferenceMediaUrls(classification)
  }
}


module.exports = {
  getByValue,
  queryByKeyword,
  queryByStream,
  queryByParent,
  formatClassifications,
  formatClassification,
};
