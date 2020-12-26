const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const organizationsService = require('../../../services/organizations')
const Converter = require('../../../utils/converter/converter')

/**
 * @swagger
 *
 * /organizations:
 *   post:
 *     summary: Create a organization
 *     tags:
 *       - organizations
 *     requestBody:
 *       description: Organization object
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/Organization'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/Organization'
 *     responses:
 *       201:
 *         description: Created
 *         headers:
 *           Location:
 *             description: Path of the created resource (e.g. `/organizations/xyz123`)
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid query parameters
 */
router.post('/', function (req, res) {
  const createdById = req.rfcx.auth_token_info.owner_id
  const convertedParams = {}
  const converter = new Converter(req.body, convertedParams, true)
  converter.convert('name').toString()
  converter.convert('is_public').default(false).toBoolean()

  return converter.validate()
    .then(async () => {
      const organization = {
        ...convertedParams,
        createdById
      }
      return organizationsService.create(organization)
    })
    .then(organization => res.location(`/organizations/${organization.id}`).sendStatus(201))
    .catch(httpErrorHandler(req, res, 'Failed creating organization'))
})

/**
 * @swagger
 *
 * /organizations:
 *   get:
 *     summary: Get list of organizations
 *     tags:
 *       - organizations
 *     parameters:
 *       - name: is_public
 *         description: Return public or private organizations
 *         in: query
 *         type: boolean
 *       - name: is_deleted
 *         description: Return only your deleted organizations
 *         in: query
 *         type: string
 *       - name: created_by
 *         description: Returns different set of organizations based on who has created it (can be `me` or a user id)
 *         in: query
 *         type: string
 *       - name: keyword
 *         description: Match organizations with name
 *         in: query
 *         type: string
 *       - name: limit
 *         description: Maximum number of results to return
 *         in: query
 *         type: int
 *         default: 100
 *       - name: offset
 *         description: Number of results to skip
 *         in: query
 *         type: int
 *         default: 0
 *       - name: fields
 *         description: Customize included fields and relations
 *         in: query
 *         type: array
 *     responses:
 *       200:
 *         description: List of organizations objects
 *         headers:
 *           Total-Items:
 *             schema:
 *               type: integer
 *             description: Total number of items without limit and offset.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Organization'
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', (req, res) => {
  const readableBy = req.rfcx.auth_token_info.owner_id
  const converter = new Converter(req.query, {}, true)
  converter.convert('keyword').optional().toString()
  converter.convert('only_public').optional().toBoolean()
  converter.convert('only_deleted').optional().toBoolean()
  converter.convert('created_by').optional().toString()
  converter.convert('limit').default(100).toInt()
  converter.convert('offset').default(0).toInt()
  converter.convert('fields').optional().toArray()

  return converter.validate()
    .then(async params => {
      const { keyword, onlyPublic, onlyDeleted, createdBy, limit, offset, fields } = params
      const options = {
        readableBy,
        createdBy: createdBy === 'me' ? readableBy : createdBy,
        onlyPublic,
        onlyDeleted,
        limit,
        offset,
        fields
      }
      const organizationsData = await organizationsService.query({ keyword }, options)
      return res
        .header('Total-Items', organizationsData.total)
        .json(organizationsData.results)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting organizations'))
})

/**
 * @swagger
 *
 * /organizations/{id}:
 *   get:
 *     summary: Get an organization
 *     tags:
 *       - organizations
 *     parameters:
 *       - name: id
 *         description: Organization identifier
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Organization'
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Organization not found
 */
router.get('/:id', (req, res) => {
  const converter = new Converter(req.query, {}, true)
  converter.convert('fields').optional().toArray()
  return converter.validate()
    .then(params => {
      const options = {
        readableBy: req.rfcx.auth_token_info.owner_id,
        fields: params.fields
      }
      return organizationsService.get(req.params.id, options)
    })
    .then(organization => res.json(organization))
    .catch(httpErrorHandler(req, res, 'Failed getting organization'))
})

/**
 * @swagger
 *
 * /organizations/{id}:
 *   patch:
 *     summary: Update a organization
 *     tags:
 *       - organizations
 *     parameters:
 *       - name: id
 *         description: organization id
 *         in: path
 *         required: true
 *         type: string
 *     requestBody:
 *       description: Organization attributes
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/OrganizationPatch'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/OrganizationPatch'
 *     responses:
 *       204:
 *         description: Success
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Organization not found
 */
router.patch('/:id', (req, res) => {
  const id = req.params.id
  const converter = new Converter(req.body, {}, true)
  converter.convert('name').optional().toString()
  converter.convert('is_public').optional().toBoolean()
  const options = { updatableBy: req.rfcx.auth_token_info.owner_id }

  return converter.validate()
    .then(params => organizationsService.update(id, params, options))
    .then(() => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed updating organization'))
})

/**
 * @swagger
 *
 * /organizations/{id}:
 *   delete:
 *     summary: Delete (or undelete) an organization
 *     tags:
 *       - organizations
 *     parameters:
 *       - name: id
 *         description: Organization identifier
 *         in: path
 *         required: true
 *         type: string
 *       - name: undo
 *         description: Restore a deleted organization
 *         in: query
 *         type: boolean
 *     responses:
 *       204:
 *         description: Success
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Organization not found
 */
router.delete('/:id', (req, res) => {
  const id = req.params.id
  const options = {
    deletableBy: req.rfcx.auth_token_info.owner_id,
    undo: req.query.undo === 'true'
  }
  return organizationsService.remove(id, options)
    .then(() => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed deleting organization'))
})

module.exports = router
