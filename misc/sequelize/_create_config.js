var exec = require('child_process').exec;
var fs = require("fs");

if (fs.existsSync(__dirname+"/../../config/env_vars.js")) {
  var env = require(__dirname+"/../../config/env_vars.js").env;
  for (i in env) { process.env[i] = env[i]; }
}

var file = __dirname+"/../../config/config.json";

var configCustom = '"username": "'+process.env.RDS_USERNAME+'", "password": "'+process.env.RDS_PASSWORD+'", "database": "'+process.env.RDS_DB_NAME+'", "host": "'+process.env.RDS_HOSTNAME+'"';
var configGeneric = '"dialect": "mysql", "define": { "underscored": true, "charset": "utf8", "collate": "utf8_general_ci", "timestamps": true }';

var str = '{ '
  +'\n"development": { '
    +configCustom+', '+configGeneric+' }, '
  +'\n"test": { '
    +configCustom+', '+configGeneric+' }, '
  +'\n"production": { '
    +configCustom+', '+configGeneric+' } '
+'\n}';

// maxConcurrentQueries: 100,
//       dialect: "mysql",
//       define: {
//         underscored: true,
//         charset: "utf8",
//         collate: "utf8_general_ci",
//         timestamps: true
//       },
//       pool: {
//         maxConnections: 5,
//         maxIdleTime: 30
//       },
//       logging: false

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