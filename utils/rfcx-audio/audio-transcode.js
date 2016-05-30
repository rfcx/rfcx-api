var Promise = require("bluebird");
var ffmpeg = require("fluent-ffmpeg");
var fs = require("fs");

var audioFormats = {
        mp3: {
            extension: "mp3", codec: "libmp3lame", outputFormat: "mp3", mime: "audio/mpeg",
            outputOptions: []
        },
        opus: { 
            extension: "opus", codec: "libopus", outputFormat: "opus", mime: "audio/ogg",
            outputOptions: [ "-compression_level 7", "-application audio", "-vbr on" ]
        },
        wav: { 
            extension: "wav", codec: null, outputFormat: "wav", mime: "audio/wav",
            outputOptions: []
        },
        flac: { 
            extension: "flac", codec: "flac", outputFormat: "flac", mime: "audio/flac",
            outputOptions: []
        },
        m4a: { // this one needs some attention...
            extension: "m4a", codec: "libfdk_aac", outputFormat: "m4a", mime: "audio/mp4",
            outputOptions: []
        } 
    };

var transcodingOutputOptions = function(format,isEnhanced) {
        var enhancedOutputOptions = [
                "-filter_complex", "[0:a][1:a]amerge=inputs=2[aout]",
                "-map", "[aout]"
            ],
            outputOptions = (isEnhanced) ? enhancedOutputOptions : [];
        for (i in audioFormats[format].outputOptions) { outputOptions.push(audioFormats[format].outputOptions[i]); }
       //     console.log(outputOptions);
        return outputOptions;
    };


exports.audioUtils = {

    formats: audioFormats,

    transcodeToMP3: function(inputParams) {
        return new Promise(function(resolve, reject) {
            try {
                fs.stat(inputParams.sourceFilePath, function(statErr,fileStat){
                    if (statErr == null) {
                        resolve(
                            new ffmpeg(inputParams.sourceFilePath)
                                .input(inputParams.sourceFilePath)
                                .outputOptions(transcodingOutputOptions("mp3",inputParams.enhanced))
                                .outputFormat(audioFormats.mp3.outputFormat)
                                .audioCodec(audioFormats.mp3.codec)
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
                });

            } catch(err) {
                console.log("failed to transcode audio to mp3 | " + err);
                reject(new Error(err));
            }
        }.bind(this));
    },

    transcodeToOpus: function(inputParams) {
        return new Promise(function(resolve, reject) {
            try {
                fs.stat(inputParams.sourceFilePath, function(statErr,fileStat){
                    if (statErr == null) {
                        resolve(
                            new ffmpeg(inputParams.sourceFilePath)
                                .input(inputParams.sourceFilePath)
                                .outputOptions(transcodingOutputOptions("opus",inputParams.enhanced))
                                .outputFormat(audioFormats.opus.outputFormat)
                                .audioCodec(audioFormats.opus.codec)
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
                });           

            } catch(err) {
                console.log("failed to transcode audio to opus | " + err);
                reject(new Error(err));
            }
        }.bind(this));
    },

    transcodeToFlac: function(inputParams) {
        return new Promise(function(resolve, reject) {
            try {
                fs.stat(inputParams.sourceFilePath, function(statErr,fileStat){
                    if (statErr == null) {
                        resolve(
                            new ffmpeg(inputParams.sourceFilePath)
                                .input(inputParams.sourceFilePath)
                                .outputOptions(transcodingOutputOptions("flac",inputParams.enhanced))
                                .outputFormat(audioFormats.flac.outputFormat)
                                .audioCodec(audioFormats.flac.codec)
                                .audioFrequency(inputParams.sampleRate)
                                .audioChannels((inputParams.enhanced) ? 2 : 1)
                                .on("error",function(err,stdout,stderr){
                                    console.log('an error occurred: '+err.message+', stdout: '+stdout+', stderr: '+stderr);
                                })
                        );  
                    } else {
                        console.log("failed to locate source audio | " + err);
                        reject(new Error(err));
                    }
                });           

            } catch(err) {
                console.log("failed to transcode audio to flac | " + err);
                reject(new Error(err));
            }
        }.bind(this));
    },

    transcodeToM4a: function(inputParams) {
        return new Promise(function(resolve, reject) {
            try {
                fs.stat(inputParams.sourceFilePath, function(statErr,fileStat){
                    if (statErr == null) {
                       resolve(
                            new ffmpeg(inputParams.sourceFilePath)
                                .input(inputParams.sourceFilePath)
                                .outputOptions(transcodingOutputOptions("m4a",inputParams.enhanced))
                                .outputFormat(audioFormats.m4a.outputFormat)
                                .audioCodec(audioFormats.m4a.codec)
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
                });             

            } catch(err) {
                console.log("failed to transcode audio to m4a | " + err);
                reject(new Error(err));
            }
        }.bind(this));
    },

    transcodeToWavFile: function(inputParams) {
        return new Promise(function(resolve, reject) {
            try {
                fs.stat(inputParams.sourceFilePath, function(statErr,fileStat){
                    if (statErr == null) {
                        var transcodedFilePath = inputParams.sourceFilePath.substr(0,inputParams.sourceFilePath.lastIndexOf("."))+"."+audioFormats.wav.extension;
                        
                        new ffmpeg(inputParams.sourceFilePath)
                            .input(inputParams.sourceFilePath)
                            .inputOptions("-flags +bitexact")
                            .outputOptions(transcodingOutputOptions("wav",inputParams.enhanced))
                            .outputFormat(audioFormats.wav.outputFormat)
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
                });            

            } catch(err) {
                console.log("failed to transcode audio to wav file | " + err);
                reject(new Error(err));
            }
        }.bind(this));
    },

    transcodeToMp3File: function(inputParams) {
        return new Promise(function(resolve, reject) {
            try {
                fs.stat(inputParams.sourceFilePath, function(statErr,fileStat){
                    if (statErr == null) {
                        var transcodedFilePath = inputParams.sourceFilePath.substr(0,inputParams.sourceFilePath.lastIndexOf("."))+"."+audioFormats.mp3.extension;
                        
                        new ffmpeg(inputParams.sourceFilePath)
                            .input(inputParams.sourceFilePath)
                            .outputOptions(transcodingOutputOptions("mp3",inputParams.enhanced))
                            .outputFormat(audioFormats.mp3.outputFormat)
                            .audioCodec(audioFormats.mp3.codec)
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
                });         

            } catch(err) {
                console.log("failed to transcode audio to mp3 file | " + err);
                reject(new Error(err));
            }
        }.bind(this));
    }


};

