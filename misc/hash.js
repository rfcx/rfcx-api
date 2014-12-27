var fs = require("fs");
var crypto = require("crypto");

exports.hash = {

  fileSha1: function(filePath) {
    return crypto
      .createHash("sha1")
      .update(fs.readFileSync(filePath))
      .digest("hex");
  }

};
