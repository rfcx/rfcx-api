var Promise = require("bluebird");
var ffmpeg = require("fluent-ffmpeg");
var fs = require("fs");

var audioFormatSettings = { 

        mp3: {
            extension: "mp3", codec: "libmp3lame", outputFormat: "mp3", mime: "audio/mpeg",
            inputOptions: [],
            outputOptions: [ "-b:a 32k" ]
        },
        opus: { 
            extension: "opus", codec: "libopus", outputFormat: "opus", mime: "audio/ogg",
            inputOptions: [],
            outputOptions: [ "-b:a 16k", "-compression_level 9", "-application audio", "-vbr on"  ]
        },
        wav: { 
            extension: "wav", codec: "pcm_s16le", outputFormat: "wav", mime: "audio/wav",
            inputOptions: [ "-flags +bitexact" ],
            outputOptions: []
        },
        flac: { 
            extension: "flac", codec: "flac", outputFormat: "flac", mime: "audio/flac",
            inputOptions: [],
            outputOptions: [ "-sample_fmt s16" ]
        },
        m4a: {
            extension: "m4a", codec: "libfdk_aac", outputFormat: "m4a", mime: "audio/mp4",
            inputOptions: [],
            outputOptions: [ "-b:a 16k" ]
        }

    };

exports.audioUtils = {

    formatSettings: audioFormatSettings,

    transcodeToFile: function(audioFormat, inputParams) {
        return new Promise(function(resolve, reject) {
            try {
                fs.stat(inputParams.sourceFilePath, function(statErr,fileStat){
                    if (statErr == null) {

                        var transcodedFilePath = inputParams.sourceFilePath.substr(0,inputParams.sourceFilePath.lastIndexOf(".")+1)+audioFormat;
                        
                        new ffmpeg(inputParams.sourceFilePath)
                            .input(inputParams.sourceFilePath)
                            .inputOptions(getInputOptions(audioFormat,inputParams.enhanced))
                            .outputOptions(getOutputOptions(audioFormat,inputParams.enhanced))
                            .outputFormat(audioFormatSettings[audioFormat].outputFormat)
                            .audioCodec(audioFormatSettings[audioFormat].codec)
                            .audioFrequency(inputParams.sampleRate)
                            .audioChannels((inputParams.enhanced) ? 2 : 1)
                     //       .audioBitrate(inputParams.bitRate)
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
                console.log("failed to transcode audio to "+audioFormat+" | " + err);
                reject(new Error(err));
            }
        }.bind(this));
    },

    // transcodeToWavFile: function(audioFormat, inputParams) {
    //     return new Promise(function(resolve, reject) {
    //         try {
    //             fs.stat(inputParams.sourceFilePath, function(statErr,fileStat){
    //                 if (statErr == null) {

    //                     var transcodedFilePath = inputParams.sourceFilePath.substr(0,inputParams.sourceFilePath.lastIndexOf(".")+1)+audioFormat;
                        
    //                     new ffmpeg(inputParams.sourceFilePath)
    //                         .input(inputParams.sourceFilePath)
    //                         .inputOptions(getInputOptions(audioFormat,inputParams.enhanced))
    //                         .outputOptions(getOutputOptions(audioFormat,inputParams.enhanced))
    //                         .outputFormat(audioFormatSettings[audioFormat].outputFormat)
    //                         .audioCodec(audioFormatSettings[audioFormat].codec)
    //                         .audioFrequency(inputParams.sampleRate)
    //                         .audioChannels((inputParams.enhanced) ? 2 : 1)
    //                  //       .audioBitrate(inputParams.bitRate)
    //                         .save(transcodedFilePath)
    //                         .on("error",function(err,stdout,stderr){
    //                             console.log('an error occurred: '+err.message+', stdout: '+stdout+', stderr: '+stderr);
    //                         })
    //                         .on("end",function(){
    //                             fs.unlink(inputParams.sourceFilePath,function(e){if(e){console.log(e);}});
    //                             resolve(transcodedFilePath);
    //                         });
    //                 } else {
    //                     console.log("failed to locate source audio | " + err);
    //                     reject(new Error(err));
    //                 }
    //             });           

    //         } catch(err) {
    //             console.log("failed to transcode audio to "+audioFormat+" | " + err);
    //             reject(new Error(err));
    //         }
    //     }.bind(this));
    // },


    transcodeToOpus: function(inputParams) {
        return new Promise(function(resolve, reject) {
            try {
                fs.stat(inputParams.sourceFilePath, function(statErr,fileStat){
                    if (statErr == null) {
                        resolve(
                            new ffmpeg(inputParams.sourceFilePath)
                                .input(inputParams.sourceFilePath)
                                .outputOptions(getOutputOptions("opus",inputParams.enhanced))
                                .outputFormat(audioFormatSettings.opus.outputFormat)
                                .audioCodec(audioFormatSettings.opus.codec)
                                .audioFrequency(inputParams.sampleRate)
                                .audioChannels((inputParams.enhanced) ? 2 : 1)
                                .audioBitrate(inputParams.bitRate)
                                // .on("error",function(err,stdout,stderr){
                                //     console.log('an error occurred: '+err.message+', stdout: '+stdout+', stderr: '+stderr);
                                // })
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
    }


};

function getInputOptions(format,isEnhanced) {
    var enhancedInputOptions = [
        ],
        inputOptions = (isEnhanced) ? enhancedInputOptions : [];
    for (i in audioFormatSettings[format].inputOptions) { inputOptions.push(audioFormatSettings[format].inputOptions[i]); }
    return inputOptions;
}

function getOutputOptions(format,isEnhanced) {
    var enhancedOutputOptions = [
            "-filter_complex", "[0:a][1:a]amerge=inputs=2[aout]",
            "-map", "[aout]"
        ],
        outputOptions = (isEnhanced) ? enhancedOutputOptions : [];
    for (i in audioFormatSettings[format].outputOptions) { outputOptions.push(audioFormatSettings[format].outputOptions[i]); }
    return outputOptions;
}

