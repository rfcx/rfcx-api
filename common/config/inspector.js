const fs = require('fs')
const envVarsSample = require('./env_vars.js.sample')

// check for environment variables file and load if present
if (fs.existsSync('./common/config/env_vars.js')) {
  console.info('Using env_vars.js')
  const env = require('./env_vars').env
  for (const i in env) { process.env[i] = env[i] }
}

const requiredEnvVars = (envVarsSample.env || [])
const missingEnvVars = []

for (const envVar in requiredEnvVars) {
  if (process.env[envVar] === undefined) {
    missingEnvVars.push(envVar)
  }
}

if (process.env.PLATFORM && !['amazon', 'google'].includes(process.env.PLATFORM)) {
  console.error('"PLATFORM" environmental variable can be only "amazon" or "google"')
  process.exit()
}

if (missingEnvVars.length) {
  console.error(`API cannot start without following environmental variables: ${missingEnvVars.join(', ')}`)
  process.exit()
}
