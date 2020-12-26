const { parse, stringify } = require('uuid')

function slugToUuid (uuidOrSlug) {
  if (uuidOrSlug.length === 36) {
    return uuidOrSlug
  }
  const base64 = uuidOrSlug
    .replace(/-/g, '+')
    .replace(/_/g, '/') +
                  '=='
  return stringify(Buffer.from(base64, 'base64'))
}

function uuidToSlug (uuid) {
  var bytes = parse(uuid)
  var base64 = (Buffer.from(bytes)).toString('base64')
  var slug = base64
    .replace(/\+/g, '-') // Replace + with - (see RFC 4648, sec. 5)
    .replace(/\//g, '_') // Replace / with _ (see RFC 4648, sec. 5)
    .substring(0, 22) // Drop '==' padding
  return slug
}

module.exports = {
  slugToUuid,
  uuidToSlug
}
