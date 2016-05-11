'use strict';

process.on('uncaught exception', function (e) { throw e; });

var fork      = require('child_process').fork,
    path      = require('path'),
    fs        = require('fs'),
    args      = require('minimist')(process.argv.slice(2)),
    childPath = path.join(__dirname, 'performance-child.js'),
    readMe    = path.join(__dirname, '..', 'ReadMe.md'),
    lib       = require('proto-lib').get('_'),
    os        = require('os'),
    filesize  = null,
    file      = null;


    // Check arguments...
    if(typeof args.file !== 'string') throw new Error(`Argument --file expected a string, but got: ${ typeof args.file }.`);

// Get the file's size...
try {
    file     = fs.readFileSync(path.resolve(args.file), 'utf-8');
    filesize = Buffer.byteLength(file);
}
catch (e) {
    throw new Error('Error executing test: ' + e.message);
}

/**
 * Writes the test results to the ReadMe.md file.
 * @param {String} s The contents to write.
 * @return {undefined}
 */
function writeResults (s) {
    if(args.write) {
        fs.readFile(readMe, 'utf-8', (err, contents) => {
            if(err) throw err;

            fs.writeFile(readMe, contents.replace(/\s*$/, '\n\n' + s + '\n'), err => {
                if(err) throw err;
                console.log('Results written to ReadMe.md successfully!');
            });
        });
    }
}

/**
 * Formats time in MS.
 * @param {Number} t The timestamp to format.
 * @return {String} The formatted time.
 */
function formatTime (t) {
    return parseFloat(t.toFixed(2))._.withPlaceholders() + ' MS';
}

/**
 * Builds out the results to write to file.
 * @param {Object} results The results from the test.
 * @return {undefined}
 */
function buildResults (results) {
    var s = `#### ${ (filesize / 1e6).toFixed(1) }MB File
${ new Date().toLocaleDateString() } • ${ os.type()._.ucFirst() } • ${ (os.totalmem() / 1e9).toFixed(2) }GB Memory • ${ os.cpus()._.size() } CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |`;

    var n = 0;
    results.passes._.every(data => {
        var pctFaster,
            neg         = false,
            timesFaster = (data.fsTime / data.keeprTime);

        if(data.keeprTime > data.fsTime) {
            neg = true;
            pctFaster = ((1 - (data.fsTime / data.keeprTime)) * 100).toFixed(2);
        }
        else {
            pctFaster = ((1 - (data.keeprTime / data.fsTime)) * 100).toFixed(2);
        }
        if(Math.abs(pctFaster) > 50) pctFaster = '**' + pctFaster + '%**'; else pctFaster += '%';
        timesFaster = (timesFaster > 1.5) ? '**' + timesFaster._.withPlaceholders().toFixed(2) + '**' : timesFaster._.withPlaceholders().toFixed(2);
        if(neg) pctFaster = '-' + pctFaster;


        s += `
| ${ ++n } | ${ data.reads } | ${ data.format === 'utf-8' ? data.format.toUpperCase() : data.format._.ucFirst() } | ${ formatTime(data.fsTime) } | ${ formatTime(data.keeprTime) } | ${ pctFaster } | ${ timesFaster } | ${ (data.fsHeap / 1e6).toFixed(0) }MB | ${ (data.keeprHeap / 1e6).toFixed(0) }MB |`;
    });

    writeResults(s);
}

console.log('Starting Vanilla FS run. This could take a few minutes...');
var child = fork(childPath, ['--type=vanilla', `--file=${ args.file }`, `--encoding=${ args.encoding || 'utf-8' }`]);

// Run vanilla FS read performance test...
child.on('message', vanillaResults => {

    // Run Keepr read performance test...
    console.log('Starting Keepr FS run. This could take up to a minute...');
    child = fork(childPath, ['--type=keepr', `--file=${ args.file }`, `--encoding=${ args.encoding || 'utf-8' }`]);

    child.on('message', keeprResults => {
        var res = {
            file   : null,
            passes : []
        };

        res.file = vanillaResults.file;
        vanillaResults.passes._.every((r) => {
            res.passes.push({
                reads  : r.reads,
                format : r.encoding,
                fsTime : r.time,
                fsHeap : r.heap
            });
        });

        keeprResults.passes._.every((r, i) => {
            res.passes[i].keeprTime = r.time;
            res.passes[i].keeprHeap = r.heap;
            res.passes[i].cached    = r.cached;
        });

        res.cacheEncoding = keeprResults.cacheEncoding;
        console.log('*** Results ***' + os.EOL + os.EOL, JSON.stringify(res, null, '   '));
        if(args.write) buildResults(res);
    });
});
