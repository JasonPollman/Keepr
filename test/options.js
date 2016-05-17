(function () {
    'use strict';

    var expect = require('chai').expect,
        path   = require('path'),
        fs     = require('fs'),
        keepr;

    describe('Keepr#setOptions', function () {

        before(function () {
            keepr = new (require('../').Keepr)();
            keepr.setOptions({ size: 0 });
            keepr.purge();
        });

        after(function (done) {
            keepr.purge();
            fs.unlink(path.join(__dirname, 'keepr.test.options.txt'), function () {
                done();
            });
        });

        it('Should not throw and return the current Keepr instance', function (done) {
            expect(keepr.setOptions.bind(keepr, null)).to.not.throw(Error).and.to.equal(keepr);
            expect(keepr.setOptions.bind(keepr, undefined)).to.not.throw(Error).and.to.equal(keepr);
            expect(keepr.setOptions.bind(keepr, 'string')).to.not.throw(Error).and.to.equal(keepr);
            expect(keepr.setOptions.bind(keepr, 1)).to.not.throw(Error).and.to.equal(keepr);
            done();
        });

        it('Should accept limit strings for the denominations "b", "kb", "mb", and "gb"', function (done) {

            keepr.setOptions({ size: '100b' });
            expect(keepr.getOptions().size).to.equal(100);

            keepr.setOptions({ size: '100kb' });
            expect(keepr.getOptions().size).to.equal(100000);

            keepr.setOptions({ size: '100mb' });
            expect(keepr.getOptions().size).to.equal(100000000);

            keepr.setOptions({ size: '1gb' });
            expect(keepr.getOptions().size).to.equal(1e9);

            expect(keepr.setOptions.bind(keepr, { size: 0 })).to.not.throw(Error).and.to.equal(keepr);
            expect(keepr.getOptions().size).to.equal(Number.MAX_VALUE);

            expect(keepr.setOptions.bind(keepr, { size: -1 })).to.not.throw(Error).and.to.equal(keepr);
            expect(keepr.getOptions().size).to.equal(Number.MAX_VALUE);

            expect(keepr.setOptions.bind(keepr, { size: '0b' })).to.not.throw(Error).and.to.equal(keepr);
            expect(keepr.getOptions().size).to.equal(Number.MAX_VALUE);

            expect(keepr.setOptions.bind(keepr, { size: '0kb' })).to.not.throw(Error).and.to.equal(keepr);
            expect(keepr.getOptions().size).to.equal(Number.MAX_VALUE);

            expect(keepr.setOptions.bind(keepr, { size: '-0mb' })).to.throw(Error);
            expect(keepr.getOptions().size).to.equal(Number.MAX_VALUE);

            expect(keepr.setOptions.bind(keepr, { size: '-0gb' })).to.throw(Error);
            expect(keepr.getOptions().size).to.equal(Number.MAX_VALUE);

            expect(keepr.setOptions.bind(keepr, { size: '-0b' })).to.throw(Error);
            expect(keepr.getOptions().size).to.equal(Number.MAX_VALUE);

            expect(keepr.setOptions.bind(keepr, { size: '-0kb' })).to.throw(Error);
            expect(keepr.getOptions().size).to.equal(Number.MAX_VALUE);

            expect(keepr.setOptions.bind(keepr, { size: '-0mb' })).to.throw(Error);
            expect(keepr.getOptions().size).to.equal(Number.MAX_VALUE);

            expect(keepr.setOptions.bind(keepr, { size: '-0gb' })).to.throw(Error);
            expect(keepr.getOptions().size).to.equal(Number.MAX_VALUE);

            expect(keepr.setOptions.bind(keepr, { size: '' })).to.throw(Error);
            expect(keepr.getOptions().size).to.equal(Number.MAX_VALUE);

            expect(keepr.setOptions.bind(keepr, { size: 'string' })).to.throw(Error);
            expect(keepr.getOptions().size).to.equal(Number.MAX_VALUE);

            done();
        });

        it('Should modify options when an object is passed to set options, part 1', function (done) {
            var log = console.log;
            console.log = function () {};

            expect(keepr.getOptions()).to.eql({ size: Number.MAX_VALUE, debug: false, watch: true, historyFactor: 2 });

            expect(keepr.setOptions({ size: '2mb' })).to.equal(keepr);
            expect(keepr.getOptions()).to.eql({ size: 2000000, debug: false, watch: true, historyFactor: 2 });

            expect(keepr.setOptions({ debug: true })).to.equal(keepr);
            expect(keepr.getOptions()).to.eql({ size: 2000000, debug: true, watch: true, historyFactor: 2 });

            expect(keepr.setOptions({ debug: false })).to.equal(keepr);
            expect(keepr.getOptions()).to.eql({ size: 2000000, debug: false, watch: true, historyFactor: 2 });

            expect(keepr.setOptions({ size: '1gb', debug: false, watch: false })).to.equal(keepr);
            expect(keepr.getOptions()).to.eql({ size: 1000000000, debug: false, watch: false, historyFactor: 2 });

            expect(keepr.setOptions({ size: '1gb', debug: false, watch: true, historyFactor: 4 })).to.equal(keepr);
            expect(keepr.getOptions()).to.eql({ size: 1000000000, debug: false, watch: true, historyFactor: 4 });

            console.log = log;
            done();
        });

        it('Should modify options when an object is passed to set options, part 2', function (done) {
            var keepr = new (require('../').Keepr)({ size: -1 }),
                log   = console.log,
                f     = path.join(__dirname, 'keepr.test.options.txt');

            console.log = function () {};

            keepr.purge();
            fs.writeFile(f, 'goodbye world', function () {
                keepr.read(f, function (err, contents) {
                    expect(err).to.equal(null);
                    expect(contents).to.be.an.instanceof(Buffer);

                    expect(keepr.getOptions()).to.eql({ size: Number.MAX_VALUE, debug: false, watch: true, historyFactor: 2 });

                    expect(keepr.setOptions({ size: '2mb' })).to.equal(keepr);
                    expect(keepr.getOptions()).to.eql({ size: 2000000, debug: false, watch: true, historyFactor: 2 });

                    expect(keepr.setOptions({ debug: true })).to.equal(keepr);
                    expect(keepr.getOptions()).to.eql({ size: 2000000, debug: true, watch: true, historyFactor: 2 });

                    expect(keepr.setOptions({ debug: false })).to.equal(keepr);
                    expect(keepr.getOptions()).to.eql({ size: 2000000, debug: false, watch: true, historyFactor: 2 });

                    expect(keepr.setOptions({ size: '1gb', debug: false, watch: false })).to.equal(keepr);
                    expect(keepr.getOptions()).to.eql({ size: 1000000000, debug: false, watch: false, historyFactor: 2 });

                    expect(keepr.setOptions({ size: '1gb', debug: false, watch: true, historyFactor: 4 })).to.equal(keepr);
                    expect(keepr.getOptions()).to.eql({ size: 1000000000, debug: false, watch: true, historyFactor: 4 });

                    fs.writeFile(f, 'goodbye world', function () {
                        console.log = log;
                        done();
                    });
                });
            });
        });

        it('Should lock the historyFactor between 1.5 and 8', function () {
            keepr.setOptions({ historyFactor: -1 });
            expect(keepr.getOptions().historyFactor).to.equal(1.5);

            keepr.setOptions({ historyFactor: 'a string' });
            expect(keepr.getOptions().historyFactor).to.equal(1.5);

            keepr.setOptions({ historyFactor: [] });
            expect(keepr.getOptions().historyFactor).to.equal(1.5);

            keepr.setOptions({ historyFactor: {} });
            expect(keepr.getOptions().historyFactor).to.equal(1.5);

            keepr.setOptions({ historyFactor: function () {} });
            expect(keepr.getOptions().historyFactor).to.equal(1.5);

            keepr.setOptions({ historyFactor: 5 });
            expect(keepr.getOptions().historyFactor).to.equal(5);

            keepr.setOptions({ historyFactor: 0 });
            expect(keepr.getOptions().historyFactor).to.equal(1.5);

            keepr.setOptions({ historyFactor: 1.5 });
            expect(keepr.getOptions().historyFactor).to.equal(1.5);

            keepr.setOptions({ historyFactor: 8 });
            expect(keepr.getOptions().historyFactor).to.equal(8);

            keepr.setOptions({ historyFactor: 9 });
            expect(keepr.getOptions().historyFactor).to.equal(8);

            keepr.setOptions({ historyFactor: Number.MAX_VALUE });
            expect(keepr.getOptions().historyFactor).to.equal(8);
        });
    });
}());
