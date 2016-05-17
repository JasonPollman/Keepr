(function () {
    'use strict';

    var expect = require('chai').expect,
        path   = require('path'),
        keepr;

    describe('Keepr Edge Cases', function () {

        before(function () {
            keepr = new (require('../')).Keepr();
            keepr.purge();
        });

        after(function () {
            keepr.purge();
        });

        it('Should not accept anything except a string passed to Keepr#get and Keepr#getSync', function (done) {
            this.timeout(3000);
            this.slow(500);

            var finished = 0;

            expect(keepr.getSync.bind(keepr, {})).to.throw(TypeError);
            keepr.get({}, function (err, contents) {
                expect(contents).to.equal(null);
                expect(err).to.be.an.instanceof(TypeError);
                finished++;
            });

            expect(keepr.getSync.bind(keepr, [])).to.throw(TypeError);
            keepr.get([], function (err, contents) {
                expect(contents).to.equal(null);
                expect(err).to.be.an.instanceof(TypeError);
                finished++;
            });

            expect(keepr.getSync.bind(keepr, 123)).to.throw(TypeError);
            keepr.get(123, function (err, contents) {
                expect(contents).to.equal(null);
                expect(err).to.be.an.instanceof(TypeError);
                finished++;
            });

            expect(keepr.getSync.bind(keepr, function () {})).to.throw(TypeError);
            keepr.get(function () {}, function (err, contents) {
                expect(contents).to.equal(null);
                expect(err).to.be.an.instanceof(TypeError);
                finished++;
            });

            expect(keepr.getSync.bind(keepr, null)).to.throw(TypeError);
            keepr.get(null, function (err, contents) {
                expect(contents).to.equal(null);
                expect(err).to.be.an.instanceof(TypeError);
                finished++;
            });

            expect(keepr.getSync.bind(keepr, undefined)).to.throw(TypeError);
            keepr.get(undefined, function (err, contents) {
                expect(contents).to.equal(null);
                expect(err).to.be.an.instanceof(TypeError);
                finished++;
            });

            var int = setInterval(function () {
                if(finished >= 6) {
                    done();
                    clearInterval(int);
                }
            }, 100);
        });

        it('Should return false when Keepr#isCached is called with anything except a string', function (done) {
            expect(keepr.isCached({})).to.equal(false);
            expect(keepr.isCached([])).to.equal(false);
            expect(keepr.isCached('')).to.equal(false);
            expect(keepr.isCached(123)).to.equal(false);
            expect(keepr.isCached(null)).to.equal(false);
            expect(keepr.isCached(undefined)).to.equal(false);
            expect(keepr.isCached(function () {})).to.equal(false);
            done();
        });

        it('Should cap the size to the available heap size', function (done) {
            expect(keepr.setOptions({ size: 999999999999999999 })).to.equal(keepr);
            expect(keepr.getOptions().size).to.be.lt(4e9); // 4 GB

            expect(keepr.setOptions({ size: Number.MAX_VALUE })).to.equal(keepr);
            expect(keepr.getOptions().size).to.be.lt(4e9); // 4 GB
            done();
        });

        it('Should return the current heap size when Keepr#getMaxCacheSize is called', function (done) {
            expect(keepr.getMaxCacheSize()).to.be.lt(4e9); // 4 GB
            done();
        });

        it('Should set the cache size to default, when a non-numeric or non-limit string is passed', function (done) {
            expect(keepr.setOptions({ size: [] }).getOptions().size).to.be.lt(4e9);
            expect(keepr.setOptions({ size: {} }).getOptions().size).to.be.lt(4e9);
            expect(keepr.setOptions.bind(keepr, { size: 'a string' })).to.throw(Error);
            expect(keepr.setOptions({ size: function () {} }).getOptions().size).to.be.lt(4e9);
            done();
        });

        it('Should throw a TypeError on an invalid encoding type', function (done) {
            expect(keepr.getSync.bind(keepr, path.join(__dirname, '..', 'package.json'), 'bad encoding')).to.throw(TypeError);
            expect(keepr.getSync.bind(keepr, path.join(__dirname, '..', 'package.json'), { encoding: 'foo' })).to.throw(TypeError);
            done();
        });

        it('Should return the cache limit', function (done) {
            expect(keepr.getSync.bind(keepr, path.join(__dirname, '..', 'package.json'), 'bad encoding')).to.throw(TypeError);
            expect(keepr.getSync.bind(keepr, path.join(__dirname, '..', 'package.json'), { encoding: 'foo' })).to.throw(TypeError);
            done();
        });

        it('Should convert "utf8" to "utf-8" for internal use', function (done) {
            var keepr = new (require('../')).Keepr();
            keepr.setOptions({ size: 0 });
            var f = path.join(__dirname, '..', 'package.json');

            expect(keepr.isCached(f)).to.equal(false);
            keepr.read(f, 'utf8', function (err, contents) {
                expect(err).to.equal(null);
                expect(contents).to.be.a('string');
                expect(keepr.isCached(f)).to.equal(true);

                keepr.read(f, 'utf-8', function (err, contentsNew) {
                    expect(err).to.equal(null);
                    expect(contents).to.be.a('string');
                    expect(contents).to.equal(contentsNew);
                    expect(keepr.isCached(f)).to.equal(true);
                    done();
                });
            });
        });

        it('Should return an error when using async and providing an unknown encoding', function (done) {
            var keepr = new (require('../')).Keepr();
            keepr.setOptions({ size: 0 });
            var f = path.join(__dirname, '..', 'package.json');

            expect(keepr.isCached(f)).to.equal(false);
            keepr.read(f, 'bad encoding', function (err, contents) {
                expect(err).to.be.an.instanceof(TypeError);
                expect(contents).to.equal(null);
                done();
            });
        });

        it('Should *not* cache items that are greater than 25% of (heap / historyFactor)', function (done) {
            var keepr = new (require('../')).Keepr();
            keepr.setOptions({ size: 500 });
            var f = path.join(__dirname, '..', 'package.json');

            expect(keepr.isCached(f)).to.equal(false);
            keepr.read(f, 'utf-8', function (err, contents) {
                expect(err).to.equal(null);
                expect(contents).to.be.a('string');
                expect(keepr.isCached(f)).to.equal(false);

                keepr.read(f, function (err, contents) {
                    expect(err).to.equal(null);
                    expect(contents).to.be.an.instanceof(Buffer);
                    expect(keepr.isCached(f)).to.equal(false);
                    done();
                });
            });
        });
    });
}());
