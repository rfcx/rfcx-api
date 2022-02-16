const fonts = {
  Roboto: {
    normal: 'node_modules/roboto-font/fonts/Roboto/roboto-regular-webfont.ttf',
    bold: 'node_modules/roboto-font/fonts/Roboto/roboto-bold-webfont.ttf',
    italics: 'node_modules/roboto-font/fonts/Roboto/roboto-italic-webfont.ttf',
    bolditalics: 'node_modules/roboto-font/fonts/Roboto/roboto-bolditalic-webfont.ttf'
  }
}

const PdfPrinter = require('pdfmake')
const Promise = require('bluebird')
const printer = new PdfPrinter(fonts)

function printFromPDFMakeObj (obj) {
  return new Promise((resolve, reject) => {
    const doc = printer.createPdfKitDocument(obj)

    const chunks = []
    let result

    doc.on('error', (err) => {
      reject(err)
    })
    doc.on('data', (chunk) => {
      chunks.push(chunk)
    })
    doc.on('end', () => {
      result = Buffer.concat(chunks)
      resolve(result.toString('base64'))
    })
    doc.end()
  })
}

module.exports = {
  printFromPDFMakeObj
}
