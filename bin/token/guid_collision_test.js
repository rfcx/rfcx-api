#!/usr/bin/env node

var stringLength = 12

var reps = 4

function randomStr () {
  var str = ''
  var key = '0123456789abcdef'// ;ghijklmnopqrstuvwxyz';

  for (var i = 0; i < stringLength; i++) { str += key.charAt(Math.floor(Math.random() * key.length)) }

  return str
}

var sum = 0

for (var i = 1; i <= reps; i++) {
  var arr = []

  var start = Math.round((new Date()).valueOf() / 1000)

  do {
    var s = randomStr()
    if (arr.indexOf(s) > -1) { break }
    arr.push(s)
  }
  while (true)

  sum += arr.length

  console.log(i + ') ' + arr.length + ' (' + (Math.round((new Date()).valueOf() / 1000) - start) + ' seconds)')
}

console.log('avg: ' + Math.round(sum / reps))
