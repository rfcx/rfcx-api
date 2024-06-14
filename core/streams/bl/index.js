const arbimonService = require('../../_services/arbimon')
const { randomId } = require('../../../common/crypto/random')
const { ValidationError } = require('../../../common/error-handling/errors')
const dao = require('../dao')

/**
 * Create Stream
 * @param {Stream} stream
 * @param {string} stream.id
 * @param {string} stream.name
 * @param {integer} stream.latitude
 * @param {integer} stream.longitude
 * @param {integer} stream.altitude
 * @param {string} stream.description
 * @param {boolean} stream.is_public
 * @param {integer} stream.external_id
 * @param {string} stream.project_id
 * @param {boolean} stream.hidden
 * @param {*} options
 * @param {number} options.creatableBy Create only if site is creatable by the given user id
 * @param {string} options.requestSource Whether the request was sent from the Arbimon or not
 * @param {string} options.idToken user jwt token
 */
async function create (params, options = {}) {
  const stream = {
    ...params
  }

  if (!params.id) {
    stream.id = randomId()
  }

  if (params.latitude === 0) {
    stream.latitude = null
  }

  if (params.longitude === 0) {
    stream.longitude = null
  }

  if (params.projectId) {
    const duplicateStreamInProject = await dao.query({ names: [params.name], projects: [params.projectId] }, { fields: 'id' })
    if (duplicateStreamInProject.total > 0) {
      throw new ValidationError('Duplicate stream name in the project')
    }
  }
  // Get timezone and countryCode for Arbimon
  const fullStream = { ...stream, ...(await dao.computedAdditions(stream)) }
  if (arbimonService.isEnabled && options.requestSource !== 'arbimon') {
    try {
      const arbimonSite = { ...fullStream, country_code: fullStream.countryCode }
      const externalSite = await arbimonService.createSite(arbimonSite, options.idToken)
      if (!externalSite.site_id) {
        throw new Error('site_id is missing in Arbimon stream creation response')
      }
      fullStream.externalId = externalSite.site_id
    } catch (error) {
      console.error(`Error creating site in Arbimon (stream: ${fullStream.id})`)
      throw new Error()
    }
  }
  return await dao.create(fullStream, options)
}

module.exports = {
  create
}
