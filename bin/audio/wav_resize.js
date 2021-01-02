#!/usr/bin/env node

var args = process.argv.slice(2)

var fs = require("fs");
var wav = require("wav");
var FileWriter = wav.FileWriter;

var flattenedSampleRate = args[0];
var inputFilePath = args[1];
var outputFilePath = args[2];

var inputChannels = 1;

var inputWavFile = fs.createReadStream(inputFilePath);
var inputWavReader = new wav.Reader();

var outputFileStream = new FileWriter(outputFilePath, { sampleRate: parseInt(flattenedSampleRate), channels: inputChannels });

inputWavFile.pipe(outputFileStream);