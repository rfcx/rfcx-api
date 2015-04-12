require('./test.000.init.js').expect;
var expect = require('chai').expect;
var fs = require('fs');
var fileKeeper = require("../file_storage/file-keeper.js");

describe('file_storage/fileKeeper',function(){
  
  describe('putFile',function(){
    
    var fileName;
    var testBucket = "rfcx-development";
    var testFolder = "tests/";
        
    before(function(done){
      fileName = 'readme' + Date.now() + '.md';
      //copy readme.md file to tmp folder under a different name
      fs.createReadStream('./readme.md').pipe(fs.createWriteStream(process.cwd()+"/tmp/test-assets/" + fileName))
      .on('finish', function(){
        //put a file with a random name in storage
        fileKeeper.putFile(process.cwd()+"/tmp/test-assets/" + fileName, testBucket, testFolder+fileName)
        .then(function(fkRes){
          if(fkRes.statusCode != "200"){
           throw new Error("operation not completed successfully. Status Code: " + fkRes.statusCode);
          }
        })
        .done(done);
      });
    });

    it('should put a file in a bucket, then retrieve it',function(done){
      fileKeeper.getFile(testFolder+fileName, testBucket)
      .then(function(fkRes){
        expect(fkRes.statusCode).to.equal(200);
      })
      .done(done);
    });
     
    after(function(done){
      fs.unlink(process.cwd()+"/tmp/test-assets/" + fileName,function(e){if(e){console.log(e);}});
      fileKeeper.deleteFile(testFolder+fileName, testBucket)
      .then(function(fkRes) {
        if(204 != fkRes.statusCode) {
          console.log("couldn't delete file from storage: " + testBucket + " " + fileName);
        }
      })
      .done(done);
    });
    
  });
  
});