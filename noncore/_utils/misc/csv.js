function generateCSV (data, label) {
  let csv = ''
  for (const guid in data) {
    if (data.hasOwnProperty(guid)) { // eslint-disable-line no-prototype-builtins
      const audioObj = data[guid]
      for (let duration in audioObj) {
        if (audioObj.hasOwnProperty(duration)) { // eslint-disable-line no-prototype-builtins
          for (let offset in audioObj[duration]) {
            if (audioObj[duration].hasOwnProperty(offset)) { // eslint-disable-line no-prototype-builtins
              offset = parseInt(offset)
              const value = parseInt(audioObj[duration][offset])
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
  generateCSV
}
