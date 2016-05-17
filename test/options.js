(function () {
    'use strict';

    var expect = require('chai').expect,
        keepr;

    describe('Keepr#setOptions', function () {

        before(function () {
            keepr = new (require('../').Keepr)();
            keepr.setOptions({ size: 0 });
            keepr.purge();
        });

        after(function () {
            keepr.purge();
        });

        it('Should not throw and return the current Keepr instance', function (done) {
            expect(keepr.setOptions.bind(keepr, null)).to.not.throw(Error).and.to.equal(keepr);
            expect(keepr.setOptions.bind(keepr, undefined)).to.not.throw(Error).and.to.equal(keepr);
            expect(keepr.setOptions.bind(keepr, 'string')).to.not.throw(Error).and.to.equal(keepr);
            expect(keepr.setOptions.bind(keepr, 1)).to.not.throw(Error).and.to.equal(keepr);
            done();
        });

        var log = console.log;
        it('Should modify options when an object is passed to set options', function (done) {
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
    });
}());
