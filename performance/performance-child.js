'use strict';
process.on('uncaught exception', function (e) { throw e; });

var path      = require('path'),
    fs        = require('fs'),
    lib       = require('proto-lib').get('_'),
    args      = require('minimist')(process.argv.slice(2), { boolean: 'buffercopy' }),
    runs      = [1, 5, 100, 1000],
    encodings = ['buffer', 'utf-8', 'hex', 'base64'],

    data, init;

// Check arguments...
if(typeof args.file !== 'string') throw new Error(`Argument --file expected a string, but got: ${ typeof args.file }.`);
if(typeof args.type !== 'string') throw new Error(`Argument --type expected a string, but got: ${ typeof args.type }.`);

// Stores results...
data = {
    file   : args.file,
    passes : []
};

// Setup Keepr if type === 'keepr'
if(args.type === 'keepr') {
    var keepr = require('../');
    keepr.wrapFS();
    keepr.setOptions({ size: 0 });
}

/**
 * Converts a process.hrtime tuple to MS
 * @param {Array<Number>} diff The process.hrtime tuple.
 * @return {Number} The diff in milliseconds.
 */
function diffToMS (diff) {
    return (diff[0] * 1e9 + diff[1]) / 1e6;
}

var f;
function read (encoding) {
    try {
        f = args.type !== 'keepr' ?
            fs.readFileSync(path.resolve(args.file), encoding === 'buffer' ? undefined : encoding) :
            fs.readFileSync(path.resolve(args.file), encoding);

        return f;
    }
    catch (e) {
        throw new Error(`Test failed. Unable to read file for encoding ${ encoding }: ${ e.message }`);
    }
}

init = process.hrtime();
for(var i = 0; i < runs.length; i++) {
    for(var n = 0; n < encodings.length; n++) {
        var start = process.hrtime(), end;

        console.log(`${ args.type._.ucFirst() }: Starting run with ${ runs[i] } read(s) and encoding '${ encodings[n] }'.`);
        for(var k = 0; k < runs[i]; k++) read(encodings[n]);
        end = diffToMS(process.hrtime(start));

        data.passes.push({
            reads    : runs[i],
            time     : end,
            heap     : process.memoryUsage().heapUsed,
            encoding : encodings[n],
            cached   : (args.type === 'keepr') ? keepr.isCached(path.resolve(args.file)) : false
        });
    }
}

if(args.type === 'keepr') console.log(keepr.dump());

data.cacheEncoding = args.encoding;
process.send(data);
