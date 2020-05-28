const envVarsSample = require('./env_vars.js.sample');
const requiredEnvVars = (envVarsSample.env || []);

let missingEnvVars = [];

for (let envVar in requiredEnvVars) {
  if (process.env[envVar] === undefined) {
    missingEnvVars.push(envVar);
  }
}

if (missingEnvVars.length) {
  console.error(`API cannot start without following environmental variables: ${missingEnvVars.join(', ')}`);
  process.exit();
}
