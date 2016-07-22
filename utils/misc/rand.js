

var rand = {

  /**
   * "Flips a coin" to get random result
   * @returns {boolean} true of false randomly
   */
  flipCoin: function(){
    return !!Math.floor(Math.random() * 2);
  }

};

module.exports = rand;
