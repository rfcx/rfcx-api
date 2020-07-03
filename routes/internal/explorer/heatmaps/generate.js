const Jimp = require('jimp')

const palettes = [
  // Sequential (for indices)
  [0xfff7fbFF, 0xece2f0FF, 0xd0d1e6FF, 0xa6bddbFF, 0x67a9cfFF, 0x3690c0FF, 0x02818aFF, 0x016c59FF, 0x014636FF],
  [0xffffccFF, 0xffeda0FF, 0xfed976FF, 0xfeb24cFF, 0xfd8d3cFF, 0xfc4e2aFF, 0xe31a1cFF, 0xbd0026FF, 0x800026FF],
  [0xf7f4f9FF, 0xe7e1efFF, 0xd4b9daFF, 0xc994c7FF, 0xdf65b0FF, 0xe7298aFF, 0xce1256FF, 0x980043FF, 0x67001fFF],
  // Qualitative (for clusterings)
  [0xa6cee3FF, 0x1f78b4FF, 0xb2df8aFF, 0x33a02cFF, 0xfb9a99FF, 0xe31a1cFF, 0xfdbf6fFF, 0xff7f00FF, 0xcab2d6FF]
]

function generate (values, paletteId = 0) {
  const palette = palettes[paletteId]
  const paletteLength = palette.length
  const emptyColor = 0x00000000

  const imageData = values.map(row => row.map(val =>
    val < 0 || val > 1 ? emptyColor : palette[(val * paletteLength) | 0])
  )

  return new Promise((resolve, reject) => {
    const _ = new Jimp(imageData[0].length, imageData.length, function (err, image) {
      if (err) {
        reject(err)
        return
      }

      imageData.forEach((row, y) => {
        row.forEach((color, x) => {
          image.setPixelColor(color, x, y)
        })
      })

      image.getBuffer(Jimp.MIME_PNG, function (err, buffer) {
        if (err) {
          reject(err)
          return
        }

        resolve(buffer)
      })
    })
  })
}

module.exports = generate
