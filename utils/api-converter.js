
var SequelizeApiConverter = function(type, baseUrl) {
    var converter = {}; 
  
    converter.type = type;
    converter.collection = type + "s";
    converter.baseUrl = baseUrl;
  
    function fromCamel(cameledName) {
      // Todo think about names starting with a capital letter 
      return cameledName.replace(/([A-Z])/g, function(m) { return '_' + m.toLowerCase()})
    }

    function toCamel(uncameledName) {
      return uncameledName.replace(/_([a-z])/, function(m) {return m[1].toUpperCase();});
    }

    function createApiObj(id) {
      var api = {
        data: {
          id: id, 
          type: converter.type, 
          attributes: {}
        },
        links: {
          self: converter.baseUrl + "/" + converter.collection + "/" + id
        }
      };

      return api; 
    }


    function mapToApi(obj) {
      obj = obj.dataValues;
      var id = obj.id;
      var api = createApiObj(id);
      for (var key of Object.keys(obj)) {
        if(key == 'id') {
          continue; 
        }
        
        var camelKey = toCamel(key);
        api.data.attributes[camelKey] = obj[key];
      }
      return api;
    }

    function mapToDb(obj) {
      var db = {};
      db.id = obj.data.id;
      

      for (var key of Object.keys(obj.data.attributes)) {
        var uncamelKey = fromCamel(key);
        db[uncamelKey] = obj.data.attributes[key];
      }

      return db;
    }

    converter.mapToApi = mapToApi; 
    converter.mapToDb = mapToDb;
    return converter;
}


module.exports = SequelizeApiConverter; 