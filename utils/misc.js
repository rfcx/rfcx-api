

var misc = {

    /**
     * Regular Expression IndexOf for Arrays
     * With this  little addition to the Array prototype will iterate over array
     * and return the index of the first element which matches the provided
     * regular expresion.
     * Note: This will not match on objects.
     * @param  {RegEx}   rx The regular expression to test with. E.g. /-ba/gim
     * @return {Numeric} -1 means not found
     */

    regExIndexOf: function(regExMatch){
      for (var i in this) {
        if (this[i].toString().match(regExMatch)) {
          return i;
        }
      }
      return -1;
    }

};

module.exports = misc;
