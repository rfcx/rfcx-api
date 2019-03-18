"use strict";

var fs        = require("fs");
var path      = require("path");
var Sequelize = require("sequelize");
var env       = process.env.NODE_ENV || "development";
var config    = require(process.cwd() + '/config/config.json')[env];
var sequelize = new Sequelize(config.database, config.username, config.password, config);
var db        = {};

// get file listing in 'models' directory, filtered by those we know to ignore...
fs.readdirSync(__dirname).filter(function(file) {
    return (file.indexOf(".") !== 0) && (file !== "index.js") && !fs.statSync(path.join(__dirname,file)).isDirectory();
  }).forEach(function(file) { importSequelizeModelFile(file); });

// get file listings from inner directories in models
fs.readdirSync(__dirname).filter(function(file) {
    return (file.indexOf(".") !== 0) && fs.statSync(path.join(__dirname,file)).isDirectory();
  }).forEach(function(file) {
    fs.readdirSync(path.join(__dirname,file)).filter(function(fileInDir) {
      return (fileInDir.indexOf(".") !== 0);
    }).forEach(function(fileInDir) { importSequelizeModelFile(path.join(file,fileInDir)); });
  });

Object.keys(db).forEach(function(modelName) {
  if ("associate" in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;

function importSequelizeModelFile(file) {
  var model = sequelize["import"](path.join(__dirname, file));
  db[model.name] = model;
}
