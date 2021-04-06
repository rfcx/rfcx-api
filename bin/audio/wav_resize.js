#!/usr/bin/env node

const args = process.argv.slice(2)

const fs = require('fs')
const wav = require('wav')
const FileWriter = wav.FileWriter

const flattenedSampleRate = args[0]
const inputFilePath = args[1]
const outputFilePath = args[2]

const inputChannels = 1

const inputWavFile = fs.createReadStream(inputFilePath)
// var inputWavReader = new wav.Reader()

const outputFileStream = new FileWriter(outputFilePath, { sampleRate: parseInt(flattenedSampleRate), channels: inputChannels })

inputWavFile.pipe(outputFileStream)
