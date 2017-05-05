var guid = {

  /**
   * Generages random guid
   */
  generate: function() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
  },

  /**
   * Checks if given guid has valid format
   *
   * @param {String} guid
   * @return {Boolean} hash
   */
  isValid: function(guid) {
    var regExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regExp.test(guid);
  }

};

module.exports = guid;
