(function () {
    'use strict';

    var expect = require('chai').expect,
        path   = require('path'),
        keepr;

    describe('Cache Limit', function () {

        before(function () {
            keepr = new (require('../')).Keepr();
            keepr.purge();
        });

        after(function () {
            keepr.purge();
        });

        it('It should caches files up to the cache limit, then purge old ones', function () {
        });
    });
}());
