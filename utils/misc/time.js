function addLeadingZero(t){
  return t<=9 ? "0" + t : t;
}

var time = {
  /**
   * We round the time so that all times only have 0 or 500 miliseconds - our quantum of time
   * @returns {Date} quantified time
   */
  quantify: function(dateTime){
    const miliseconds = dateTime.getMilliseconds();

    // first trident (like quadrant but for three segments? )
    if(miliseconds >= 0 && miliseconds < 250 ) {
      dateTime.setMilliseconds(0);
    }

    // second trident
    if(miliseconds >= 250 && miliseconds < 750 ) {
      dateTime.setMilliseconds(500);
    }

    // third trident
    if(miliseconds >= 750) {
      // setting miliseconds above 999 will add the appropriate secs to the date
      dateTime.setMilliseconds(1000);
      dateTime.setMilliseconds(0);
    }

    return dateTime;
  },

  dateTimeToMysqlString: function(dateTime) {
    var month = dateTime.getMonth() + 1;
    var day = dateTime.getDay() + 1;
    return "" + dateTime.getFullYear() + "-" + addLeadingZero(month)  + "-" + addLeadingZero(day) + " " +
      addLeadingZero(dateTime.getHours())+ ":" + addLeadingZero(dateTime.getMinutes()) + ":" + addLeadingZero(dateTime.getSeconds()) +
      "." + (dateTime.getMilliseconds() == 500 ? "500" : "000");
  }

};

module.exports = time;
