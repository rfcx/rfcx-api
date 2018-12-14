#!/usr/bin/env node

var arr = [];


function randomStr() {
	var len = 8;
  var str = "";
  var key = "0123456789abcdefghijklmnopqrstuvwxyz";

  for (var i = 0; i < len; i++)
    str += key.charAt(Math.floor(Math.random() * key.length));

  return str;
}

do {
	var s = randomStr();
	if (arr.indexOf(s) > -1) { break; }
	arr.push(s);
}
while (true);

console.log(arr.length);