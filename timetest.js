'use strict';
var keepr = require('./');

// Third argument is a process.hrtime tuple with
// the time taked to load the file.

// Read *this* file
keepr.get('./ReadMe.md', function (err, contents, time) {
    var ns = time[0] * 1e9 + time[1];

    keepr.get('./ReadMe.md', function (err, contents, cachedTime) {
        var cachedNS = cachedTime[0] * 1e9 + cachedTime[1];

        // ~ 93-95% faster on my machine...
        console.log((1 - (cachedNS / ns)) * 100);
    });
});
