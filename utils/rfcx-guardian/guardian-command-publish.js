var Promise = require('bluebird')
var zlib = require('zlib')

exports.guardianCommand = {

  processAndCompressCommandJson: function (checkInObj) {
    return new Promise(function (resolve, reject) {
      try {
        for (var prop in checkInObj.rtrn.obj) {
          if (!checkInObj.rtrn.obj.hasOwnProperty(prop)) continue // eslint-disable-line no-prototype-builtins
          if (  (Array.isArray(checkInObj.rtrn.obj[prop]) && (checkInObj.rtrn.obj[prop].length === 0)) 
             || (checkInObj.rtrn.obj[prop] == null)
            ) {
            delete checkInObj.rtrn.obj[prop]
          }
        }

        zlib.gzip(Buffer.from(JSON.stringify(checkInObj.rtrn.obj), 'utf8'), function (errJsonGzip, bufJsonGzip) {
          if (errJsonGzip) { console.log(errJsonGzip); reject(new Error(errJsonGzip)) } else {
            checkInObj.rtrn.gzip = bufJsonGzip
            resolve(checkInObj)
          }
        })
      } catch (errProcessPublishJson) { console.log(errProcessPublishJson); reject(new Error(errProcessPublishJson)) }
    })
  }

}


