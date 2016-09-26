var guid = {

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