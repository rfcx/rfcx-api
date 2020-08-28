'use strict'

var fs = require('fs')
var path = require('path')
var views = {}

fs.readdirSync(__dirname).filter(function (file) {
  return (file.indexOf('.') !== 0) && (file !== 'index.js') && !fs.statSync(path.join(__dirname, file)).isDirectory()
}).forEach(function (file) {
  importRfcxViewFile(path.join(__dirname, file))
})

// get file listings from inner directories
fs.readdirSync(__dirname).filter(function (file) {
  return (file.indexOf('.') !== 0) && fs.statSync(path.join(__dirname, file)).isDirectory()
}).forEach(function (file) {
  fs.readdirSync(path.join(__dirname, file)).filter(function (fileInDir) {
    return (fileInDir.indexOf('.') !== 0) && !fs.statSync(path.join(__dirname, file, fileInDir)).isDirectory()
  }).forEach(function (fileInDir) {
    importRfcxViewFile(path.join(__dirname, file, fileInDir))
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
      importRfcxViewFile(path.join(__dirname, file, fileInDir, fileInSubDir))
    })
  })
})

module.exports = views

function importRfcxViewFile (filePath) {
  var viewFile = require(filePath)
  Object.keys(viewFile).forEach(function (typeKey) {
    if (views[typeKey] == null) { views[typeKey] = {} }
    Object.keys(viewFile[typeKey]).forEach(function (viewKey) {
      views[typeKey][viewKey] = viewFile[typeKey][viewKey]
    })
  })
}
