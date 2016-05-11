(function () {
    'use strict';

    var expect = require('chai').expect,
        path   = require('path'),
        fs     = require('fs'),
        keepr;

    describe('FS Wrapping', function () {

        before(function () {
            keepr = require('../');
            keepr.purge();
        });

        after(function () {
            keepr.purge();
            keepr.unwrapFS();
        });

        it('It should wrap fs.readFile and fs.readFileSync when keepr.wrapFS is called', function () {
            var readFile     = fs.readFile,
                readFileSync = fs.readFileSync;

            expect(keepr).to.be.an('object');
            expect(keepr).to.be.an.instanceof(keepr.Keepr);
            expect(keepr.wrapFS).to.be.a('function');
            expect(keepr.unwrapFS).to.be.a('function');

            keepr.wrapFS();
            expect(fs.readFile).to.equal(keepr.get);
            expect(fs.readFileSync).to.equal(keepr.getSync);

            keepr.unwrapFS();
            expect(fs.readFile).to.equal(readFile);
            expect(fs.readFileSync).to.equal(readFileSync);

            keepr.wrapFS();
            expect(fs.readFile).to.equal(keepr.get);
            expect(fs.readFileSync).to.equal(keepr.getSync);
        });

        it('fs.readFile should perform correctly when wrapped', function (done) {
            keepr.purge();
            var f = path.join(__dirname, '..', 'package.json');
            expect(keepr.isCached(f)).to.equal(false);

            var dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(0);

            fs.readFile(f, { encoding: 'utf-8' }, function (err, contents) {
                expect(keepr.isCached(f)).to.equal(true);
                expect(err).to.equal(null);
                expect(contents).to.be.a('string');

                expect(keepr.sizeOf(contents)).to.be.greaterThan(700);
                var package_ = JSON.parse(contents);
                expect(package_).to.be.an('object');
                expect(package_.name).to.equal('keepr');

                var dump = keepr.dump();
                expect(dump).to.be.an('object');
                expect(dump._.size()).to.equal(2);

                expect(keepr.isCached(f)).to.equal(true);
                fs.readFile(f, { encoding: 'utf-8' }, function (err, contents) {
                    expect(keepr.isCached(f)).to.equal(true);
                    expect(err).to.equal(null);
                    expect(contents).to.be.a('string');

                    expect(keepr.sizeOf(contents)).to.be.greaterThan(700);
                    var package_ = JSON.parse(contents);
                    expect(package_).to.be.an('object');
                    expect(package_.name).to.equal('keepr');

                    var dump = keepr.dump();
                    expect(dump).to.be.an('object');
                    expect(dump._.size()).to.equal(2);
                    done();
                });
            });
        });

        it('fs.readFileSync should perform correctly when wrapped', function (done) {
            keepr.purge();
            var f = path.join(__dirname, '..', 'package.json');
            expect(keepr.isCached(f)).to.equal(false);

            var dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(0);

            var contents = fs.readFileSync(f, { encoding: 'utf-8' });
            expect(keepr.isCached(f)).to.equal(true);
            expect(contents).to.be.a('string');

            expect(keepr.sizeOf(contents)).to.be.greaterThan(700);
            var package_ = JSON.parse(contents);
            expect(package_).to.be.an('object');
            expect(package_.name).to.equal('keepr');

            dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(1);

            expect(keepr.isCached(f)).to.equal(true);
            contents = fs.readFileSync(f, { encoding: 'utf-8' });
            expect(keepr.isCached(f)).to.equal(true);
            expect(contents).to.be.a('string');

            expect(keepr.sizeOf(contents)).to.be.greaterThan(700);
            package_ = JSON.parse(contents);
            expect(package_).to.be.an('object');
            expect(package_.name).to.equal('keepr');

            dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(1);

            f = path.join(__dirname, '..', 'ReadMe.md');
            expect(keepr.isCached(f)).to.equal(false);
            contents = fs.readFileSync(f, { encoding: 'utf-8' });
            expect(keepr.isCached(f)).to.equal(true);
            expect(contents).to.be.a('string');

            expect(keepr.sizeOf(contents)).to.be.greaterThan(700);

            dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(2);
            done();
        });
    });
}());
