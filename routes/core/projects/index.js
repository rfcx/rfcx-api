const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const ForbiddenError = require('../../../utils/converter/forbidden-error')
const organizationsService = require('../../../services/organizations')
const projectsService = require('../../../services/projects')
const usersFusedService = require('../../../services/users/fused')
const hash = require('../../../utils/misc/hash.js').hash
const Converter = require('../../../utils/converter/converter')
const { hasProjectPermission } = require('../../../middleware/authorization/roles')
const { hasPermission, CREATE, ORGANIZATION, UPDATE, DELETE, READ } = require('../../../services/roles')
const arbimonService = require('../../../services/arbimon')

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
 *         headers:
 *           Location:
 *             description: Path of the created resource (e.g. `/projects/xyz123`)
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Invalid query parameters
 */

router.post('/', (req, res) => {
  const userId = req.rfcx.auth_token_info.owner_id
  const converter = new Converter(req.body, {})
  converter.convert('id').optional().toString()
  converter.convert('name').toString()
  converter.convert('description').optional().toString()
  converter.convert('is_public').default(false).toBoolean()
  converter.convert('organization_id').optional().toString()
  converter.convert('external_id').optional().toInt()

  return params.validate()
    .then(() => usersFusedService.ensureUserSyncedFromToken(req))
    .then(async () => {
      if (convertedParams.organization_id) {
        await organizationsService.get(convertedParams.organization_id)
        const allowed = await hasPermission(CREATE, userId, convertedParams.organization_id, ORGANIZATION)
        if (!allowed) {
          throw new ForbiddenError('You do not have permission to create project in this organization.')
        }
      }

      params.created_by_id = userId
      project = await projectsService.create(params, { joinRelations: true })

      if (arbimonService.isEnabled && req.headers.source !== 'arbimon') {
        const idToken = req.headers.authorization
        const arbimonProject = await arbimonService.createProject(project.toJSON(), idToken)
        project = await projectsService.update(project, { external_id: arbimonProject.project_id }, { joinRelations: true })
      }

      res.location(`/projects/${project.id}`).status(201).json(projectsService.formatProject(project))
    }).catch(error => {
      httpErrorHandler(req, res, 'Failed creating project')(error)
      if (project) {
        projectsService.remove(project, { force: true })
      }
    })
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
 *                 $ref: '#/components/schemas/ProjectLite'
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', (req, res) => {
  const user = req.rfcx.auth_token_info
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('is_public').optional().toBoolean()
  params.convert('is_deleted').optional().toBoolean()
  params.convert('created_by').optional().toString().isEqualToAny(['me', 'collaborators'])
  params.convert('keyword').optional().toString()
  params.convert('limit').optional().toInt().default(100)
  params.convert('offset').optional().toInt().default(0)

  return params.validate()
    .then(async () => {
      convertedParams.current_user_id = user.owner_id
      convertedParams.current_user_is_super = user.is_super
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
router.get('/:id', hasProjectPermission(READ), (req, res) => {
  return projectsService.get(req.params.id, { joinRelations: true })
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
 *             $ref: '#/components/requestBodies/ProjectPatchArbimon'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/ProjectPatchArbimon'
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
router.patch('/:id', hasProjectPermission(UPDATE), (req, res) => {
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
    .then(() => usersFusedService.ensureUserSyncedFromToken(req))
    .then(() => projectsService.get(projectId, { includeDeleted: convertedParams.restore === true }))
    .then(async project => {
      if (convertedParams.organization_id) {
        await organizationsService.get(convertedParams.organization_id)
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
 *       204:
 *         description: Success
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Project not found
 */
router.delete('/:id', hasProjectPermission(DELETE), (req, res) => {
  return projectsService.get(req.params.id, { joinRelations: true })
    .then(projectsService.remove)
    .then(json => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed deleting project'))
})

module.exports = router
