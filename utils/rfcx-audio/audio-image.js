var Promise = require("bluebird");
var models  = require("../../models");
var ffmpeg = require("fluent-ffmpeg");
var aws = require("../../utils/external/aws.js").aws();

exports.audioImage = {

    /**
     * returns a Promise that will transcode a non-seekable file into an ogg vorbis file and save the result.
     *
     * @param {String} s3Bucket, bucket on s3 with the file you wish to transcode
     * @param {String} s3Path, path on s3 with the file you wish to transcode
     * @param {String} outputFilePath, directory and file name where the audio can saved after processing
     * @param {String} tempFilePath, temporary directory and file name where the audio can be downloaded for processing
     * @return {bluebird} promise
     */
    transformToOggRemote: function(s3Bucket, s3Path, outputFilePath, tempFilePath) {
        return new Promise(function(resolve, reject) {
            try {
                aws.s3(s3Bucket).getFile(s3Path, function (err, result) {
                    result.pipe(fs.createWriteStream(tempFilePath));
                    result.on('end', function () {
                        console.log('File Downloaded!');
                        this.buildTransformToOgg(tempFilePath, resolve, reject)
                            .save(outputFilePath);
                    })
                });
            } catch(err) {
                console.log("failed to transcode mp4 remote file to ogg | " + err);
                reject(new Error(err));
            }
        }.bind(this));
    },

    /**
     * returns a Promise that will move the meta data at the end of a remote MP4 file  on S3 to the start so that it
     * can be streamed and then saves the resultant file
     *
     * @param {String} s3Bucket, bucket on s3 with the file you wish to transcode
     * @param {String} s3Path, path on s3 with the file you wish to transcode
     * @param {String} tempFilePath, temporary directory and file name where the audio can be downloaded for processing
     * @param {String} outputFilePath, directory and file name where the audio can saved after processing
     * @return {bluebird} promise
     */
    transformMp4ForStreamRemote: function(s3Bucket, s3Path, tempFilePath, outputFilePath) {
        return new Promise(function(resolve, reject) {
            try {
                aws.s3(s3Bucket).getFile(s3Path, function(err, result) {
                    result.pipe(fs.createWriteStream(tempFilePath));
                    result.on('end', function () {
                        console.log('File Downloaded!');
                        this.buildTransformMp4ForStream(tempFilePath, resolve, reject)
                            .save(outputFilePath);
                    })
                });
            } catch(err) {
                console.log("failed to transcode mp4 remote file to ogg | " + err);
                reject(new Error(err));
            }
        }.bind(this));
    },

    /**
     * returns a Promise that will transcode a into an ogg vorbis file and save the result
     *
     * @param {String} inputFilePath, location of the local file for processing
     * @param {String} outputFilePath, directory and file name where the audio can saved after processing
     * @return {bluebird} promise
     */
    transformToOgg: function(inputFilePath, outputFilePath) {
        return new Promise(function(resolve, reject) {
            this.buildTransformToOgg(inputFilePath, resolve, reject)
                .save(outputFilePath);
        }.bind(this));
    },

    /**
     * returns a Promise that will move the meta data at the end of an MP4 file to the start so that it can be
     * streamed. The resultant file is then saved
     *
     * @param {String} inputFilePath, location of the local file for processing
     * @param {String} outputFilePath, directory and file name where the audio can saved after processing
     * @return {bluebird} promise
     */
    transformMp4ForStream: function(inputFilePath, outputFilePath) {
        return new Promise(function(resolve, reject) {
            this.buildTransformMp4ForStream(inputFilePath, resolve, reject)
                .save(outputFilePath);
        }.bind(this));
    },

    /**
     * returns a Promise that will transcode an MP4 file into an ogg vorbis file and pipes the result into the provided
     * output stream. The response object in a request handler is one such object that would then stream the file to the
     * browser
     *
     * @param {String} inputFilePath, location of the local file for processing
     * @param {String} outputStream, stream in which to pipe the transcoded output
     * @param {function} resolve, function to call when the process completes
     * @param {function} reject, function to call if an error occurs
     * @return {bluebird} promise
     */
    transformToOggAndPipe: function(inputFilePath, outputStream, resolve, reject) {
        this.buildTransformToOgg(inputFilePath, resolve, reject).pipe(outputStream, {end: true});
    },

    /**
     * returns a Promise that will move the meta data at the end of an MP4 file to the start so that it can be
     * streamed and pipes the result into the provided output stream. The response object in a request handler is one
     * such object that would then stream the file to the browser
     *
     * @param {String} inputFilePath, location of the local file for processing
     * @param {String} outputStream, stream in which to pipe the transcoded output
     * @param {function} resolve, function to call when the process completes
     * @param {function} reject, function to call if an error occurs
     * @return {bluebird} promise
     */
    transformMp4ForStreamAndPipe: function(inputFilePath, outputStream, resolve, reject) {
        this.buildTransformMp4ForStream(inputFilePath, resolve, reject).pipe(outputStream, {end: true});
    },

    buildTransformToOgg: function(filePath, resolve, reject) {
        return this.buildFfmpeg(filePath, 'ogg', 'flac', 0, [], resolve, reject);
    },

    buildTransformMp4ForStream: function(filePath, resolve, reject) {
        return this.buildFfmpeg(filePath, 'mp4', 'copy', 0, ['-movflags isml+frag_keyframe'], resolve, reject);
    },

    buildFfmpeg: function(file_location, format, codec, seek, outputOptions, resolve, reject) {
        return new ffmpeg(file_location)
            .outputOptions(outputOptions)
            .toFormat(format)
            .withAudioCodec(codec)
            .seekInput(seek)
            .on('error', function (err, stdout, stderr) {
                console.log('an error happened: ' + err.message);
                console.log('ffmpeg stdout: ' + stdout);
                console.log('ffmpeg stderr: ' + stderr);
                reject(err)
            })
            .on('end', function () {
                console.log('Processing finished !');
                resolve()
            })
            .on('progress', function (progress) {
                console.log('Processing: ' + progress.percent + '% done');
            })
    }
};

