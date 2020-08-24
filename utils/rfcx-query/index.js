'use strict'

var fs = require('fs')
var path = require('path')
var helpers = {}

fs.readdirSync(__dirname).filter(function (file) {
  return (file.indexOf('.') !== 0) && (file !== 'index.js') && !fs.statSync(path.join(__dirname, file)).isDirectory()
}).forEach(function (file) {
  importHelperFile(path.join(__dirname, file))
})

// get file listings from inner directories
fs.readdirSync(__dirname).filter(function (file) {
  return (file.indexOf('.') !== 0) && fs.statSync(path.join(__dirname, file)).isDirectory()
}).forEach(function (file) {
  fs.readdirSync(path.join(__dirname, file)).filter(function (fileInDir) {
    return (fileInDir.indexOf('.') !== 0) && !fs.statSync(path.join(__dirname, file, fileInDir)).isDirectory()
  }).forEach(function (fileInDir) {
    importHelperFile(path.join(__dirname, file, fileInDir))
  })
})

// get file listings from inner sub directories
fs.readdirSync(__dirname).filter(function (file) {
  return (file.indexOf('.') !== 0) && fs.statSync(path.join(__dirname, file)).isDirectory()
}).forEach(function (file) {
  fs.readdirSync(path.join(__dirname, file)).filter(function (fileInDir) {
    return (fileInDir.indexOf('.') !== 0) && fs.statSync(path.join(__dirname, file, fileInDir)).isDirectory()
  }).forEach(function (fileInDir) {
    fs.readdirSync(path.join(__dirname, file, fileInDir)).filter(function (fileInSubDir) {
      return (fileInSubDir.indexOf('.') !== 0) && !fs.statSync(path.join(__dirname, file, fileInDir, fileInSubDir)).isDirectory()
    }).forEach(function (fileInSubDir) {
      importHelperFile(path.join(__dirname, file, fileInDir, fileInSubDir))
    })
  })
})

module.exports = helpers

function importHelperFile (filePath) {
  var helperFile = require(filePath)
  Object.keys(helperFile).forEach(function (typeKey) {
    if (helpers[typeKey] == null) { helpers[typeKey] = {} }
    Object.keys(helperFile[typeKey]).forEach(function (helperKey) {
      helpers[typeKey][helperKey] = helperFile[typeKey][helperKey]
    })
  })
}
