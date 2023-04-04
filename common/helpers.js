// https://advancedweb.hu/how-to-use-async-functions-with-array-filter-in-javascript/
const asyncFilter = async (arr, predicate) =>
  arr.reduce(async (memo, e) =>
    [...await memo, ...await predicate(e) ? [e] : []]
  , [])

// https://advancedweb.hu/how-to-use-async-functions-with-array-some-and-every-in-javascript/
const asyncSome = async (arr, predicate) => (await asyncFilter(arr, predicate)).length > 0
const asyncEvery = async (arr, predicate) => (await asyncFilter(arr, predicate)).length === arr.length

function getRandomFromArray (array) {
  return array[Math.floor(Math.random() * array.length)]
}

function randomBetween (min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

module.exports = {
  asyncFilter,
  asyncSome,
  asyncEvery,
  getRandomFromArray,
  randomBetween
}
