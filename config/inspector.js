const envVarsSample = require('./env_vars.js.sample');
const requiredEnvVars = (envVarsSample.env || []);

let missingEnvVars = [];

for (let envVar in requiredEnvVars) {
  if (process.env[envVar] === undefined) {
    missingEnvVars.push(envVar);
  }
}

if (process.env.PLATFORM && !['amazon', 'google'].includes(process.env.PLATFORM)) {
  console.error(`"PLATFORM" environmental variable can be only "amazon" or "google"`);
  process.exit();
}

if (missingEnvVars.length) {
  console.error(`API cannot start without following environmental variables: ${missingEnvVars.join(', ')}`);
  process.exit();
}
