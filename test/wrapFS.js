(function () {
    'use strict';

    var expect = require('chai').expect,
        path   = require('path'),
        fs     = require('fs'),
        keepr;

    describe('Keepr#wrapFS', function () {
        var pkg, readme, readmehex;

        before(function (done) {
            keepr = require('../');
            keepr.purge();

            fs.readFile('./package.json', 'utf-8', function (err, contents) {
                pkg = contents;

                fs.readFile('./ReadMe.md', function (err, contents) {
                    readme    = contents.toString('utf-8');
                    readmehex = contents.toString('hex');
                    done();
                });
            });
        });

        after(function () {
            keepr.purge();
            keepr.unwrapFS();
        });

        it('Should wrap fs.readFile and fs.readFileSync when keepr.wrapFS is called', function () {
            var readFile     = fs.readFile,
                readFileSync = fs.readFileSync;

            keepr.purge();
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
            keepr.wrapFS();
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

                expect(contents).to.equal(pkg);

                expect(keepr.sizeOf(contents)).to.be.greaterThan(686);
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

                    expect(contents).to.equal(pkg);

                    expect(keepr.sizeOf(contents)).to.be.greaterThan(686);
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
            keepr.wrapFS();
            keepr.purge();
            var f = path.join(__dirname, '..', 'package.json');
            expect(keepr.isCached(f)).to.equal(false);

            var dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(0);

            var contents = fs.readFileSync(f, { encoding: 'utf-8' });
            expect(keepr.isCached(f)).to.equal(true);
            expect(contents).to.be.a('string');
            expect(contents).to.equal(pkg);

            expect(keepr.sizeOf(contents)).to.be.greaterThan(686);
            var package_ = JSON.parse(contents);
            expect(package_).to.be.an('object');
            expect(package_.name).to.equal('keepr');

            dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(2);

            expect(keepr.isCached(f)).to.equal(true);
            contents = fs.readFileSync(f, { encoding: 'utf-8' });
            expect(keepr.isCached(f)).to.equal(true);
            expect(contents).to.be.a('string');

            expect(keepr.sizeOf(contents)).to.be.greaterThan(686);
            package_ = JSON.parse(contents);
            expect(package_).to.be.an('object');
            expect(package_.name).to.equal('keepr');

            dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(2);

            f = path.join(__dirname, '..', 'ReadMe.md');
            expect(keepr.isCached(f)).to.equal(false);
            contents = fs.readFileSync(f, { encoding: 'utf-8' });
            expect(keepr.isCached(f)).to.equal(true);
            expect(contents).to.be.a('string');
            expect(contents).to.equal(readme);

            expect(keepr.sizeOf(contents)).to.be.greaterThan(700);

            dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(4);

            expect(keepr.isCached(f)).to.equal(true);
            contents = fs.readFileSync(f, { encoding: 'hex' });
            expect(keepr.isCached(f)).to.equal(true);
            expect(contents).to.be.a('string');
            expect(contents).to.not.equal(readme);
            expect(contents).to.equal(readmehex);

            expect(keepr.sizeOf(contents)).to.be.greaterThan(700);

            dump = keepr.dump();
            expect(dump).to.be.an('object');
            expect(dump._.size()).to.equal(5);
            done();
        });
    });
}());
