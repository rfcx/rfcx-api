

function generateCSV(data, label) {
  var csv = '';
  for (var guid in data) {
    if (data.hasOwnProperty(guid)) {
      var audioObj = data[guid];
      for (var duration in audioObj) {
        if (audioObj.hasOwnProperty(duration)) {
          for (var offset in audioObj[duration]) {
            if (audioObj[duration].hasOwnProperty(offset)) {
              offset = parseInt(offset);
              var value = parseInt(audioObj[duration][offset]);
              duration = parseInt(duration);
              csv += guid + ',' + offset + ',' + (offset + duration) + ',';
              csv += value === 0 ? 'ambient' : label;
              csv += '\r\n';
            }
          }
        }
      }
    }
  }
  return csv;
}

module.exports = {
  generateCSV: generateCSV
};
