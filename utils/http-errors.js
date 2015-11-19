
var options = {

  "404": {
    "default": "Not Found",
    "database": "Record Not Found"
  },

  "500": {
    "default": "Internal Server Error",
    "database": "Server Error While Retrieving Data"
  },

};

var httpError = function(res, code, context) {
    
  res.status(parseInt(code))
    .json({
      message: ((context != null) && (options[""+code][""+context] != null)) ? options[""+code][""+context] : options[""+code]["default"],
      error: {
        status: parseInt(code)
      }
    });
}

module.exports = httpError;
