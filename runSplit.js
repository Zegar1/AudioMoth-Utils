/****************************************************************************
 * runSplit.js
 * Wrapper dla splitter.js - cięcie plików WAV na fragmenty
 * 
 * Użycie: 
 *   node runSplit.js <input_path> <output_dir> <duration_seconds>
 * 
 * input_path może być:
 *   - ścieżką do pojedynczego pliku WAV
 *   - ścieżką do katalogu (przetwarza rekurencyjnie z zachowaniem struktury)
 * 
 * Przykłady:
 *   node runSplit.js "C:\audio\file.wav" "C:\output" 5
 *   node runSplit.js "C:\audio" "C:\output" 5
 *****************************************************************************/

'use strict';

const fs = require('fs');
const path = require('path');
const splitter = require('./splitter.js');

/* Pobierz argumenty */
const [, , inputPath, outputDir, durationArg] = process.argv;

if (!inputPath || !outputDir || !durationArg) {
    console.error('Usage: node runSplit.js <input_path> <output_dir> <duration_seconds>');
    console.error('  input_path: single WAV file or directory (recursive)');
    console.error('Example: node runSplit.js "C:\\audio\\file.wav" "C:\\output" 5');
    console.error('Example: node runSplit.js "C:\\audio" "C:\\output" 5');
    process.exit(1);
}

const duration = parseInt(durationArg, 10);

if (isNaN(duration) || duration <= 0) {
    console.error('Error: Duration must be a positive integer.');
    process.exit(1);
}

if (fs.existsSync(inputPath) === false) {
    console.error('Input path not found: ' + inputPath);
    process.exit(1);
}

// Utwórz katalog wyjściowy jeśli nie istnieje
if (fs.existsSync(outputDir) === false) {
    fs.mkdirSync(outputDir, { recursive: true });
}

let numberOfFilesProcessed = 0;
let baseInputDir = null; // Bazowy katalog dla obliczania ścieżek względnych

function isWaveFile(file) {
    return file.toUpperCase().endsWith('.WAV');
}

function splitFile(inputFilePath) {
    numberOfFilesProcessed += 1;

    // Oblicz ścieżkę względną od bazowego katalogu
    let targetDir;
    if (baseInputDir) {
        const relativeDir = path.relative(baseInputDir, path.dirname(inputFilePath));
        targetDir = path.join(outputDir, relativeDir);
    } else {
        // Pojedynczy plik - zapisz bezpośrednio do outputDir
        targetDir = outputDir;
    }

    fs.mkdirSync(targetDir, { recursive: true });

    console.log('\nSplitting ' + inputFilePath + ' -> ' + targetDir + ' ...');

    const result = splitter.split(
        inputFilePath,
        targetDir,
        '',
        duration,
        (progress) => process.stdout.write('\rProgress: ' + progress + '%   ')
    );

    if (result.success) {
        process.stdout.write('\rProgress: 100%   \n');
        console.log('Done.');
    } else {
        process.stdout.write('\r');
        console.error('Failed: ' + result.error);
        process.exit(1);
    }
}

function processDirectory(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
            // Rekurencyjnie przetwarzaj podfoldery
            processDirectory(fullPath);
        } else if (entry.isFile() && isWaveFile(entry.name)) {
            splitFile(fullPath);
        }
    }
}

/* Sprawdź czy input to plik czy katalog */
const inputStats = fs.statSync(inputPath);

if (inputStats.isFile()) {
    /* Pojedynczy plik WAV */
    if (isWaveFile(inputPath)) {
        baseInputDir = null; // Brak bazowego katalogu dla pojedynczego pliku
        splitFile(inputPath);
    } else {
        console.error('Error: Input file is not a WAV file: ' + inputPath);
        process.exit(1);
    }
} else if (inputStats.isDirectory()) {
    /* Katalog - przetwarzaj rekurencyjnie z zachowaniem struktury */
    baseInputDir = inputPath;
    processDirectory(inputPath);
    
    if (numberOfFilesProcessed === 0) {
        console.log('No WAV files found in: ' + inputPath);
    }
} else {
    console.error('Error: Input path is neither a file nor directory: ' + inputPath);
    process.exit(1);
}

console.log('\nTotal files processed: ' + numberOfFilesProcessed);
