// Returns a Neo4j driver when NEO4J_ENABLED is set, else returns a fake driver object
let driver
if (process.env.NEO4J_ENABLED !== 'true') {
  driver = {
    session: () => {
      throw new Error({ name: 'NotEnabledError', message: 'NEO4J_ENABLED environment variable is not set' })
    }
  }
} else {
  const neo4j = require('neo4j-driver').v1
  const env = process.env.NODE_ENV || 'development'

  const config = {
    disableLosslessIntegers: true
  }

  if (env === 'development') {
    config.logging = neo4j.logging.console('debug')
  }

  driver = neo4j.driver(
    process.env.NEO4J_URL,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
    config
  )
}

module.exports = driver
