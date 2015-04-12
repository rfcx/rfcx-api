require('./test.000.init.js').expect;
var expect = require('chai').expect;
var guardianSoftware = require("../data_storage/guardian-software.js");

describe('data_storage/guardian-storage',function(){

  describe('delete',function(){
    var softwareVersion = "-0.0.1";

    before(function(done){
      //create a new guardian software record
      guardianSoftware.upsertGuardianSoftware(softwareVersion, null)
      .done(done);
    });

    it('should remove record on delete',function(done){
      //make sure there's actualy a record to begin with
      guardianSoftware.findGuardianSoftware(softwareVersion)
      .then(function(gs) {
        expect(gs).to.exist();
        //delete the guardian software record that was just created
        return guardianSoftware.deleteGuardianSoftware(softwareVersion);
      })
      .then(function(){
        return guardianSoftware.findGuardianSoftware(softwareVersion);
      })
      .then(function(gs){
        expect(gs).to.not.exist();
      })  
      .done(done);
    });
  
    after(function(done){
      guardianSoftware.deleteGuardianSoftware(softwareVersion)
      .done(done);
    });
  });
    
  describe('upsert without a file hash',function(){
    var softwareVersion = "-0.0.1";
    var gsInstance;

    before(function(done){
      //create a new guardian software record
      guardianSoftware.upsertGuardianSoftware(softwareVersion, "")
      .then(function(gs){
        gsInstance = gs;
      })
      .done(done);
    });

    it('should have a software version',function(){
      expect(gsInstance).to.have.property('number',softwareVersion);
    });

    it('should not have a file hash',function(){
      expect(gsInstance).to.not.have.property('sha1_checksum');
    });

    it('should not be available',function(){
      expect(gsInstance).to.have.property('is_available',false);
    });

    after(function(done){
      guardianSoftware.deleteGuardianSoftware(softwareVersion).done(done);
    });
  });
 
  describe('upsert with a file hash',function(){
    var softwareVersion = "-0.0.1";
    var fileHash = "dsfsfdsdafdsfsa";
    var gsInstance;

    before(function(done){
      //create a new guardian software record
      guardianSoftware.upsertGuardianSoftware(softwareVersion, fileHash)
      .then(function(gs){
        gsInstance = gs;
      })
      .done(done);
    });

    it('should have a software version',function(){
      expect(gsInstance).to.have.property('number',softwareVersion);
    });

    it('should have a file hash',function(){
      expect(gsInstance).to.have.property('sha1_checksum',fileHash);
    });
    
    it('should have a url',function(){
      expect(gsInstance).to.have.property('url',process.env.GUARDIAN_DOWNLOAD_PATH+softwareVersion+".apk");
    });

    it('should be available',function(){
      expect(gsInstance).to.have.property('is_available',true);
    });

    after(function(done){
      guardianSoftware.deleteGuardianSoftware(softwareVersion).done(done);
    });
  });

  describe('upsert existing software version',function(){
    var softwareVersion = "-0.0.1";
    var fileHash = "dsfsfdsdafdsfsa";
    var newFileHash ="e23we23ewe12";
    var gsInstance;

    before(function(done){
      //create a new guardian software record
      guardianSoftware.upsertGuardianSoftware(softwareVersion, fileHash)
      .then(function(gs){
        gsInstance = gs;
      })
      .done(done);
    });

    it('should be updated with new fileHash',function(done){
      //upsert guardian software with the same version as an existing record
      guardianSoftware.upsertGuardianSoftware(softwareVersion, newFileHash)
      .then(function() {
        return guardianSoftware.findGuardianSoftware(softwareVersion);
      })
      .then(function(gs){
        expect(gs).to.have.property('number',softwareVersion);
        expect(gs).to.have.property('sha1_checksum',newFileHash);
        expect(gs).to.have.property('is_available',true);
      })  
      .done(done);
    });

    after(function(done){
      guardianSoftware.deleteGuardianSoftware(softwareVersion).done(done);
    });
  });

});