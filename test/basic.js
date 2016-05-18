(function () {
    'use strict';

    var expect = require('chai').expect,
        path   = require('path'),
        fs     = require('fs'),
        os     = require('os'),
        keepr;

    describe('Keepr (Basic Usage)', function () {
        var utf, hex, base64, binary;

        before(function (done) {
            keepr = require('../');
            keepr.unwrapFS();
            keepr.purge();

            fs.readFile(path.join(__dirname, '..', 'package.json'), function (err, contents) {
                utf    = contents.toString('utf-8');
                hex    = contents.toString('hex');
                base64 = contents.toString('base64');
                binary = contents.toString('binary');

                done();
            });
        });

        after(function (done) {
            keepr.purge();
            fs.unlink(path.join(os.homedir(), 'keepr.testfile.txt'), function () {
                done();
            });
        });

        it('Should return an object with the correct API when required', function () {
            expect(keepr).to.be.an('object');
            expect(keepr).to.be.an.instanceof(keepr.Keepr);
            expect(keepr.get).to.be.a('function');
            expect(keepr.getSync).to.be.a('function');
            expect(keepr.read).to.be.a('function');
            expect(keepr.readSync).to.be.a('function');
            expect(keepr.currentByteSize).to.be.a('function');
            expect(keepr.currentSize).to.be.a('function');
            expect(keepr.getMaxCacheSize).to.be.a('function');
            expect(keepr.utilized).to.be.a('function');
            expect(keepr.purge).to.be.a('function');
            expect(keepr.dump).to.be.a('function');
            expect(keepr.wrapFS).to.be.a('function');
            expect(keepr.unwrapFS).to.be.a('function');
            expect(keepr.sizeOf).to.be.a('function');
            expect(keepr.setOptions).to.be.a('function');
            expect(keepr.getOptions).to.be.a('function');
            expect(keepr.noCache).to.be.a('function');
            expect(keepr.noCacheSync).to.be.a('function');
            expect(keepr.count).to.be.a('function');

            var dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(0);
        });

        it('Should read files asyncronously', function (done) {
            keepr.purge();
            var f = path.join(__dirname, '..', 'package.json');
            expect(keepr.isCached(f)).to.equal(false);

            var dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(0);

            keepr.get(f, { encoding: 'utf-8' }, function (err, contents) {
                expect(keepr.isCached(f)).to.equal(true);
                expect(err).to.equal(null);
                expect(contents).to.be.a('string');
                expect(contents).to.equal(utf);

                var package_ = JSON.parse(contents);
                expect(package_).to.be.an('object');
                expect(package_.name).to.equal('keepr');

                var dump = keepr.dump();
                expect(dump).to.be.an('object');
                expect(dump._.size()).to.equal(2);
                done();
            });
        });

        it('Should correctly handle file read errors', function (done) {
            keepr.purge();
            var f = path.join(__dirname, '..', 'no-existy.json');
            expect(keepr.isCached(f)).to.equal(false);

            var dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(0);
            expect(keepr.count()).to.equal(0);

            keepr.get(f, { encoding: 'utf-8' }, function (err) {
                expect(err).to.be.an.instanceof(Error);
                expect(keepr.isCached(f)).to.equal(false);

                expect(keepr.getSync.bind(keepr, f, 'utf-8')).to.throw(Error);
                expect(keepr.isCached(f)).to.equal(false);

                dump = keepr.dump();
                expect(dump).to.be.an('object');
                expect(dump._.size()).to.equal(0);
                expect(keepr.count()).to.equal(0);

                done();
            });
        });

        it('Should replace ~ and %HOME% with the user\'s directory', function (done) {
            fs.writeFile(path.join(os.homedir(), 'keepr.testfile.txt'), 'hello world!', function () {
                keepr.purge();
                var f;

                f = (os.platform() !== 'win32') ? '~/keepr.testfile.txt' : '%HOME%/keepr.testfile.txt';
                expect(keepr.isCached(f)).to.equal(false);

                var dump = keepr.dump();
                expect(dump).to.be.an('object');
                expect(dump._.size()).to.equal(0);

                keepr.get(f, { encoding: 'utf-8' }, function (err, contents) {
                    expect(err).to.equal(null);
                    expect(keepr.isCached(f)).to.equal(true);
                    expect(contents).to.be.a('string');
                    expect(contents).to.equal('hello world!');

                    var dump = keepr.dump();
                    expect(dump).to.be.an('object');
                    expect(dump._.size()).to.equal(2);

                    keepr.get(path.join(os.homedir(), 'keepr.testfile.txt'), 'utf-8', function (err, contentsNext) {
                        expect(contentsNext).to.equal(contents);

                        dump = keepr.dump();
                        expect(dump).to.be.an('object');
                        expect(dump._.size()).to.equal(2);

                        done();
                    });
                });
            });
        });

        it('Should read files syncronously', function (done) {
            keepr.purge();
            var f = path.join(__dirname, '..', 'package.json');
            expect(keepr.isCached(f)).to.equal(false);

            var dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(0);
            expect(keepr.count()).to.equal(0);

            var contents = keepr.getSync(f, { encoding: 'utf-8' });
            expect(keepr.isCached(f)).to.equal(true);
            expect(contents).to.be.a('string');
            expect(contents).to.equal(utf);

            var package_ = JSON.parse(contents);
            expect(package_).to.be.an('object');
            expect(package_.name).to.equal('keepr');

            dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(2);
            expect(keepr.count()).to.equal(2);
            done();
        });

        it('Should read files asyncronously and return a buffer by default', function (done) {
            keepr.purge();

            var f = path.join(__dirname, '..', 'ReadMe.md');
            expect(keepr.isCached(f)).to.equal(false);

            var dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(0);
            expect(keepr.count()).to.equal(0);

            keepr.get(f, function (err, contents) {
                expect(keepr.isCached(f)).to.equal(true);

                expect(err).to.equal(null);
                expect(contents).to.be.an.instanceof(Buffer);

                var dump = keepr.dump();
                expect(dump).to.be.an('object');
                expect(dump._.size()).to.equal(1);
                expect(keepr.count()).to.equal(1);

                keepr.get(f, function (err, contentsNext) {
                    expect(keepr.isCached(f)).to.equal(true);

                    expect(err).to.equal(null);
                    expect(contentsNext).to.be.an.instanceof(Buffer);
                    expect(contents).to.eql(contentsNext);
                    expect(contents.toString('utf-8')).to.equal(contentsNext.toString('utf-8'));

                    var dump = keepr.dump();
                    expect(dump).to.be.an('object');
                    expect(dump._.size()).to.equal(1);
                    expect(keepr.count()).to.equal(1);

                    done();
                });
            });
        });

        it('Should read files syncronously and return a buffer by default', function (done) {
            keepr.purge();

            var f = path.join(__dirname, '..', 'ReadMe.md');
            expect(keepr.isCached(f)).to.equal(false);

            var dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(0);

            var contents = keepr.getSync(f);
            expect(keepr.isCached(f)).to.equal(true);
            expect(contents).to.be.an.instanceof(Buffer);

            dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(1);

            var contentsNext = keepr.getSync(f);
            expect(keepr.isCached(f)).to.equal(true);

            expect(contentsNext).to.be.an.instanceof(Buffer);
            expect(contents).to.eql(contentsNext);
            expect(contents.toString('utf-8')).to.equal(contentsNext.toString('utf-8'));

            dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(1);

            done();
        });

        it('Should read files asyncronously and return a string when "utf-8" is the specified encoding', function (done) {
            var f = path.join(__dirname, '..', 'package.json');

            keepr.purge();
            expect(keepr.isCached(f)).to.equal(false);

            var dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(0);

            keepr.get(f, { encoding: 'utf-8' }, function (err, contents) {
                expect(err).to.equal(null);
                expect(keepr.isCached(f)).to.equal(true);
                expect(contents).to.be.a('string');
                expect(contents).to.equal(utf);

                var dump = keepr.dump();
                expect(dump).to.be.an('object');
                expect(dump._.size()).to.equal(2);

                keepr.get(f, 'utf-8', function (err, contentsNext) {
                    expect(keepr.isCached(f)).to.equal(true);

                    expect(err).to.equal(null);
                    expect(contentsNext).to.be.a('string');
                    expect(contents).to.equal(contentsNext);
                    expect(contentsNext).to.equal(utf);

                    var dump = keepr.dump();
                    expect(dump).to.be.an('object');
                    expect(dump._.size()).to.equal(2);
                    done();
                });
            });
        });

        it('Should read files asyncronously and return a string when "binary" is the specified encoding', function (done) {
            var f = path.join(__dirname, '..', 'package.json');

            keepr.purge();
            expect(keepr.isCached(f)).to.equal(false);

            var dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(0);

            keepr.get(f, { encoding: 'binary' }, function (err, contents) {
                expect(err).to.equal(null);
                expect(keepr.isCached(f)).to.equal(true);
                expect(contents).to.be.a('string');
                expect(contents).to.equal(utf);

                var dump = keepr.dump();
                expect(dump).to.be.an('object');
                expect(dump._.size()).to.equal(2);

                keepr.get(f, 'binary', function (err, contentsNext) {
                    expect(keepr.isCached(f)).to.equal(true);

                    expect(err).to.equal(null);
                    expect(contentsNext).to.be.a('string');
                    expect(contents).to.equal(contentsNext);
                    expect(contentsNext).to.equal(utf);

                    var dump = keepr.dump();
                    expect(dump).to.be.an('object');
                    expect(dump._.size()).to.equal(2);
                    done();
                });
            });
        });

        it('Should read files asyncronously and return a string when "ascii" is the specified encoding', function (done) {
            var f = path.join(__dirname, '..', 'package.json');

            keepr.purge();
            expect(keepr.isCached(f)).to.equal(false);

            var dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(0);

            keepr.get(f, { encoding: 'ascii' }, function (err, contents) {
                expect(err).to.equal(null);
                expect(keepr.isCached(f)).to.equal(true);
                expect(contents).to.be.a('string');
                expect(contents).to.equal(utf);

                var dump = keepr.dump();
                expect(dump).to.be.an('object');
                expect(dump._.size()).to.equal(2);

                keepr.get(f, 'ascii', function (err, contentsNext) {
                    expect(keepr.isCached(f)).to.equal(true);

                    expect(err).to.equal(null);
                    expect(contentsNext).to.be.a('string');
                    expect(contents).to.equal(contentsNext);
                    expect(contentsNext).to.equal(utf);

                    var dump = keepr.dump();
                    expect(dump).to.be.an('object');
                    expect(dump._.size()).to.equal(2);
                    done();
                });
            });
        });

        it('Should read files syncronously and return a string when "utf-8" is the specified encoding', function (done) {
            var f = path.join(__dirname, '..', 'package.json');

            keepr.purge();
            expect(keepr.isCached(f)).to.equal(false);

            var dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(0);

            var contents = keepr.getSync(f, { encoding: 'utf-8' });
            expect(keepr.isCached(f)).to.equal(true);
            expect(contents).to.be.a('string');
            expect(contents).to.equal(utf);

            dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(2);

            var contentsNext = keepr.getSync(f, 'utf-8');
            expect(keepr.isCached(f)).to.equal(true);

            expect(contentsNext).to.be.a('string');
            expect(contents).to.equal(contentsNext);
            expect(contentsNext).to.equal(utf);

            dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(2);
            done();
        });

        it('Should read files asyncronously and return a string when "hex" is the specified encoding', function (done) {
            var f = path.join(__dirname, '..', 'package.json');

            keepr.purge();
            expect(keepr.isCached(f)).to.equal(false);

            var dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(0);

            keepr.get(f, { encoding: 'hex' }, function (err, contents) {
                expect(err).to.equal(null);
                expect(keepr.isCached(f)).to.equal(true);
                expect(contents).to.be.a('string');
                expect(contents).to.equal(hex);

                var dump = keepr.dump();
                expect(dump).to.be.an('object');
                expect(dump._.size()).to.equal(2);

                keepr.get(f, 'hex', function (err, contentsNext) {
                    expect(keepr.isCached(f)).to.equal(true);

                    expect(err).to.equal(null);
                    expect(contentsNext).to.be.a('string');
                    expect(contents).to.equal(contentsNext);
                    expect(contentsNext).to.equal(hex);

                    var dump = keepr.dump();
                    expect(dump).to.be.an('object');
                    expect(dump._.size()).to.equal(2);
                    done();
                });
            });
        });

        it('Should read files asyncronously and return a string when "base64" is the specified encoding', function (done) {
            var f = path.join(__dirname, '..', 'package.json');

            keepr.purge();
            expect(keepr.isCached(f)).to.equal(false);

            var dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(0);

            keepr.get(f, { encoding: 'base64' }, function (err, contents) {
                expect(err).to.equal(null);
                expect(keepr.isCached(f)).to.equal(true);
                expect(contents).to.be.a('string');
                expect(contents).to.equal(base64);

                var dump = keepr.dump();
                expect(dump).to.be.an('object');
                expect(dump._.size()).to.equal(2);

                keepr.get(f, 'base64', function (err, contentsNext) {
                    expect(keepr.isCached(f)).to.equal(true);

                    expect(err).to.equal(null);
                    expect(contentsNext).to.be.a('string');
                    expect(contents).to.equal(contentsNext);
                    expect(contentsNext).to.equal(base64);

                    var dump = keepr.dump();
                    expect(dump).to.be.an('object');
                    expect(dump._.size()).to.equal(2);
                    done();
                });
            });
        });

        it('Should read files asyncronously and return a string when "binary" is the specified encoding', function (done) {
            var f = path.join(__dirname, '..', 'package.json');

            keepr.purge();
            expect(keepr.isCached(f)).to.equal(false);

            var dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(0);

            keepr.get(f, { encoding: 'binary' }, function (err, contents) {
                expect(err).to.equal(null);
                expect(keepr.isCached(f)).to.equal(true);
                expect(contents).to.be.a('string');
                expect(contents).to.equal(binary);

                var dump = keepr.dump();
                expect(dump).to.be.an('object');
                expect(dump._.size()).to.equal(2);

                keepr.get(f, 'binary', function (err, contentsNext) {
                    expect(keepr.isCached(f)).to.equal(true);

                    expect(err).to.equal(null);
                    expect(contentsNext).to.be.a('string');
                    expect(contents).to.equal(contentsNext);
                    expect(contentsNext).to.equal(binary);

                    var dump = keepr.dump();
                    expect(dump).to.be.an('object');
                    expect(dump._.size()).to.equal(2);
                    done();
                });
            });
        });

        it('Should return a buffer when "buffer" is specified in the encoding', function (done) {
            keepr.purge();
            var f = path.join(__dirname, '..', 'package.json');
            expect(keepr.isCached(f)).to.equal(false);

            var dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(0);

            keepr.get(f, { encoding: 'buffer' }, function (err, contents) {
                expect(keepr.isCached(f)).to.equal(true);
                expect(err).to.equal(null);
                expect(contents).to.be.an.instanceof(Buffer);

                var dump = keepr.dump();
                expect(dump).to.be.an('object');
                expect(dump._.size()).to.equal(1);

                keepr.get(f, 'buffer', function (err, contents) {
                    expect(keepr.isCached(f)).to.equal(true);
                    expect(err).to.equal(null);
                    expect(contents).to.be.an.instanceof(Buffer);

                    keepr.get(f, { encoding: 'utf-8' }, function (err, contents) {
                        var utfContents = contents;
                        expect(keepr.isCached(f)).to.equal(true);
                        expect(err).to.equal(null);
                        expect(contents).to.be.a('string');
                        expect(contents).to.equal(utf);

                        var package_ = JSON.parse(contents);
                        expect(package_).to.be.an('object');
                        expect(package_.name).to.equal('keepr');

                        var dump = keepr.dump();
                        expect(dump).to.be.an('object');
                        expect(dump._.size()).to.equal(2);

                        keepr.get(f, { encoding: 'hex' }, function (err, contents) {
                            expect(keepr.isCached(f)).to.equal(true);
                            expect(err).to.equal(null);
                            expect(contents).to.be.a('string');
                            expect(utfContents).to.not.equal(contents);

                            var dump = keepr.dump();
                            expect(dump).to.be.an('object');
                            expect(dump._.size()).to.equal(3);

                            f = path.join(__dirname, '..', 'ReadMe.md');
                            expect(keepr.isCached(f)).to.equal(false);

                            keepr.get(f, 'utf-8', function (err, contents) {
                                expect(keepr.isCached(f)).to.equal(true);

                                expect(err).to.equal(null);
                                expect(contents).to.be.a('string');

                                var dump = keepr.dump();
                                expect(dump).to.be.an('object');
                                expect(dump._.size()).to.equal(5);
                                done();
                            });
                        });
                    });
                });
            });
        });
    });
}());
