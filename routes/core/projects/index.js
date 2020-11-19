const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const ForbiddenError = require('../../../utils/converter/forbidden-error')
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const organizationsService = require('../../../services/organizations')
const projectsService = require('../../../services/projects')
const usersTimescaleDBService = require('../../../services/users/users-service-timescaledb')
const hash = require('../../../utils/misc/hash.js').hash
const Converter = require('../../../utils/converter/converter')

/**
 * @swagger
 *
 * /projects:
 *   post:
 *     summary: Create a project
 *     tags:
 *       - projects
 *     requestBody:
 *       description: Project object
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/Project'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/Project'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Invalid query parameters
 */

router.post('/', authenticatedWithRoles('appUser', 'rfcxUser'), function (req, res) {
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('id').optional().toString()
  params.convert('name').toString()
  params.convert('description').optional().toString()
  params.convert('is_public').optional().toBoolean().default(false)
  params.convert('organization_id').optional().toString()
  params.convert('external_id').optional().toInt()

  return params.validate()
    .then(() => usersTimescaleDBService.ensureUserSyncedFromToken(req))
    .then(async () => {
      if (convertedParams.organization_id) {
        await organizationsService.getById(convertedParams.organization_id)
      }
      convertedParams.id = convertedParams.id || hash.randomString(12)
      convertedParams.created_by_id = req.rfcx.auth_token_info.owner_id
      return projectsService.create(convertedParams, { joinRelations: true })
    })
    .then(projectsService.formatProject)
    .then(data => res.status(201).json(data))
    .catch(httpErrorHandler(req, res, 'Failed creating project'))
})

/**
 * @swagger
 *
 * /projects:
 *   get:
 *     summary: Get list of projects
 *     tags:
 *       - projects
 *     parameters:
 *       - name: is_public
 *         description: Return public or private projects
 *         in: query
 *         type: boolean
 *       - name: is_deleted
 *         description: Return only your deleted projects
 *         in: query
 *         type: string
 *       - name: created_by
 *         description: Returns different set of projects based on who has created it
 *         in: query
 *         schema:
 *           type: string
 *           enum:
 *             - me
 *       - name: keyword
 *         description: Match projects with name
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
 *     responses:
 *       200:
 *         description: List of projects objects
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
 *                 $ref: '#/components/schemas/Project'
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', authenticatedWithRoles('appUser', 'rfcxUser'), (req, res) => {
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('is_public').optional().toBoolean()
  params.convert('is_deleted').optional().toBoolean()
  params.convert('created_by').optional().toString().isEqualToAny(['me'])
  params.convert('keyword').optional().toString()
  params.convert('limit').optional().toInt().default(100)
  params.convert('offset').optional().toInt().default(0)

  return params.validate()
    .then(async () => {
      convertedParams.current_user_id = req.rfcx.auth_token_info.owner_id
      const projectsData = await projectsService.query(convertedParams, { joinRelations: true })
      const projects = projectsService.formatProjects(projectsData.projects)
      return res
        .header('Total-Items', projectsData.count)
        .json(projects)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting projects'))
})

/**
 * @swagger
 *
 * /projects/{id}:
 *   get:
 *     summary: Get a project
 *     tags:
 *       - projects
 *     parameters:
 *       - name: id
 *         description: Project id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Project not found
 */
router.get('/:id', authenticatedWithRoles('appUser', 'rfcxUser'), (req, res) => {
  return projectsService.getById(req.params.id, { joinRelations: true })
    .then(projectsService.formatProject)
    .then(json => res.json(json))
    .catch(httpErrorHandler(req, res, 'Failed getting project'))
})

/**
 * @swagger
 *
 * /projects/{id}:
 *   patch:
 *     summary: Update a project
 *     tags:
 *       - projects
 *     parameters:
 *       - name: id
 *         description: project id
 *         in: path
 *         required: true
 *         type: string
 *     requestBody:
 *       description: Project object attributes
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/ProjectPatch'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/ProjectPatch'
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Project not found
 */
router.patch('/:id', authenticatedWithRoles('appUser', 'rfcxUser'), (req, res) => {
  const projectId = req.params.id
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('name').optional().toString()
  params.convert('description').optional().toString()
  params.convert('is_public').optional().toBoolean()
  params.convert('organization_id').optional().toString()
  params.convert('external_id').optional().toInt()
  params.convert('restore').optional().toBoolean()

  return params.validate()
    .then(() => usersTimescaleDBService.ensureUserSyncedFromToken(req))
    .then(() => projectsService.getById(projectId, { includeDeleted: convertedParams.restore === true }))
    .then(async project => {
      if (convertedParams.organization_id) {
        await organizationsService.getById(convertedParams.organization_id)
      }
      if (convertedParams.restore === true) {
        await projectsService.restore(project)
      }
      return projectsService.update(project, convertedParams, { joinRelations: true })
    })
    .then(projectsService.formatProject)
    .then(json => res.json(json))
    .catch(httpErrorHandler(req, res, 'Failed updating project'))
})

/**
 * @swagger
 *
 * /projects/{id}:
 *   delete:
 *     summary: Delete a project (soft-delete)
 *     tags:
 *       - projects
 *     parameters:
 *       - name: id
 *         description: Project id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Success
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Project not found
 */
router.delete('/:id', authenticatedWithRoles('appUser', 'rfcxUser'), (req, res) => {
  return projectsService.getById(req.params.id, { joinRelations: true })
    .then(async project => {
      if (project.created_by_id !== req.rfcx.auth_token_info.owner_id) {
        throw new ForbiddenError('You do not have permission to delete this project.')
      }
      return projectsService.softDelete(project)
    })
    .then(json => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed deleting project'))
})

module.exports = router
