const swaggerJSDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const router = require('express').Router()

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RFCx API Documentation',
      version: '0.0.1'
    },
    servers: [
      {
        url: 'https://dev-api.rfcx.org',
        description: 'Development server'
      },
      {
        url: 'https://staging-api.rfcx.org',
        description: 'Staging server'
      },
      {
        url: 'https://api.rfcx.org',
        description: 'Production server (live data - use with care)'
      },
      {
        url: 'http://localhost:8080',
        description: 'Local development'
      }
    ],
    components: {
      schemas: require('./modelSchemas.json'),
      requestBodies: require('./requestBodies.json'),
      securitySchemes: {
        auth0: {
          type: 'oauth2',
          description: 'This API uses OAuth 2 with the implicit grant flow.',
          flows: {
            authorizationCode: {
              authorizationUrl: 'https://auth.rfcx.org/authorize',
              tokenUrl: 'https://auth.rfcx.org/oauth/token',
              scopes: {
                openid: 'required',
                email: 'required',
                profile: 'required',
                offline: 'required'
              }
            }
          },
          'x-tokenName': 'id_token'
        }
      }
    },
    security: [
      {
        auth0: ['openid', 'email', 'profile', 'offline']
      }
    ]
  },
  apis: [
    './routes/core/**/*.js',
    './routes/internal/ai-hub/*.js',
    './routes/internal/arbimon/*.js',
    './routes/internal/auth0/*.js',
    './routes/internal/assets/*.js',
    './routes/internal/cognition/*.js',
    './routes/internal/console/*.js',
    './routes/internal/cron/*.js',
    './routes/internal/explorer/*.js',
    './routes/internal/ingest/*.js',
    './routes/internal/prediction/*.js',
    './routes/internal/rabbitmq/*.js',
    './routes/public/**/*.js',
    './routes/*.js'
  ]
}

const swaggerSpec = swaggerJSDoc(options)
const swaggerUiOptions = {
  oauth2RedirectUrl: 'https://dev-api.rfcx.org/docs/auth-callback',
  operationsSorter: 'alpha'
}
const swaggerUiExpressOptions = {
  customSiteTitle: 'RFCx API Documentation',
  customCss: '.topbar { display: none }',
  swaggerOptions: swaggerUiOptions
}

router.get('/auth-callback', (req, res) => res.sendFile('/docs/oauth-redirect.html', { root: '.' }))
router.use('/', swaggerUi.serve, (req, res) => {
  const host = req.get('host')
  const oauth2RedirectUrl = `${host.endsWith('.rfcx.org') ? 'https' : 'http'}://${host}/docs/auth-callback`
  const options = { ...swaggerUiExpressOptions, swaggerOptions: { ...swaggerUiOptions, oauth2RedirectUrl } }
  swaggerUi.setup(swaggerSpec, options)(req, res)
})

module.exports = router
