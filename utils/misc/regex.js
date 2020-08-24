
var regex = {

  regExIndexOf: function (stringToMatch, regExMatchArray) {
    for (var i in regExMatchArray) {
      if (stringToMatch.toString().match(regExMatchArray[i])) {
        return i
      }
    }
    return -1
  }

}

module.exports = regex
