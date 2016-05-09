(function () {
    'use strict';

    var expect = require('chai').expect,
        path   = require('path'),
        keepr;

    describe('Basic Usage', function () {

        before(function () {
            keepr = require('../');
            keepr.purge();
        });

        after(function () {
            keepr.purge();
        });

        it('It should return an object with the correct API when required', function () {
            expect(keepr).to.be.an('object');
            expect(keepr).to.be.an.instanceof(keepr.Keepr);
            expect(keepr.get).to.be.a('function');
            expect(keepr.getSync).to.be.a('function');
            expect(keepr.read).to.be.a('function');
            expect(keepr.readSync).to.be.a('function');
            expect(keepr.setHistoryFactor).to.be.a('function');
            expect(keepr.currentByteSize).to.be.a('function');
            expect(keepr.currentSize).to.be.a('function');
            expect(keepr.getMaxCacheSize).to.be.a('function');
            expect(keepr.setCacheLimit).to.be.a('function');
            expect(keepr.utilized).to.be.a('function');
            expect(keepr.relativeTo).to.be.a('function');
            expect(keepr.purge).to.be.a('function');
            expect(keepr.dump).to.be.a('function');
            expect(keepr.wrapFS).to.be.a('function');
            expect(keepr.unwrapFS).to.be.a('function');
            expect(keepr.sizeOf).to.be.a('function');

            var dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(0);
        });

        it('It should read files asyncronously', function (done) {
            var f = path.join(__dirname, '..', 'package.json');
            expect(keepr.isCached(f)).to.equal(false);

            var dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(0);

            keepr.get(f, { encoding: 'utf-8' }, function (err, contents) {
                expect(keepr.isCached(f)).to.equal(true);
                expect(err).to.equal(null);
                expect(contents).to.be.a('string');

                var package_ = JSON.parse(contents);
                expect(package_).to.be.an('object');
                expect(package_.name).to.equal('keepr');

                var dump = keepr.dump();
                expect(dump).to.be.an('object');
                expect(dump._.size()).to.equal(1);
                done();
            });
        });

        it('It should read files asyncronously and return a buffer by default', function (done) {
            var f = path.join(__dirname, '..', 'ReadMe.md');
            expect(keepr.isCached(f)).to.equal(false);

            var dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(1);

            keepr.get(f, function (err, contents) {
                expect(keepr.isCached(f)).to.equal(true);

                expect(err).to.equal(null);
                expect(contents).to.be.an.instanceof(Buffer);

                var dump = keepr.dump();
                expect(dump).to.be.an('object');
                expect(dump._.size()).to.equal(2);

                done();
            });
        });

        it('It should read files asyncronously and return an object when JSON is read and the "json" encoding is provided', function (done) {
            var f = path.join(__dirname, '..', 'package.json');
            expect(keepr.isCached(f)).to.equal(true);

            keepr.purge();
            expect(keepr.isCached(f)).to.equal(false);

            var dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(0);

            keepr.get(f, { encoding: 'json' }, function (err, contents, time) {
                expect(keepr.isCached(f)).to.equal(true);
                expect(time).to.be.an('array');

                expect(err).to.equal(null);
                expect(contents).to.be.an('object');
                expect(contents.name).to.equal('keepr');

                var dump = keepr.dump();
                expect(dump).to.be.an('object');
                expect(dump._.size()).to.equal(1);

                keepr.get(f, 'json', function (err, contents, cachedTime) {
                    expect(cachedTime).to.be.an('array');
                    expect(keepr.isCached(f)).to.equal(true);

                    expect(cachedTime[0] * 1e9 + cachedTime[1]).to.be.lessThan(time[0] * 1e9 + time[1]);

                    expect(err).to.equal(null);
                    expect(contents).to.be.an('object');
                    expect(contents.name).to.equal('keepr');

                    var dump = keepr.dump();
                    expect(dump).to.be.an('object');
                    expect(dump._.size()).to.equal(1);
                    done();
                });
            });
        });

        it('It should return a buffer when "buffer" is specified in the encoding', function (done) {
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

                        var package_ = JSON.parse(contents);
                        expect(package_).to.be.an('object');
                        expect(package_.name).to.equal('keepr');

                        var dump = keepr.dump();
                        expect(dump).to.be.an('object');
                        expect(dump._.size()).to.equal(1);

                        keepr.get(f, { encoding: 'hex' }, function (err, contents) {
                            expect(keepr.isCached(f)).to.equal(true);
                            expect(err).to.equal(null);
                            expect(contents).to.be.a('string');
                            expect(utfContents).to.not.equal(contents);

                            var dump = keepr.dump();
                            expect(dump).to.be.an('object');
                            expect(dump._.size()).to.equal(1);

                            f = path.join(__dirname, '..', 'ReadMe.md');
                            expect(keepr.isCached(f)).to.equal(false);

                            keepr.get(f, 'utf-8', function (err, contents) {
                                expect(keepr.isCached(f)).to.equal(true);

                                expect(err).to.equal(null);
                                expect(contents).to.be.a('string');

                                var dump = keepr.dump();
                                expect(dump).to.be.an('object');
                                expect(dump._.size()).to.equal(2);
                                done();
                            });
                        });
                    });
                });
            });
        });
    });
}());
