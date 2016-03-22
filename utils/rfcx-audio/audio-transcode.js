var Promise = require("bluebird");
var ffmpeg = require("fluent-ffmpeg");
var fs = require("fs");

exports.audioUtils = {

    formats: {
        mp3: {
            extension: "mp3", codec: "libmp3lame", outputFormat: "mp3", mime: "audio/mpeg",
            outputOptions: []
        },
        opus: { 
            extension: "opus", codec: "libopus", outputFormat: "opus", mime: "audio/ogg",
            outputOptions: [ "-compression_level 10", "-application audio", "-vbr on" ]
        },
        wav: { 
            extension: "wav", codec: null, outputFormat: "wav", mime: "audio/wav",
            outputOptions: []
        },
        aac: { // this one needs some attention...
            extension: "m4a", codec: "libfdk_aac", outputFormat: "aac", mime: "audio/mp4",
            outputOptions: []
        } 
    },

    transcodingOutputOptions: function(format,isEnhanced) {
        var enhancedOutputOptions = [
                "-filter_complex", "[0:a][1:a]amerge=inputs=2[aout]",
                "-map", "[aout]"
            ],
            outputOptions = (isEnhanced) ? enhancedOutputOptions : [];
        for (i in this.formats[format].outputOptions) { outputOptions.push(this.formats[format].outputOptions[i]); }
       //     console.log(outputOptions);
        return outputOptions;
    },

    transcodeToMP3: function(inputParams) {
        return new Promise(function(resolve, reject) {
            try {
                if (fs.existsSync(inputParams.sourceFilePath)) {
                    resolve(
                        new ffmpeg(inputParams.sourceFilePath)
                            .input(inputParams.sourceFilePath)
                            .outputOptions(this.transcodingOutputOptions("mp3",inputParams.enhanced))
                            .outputFormat(this.formats.mp3.outputFormat)
                            .audioCodec(this.formats.mp3.codec)
                            .audioFrequency(inputParams.sampleRate)
                            .audioChannels((inputParams.enhanced) ? 2 : 1)
                            .audioBitrate(inputParams.bitRate)
                            .on("error",function(err,stdout,stderr){
                                console.log('an error occurred: '+err.message+', stdout: '+stdout+', stderr: '+stderr);
                            })
                    );  
                    
                } else {
                    console.log("failed to locate source audio | " + err);
                    reject(new Error(err));
                }              

            } catch(err) {
                console.log("failed to transcode audio to mp3 | " + err);
                reject(new Error(err));
            }
        }.bind(this));
    },

    transcodeToOpus: function(inputParams) {
        return new Promise(function(resolve, reject) {
            try {
                if (fs.existsSync(inputParams.sourceFilePath)) {
                    resolve(
                        new ffmpeg(inputParams.sourceFilePath)
                            .input(inputParams.sourceFilePath)
                            .outputOptions(this.transcodingOutputOptions("opus",inputParams.enhanced))
                            .outputFormat(this.formats.opus.outputFormat)
                            .audioCodec(this.formats.opus.codec)
                            .audioFrequency(inputParams.sampleRate)
                            .audioChannels((inputParams.enhanced) ? 2 : 1)
                            .audioBitrate(inputParams.bitRate)
                            .on("error",function(err,stdout,stderr){
                                console.log('an error occurred: '+err.message+', stdout: '+stdout+', stderr: '+stderr);
                            })
                    );  
                    
                } else {
                    console.log("failed to locate source audio | " + err);
                    reject(new Error(err));
                }              

            } catch(err) {
                console.log("failed to transcode audio to opus | " + err);
                reject(new Error(err));
            }
        }.bind(this));
    },

    transcodeToWavFile: function(inputParams) {
        return new Promise(function(resolve, reject) {
            try {
                if (fs.existsSync(inputParams.sourceFilePath)) {
                    var transcodedFilePath = inputParams.sourceFilePath.substr(0,inputParams.sourceFilePath.lastIndexOf("."))+"."+this.formats.wav.extension;
                    
                    new ffmpeg(inputParams.sourceFilePath)
                        .input(inputParams.sourceFilePath)
                        .inputOptions("-flags +bitexact")
                        .outputOptions(this.transcodingOutputOptions("wav",inputParams.enhanced))
                        .outputFormat(this.formats.wav.outputFormat)
                        .audioFrequency(inputParams.sampleRate)
                        .save(transcodedFilePath)
                        .on("error",function(err,stdout,stderr){
                            console.log('an error occurred: '+err.message+', stdout: '+stdout+', stderr: '+stderr);
                        })
                        .on("end",function(){
                            resolve(transcodedFilePath);
                        });
                    
                } else {
                    console.log("failed to locate source audio | " + err);
                    reject(new Error(err));
                }              

            } catch(err) {
                console.log("failed to transcode audio to wav file | " + err);
                reject(new Error(err));
            }
        }.bind(this));
    },

    transcodeToMp3File: function(inputParams) {
        return new Promise(function(resolve, reject) {
            try {
                if (fs.existsSync(inputParams.sourceFilePath)) {
                    var transcodedFilePath = inputParams.sourceFilePath.substr(0,inputParams.sourceFilePath.lastIndexOf("."))+"."+this.formats.mp3.extension;
                    
                    new ffmpeg(inputParams.sourceFilePath)
                        .input(inputParams.sourceFilePath)
                        .outputOptions(this.transcodingOutputOptions("mp3",inputParams.enhanced))
                        .outputFormat(this.formats.mp3.outputFormat)
                        .audioCodec(this.formats.mp3.codec)
                        .audioFrequency(inputParams.sampleRate)
                        .audioChannels((inputParams.enhanced) ? 2 : 1)
                        .audioBitrate(inputParams.bitRate)
                        .save(transcodedFilePath)
                        .on("error",function(err,stdout,stderr){
                            console.log('an error occurred: '+err.message+', stdout: '+stdout+', stderr: '+stderr);
                        })
                        .on("end",function(){
                            fs.unlink(inputParams.sourceFilePath,function(e){if(e){console.log(e);}});
                            resolve(transcodedFilePath);
                        });
                    
                } else {
                    console.log("failed to locate source audio | " + err);
                    reject(new Error(err));
                }              

            } catch(err) {
                console.log("failed to transcode audio to mp3 file | " + err);
                reject(new Error(err));
            }
        }.bind(this));
    }


};

