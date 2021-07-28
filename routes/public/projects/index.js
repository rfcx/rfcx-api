const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const projectsService = require('../../../services/projects')
const Converter = require('../../../utils/converter/converter')

/**
 * @swagger
 *
 * /projects:
 *   get:
 *     summary: Get list of publicly available projects
 *     tags:
 *       - public
 *     parameters:
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
 *       - name: include_location
 *         description: Whether to add latitude and longitude to project info or not
 *         in: query
 *         type: boolean
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
 *                 oneOf:
 *                   - $ref: '#/components/schemas/ProjectPublic'
 *                   - $ref: '#/components/schemas/ProjectPublicWithLocation'
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', (req, res) => {
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('keyword').optional().toString()
  params.convert('limit').optional().toInt().default(100)
  params.convert('offset').optional().toInt().default(0)
  params.convert('include_location').toBoolean().default(false)

  return params.validate()
    .then(async () => {
      convertedParams.is_public = true
      convertedParams.is_partner = true
      const projectsData = await projectsService.query(convertedParams, {
        attributes: ['id', 'name', 'description']
      })
      const { projects, count } = projectsData
      if (convertedParams.include_location) {
        await Promise.all(
          projects.map((project) => {
            return projectsService.getProjectLocation(project.id)
              .then((location) => {
                project.latitude = location ? location.latitude : null
                project.longitude = location ? location.longitude : null
              })
          })
        )
      }
      projects.forEach(p => delete p.id)
      return res
        .header('Total-Items', count)
        .json(projects)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting projects'))
})

module.exports = router
