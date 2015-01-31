require('./init-test').expect;
var expect = require('chai').expect;
var hash = require("../misc/hash.js").hash;

var sha1Regex = /^[0-9a-f]{40}$/i;

describe('misc/hash',function(){
  
  describe('fileSha1Async',function(){
  
    it('should take a file path and return a hash asynchronously',function(done){
      hash.fileSha1Async("README.MD")
      .then(function(fileHash){
        expect(fileHash).to.not.be.empty();
        expect(fileHash).to.match(sha1Regex);
      })
      .done(done);
    });
    
    it('should take a null file path and return null',function(done){
      hash.fileSha1Async(null)
      .then(function(fileHash){
        expect(fileHash).to.not.exist();
      })
      .done(done);
    });
    
    it('should throw an error if a path to a non existant file is given',function(done){
      hash.fileSha1Async("aeafwerwea.fsd")
      .then(function(fileHash){
        
      })
      .catch(function(err){
        expect(err).to.exist();
        expect(err.cause.code).to.equal('ENOENT');
      })
      .done(done);
    });
    
  });
  
  describe('fileSha1',function(){

    it('should take a file path and return a hash',function(){
      var fileHash = hash.fileSha1("README.MD");
      expect(fileHash).to.not.be.empty();
      expect(fileHash).to.match(sha1Regex);
    });
    
  });
  
});