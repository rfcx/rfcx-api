"use strict";

var fs        = require("fs");
var path      = require("path");
var Sequelize = require("sequelize");
var env       = process.env.NODE_ENV || "development";
var config    = require(__dirname + '/../config/config.json')[env];
var sequelize = new Sequelize(config.database, config.username, config.password, config);
var db        = {};

fs
  .readdirSync(__dirname)
  .filter(function(file) {
    return (file.indexOf(".") !== 0) && (file !== "index.js") && (file !== "index.orig.js") && (file !== "_associations.js");
  })
  .forEach(function(file) {
    var model = sequelize["import"](path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach(function(modelName) {
  if ("associate" in db[modelName]) {
    if (!!db[modelName].associate(db)) {

      var assoc = db[modelName].associate(db);
      var syncChain = new Sequelize.Utils.QueryChainer();
      syncChain.add(
        db[modelName].belongsTo(db.GuardianSoftware,{as:"SoftwareVersion"})
      );
       syncChain.run();
    // .success(function(){ console.log("Model sync success"); })
    // .error(function(err){ console.log("Model sync failure -> "+err); });
      
    }
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
