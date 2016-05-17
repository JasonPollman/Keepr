(function () {
    'use strict';

    var expect = require('chai').expect,
        path   = require('path'),
        zeros  = path.join(__dirname, '..', 'performance', 'zeros'),
        fs     = require('fs'),
        bytes,
        keepr;

    describe('Keepr (Cache Limit)', function () {

        before(function () {
            keepr = require('../');
            keepr.setOptions({ size: '2mb' });
            keepr.purge();

            fs.readFile(path.join(zeros, '1-kb.txt'), 'utf-8', function (err, contents) {
                if(err) throw err;
                bytes = contents;
            });
        });

        after(function () {
            keepr.purge();
            keepr.unwrapFS();

            for(var i = 0; i < 1000; i++) {
                fs.unlink(path.join(__dirname, 'keepr.test.' + i + '.txt'), function () {
                    /* No Op, if error */
                });
            }
        });

        it('Should keep the correct cache size limit, part 1', function (done) {
            this.timeout(10000);
            this.slow(2000);
            keepr.purge();
            
            var read = 0;
            for(var i = 0; i < 100; i++) {
                keepr.get(path.join(zeros, '500-kb.txt'), function (err, contents) {
                    expect(err).to.equal(null);
                    expect(contents).to.match(/^0+$/);
                    expect(keepr.currentSize()).to.equal(500400);

                    if(++read === 100) {
                        for(var i = 0; i < 100; i++) {
                            keepr.get(path.join(zeros, '500-kb.txt'), 'utf-8', function (err, contents) {
                                expect(err).to.equal(null);
                                expect(contents).to.match(/^0+$/);
                                expect(keepr.currentSize()).to.equal(1000800);

                                if(++read === 200) {
                                    for(var i = 0; i < 100; i++) {
                                        keepr.get(path.join(zeros, '1-kb.txt'), 'utf-8', function (err, contents) {
                                            expect(err).to.equal(null);
                                            expect(contents).to.match(/^0+$/);
                                            expect(keepr.currentSize()).to.equal(1002800);
                                            if(++read === 300) done();
                                        });
                                    }
                                }
                            });
                        }
                    }
                });
            }
        });

        it('Should keep the correct cache size limit, part 2', function (done) {
            this.timeout(10000);
            this.slow(2000);

            keepr.purge();
            keepr.wrapFS();

            var read = 0, total = 0;
            for(var i = 0; i < 100; i++) {
                var f = path.join(__dirname, 'keepr.test.' + i + '.txt');

                fs.writeFile(f, bytes, function (err) {
                    if(err) throw err;
                    fs.readFile(this.file, 'utf-8', function (err, contents) {
                        expect(err).to.equal(null);
                        expect(contents).to.match(/^0+$/);
                        expect(keepr.sizeOf(contents)).to.equal(1000);
                        total += 1000 * 2;

                        if(++read === 100) {
                            expect(total).to.equal(200000);
                            expect(total).to.equal(keepr.currentSize());
                            done();
                        }
                    }.bind(this));
                }.bind({ file: f, i: i }));
            }
        });

        it('Should not overflow the cache limit', function (done) {
            this.timeout(10000);
            this.slow(2000);

            keepr.purge();
            keepr.wrapFS();
            keepr.setOptions({ size: '200kb' });

            var read = 0, total = 0;
            for(var i = 0; i < 500; i++) {
                var f = path.join(__dirname, 'keepr.test.' + i + '.txt');

                fs.writeFile(f, bytes, function (err) {
                    if(err) throw err;
                    fs.readFile(this.file, 'utf-8', function (err, contents) {
                        expect(err).to.equal(null);
                        expect(contents).to.match(/^0+$/);
                        expect(keepr.sizeOf(contents)).to.equal(1000);
                        total += 1000 * 2;

                        if(++read === 500) {
                            expect(total).to.equal(1000000);
                            expect(keepr.currentSize()).to.equal(200000);

                            var dump = keepr.dump();
                            expect(dump._.size()).to.equal(200);
                            done();
                        }
                    }.bind(this));
                }.bind({ file: f, i: i }));
            }
        });
    });
}());
