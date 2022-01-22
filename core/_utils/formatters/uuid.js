const { parse, stringify } = require('uuid')

function isUuid (str) {
  return str.length === 36 && str.charAt(8) === '-'
}

function slugToUuid (slug) {
  const base64 = slug
    .replace(/-/g, '+')
    .replace(/_/g, '/') +
    '=='
  return stringify(Buffer.from(base64, 'base64'))
}

function uuidToSlug (uuid) {
  const bytes = parse(uuid)
  const base64 = (Buffer.from(bytes)).toString('base64')
  const slug = base64
    .replace(/\+/g, '-') // Replace + with - (see RFC 4648, sec. 5)
    .replace(/\//g, '_') // Replace / with _ (see RFC 4648, sec. 5)
    .substring(0, 22) // Drop '==' padding
  return slug
}

module.exports = {
  isUuid,
  slugToUuid,
  uuidToSlug
}
