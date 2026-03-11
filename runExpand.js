#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const audiomothUtils = require('./audiomoth-utils.js');

function printUsageAndExit() {
    console.error('Usage: node runExpand.js <inputDir> <outputDir> <durationSeconds>');
    process.exit(1);
}

const [, , inputDir, outputDir, durationArg] = process.argv;

if (!inputDir || !outputDir || !durationArg) {
    printUsageAndExit();
}

let numberOfFilesProcessed = 0;

const maximumFileDuration = Number(durationArg);

if (Number.isFinite(maximumFileDuration) === false || maximumFileDuration <= 0) {
    console.error('Duration must be a positive number (seconds).');
    process.exit(1);
}

function isWaveFile(file) {
    return file.toUpperCase().endsWith('T.WAV');
}

function expandFile(inputPath) {
    numberOfFilesProcessed += 1;
    const relativeDir = path.relative(inputDir, path.dirname(inputPath));

    const targetDir = path.join(outputDir, relativeDir);

    fs.mkdirSync(targetDir, {recursive: true});

    console.log(`\nExpanding ${inputPath} -> ${targetDir} ...`);

    const result = audiomothUtils.expand(
        inputPath,
        targetDir,
        '',
        'EVENT',
        maximumFileDuration,
        false,
        false,
        (progress) => process.stdout.write(`\rProgress: ${progress}%   `)
    );

    if (result.success) {
        process.stdout.write('\rProgress: 100%   \n');
        console.log('Done.');
    } else {
        process.stdout.write('\r');
        console.error(`Failed: ${result.error}`);
    }
}

function processDirectory(currentDir) {
    const entries = fs.readdirSync(currentDir, {withFileTypes: true});

    for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
            processDirectory(fullPath);
        } else if (entry.isFile() && isWaveFile(entry.name)) {
            expandFile(fullPath);
        }
    }
}

if (fs.existsSync(inputDir) === false) {
    console.error(`Input directory not found: ${inputDir}`);
    process.exit(1);
}

if (fs.existsSync(outputDir) === false) {
    console.error(`Output directory not found: ${outputDir}`);
    process.exit(1);
}

processDirectory(inputDir);

if (numberOfFilesProcessed === 0) {
    console.log('No T.WAV files found.');
}
