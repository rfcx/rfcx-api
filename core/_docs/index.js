const swaggerJSDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const router = require('express').Router()

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Rainforest Connection® API Documentation',
      version: '1.0.26'
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
    './core/**/*.js'
  ]
}

const swaggerSpec = swaggerJSDoc(options)
const swaggerUiOptions = {
  oauth2RedirectUrl: 'https://dev-api.rfcx.org/docs/auth-callback',
  operationsSorter: 'alpha'
}
const swaggerUiExpressOptions = {
  customSiteTitle: 'Rainforest Connection® API Documentation',
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
