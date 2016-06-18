
var options = {

  "404": {
    "default": "Not Found",
    "database": "Record Not Found"
  },

  "500": {
    "default": "Internal Server Error",
    "database": "Server Error While Retrieving Data",
    "parse": "Failed to parse input"
  },

  "403": {
    "default": "Not authorized to access this resource",
    "user": "Only users are authorized to access this resource"
  }

};

var httpError = function(res, code, context) {
  
  var json = {
      message: ((context != null) && (options[""+code][""+context] != null)) ? options[""+code][""+context] : options[""+code]["default"],
      error: {
        status: parseInt(code)
      }
    };
  console.log("Error: "+json.message);
  res.status(parseInt(code)).json(json);
};

module.exports = httpError;
