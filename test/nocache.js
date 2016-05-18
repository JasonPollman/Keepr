(function () {
    'use strict';

    var expect = require('chai').expect,
        path   = require('path'),
        fs     = require('fs'),
        keepr;

    describe('Keepr#noCache/Keepr#noCacheSync', function () {

        before(function () {
            keepr = new (require('../')).Keepr();
            keepr.purge();
        });

        after(function () {
            keepr.purge();
        });

        it('Should expose the native fs read file methods', function () {
            expect(keepr.noCache).to.equal(fs.readFile);
            expect(keepr.noCacheSync).to.equal(fs.readFileSync);
        });

        it('Should not cache files asyncronously', function (done) {
            var f = path.join(__dirname, '..', 'package.json');

            expect(keepr.isCached(f)).to.equal(false);
            keepr.noCache(f, 'utf8', function (err, contents) {
                expect(err).to.equal(null);
                expect(contents).to.be.a('string');
                expect(keepr.isCached(f)).to.equal(false);
                done();
            });
        });

        it('Should not cache files syncronously', function (done) {
            var f = path.join(__dirname, '..', 'package.json');

            expect(keepr.isCached(f)).to.equal(false);
            var contents = keepr.noCacheSync(f, 'utf8');
            expect(contents).to.be.a('string');
            expect(keepr.isCached(f)).to.equal(false);
            done();
        });
    });
}());
