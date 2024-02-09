const regex = {

  regExIndexOf: function (stringToMatch, regExMatchArray) {
    for (const i in regExMatchArray) {
      if (stringToMatch.toString().match(regExMatchArray[i])) {
        return i
      }
    }
    return -1
  }

}

module.exports = regex
