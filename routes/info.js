const router = require('express').Router()
const healthCheck = require('../utils/internal-rfcx/health-check')
const packageData = require('../package.json')

/**
 * @swagger
 *
 * /health-check:
 *   get:
 *     summary: Get a system health check
 *     tags:
 *       - unsupported
 *     security: []
 *     responses:
 *       200:
 *         description:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 healthy:
 *                   type: boolean
 */
router.get('/health-check', healthCheck)
router.get('/health_check', healthCheck)

/**
 * @swagger
 *
 * /app-info:
 *   get:
 *     summary: Information on the API application
 *     tags:
 *       - unsupported
 *     security: []
 *     responses:
 *       200:
 *         description:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 app:
 *                   type: string
 *                   description: Application version
 *                 node:
 *                   type: string
 */
router.get('/app-info', (req, res) => {
  res.status(200).json({
    node: process.version, // TODO: potential security risk to advertise software versions
    app: packageData.version
  })
})

// TODO: find out if this is used
router.get('/', function (req, res) {
  res.status(200).json({
    name: 'Rainforest Connection (RFCx)',
    message: 'Access to this API requires authentication. Please send requests for access by email to contact@rfcx.org',
    info: 'https://rfcx.org/'
  })
})

module.exports = router

const { sequelize } = require('../modelsTimescale')
const storageService = require('../services/storage/amazon')

async function obsBackfillProject (projectId) {
  const query = `SELECT id FROM streams WHERE project_id = :projectId;`
  return sequelize.query(query, { replacements: { projectId }, type: sequelize.QueryTypes.SELECT })
}

async function obsBackfillStream (streamId) {
  const query = `SELECT sf.id, sf.filename, s.id as stream_id, s.name as stream_name FROM stream_source_files sf JOIN streams s ON sf.stream_id = s.id LEFT JOIN stream_segments ss ON ss.stream_source_file_id = sf.id WHERE sf.stream_id = :streamId AND ss IS NULL;`
  return sequelize.query(query, { replacements: { streamId }, type: sequelize.QueryTypes.SELECT })
    .then(async (sourceFiles) => {
      if (sourceFiles.length) {
        let q = `DELETE FROM stream_source_files WHERE id IN ('${sourceFiles.map(f => f.id).join("', '")}')`
        const deleteNames = sourceFiles.map((sourceFile) => {
          return [
            { Key: `${sourceFile.stream_name}-${sourceFile.stream_id}/${sourceFile.filename.replace('.flac', '.ingested').replace('.FLAC', '.ingested').replace('.wav', '.ingested').replace('.WAV', '.ingested')}` },
            { Key: `${sourceFile.stream_name}-${sourceFile.stream_id}/${sourceFile.filename.replace('.flac', '.failed').replace('.FLAC', '.failed').replace('.wav', '.failed').replace('.WAV', '.failed')}` },
          ]
        }).flat()
        console.log('\n\nstreamId', streamId, '\nsourceFiles', sourceFiles, '\ndeleteNames', deleteNames)
        await sequelize.query(q, { replacements: {}, type: sequelize.QueryTypes.DELETE })
        await storageService.deleteFiles('pr-temp-bucket', deleteNames)
      }
      // for (let sourceFile of sourceFiles) {
      //   // let q = `DELETE FROM stream_source_files WHERE id = :id`
      //   // await sequelize.query(q, { replacements: { id: sourceFile.id }, type: sequelize.QueryTypes.DELETE })
      //   const deleteNames = [
      //     `${sourceFile.stream_name}-${sourceFile.stream_id}/${sourceFile.filename.replace('.flac', '.ingested').replace('.FLAC', '.ingested').replace('.wav', '.ingested').replace('.WAV', '.ingested')}`,
      //     `${sourceFile.stream_name}-${sourceFile.stream_id}/${sourceFile.filename.replace('.flac', '.failed').replace('.FLAC', '.failed').replace('.wav', '.failed').replace('.WAV', '.failed')}`,
      //   ]
      //   // sourceFile.infoFilename = sourceFile.filename.replace('.flac', '.ingested').replace('.FLAC', '.ingested').replace('.wav', '.ingested').replace('.WAV', '.ingested')
      //   // const exists = await storageService.deleteFiles('pr-temp-bucket', `${sourceFile.stream_name}-${sourceFile.stream_id}/${sourceFile.infoFilename}`)
      //   console.log(`${sourceFile.stream_name}-${sourceFile.stream_id}/${sourceFile.infoFilename}`, 'exists:', exists)
      // }
    })
}

setTimeout(() => {
  let process = false
  obsBackfillStream('k37rVyRpbKfU')
  // obsBackfillProject('n9nrlg45vyf0')
  //   .then(async (streams) => {
  //     for (let stream of streams) {
  //       if (stream.id === 'foCReF5609cq') {
  //         process = true
  //       }
  //       if (process) {
  //         await obsBackfillStream(stream.id)
  //       }
  //     }
  //   })
}, 3000)
