var request = require('supertest');
var sinon = require('sinon');
var expect = require('chai').expect;
var Promise = require("bluebird");
var app = require('../app');

describe('post /v1/guardians/upload/software', function(){
  
  var fileKeeper = require('../file_storage/file-keeper.js');
  var guardianSoftware = require('../data_storage/guardian-software.js');
  var fileKeeperStub;
  
  before(function(done){
    fileKeeperStub = sinon
      .stub(fileKeeper, "putFile", function(filePath, bucketName) {
        return new Promise(function(resolve,reject){resolve({ statusCode: 200 })});
      });
    sinon
      .stub(guardianSoftware, "upsertGuardianSoftware", function(softwareVersion, fileHash) {
        return new Promise(function(resolve,reject){resolve()});
      });
    done();
  });
  
  after(function(done){
    fileKeeper.putFile.restore();
    guardianSoftware.upsertGuardianSoftware.restore();
    done();
  });
    
  it('should respond with status 200 when software version specified', function(done){
    request(app)
      .post('/v1/guardians/upload/software')
      .field( 'software_version', '-0.0.1')
      .end(function(err, res) {
          expect(err).not.exist();
          expect(res).to.have.property('status',200);
          done();
      });
  })
  
  it('should respond with status 500 when software version not specified', function(done){
    request(app)
      .post('/v1/guardians/upload/software')
      .field( 'software_version', '')
      .end(function(err, res) {
          expect(err).not.exist();
          expect(res).to.have.property('status',500);
          expect(JSON.parse(res.text)).to.have.property('msg','a software version must be specified');
          done();
      });
  })
  
  it('should respond with status 200 and call file storage when all parameters provided', function(done){
    fileKeeperStub.reset();
    request(app)
      .post('/v1/guardians/upload/software')
      .field( 'software_version', '-0.0.1')
      .attach('software', 'README.md')
      .end(function(err, res) {
          expect(err).not.exist();
          expect(res).to.have.property('status',200);
          expect(fileKeeperStub.called).to.be.true();
          done();
      });
  })
  
  it('should respond with status 500 when file storage fails', function(done){
    fileKeeper.putFile.restore();
    sinon.stub(fileKeeper, "putFile", function(filePath, bucketName) {
      return new Promise(function(resolve,reject){resolve({ statusCode: 500, msg: 'file keeper failure' })});
    });
    
    request(app)
      .post('/v1/guardians/upload/software')
      .field( 'software_version', '-0.0.1')
      .attach('software', 'README.md')
      .end(function(err, res) {
          expect(err).not.exist();
          expect(res).to.have.property('status',500);
          expect(JSON.parse(res.text)).to.have.property('msg',
            'file keeper error storing guardian software file: file keeper failure');
          done();
      });
  })
  
  it('should respond with status 500 when data storage fails', function(done){
    guardianSoftware.upsertGuardianSoftware.restore();
    sinon
      .stub(guardianSoftware, "upsertGuardianSoftware", function(softwareVersion, fileHash) {
        return new Promise(function(resolve,reject){reject(new Error("data failure"))});
      });
    
    request(app)
      .post('/v1/guardians/upload/software')
      .field( 'software_version', '-0.0.1')
      .end(function(err, res) {
          expect(err).not.exist();
          expect(res).to.have.property('status',500);
          expect(JSON.parse(res.text)).to.have.property('msg',
            'error submitting guardian software file: data failure');
          done();
      });
  })
});