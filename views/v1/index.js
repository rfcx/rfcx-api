"use strict";

var fs        = require("fs");
var path      = require("path");
var env       = process.env.NODE_ENV || "development";
var views     = {};

fs.readdirSync(__dirname)
  .filter(function(file) {
    return (file.indexOf(".") !== 0) && (file !== "index.js") && !fs.statSync(path.join(__dirname,file)).isDirectory();
  }).forEach(function(file) {
    // var model = sequelize["import"](path.join(__dirname, file));
    // db[model.name] = model;
  });

// get file listings from inner directories
fs.readdirSync(__dirname).filter(function(file) {
    return (file.indexOf(".") !== 0) && fs.statSync(path.join(__dirname,file)).isDirectory();
  }).forEach(function(file) { 
    fs.readdirSync(path.join(__dirname,file)).filter(function(fileInDir) {
      return (fileInDir.indexOf(".") !== 0);
    }).forEach(function(fileInDir) { 
//      importSequelizeModelFile(file+"/"+fileInDir);
    });
  });

module.exports = views;