const fs = require('fs')
const unzip = require('node-unzip-2')
const xmldom = new (require('xmldom').DOMParser)()
const togeojson = require('togeojson')
const Promise = require('bluebird')

function toKML (path, callback) {
  fs.createReadStream(path)
    .pipe(unzip.Parse())
    .on('entry', function (entry) {
      var fileName = entry.path
      if (fileName.indexOf('.kml') === -1) {
        entry.autodrain()
        return
      }

      var data = ''
      entry.on('error', function (err) {
        callback(err)
      })

      entry.on('data', function (chunk) {
        data += chunk
      })
      entry.on('end', function () {
        callback(null, data)
      })
    })
    .on('error', callback)
};

function toGeoJSON (path, isKML) {
  return new Promise((resolve, reject) => {
    if (!isKML) {
      toKML(path, (error, kml) => {
        if (error) {
          reject(error)
        } else {
          const geojson = togeojson.kml(xmldom.parseFromString(kml))
          resolve(geojson)
        }
      })
    } else {
      var kml = xmldom.parseFromString(fs.readFileSync(path, 'utf8'))
      if (!kml) {
        reject() // eslint-disable-line prefer-promise-reject-errors
      } else {
        const geojson = togeojson.kml(kml)
        resolve(geojson)
      }
    }
  })
};

module.exports = {
  toKML,
  toGeoJSON
}
