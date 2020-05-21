const swaggerJSDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

function configure (app) {
  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'RFCx API Documentation',
        version: '0.0.1',
      },
      components: {
        securitySchemes: {
          auth0: {
            type: 'oauth2',
            description: 'This API uses OAuth 2 with the implicit grant flow.',
            flows: {
              authorizationCode: {
                authorizationUrl: 'https://auth.rfcx.org/authorize',
                tokenUrl: 'https://auth.rfcx.org/oauth/token',
                scopes: {
                  'openid': 'required',
                  'email': 'required',
                  'profile': 'required',
                  'offline': 'required'
                }
              }
            }
          }
        }
      },
      security: {
        auth0: ['openid', 'email', 'profile', 'offline']
      }
    },
    apis: ['./routes/v2/**/*.js'],
  }

  const swaggerSpec = swaggerJSDoc(options)
  const swaggerUiOptions = {
    oauth2RedirectUrl: 'http://localhost:8080/docs-auth-callback'
  }

  const middleware = function (req, res, next) {
    swaggerSpec.host = req.get('host')
    req.swaggerDoc = swaggerSpec
    next()
  }

  app.get('/docs-auth-callback', (req, res) => res.sendFile('/docs/oauth-redirect.html', { root: '.' }))
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { swaggerOptions: swaggerUiOptions }))
}

module.exports = { configure }
