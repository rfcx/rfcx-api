var fs = require("fs");

if (fs.existsSync("../config/env_vars.js")) {
  var env = require("../config/env_vars.js").env;
  for (i in env) { process.env[i] = env[i]; }
}

if (process.env.NODE_ENV === "production"){
  throw Error("unit tests cannot be run in production!")
}

var dir = './tmp/test';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}