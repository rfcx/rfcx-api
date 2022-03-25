const fs = require('fs')

// check for environment variables file and load if present
if (fs.existsSync('./common/config/env_vars.js')) {
  console.info('Using env_vars.js')
  const env = require('./env_vars').env
  for (const i in env) { process.env[i] = env[i] }
}
