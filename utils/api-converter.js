var urls = require('./misc/urls');

var SequelizeApiConverter = function(type, req) {
    var converter = {}; 
  
    converter.type = type;
    converter.collection = type + "s";
    converter.baseUrl = urls.getApiUrl(req);
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
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          if(key == 'id') {
            continue;
          }

          var camelKey = toCamel(key);
          api.data.attributes[camelKey] = obj[key];
        }
      }
      return api;
    }

    /**
     * Convert camelCase object attributes to underscore format and prepare data for db
     */
    function mapToDb(obj) {
      var db = {};

      db.id = obj.data.id;
      db.type = obj.data.type;

      for (var key in obj.data.attributes) {
        if (obj.data.attributes.hasOwnProperty(key)) {
          var uncamelKey = fromCamel(key);
          db[uncamelKey] = obj.data.attributes[key];
        }
      }

      return db;
    }

    converter.mapToApi = mapToApi; 
    converter.mapToDb = mapToDb;
    return converter;
};


module.exports = SequelizeApiConverter; 