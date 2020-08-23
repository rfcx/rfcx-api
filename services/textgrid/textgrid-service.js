function prepareTextGrid (item) {
  let textGrid = ''
  textGrid += 'File type = \'ooTextFile\''
  textGrid += '\nObject class = \'TextGrid\'\n'
  textGrid += `\nxmin = ${item.xmin_global}`
  textGrid += `\nxmax = ${item.xmax_global}`
  textGrid += '\ntiers? <exists>'
  textGrid += `\nsize = ${item.size}`
  textGrid += '\nitem []:'
  textGrid += `
  item [1]:
    class = 'IntervalTier'
    name = '${item.audioGuid}'
    xmin = ${item.xmin_global}
    xmax = ${item.xmax_global}
    intervals: size = '${item.audioWindows.length}'`
  item.audioWindows.forEach((obj, index) => {
    textGrid += `
    intervals [${index + 1}]:
      xmin: ${obj.start / 1000}
      xmax: ${obj.end / 1000}`
    if (obj.ymin) {
      textGrid += `
      ymin: ${obj.ymin}`
    }
    if (obj.ymax) {
      textGrid += `
      ymax: ${obj.ymax}`
    }
    if (item.label) {
      textGrid += `
      text: ${item.label}`
    }
    if (obj.confirmed !== undefined) {
      textGrid += `
      type: ${obj.confirmed}`
    }
  })
  return textGrid
}

module.exports = {
  prepareTextGrid
}
