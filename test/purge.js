(function () {
    'use strict';

    var expect = require('chai').expect,
        path   = require('path'),
        keepr;

    describe('Keepr#purge', function () {

        before(function () {
            keepr = new (require('../')).Keepr();
            keepr.purge();
        });

        after(function () {
            keepr.purge();
        });

        it('Should purge file contents by filename', function (done) {
            this.timeout(3000);
            this.slow(500);

            var f  = path.join(__dirname, '..', 'index.js'),
                f2 = path.join(__dirname, '..', 'ReadMe.md'),
                f3 = path.join(__dirname, '..', 'package.json'),
                f4 = path.join(__dirname, 'basic.js'),

                read  = 0,
                files = [f, f2, f3, f4];

            files._.each(function (file) {
                keepr.read(file, function () {
                    if(++read === 4) {
                        var dump    = keepr.dump(),
                            cached  = dump._.size(),
                            cleared = 0;

                        expect(dump).to.be.an('object');
                        expect(cached).to.equal(4);

                        files._.each(function (f) {
                            keepr.purge(f);
                            expect((++cleared) + (--cached)).to.equal(dump._.size());
                        });

                        expect(keepr.dump()._.size()).to.equal(0);

                        read = 0;
                        files._.each(function (file) {
                            keepr.read(file, 'utf-8', function () {
                                if(++read === 4) {
                                    var dump    = keepr.dump(),
                                        cached  = dump._.size(),
                                        cleared = 0;
                                    expect(dump).to.be.an('object');
                                    expect(cached).to.equal(8);

                                    files._.each(function (f) {
                                        keepr.purge(f);
                                        cleared += 2;
                                        cached  -= 2;
                                        expect(cleared + cached).to.equal(dump._.size());
                                    });

                                    expect(keepr.dump()._.size()).to.equal(0);
                                    done();
                                }
                            });
                        });
                    }
                });
            });
        });

        it('Should purge all cache', function (done) {
            this.timeout(5000);
            this.slow(500);

            var f  = path.join(__dirname, '..', 'index.js'),
                f2 = path.join(__dirname, '..', 'ReadMe.md'),
                f3 = path.join(__dirname, '..', 'package.json'),
                f4 = path.join(__dirname, 'basic.js'),

                read  = 0,
                files = [f, f2, f3, f4];

            files._.each(function (file) {
                keepr.read(file, function () {
                    if(++read === 4) {
                        var dump    = keepr.dump(),
                            cached  = dump._.size(),
                            cleared = 0;

                        expect(dump).to.be.an('object');
                        expect(cached).to.equal(4);

                        files._.each(function (f) {
                            keepr.purge(f);
                            expect((++cleared) + (--cached)).to.equal(dump._.size());
                        });

                        expect(keepr.dump()._.size()).to.equal(0);

                        read = 0;
                        files._.each(function (file) {
                            keepr.read(file, 'utf-8', function () {
                                if(++read === 4) {
                                    var dump    = keepr.dump(),
                                        cached  = dump._.size(),
                                        cleared = 0;
                                    expect(dump).to.be.an('object');
                                    expect(cached).to.equal(8);

                                    files._.each(function (f) {
                                        keepr.purge(f);
                                        cleared += 2;
                                        cached  -= 2;
                                        expect(cleared + cached).to.equal(dump._.size());
                                    });

                                    expect(keepr.dump()._.size()).to.equal(0);
                                    done();
                                }
                            });
                        });
                    }
                });
            });
        });
    });
}());
