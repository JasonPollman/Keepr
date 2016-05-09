(function () {
    'use strict';

    var expect = require('chai').expect,
        path   = require('path'),
        keepr;

    describe('Keepr Dump', function () {

        before(function () {
            keepr = new (require('../')).Keepr();
            keepr.purge();
        });

        after(function () {
            keepr.purge();
        });

        it('It should dump a copy of the cache contents', function (done) {
            var f  = path.join(__dirname, '..', 'index.js'),
                f2 = path.join(__dirname, '..', 'ReadMe.md'),
                f3 = path.join(__dirname, '..', 'package.json'),
                f4 = path.join(__dirname, 'basic.js');

                var read = 0;
                [f, f2, f3, f4]._.each(function (file) {
                    keepr.read(file, function () {
                        if(++read === 4) {
                            var dump = keepr.dump(),
                                arr  = dump._.toArray();

                            expect(dump).to.be.an('object');
                            expect(dump._.size()).to.equal(4);

                            arr._.each(function (d) {
                                expect(d.source).to.be.a('string');
                                expect(d.called).to.be.a('number');
                                expect(d.size).to.be.a('number');
                                expect([f, f2, f3, f4].indexOf(d.source) > -1).to.equal(true);
                            });
                            done();
                        }
                    });
                });
        });
    });
}());
