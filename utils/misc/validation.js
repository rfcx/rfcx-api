function findMissingAttributes(obj, attributes){
  var missing = [];

  for(var i=0; i<attributes.length; i++){
    var attr = attributes[i];
    if(! obj.hasOwnProperty(attr)){
      missing.push(attr);
    }
  }
  return missing;
}


var validation = {

    assertAttributesExist: function (obj, attributes) {
      var missing = findMissingAttributes(obj, attributes);

      if(missing.length > 0){
        var msg = "Please provide the following attributes: ";
        msg += missing.join(", ");
        throw new Error(msg);
      }
    }
};

module.exports = validation;