function isPowerOfTwo (value) {
  return (value & (value - 1)) === 0 && value !== 0
}

function ceilPowerOfTwo (value) {
  return Math.pow(2, Math.ceil(Math.log(value) / Math.LN2))
}

function floorPowerOfTwo (value) {
  return Math.pow(2, Math.floor(Math.log(value) / Math.LN2))
}

module.exports = {
  isPowerOfTwo,
  ceilPowerOfTwo,
  floorPowerOfTwo
}
