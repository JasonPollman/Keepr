(function () {
    'use strict';

    var expect = require('chai').expect,
        fs     = require('fs-extra'),
        path   = require('path'),
        v8     = require('v8'),
        keepr;

    describe('Heap Limit Test', function () {
        var zPath   = path.join(__dirname, '..', 'performance', 'zeros', '1-mb.txt'),
            hDir    = path.join(__dirname, 'heap-limit-test'),
            zeros   = '';

        before(function (done) {
            keepr = new (require('../')).Keepr({ size: '100mb', watch: false });
            keepr.purge();

            fs.mkdirp(hDir, function () {
                fs.readFile(zPath, function (err, contents) {
                    if(err) throw err;
                    zeros = contents;
                    done();
                });
            });
        });

        after(function (done) {
            keepr.purge();
            fs.remove(hDir, function () {
                done();
            });
        });

        it('Should not cache large files that will exceed the cache limit', function (done) {
            this.timeout(10000);
            this.slow(5000);

            var max = 0, total = 0;
            var getFile = function getFile (i) {
                fs.writeFile(path.join(hDir, 'dummy-test-file-' + i), zeros, function (err) {
                    if(err) throw err;
                    keepr.get(path.join(hDir, 'dummy-test-file-' + i), function (err) {
                        total += zeros._.sizeOf();

                        if(err) throw err;
                        if(keepr.currentSize() + 1000000 <= keepr.getOptions().size) {
                            expect(keepr.currentSize()).to.equal(1000000 * (i + 1));
                            max = keepr.currentSize() + 1000000;
                        }
                        else {
                            expect(keepr.currentSize()).to.equal(max);
                        }

                        if(v8.getHeapStatistics().total_available_size > zeros._.sizeOf() && total < 1e9) { // 1 GB Max
                            process.nextTick(function () {
                                getFile(++i);
                            });
                        }
                        else {
                            done();
                        }
                    });
                });
            };

            getFile(0);
        });
    });
}());
