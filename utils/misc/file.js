const Promise = require('bluebird');
const fs = require('fs');
var loggers = require('../logger');
var logDebug = loggers.debugLogger.log;
var logError = loggers.errorLogger.log;

function serveFile(res, filePathToServe, fileName, mimeType, inline) {
console.log('filePathToServe//////////', filePathToServe, 'fileName', fileName, 'mimeType', mimeType, 'inline', inline);
  return new Promise((resolve, reject) => {
    try {
      fs.stat(filePathToServe, (err, stat) => {
        console.log('stat-----', stat);
        if (err) {
          console.log('eRRRRRRRRRR++++++++0000', err);
          reject(err);
        }
        else {
          let headers = {
            'Content-Type': mimeType,
            'Content-Length': stat.size,
            'Accept-Ranges': `bytes 0-${stat.size-1}/${stat.size}`,
            'Content-Disposition': `attachment; filename=${fileName}`,
            'Cache-Control': 'max-age=600'
          }
          console.log('headers++++++++', headers);
          // if we'd like to open file in browser instead of downloading it
          if (inline) {
            delete headers['Content-Disposition'];
          }

          res.writeHead(200, headers);

          fs.createReadStream(filePathToServe)
            .on('end', () => {
              res.end();
              console.log('res++++++++', res);
              resolve();
              fs.unlink(filePathToServe, (err) => {
                if (err) {
                  console.log('eRRRRRRRRRR++++++++11111111', err);
                  logError(`Failed to remove local file ${filePathToServe}`, { err });
                }
              });
            })
            .pipe(res, { end: true });
        }
      });
    }
    catch(e) {
      console.log('eRRRRRRRRRR++++++++2222222', e);
      reject(e);
    }
  })
}

module.exports = {
  serveFile,
}
