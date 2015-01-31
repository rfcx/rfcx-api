var env = require("../config/env_vars.js").env;
for (i in env) { process.env[i] = env[i]; }
if (process.env.NODE_ENV === "production"){
  throw Error("unit tests cannot be run in production!")
}
var fs_test = require('fs');
var dir = './tmp/test';
if (!fs_test.existsSync(dir)){
    fs_test.mkdirSync(dir);
}

