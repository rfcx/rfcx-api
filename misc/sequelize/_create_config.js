var exec = require('child_process').exec;
var fs = require("fs");

if (fs.existsSync(__dirname+"/../../config/env_vars.js")) {
  var env = require(__dirname+"/../../config/env_vars.js").env;
  for (i in env) { process.env[i] = env[i]; }
}

var file = __dirname+"/../../config/config.json";
  
var str = '{ '
  +'"development": { '
    +'"username": "'+process.env.RDS_USERNAME+'", "password": "'+process.env.RDS_PASSWORD+'", "database": "'+process.env.RDS_DB_NAME+'", "host": "'+process.env.RDS_HOSTNAME+'", "dialect": "mysql" }, '
  +'"test": { '
    +'"username": "'+process.env.RDS_USERNAME+'", "password": "'+process.env.RDS_PASSWORD+'", "database": "'+process.env.RDS_DB_NAME+'", "host": "'+process.env.RDS_HOSTNAME+'", "dialect": "mysql" }, '
  +'"production": { '
    +'"username": "'+process.env.RDS_USERNAME+'", "password": "'+process.env.RDS_PASSWORD+'", "database": "'+process.env.RDS_DB_NAME+'", "host": "'+process.env.RDS_HOSTNAME+'", "dialect": "mysql" } '
+'}';

  fs.unlink(file,function(e){
    fs.writeFile(file, str, function(e){
      if (!e) {
        exec( "echo 'done'; "
              ,function(err,stdout,stderr){
          console.log(stdout);
        });
      }
    });
  });