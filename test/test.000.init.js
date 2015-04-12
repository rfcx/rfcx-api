var fs = require("fs");

if (fs.existsSync(process.cwd()+"/config/env_vars.js")) {
  var env = require(process.cwd()+"/config/env_vars.js").env;
  for (i in env) { process.env[i] = env[i]; }
}

if (process.env.NODE_ENV === "production"){
  throw Error("unit tests cannot be run in production!")
}

if (fs.existsSync(process.cwd()+"/config/config.json")) {
  console.log("config.json exists");
} else {
  console.log("config.json does not exist");
}