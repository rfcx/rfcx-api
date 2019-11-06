const fs = require('fs');
const unzip = require('unzip2');
const xmldom = new (require('xmldom').DOMParser)();
const togeojson = require('togeojson');

function toKML(path, callback) {

  fs.createReadStream(path)
  .pipe(unzip.Parse())
  .on('entry', function (entry) {
    var fileName = entry.path;
    if (fileName.indexOf('.kml') === -1) {
      entry.autodrain();
      return;
    }

    var data = '';
    entry.on('error', function(err) {
      callback(err);
    });

    entry.on('data', function(chunk) {
      data += chunk;
    });
    entry.on('end', function() {
      callback(null, data);
    });
  })
  .on('error', callback);
};

function toGeoJSON(path, callback) {
  toKML(path, function(error, kml) {
    var geojson = togeojson.kml(xmldom.parseFromString(kml));
    callback(null, geojson);
  });
};

module.exports = {
  toKML,
  toGeoJSON,
};
