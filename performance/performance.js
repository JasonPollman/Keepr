'use strict';

process.on('uncaught exception', function (e) { throw e; });

var fork      = require('child_process').fork,
    path      = require('path'),
    fs        = require('fs'),
    childPath = path.join(__dirname, 'performance-child.js'),
    readMe    = path.join(__dirname, '..', 'ReadMe.md'),
    lib       = require('proto-lib').get('_'),
    os        = require('os');


function writeResults (line) {
    fs.readFile(readMe, 'utf-8', function (err, contents) {
        if(err) throw err;

        fs.writeFile(readMe, contents.replace(/\s*$/, '\n' + line + '\n'), function (err) {
            if(err) throw err;
            console.log('Results written to ReadMe.md successfully!');
        });
    });
}

function formatTime (t) {
    return parseInt(t, 10)._.withPlaceholders() + ' MS';
}

function buildResults (results) {
    var line = '| ' + new Date().toLocaleDateString() + ' | ';
    line += os.type() + ' | ' + os.cpus()._.size() + ' | ' + (os.totalmem() / 1e9).toFixed(2) + ' GB' + ' | ';

    for(var i = 0; i < 3; i++) {
        var diff = ((1 - (results.keepr['p' + i] / results.vanilla['p' + i])) * 100).toFixed(1) + '%';
        line += formatTime(results.vanilla['p' + i]) + ' | ' + formatTime(results.keepr['p' + i]) + ' | ' + diff + ' | ';
    }

    var totalDiff = ((1 - (results.keepr.totalTime / results.vanilla.totalTime)) * 100).toFixed(1) + '%';
    line += formatTime(results.vanilla.totalTime) + ' | ' + formatTime(results.keepr.totalTime) + ' | ' + totalDiff + ' | ' + (results.vanilla.heapUsed / 1e6).toFixed(0) + ' MB ' + ' | ' + (results.keepr.heapUsed / 1e6).toFixed(0) + ' MB ' + ' |';
    writeResults(line);
}

console.log('Starting Vanilla FS run. This could take a few minutes...');
var child = fork(childPath, ['vanilla']);
child.on('message', function (vanillaResults) {

    console.log('Starting Keepr FS run. This could take up to a minute...');
    child = fork(childPath, ['keepr']);
    child.on('message', function (keeprResults) {
        var res = { keepr: keeprResults, vanilla: vanillaResults };

        console.log('*** Results ***' + os.EOL + os.EOL, JSON.stringify(res, null, '   '));
        buildResults(res);
    });
});
