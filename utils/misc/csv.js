
function generateCSV (data, label) {
  var csv = ''
  for (var guid in data) {
    if (data.hasOwnProperty(guid)) { // eslint-disable-line no-prototype-builtins
      var audioObj = data[guid]
      for (var duration in audioObj) {
        if (audioObj.hasOwnProperty(duration)) { // eslint-disable-line no-prototype-builtins
          for (var offset in audioObj[duration]) {
            if (audioObj[duration].hasOwnProperty(offset)) { // eslint-disable-line no-prototype-builtins
              offset = parseInt(offset)
              var value = parseInt(audioObj[duration][offset])
              duration = parseInt(duration)
              csv += guid + ',' + offset + ',' + (offset + duration) + ','
              csv += value === 0 ? 'ambient' : label
              csv += '\r\n'
            }
          }
        }
      }
    }
  }
  return csv
}

module.exports = {
  generateCSV: generateCSV
}
