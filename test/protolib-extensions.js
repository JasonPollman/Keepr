(function () {
    'use strict';

    var expect = require('chai').expect,
        keepr;

    describe('Protolib Extensions', function () {

        before(function () {
            keepr = new (require('../')).Keepr({});
            keepr.purge();
        });

        after(function () {
            keepr.purge();
        });

        it('Should add Keepr#sizeOf to all strings', function () {
            expect('000'._.sizeOf()).to.equal(3);
            expect(''._.sizeOf()).to.equal(0);
            expect('0'._.sizeOf()).to.equal(1);
            expect('abcdefghijklmnopqrstuvwxyz'._.sizeOf()).to.equal(26);
        });

        it('Should add Keepr#sizeOf to all Buffer objects', function () {
            expect(new Buffer(3)._.sizeOf()).to.equal(3);
            expect(new Buffer(1e6)._.sizeOf()).to.equal(1e6);
            expect(new Buffer(0)._.sizeOf()).to.equal(0);
            expect(new Buffer('test')._.sizeOf()).to.equal(4);
        });
    });
}());
