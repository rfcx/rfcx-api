"use strict";

var fs        = require("fs");
var path      = require("path");
var Sequelize = require("sequelize");
var env       = process.env.NODE_ENV || "development";

let options = {
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'development' && process.env.POSTGRES_HOSTNAME !== 'localhost' && process.env.POSTGRES_HOSTNAME !== '127.0.0.1',
  },
  host: process.env.POSTGRES_HOSTNAME,
  port: process.env.POSTGRES_PORT,
  define: {
    underscored: true,
    charset: 'utf8',
    dialectOptions: {
      collate: 'utf8_general_ci'
    },
    timestamps: true
  }
}
if (env === 'development') {
  options.logging = function(str) {
    console.log('\nPostgres QUERY----------------------------------\n', str, '\n----------------------------------');
  }
}
var sequelize = new Sequelize(process.env.POSTGRES_DB, process.env.POSTGRES_USER, process.env.POSTGRES_PASSWORD, options);
var db        = {};

sequelize
  .authenticate()
  .then(() => {
    console.log('Connected to TimescaleDB.');
  })
  .catch(err => {
    console.error('Unable to connect to TimescaleDB:', err);
  });

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

defineRelationships();

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;

function importSequelizeModelFile(file) {
  var model = sequelize.import(path.join(__dirname, file));
  db[model.name] = model;
}

function defineRelationships() {
  sequelize.models.Classification.belongsTo(sequelize.models.ClassificationType, { as: 'Type', foreignKey: "type" });
  sequelize.models.Classification.belongsTo(sequelize.models.ClassificationSource, { as: 'Source', foreignKey: "source" });
  sequelize.models.Classification.belongsTo(sequelize.models.Classification, { as: 'Parent', foreignKey: "parent" });
  sequelize.models.Classification.hasMany(sequelize.models.SpeciesName, { as: "Name", foreignKey: "species" });

  sequelize.models.SpeciesName.belongsTo(sequelize.models.Language, { as: 'Language', foreignKey: "language" });
  sequelize.models.SpeciesName.belongsTo(sequelize.models.Classification, { as: 'Species', foreignKey: 'species' });
}
