require('./../../../test.000.init.js').expect;
var expect = require('chai').expect;
var ffmpeg = require("fluent-ffmpeg");
var path = require('path');
var audio = require("../../../../utils/internal-rfcx/audio.js").audio;
var app_root = path.dirname(process.mainModule.filename);

describe('utils/internal-rfcx/audio',function(){

    describe('transcodeMp4RemoteToOgg',function(){

        it('should take a file path and transcode the file to ogg',function(done){
            var inputFilePath = path.join(app_root,"../../../tmp/stream/36175011-dd27-43eb-bdb6-f6e5015abc9d.m4a");
            var outputFilePath = path.join(app_root, "../../../tmp/stream/integration_test_local.ogg");
            audio.transformToOgg(inputFilePath, outputFilePath)
                .then(function(){
                    console.log("file transcoded");
                    //expect(fileHash).to.not.be.empty();
                })
                .done(done)
        });
    });

    describe('remuxMp4LocalForStream',function(){

        it('should take a file path and remux the mp4 file for streaming',function(done){
            var inputFilePath = path.join(app_root,"../../../tmp/stream/36175011-dd27-43eb-bdb6-f6e5015abc9d.m4a");
            var outputFilePath = path.join(app_root, "../../../tmp/stream/integration_test_local.m4a");
            audio.transformMp4ForStream(inputFilePath, outputFilePath)
                .then(function(){
                    console.log("file transcoded");
                    //expect(fileHash).to.not.be.empty();
                })
                .done(done)
        });
    });
});