'use strict';
process.on('uncaught exception', function (e) { throw e; });

var path      = require('path'),
    fs        = require('fs'),
    lib       = require('proto-lib').get('_'),
    args      = require('minimist')(process.argv.slice(2), { boolean: 'buffercopy' }),
    runs      = [1, 2, 5, 20],
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
function read (runs, encoding, done) {
    var  read = 0;
    console.log(`${ args.type._.ucFirst() }: Starting run with ${ runs } read(s) and encoding '${ encoding }'.`);

    for(var k = 0; k < runs; k++) {
        f = fs.readFile(path.resolve(args.file), encoding === 'buffer' ? undefined : encoding, function () {
            if(++read === runs) done();
        });
    }
}

init = process.hrtime();
var total = runs.length * encodings.length, done = 0;
for(var i = 0; i < runs.length; i++) {
    for(var n = 0; n < encodings.length; n++) {
        setTimeout(function () {
            var self  = this,
                start = process.hrtime();

            read(self.run, self.encoding, function () {
                data.passes.push({
                    reads    : self.run,
                    time     : diffToMS(process.hrtime(start)),
                    heap     : process.memoryUsage().heapUsed,
                    encoding : self.encoding,
                    cached   : (args.type === 'keepr') ? keepr.isCached(path.resolve(args.file)) : false
                });

                if(++done === total) {
                    if(args.type === 'keepr') console.log(keepr.dump());

                    data.cacheEncoding = args.encoding;
                    console.log('Sending data to parent...');
                    process.send(data);
                }
            });
        }.bind({ run: runs[i], encoding: encodings[n] }), i * 1000);
    }
}
