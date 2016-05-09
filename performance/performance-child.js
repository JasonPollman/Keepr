'use strict';
process.on('uncaught exception', function (e) { throw e; });

var path  = require('path'),
    fs    = require('fs'),
    lib   = require('proto-lib').get('_'),

    // The files to iterate over...
    files = {
        '100b'  : path.join(__dirname, 'zeros', '100-bytes.txt'),
        '1kb'   : path.join(__dirname, 'zeros', '1-kb.txt'),
        '100kb' : path.join(__dirname, 'zeros', '100-kb.txt'),
        '500kb' : path.join(__dirname, 'zeros', '500-kb.txt'),
        '1mb'   : path.join(__dirname, 'zeros', '1-mb.txt'),
        '50mb'  : path.join(__dirname, 'zeros', '50-mb.txt'),
        '100mb' : path.join(__dirname, 'zeros', '100-mb.txt')
    },

    // Stores results...
    data = {
        totalTime : 0,
        heapUsed  : 0,

        p0: 0,
        p1: 0,
        p2: 0,

        '100b'  : { 1: 0, 50: 0, 500: 0 },
        '1kb'   : { 1: 0, 50: 0, 500: 0 },
        '100kb' : { 1: 0, 50: 0, 500: 0 },
        '500kb' : { 1: 0, 50: 0, 500: 0 },
        '1mb'   : { 1: 0, 50: 0, 500: 0 },
        '50mb'  : { 1: 0, 50: 0, 500: 0 },
        '100mb' : { 1: 0, 50: 0, 500: 0 }
    };


/**
 * Converts a process.hrtime tuple to MS
 * @param {Array<Number>} diff The process.hrtime tuple.
 * @return {Number} The diff in milliseconds.
 */
function diffToMS (diff) {
    return (diff[0] * 1e9 + diff[1]) / 1e6;
}

function read (type, file, key, runSize, num) {
    var start  = process.hrtime();
    fs.readFileSync(file, 'utf-8');
    var diff = process.hrtime(start);
    data[key][runSize] += diffToMS(diff);
    data['p' + num]    += diffToMS(diff);
}

function doAllRuns (type) {
    var runs  = [1, 50, 500];

    for(var k = 0; k < runs.length; k++) {
        for(var n in files) {
            if(files.hasOwnProperty(n)) {
                for(var i = 0; i < runs[k]; i++) {
                    read(type, files[n], n, runs[k], k);
                }
            }
        }
    }
}

if(process.argv[2] === 'keepr') {
    var keepr = require('../');
    keepr.wrapFS();
    keepr.setOptions({ size: 0 });
}

var start = process.hrtime();
doAllRuns(process.argv[2]);
data.totalTime = diffToMS(process.hrtime(start));
data.heapUsed  = process.memoryUsage().heapUsed;
process.send(data);
