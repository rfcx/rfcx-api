#!/usr/bin/env node

const stringLength = 12

const reps = 4

function randomStr () {
  let str = ''
  const key = '0123456789abcdef'// ;ghijklmnopqrstuvwxyz';

  for (let i = 0; i < stringLength; i++) { str += key.charAt(Math.floor(Math.random() * key.length)) }

  return str
}

let sum = 0

for (let i = 1; i <= reps; i++) {
  const arr = []

  const start = Math.round((new Date()).valueOf() / 1000)

  do {
    const s = randomStr()
    if (arr.indexOf(s) > -1) { break }
    arr.push(s)
  }
  while (true)

  sum += arr.length

  console.log(i + ') ' + arr.length + ' (' + (Math.round((new Date()).valueOf() / 1000) - start) + ' seconds)')
}

console.log('avg: ' + Math.round(sum / reps))
