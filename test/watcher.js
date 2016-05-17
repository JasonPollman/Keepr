(function () {
    'use strict';

    var expect   = require('chai').expect,
        path     = require('path'),
        fs       = require('fs'),
        testFile = path.join('..', 'keepr.test.txt'),
        keepr;

    describe('Keepr (FS Watchers)', function () {
        before(function (done) {
            keepr = require('../');
            keepr.purge();

            fs.writeFile(testFile, 'hello world', function (err) {
                if(err) throw err;
                done();
            });
        });

        after(function (done) {
            keepr.purge();
            keepr.unwrapFS();

            fs.unlink(testFile, function () {
                done();
            });
        });

        it('It should purge cache when files are modified and the "watch" option is set to true (default)', function (done) {
            keepr.purge();

            expect(keepr.isCached(testFile)).to.equal(false);
            keepr.get(testFile, 'utf-8', function (err, contents) {
                expect(err).to.equal(null);
                expect(keepr.isCached(testFile)).to.equal(true);
                expect(contents).to.equal('hello world');

                var dump = keepr.dump();
                expect(dump._.size()).to.equal(2);

                fs.writeFile(testFile, 'goodbye world', function (err) {
                    if(err) throw err;
                    expect(keepr.isCached(testFile)).to.equal(false);

                    var dump = keepr.dump();
                    expect(dump._.size()).to.equal(0);

                    keepr.get(testFile, 'utf-8', function (err, contents) {
                        expect(err).to.equal(null);
                        expect(keepr.isCached(testFile)).to.equal(true);
                        expect(contents).to.equal('goodbye world');

                        var dump = keepr.dump();
                        expect(dump._.size()).to.equal(2);

                        fs.writeFile(testFile, 'hello world', function (err) {
                            if(err) throw err;
                            expect(keepr.isCached(testFile)).to.equal(false);

                            var dump = keepr.dump();
                            expect(dump._.size()).to.equal(0);
                            done();
                        });
                    });
                });
            });
        });

        it('It should *not* purge cache when files are modified and the "watch" option is set to false', function (done) {
            keepr.purge();
            keepr.setOptions({ watch: false });

            expect(keepr.isCached(testFile)).to.equal(false);
            keepr.get(testFile, 'utf-8', function (err, contents) {
                expect(err).to.equal(null);
                expect(keepr.isCached(testFile)).to.equal(true);
                expect(contents).to.equal('hello world');

                var dump = keepr.dump();
                expect(dump._.size()).to.equal(2);

                fs.writeFile(testFile, 'goodbye world', function (err) {
                    if(err) throw err;
                    expect(keepr.isCached(testFile)).to.equal(true);

                    var dump = keepr.dump();
                    expect(dump._.size()).to.equal(2);

                    keepr.get(testFile, 'utf-8', function (err, contents) {
                        expect(err).to.equal(null);
                        expect(keepr.isCached(testFile)).to.equal(true);
                        expect(contents).to.equal('hello world');

                        var dump = keepr.dump();
                        expect(dump._.size()).to.equal(2);

                        fs.writeFile(testFile, 'hello world', function (err) {
                            if(err) throw err;
                            expect(keepr.isCached(testFile)).to.equal(true);

                            var dump = keepr.dump();
                            expect(dump._.size()).to.equal(2);

                            keepr.get(testFile, 'utf-8', function (err, contents) {
                                expect(err).to.equal(null);
                                expect(keepr.isCached(testFile)).to.equal(true);
                                expect(contents).to.equal('hello world');

                                var dump = keepr.dump();
                                expect(dump._.size()).to.equal(2);

                                keepr.get(testFile, 'utf-8', function (err, contents) {
                                    expect(err).to.equal(null);
                                    expect(keepr.isCached(testFile)).to.equal(true);
                                    expect(contents).to.equal('hello world');

                                    var dump = keepr.dump();
                                    expect(dump._.size()).to.equal(2);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it('It should purge cache when files are modified and the "watch" option is set to true (when set)', function (done) {
            keepr.purge();
            keepr.setOptions({ watch: true });

            expect(keepr.isCached(testFile)).to.equal(false);
            keepr.get(testFile, 'utf-8', function (err, contents) {
                expect(err).to.equal(null);
                expect(keepr.isCached(testFile)).to.equal(true);
                expect(contents).to.equal('hello world');

                var dump = keepr.dump();
                expect(dump._.size()).to.equal(2);

                fs.writeFile(testFile, 'goodbye world', function (err) {
                    if(err) throw err;
                    expect(keepr.isCached(testFile)).to.equal(false);

                    var dump = keepr.dump();
                    expect(dump._.size()).to.equal(0);

                    keepr.get(testFile, 'utf-8', function (err, contents) {
                        expect(err).to.equal(null);
                        expect(keepr.isCached(testFile)).to.equal(true);
                        expect(contents).to.equal('goodbye world');

                        var dump = keepr.dump();
                        expect(dump._.size()).to.equal(2);

                        fs.writeFile(testFile, 'hello world', function (err) {
                            if(err) throw err;
                            expect(keepr.isCached(testFile)).to.equal(false);

                            var dump = keepr.dump();
                            expect(dump._.size()).to.equal(0);
                            done();
                        });
                    });
                });
            });
        });

        it('It should purge cache when files are modified and the "watch" option is set to true (default, FS wrapped)', function (done) {
            keepr.purge();
            keepr.wrapFS();
            keepr.setOptions({ watch: true });

            expect(keepr.isCached(testFile)).to.equal(false);
            fs.readFile(testFile, 'utf-8', function (err, contents) {
                expect(err).to.equal(null);
                expect(keepr.isCached(testFile)).to.equal(true);
                expect(contents).to.equal('hello world');

                var dump = keepr.dump();
                expect(dump._.size()).to.equal(2);

                fs.writeFile(testFile, 'goodbye world', function (err) {
                    if(err) throw err;
                    expect(keepr.isCached(testFile)).to.equal(false);

                    var dump = keepr.dump();
                    expect(dump._.size()).to.equal(0);

                    fs.readFile(testFile, 'utf-8', function (err, contents) {
                        expect(err).to.equal(null);
                        expect(keepr.isCached(testFile)).to.equal(true);
                        expect(contents).to.equal('goodbye world');

                        var dump = keepr.dump();
                        expect(dump._.size()).to.equal(2);

                        fs.writeFile(testFile, 'hello world', function (err) {
                            if(err) throw err;
                            expect(keepr.isCached(testFile)).to.equal(false);

                            var dump = keepr.dump();
                            expect(dump._.size()).to.equal(0);
                            done();
                        });
                    });
                });
            });
        });

        it('It should *not* purge cache when files are modified and the "watch" option is set to false (FS wrapped)', function (done) {
            keepr.purge();
            keepr.setOptions({ watch: false });
            keepr.wrapFS();

            expect(keepr.isCached(testFile)).to.equal(false);
            fs.readFile(testFile, 'utf-8', function (err, contents) {
                expect(err).to.equal(null);
                expect(keepr.isCached(testFile)).to.equal(true);
                expect(contents).to.equal('hello world');

                var dump = keepr.dump();
                expect(dump._.size()).to.equal(2);

                fs.writeFile(testFile, 'goodbye world', function (err) {
                    if(err) throw err;
                    expect(keepr.isCached(testFile)).to.equal(true);

                    var dump = keepr.dump();
                    expect(dump._.size()).to.equal(2);

                    fs.readFile(testFile, 'utf-8', function (err, contents) {
                        expect(err).to.equal(null);
                        expect(keepr.isCached(testFile)).to.equal(true);
                        expect(contents).to.equal('hello world');

                        var dump = keepr.dump();
                        expect(dump._.size()).to.equal(2);

                        fs.writeFile(testFile, 'hello world', function (err) {
                            if(err) throw err;
                            expect(keepr.isCached(testFile)).to.equal(true);

                            var dump = keepr.dump();
                            expect(dump._.size()).to.equal(2);

                            fs.readFile(testFile, 'utf-8', function (err, contents) {
                                expect(err).to.equal(null);
                                expect(keepr.isCached(testFile)).to.equal(true);
                                expect(contents).to.equal('hello world');

                                var dump = keepr.dump();
                                expect(dump._.size()).to.equal(2);

                                fs.readFile(testFile, 'utf-8', function (err, contents) {
                                    expect(err).to.equal(null);
                                    expect(keepr.isCached(testFile)).to.equal(true);
                                    expect(contents).to.equal('hello world');

                                    var dump = keepr.dump();
                                    expect(dump._.size()).to.equal(2);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it('It should purge cache when files are modified and the "watch" option is set to true (when set, FS wrapped)', function (done) {
            keepr.purge();
            keepr.setOptions({ watch: true });
            keepr.wrapFS();

            expect(keepr.isCached(testFile)).to.equal(false);
            fs.readFile(testFile, 'utf-8', function (err, contents) {
                expect(err).to.equal(null);
                expect(keepr.isCached(testFile)).to.equal(true);
                expect(contents).to.equal('hello world');

                var dump = keepr.dump();
                expect(dump._.size()).to.equal(2);

                fs.writeFile(testFile, 'goodbye world', function (err) {
                    if(err) throw err;
                    expect(keepr.isCached(testFile)).to.equal(false);

                    var dump = keepr.dump();
                    expect(dump._.size()).to.equal(0);

                    fs.readFile(testFile, 'utf-8', function (err, contents) {
                        expect(err).to.equal(null);
                        expect(keepr.isCached(testFile)).to.equal(true);
                        expect(contents).to.equal('goodbye world');

                        var dump = keepr.dump();
                        expect(dump._.size()).to.equal(2);

                        fs.writeFile(testFile, 'hello world', function (err) {
                            if(err) throw err;
                            expect(keepr.isCached(testFile)).to.equal(false);

                            var dump = keepr.dump();
                            expect(dump._.size()).to.equal(0);
                            done();
                        });
                    });
                });
            });
        });
    });
}());
