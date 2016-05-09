'use strict';

var crypto  = require('crypto'),
    path    = require('path'),
    lib     = require('proto-lib').get('_'),
    v8      = require('v8'),
    fs      = require('fs'),
    os      = require('os'),
    OS_TYPE = os.platform(),
    HOME    = os.homedir(),


    readFile     = fs.readFile,
    readFileSync = fs.readFileSync,

    /**
     * The default multipler to multiply against the available heap to set as the max space size if the provided
     * value is missing or invalid.
     * @type {Number}
     */
    DEFAULT_SIZE_PERCENTAGE_MULTIPLIER = 0.25;

/**
 * Replaces ~ or %HOME% with the user's home directory.
 * Extends the proto-lib library.
 */
lib.extend(String, 'tildeToHome', function (s) {
    return s.replace(/^(~|%HOME%)/, (HOME || (OS_TYPE === 'win32' ? '\\' : '/')));
});

/**
 * Cache's files up to a specified byte size and keeps the most frequently files used in memory.
 * @constructor
 * @param {Object} options Various options to set class defaults.
 * @param {Number=} options.size The maximum bytesize the cache is allowed to grow to.
 * @param {Boolean=} options.debug If true, debug messages will be printed.
 * @param {Number=} options.historyFactor A number between 1.5 and 8 that will affect how old cache is deleted. For more
 * info @see Keepr~historyFactor.
 */
function Keepr (options) {
    // Prevent bind calls
    if(!(this instanceof Keepr)) return new Keepr();

    /**
     * Stores file buffer contents
     * @type {Object<Buffer>}
     */
    var cache = {},

    /**
     * The currrent byte size of the cache in bytes.
     * @type {Number}
     */
    currentCacheSize = 0,

    /**
     * The maximum size the cache is allowed to store in *bytes*.
     * Default is 1 GB.
     * @type {}
     */
    cacheLimitSize = 0,

    /**
     * If true, debugging messages will be output to the stdout.
     * @type {Boolean}
     */
    debugEnabled = false,

    /**
     * If true, Keepr will remove cached files when files are changed.
     * @type {Boolean}
     */
    watchForChanges = true,

    /**
     * Stores the pending file loads and their callbacks. So if the same files are called async, the second
     * doesn't try to load the file again.
     * @type {Object<Array>}
     */
    pendingLoad = {},

    /**
     * The divisor in which the cache will be split to look for the next cache line(s) to remove. The higher this setting
     * the more the algorithm will focus on age compared to frequency, the lower the more it will focus on removing
     * older cache rather than less frequently used. This must be a number between 1.5 and 8, otherwise 2 will be used.
     * @type {Number}
     */
    historyFactor = 2,

    /**
     * If set, all paths will be relative to the given path prefix.
     * @type {String=}
     */
    relativeTo = null,

    /**
     * A self reference to the current Keepr object.
     * @type {Keepr}
     */
    self = this;

    /**
     * Simply writes debug messages to the stdout (if debugging is enabled for this instance).
     * @return {undefined}
     */
    function debug () {
        var args = arguments._.toArray();
        args.unshift('Keepr Debug →');
        if(debugEnabled === true) console.log.apply(console, args);
    }

    /**
     * Attempts to convert the buffer to the requested encoding without throwing if the encoding doesn't exist.
     * @param {Buffer} buffer The buffer to convert.
     * @param {String} encoding The encoding to convert the buffer to.
     * @param {Array<Number>} start The process.hrtime results from the beginning of the read call.
     * @param {Function} done A callback for completion.
     * @return {undefined}
     */
    function getBufferWithEncodingAndInvoke (buffer, encoding, start, done) {
        var res;
        try {
            if(encoding === 'json') {
                res = JSON.parse(buffer.toString('utf-8'));
            }
            else {
                res = encoding === 'buffer' ? new Buffer(buffer) : buffer.toString(encoding);
            }
            done.call(self, null, res, process.hrtime(start));
            return res;
        }
        catch (e) {
            done.call(self, e, null, process.hrtime(start));
            return e;
        }
    }

    /**
     * Invoked by fs.readFile when a file load is complete. All callbacks subscribed to the file will then
     * be invoked in the order they were requested.
     * @param {Error|null} err An error that occured loading the file, if one existed.
     * @param {String} hash The hash of the filename (cache item) to invoke the pending callbacks with.
     * @param {Buffer} buffer The buffer results from fs.readFile.
     * @return {undefined}
     */
    function onFileLoaded (err, filename, hash, buffer) {
        var loadQueue = pendingLoad[hash];
        pendingLoad[hash] = undefined;
        delete pendingLoad[hash];

        if(!err) {
            debug('File "' + filename + '" finished loading.');
            addToCache(filename, hash, buffer);
        }
        else {
            debug('File "' + filename + '" failed to load: ' + err.message);
        }

        if(loadQueue instanceof Array) {
            debug('Invoking ' + loadQueue.length + ' callback(s) for file "' + path.basename(filename) + '" with hash "' + hash + '".');
            loadQueue._.every(function (o) {
                if(err) {
                    o.callback.call(self, err, null, process.hrtime(o.start));
                }
                else {
                    getBufferWithEncodingAndInvoke(buffer, o.encoding, o.start, o.callback);
                }
            });
        }
    }

    /**
     * Adds a cache item to the cace.
     * @param {String} filename The filename associated with this buffer contents.
     * @param {String} hash The md5 string used to identify the cache.
     * @param {Buffer} buffer The buffer contents to store in the cache.
     * @return {undefined}
     */
    function addCacheLine (filename, hash, buffer) {
        var sz = self.currentByteSize();

        currentCacheSize += buffer.length;
        cache[hash] = {
            data    : buffer,
            size    : buffer.length,
            source  : filename,
            called  : 0,
            watcher : !watchForChanges ? null : fs.watch(filename, { persistent: false, }, function () {
                debug('Detected changes in file "' + filename + '" killing its cache.');
                cache[hash].watcher.close();

                cache[hash] = undefined;
                delete cache[hash];
            })
        };

        debug('Cache re-sized to: ' + buffer.length + ' + ' + sz + ' = ' + (sz + buffer.length) + ' (' + (self.utilized() * 100).toFixed(4) + '% utiliation).');
    }

    /**
     * Removes the oldest / least frequenly used cache item.
     * @return {undefined}
     */
    function makeRoomForBuffer (buffer) {
        var lfu, size;

        while(cacheLimitSize < currentCacheSize + buffer.length) {
            lfu = cache._.first(Math.ceil(cache._.size() / historyFactor))
                       ._.keyOfMin(function (line) { return line.called; });

            size = cache[lfu].size;
            currentCacheSize -= size;

            if(cache[lfu].watcher) cache[lfu].watcher.close();
            cache[lfu] = undefined;
            delete cache[lfu];
            debug('Cache line with hash: "' + lfu + '" and size ' +  size + ' removed');
        }
    }

    /**
     * Adds a file to the cache.
     * @param {String} filename The filename of the file that was loaded.
     * @param {String} hash The md5 string used to identify the cache.
     * @param {Buffer} buffer The buffer contents to store in the cache.
     * @return {Boolean} True if the file was cached, false otherwise.
     */
    function addToCache (filename, hash, buffer) {
        debug('Adding hash "' + hash + '" to cache.');
        if(!(buffer instanceof Buffer)) return false;

        var hasEnoughHeap = v8.getHeapStatistics().total_available_size > buffer.length;

        // Check that the filesize is less than the buffer size. If it's not, don't cache it.
        if(buffer.length > (cacheLimitSize / historyFactor * 2) || !hasEnoughHeap) {
            debug(
                'File "' + filename + '" is too large to be cached. Skipping...' + os.EOL +
                '    Cache     : ' + currentCacheSize                    + os.EOL +
                '    Limit     : ' + cacheLimitSize                      + os.EOL +
                '    Available : ' + (cacheLimitSize - currentCacheSize) + os.EOL +
                '    File      : ' + buffer.length
            );
            return false;
        }

        // Check that we have the heap space to allocate the new cache line
        if(hasEnoughHeap) {
            // Still room for the file contents...
            if(currentCacheSize + buffer.length < cacheLimitSize) {
                addCacheLine(filename, hash, buffer);
            }
            // Not enough room, gotta dump something...
            else {
                debug('Not enough room in cache, purging lines to make space.');
                makeRoomForBuffer(buffer);
                addCacheLine(filename, hash, buffer);
            }
        }
        // User needs to re-think their program design...
        else {
            debug('Warning! Heap allocation failure immenient! No heap space available to add cache!');
            return false;
        }
        return true;
    }

    /**
     * Converts a "limit string" to numeric bytes. A limit string is a string that is numbers followed by a space notation.
     * When called, this should be invoked with the string bytes portion of the limit string as the first argument, and the
     * type ('mb', 'gb', etc.) as the second.
     * Example: '1000mb', '1gb', '2.3kb', '5000b'.
     * @param {String|Number} n The numeric value portion of the limit string.
     * @param {String} type The notation portion of the limit string.
     * @return {Number} The limit string value in bytes.
     */
    function limitStringToBytes (n, type) {
        // Force default for negative numbers...
        if(n < 0) type = null;

        switch(type) {
            case 'b'  : return parseInt(n, 10);
            case 'kb' : return parseInt(n * 1e3, 10);
            case 'mb' : return parseInt(n * 1e6, 10);
            case 'gb' : return parseInt(n * 1e9, 10);
            default   : return v8.getHeapStatistics().total_available_size * DEFAULT_SIZE_PERCENTAGE_MULTIPLIER;
        }
    }

    /**
     * Checks that the given bytes are less than the maximum cache size. If not, it sets the size to the max.
     * @param {Number} bytes The number of bytes to check.
     * @return {Number} The value provided to the "bytes" parameter.
     */
    function checkLimitSize (bytes) {
        var max = self.getMaxCacheSize();
        if(bytes > max) return max;
        return bytes;
    }

    /**
     * Initalizes this Keepr instance.
     * @param {Object} options Options to init this instance with.
     * @return {Keepr} The current Keepr instance.
     */
    function init (options) {
        options = typeof options === 'object' ? options : {};

        // Set initial cache limit...
        self.setCacheLimit(options.size);
        // Set relativeTo option
        relativeTo = typeof options.relativeTo === 'string' ? self.relativeTo(options.relativeTo) : null;
        // Set file watching options
        watchForChanges = options.watch === undefined ? true : !!options.watch;
        // Set debug options
        debugEnabled = typeof options.debug === 'boolean' ? options.debug : false;
        // Set historyFactor option
        self.setHistoryFactor(options.historyFactor);

        debug('Max cache size is set to ' +  (cacheLimitSize * 1e-6)._.withPlaceholders() + 'mb.');
        debug('History factorization is ' +  historyFactor + '.');
        return self;
    }

    /**
     * Sets the history factor.
     * @param {Number} factor A number between 1.5 and 8 (inclusive).
     * @return {Keepr} The current Keepr instance.
     */
    this.setHistoryFactor = function (factor) {
        historyFactor = lib.object.isNumeric(factor) ? lib.object.getNumeric(factor) : 2;
        if(historyFactor < 1.5) historyFactor = 1.5;
        if(historyFactor > 8  ) historyFactor = 8;
        return self;
    };

    /**
     * Returns the byte size of the given object.
     * @param {String|Buffer|TypedArray} o The object to inspect.
     * @return {Number} The byte length of the object.
     */
    this.sizeOf = function sizeOf (o) {
        return Buffer.byteLength(o);
    };

    /**
     * Returns the current cache size in bytes.
     * @return {Number} The current cache size in bytes.
     */
    this.currentByteSize = function currentByteSize () {
        return currentCacheSize;
    };

    /**
     * Alias for Keepr#currentByteSize
     * @function
     */
    this.currentSize = this.currentByteSize;

    /**
     * Returns the maximum size the cache can be set to.
     * @return {[type]} [description]
     */
    this.getMaxCacheSize = function getMaxCacheSize () {
        return Math.floor(v8.getHeapStatistics().total_available_size);
    };

    /**
     * Returns the maxCacheLimit
     * @return {Number}
     */
    this.cacheLimit = function getCacheLimitSize () {
        return cacheLimitSize;
    };

    /**
     * Sets the maximum size the cache can grow to.
     * @param {Number|String} bytesOrLimitString The number of bytes, or a string representing a storage size.
     * Examples: 1000b, 1500kb, 1.5mb, 3gb...
     * @return {Keepr} The current Keepr instance.
     */
    this.setCacheLimit = function setCacheLimit (bytesOrLimitString) {
        // User passed a number, treat it as bytes..
        if(lib.object.isNumeric(bytesOrLimitString)) {
            cacheLimitSize = checkLimitSize(parseInt(bytesOrLimitString, 10));
        }
        // Got "limit string", parse the string...
        else if(typeof bytesOrLimitString === 'string') {
            var m = bytesOrLimitString.toLowerCase().match(/^ *(\d+(?:\.\d+)?) *(b|kb|mb|gb) *$/i);

            if(m) {
                cacheLimitSize = checkLimitSize(limitStringToBytes(m[1], m[2]));
            }
            else {
                throw new Error('Invalid cache size "' + bytesOrLimitString + '"');
            }
        }
        // Set default limit size...
        else {
            cacheLimitSize = v8.getHeapStatistics().total_available_size * DEFAULT_SIZE_PERCENTAGE_MULTIPLIER;
        }

        if(cacheLimitSize === 0) cacheLimitSize = Number.MAX_VALUE;
        return self;
    };

    /**
     * Returns the utilization percentage of the cache.
     * @return {Number} The utiliation percentage of the cache.
     */
    this.utilized = function utilized () {
        return currentCacheSize / cacheLimitSize;
    };

    /**
     * Reads a file, if cached the cached contents will be returned, otherwise the file will be loaded and cached.
     * @param {String} filename The path to the file to load.
     * @param {Function=} done A callback for completion.
     * @params {Object} options Options passed to fs.readFile
     * @return {Keepr|Buffer|String} The current Keepr instance, or the file contents is "sync" is true.
     */
    function get (sync, filename, options, done) {
        var start = process.hrtime(), contents;
        done = arguments._.getCallback();

        // Check filename argument...
        if(typeof filename !== 'string')
            return done.call(self, new Error(`Keepr#get expected argument #0 (get) to be a string, but got ${ typeof filename }`));

        // Check the options argument...
        if(typeof options === 'string') options = { encoding: options };
        options = typeof options === 'object' ? options : {};
        if(typeof options.encoding !== 'string') options.encoding = 'buffer';

        // Format the filename...
        var fn   = relativeTo ? path.resolve(path.join(relativeTo, filename)) : path.resolve(filename),
            hash = crypto
            .createHash('md5')
            .update('keepr-' + fn)
            .digest('hex');

        // Attempt to find the file in the cache.
        if(typeof cache[hash] === 'object') {
            cache[hash].called++;
            debug('Requested file "' + fn + '" present, returning cache with key "' + hash + '".');
            contents = getBufferWithEncodingAndInvoke(cache[hash].data, options.encoding, start, done);
            if(sync) return contents;
        }
        // File doesn't exist in cache, read the file and cache it.
        else {
            // The file is currently being loaded, push the callback to be executed when it's finished.
            if(pendingLoad[hash]) {
                debug('Requested file "' + fn + '" waiting for load... pushing callback to completion queue.');
                pendingLoad[hash].push({ callback: done, encoding: options.encoding, start: start });
                return self;
            }
            // Reading the file synchronously
            else if(sync === true) {
                debug('Requested file "' + fn + '" not present, reading and caching (synchronously).');
                try {
                    // Remove the encoding so we get a buffer back.
                    delete options.encoding;

                    contents = readFileSync(fn, options);
                    onFileLoaded(null, fn, hash, contents);
                    return options.encoding === 'buffer' ? contents : contents.toString(options.encoding);
                }
                catch (e) {
                    onFileLoaded(e, fn, hash, null);
                    return e;
                }
            }
            // Reading the file
            else {
                debug('Requested file "' + fn + '" not present, reading and caching (asynchronously).');
                pendingLoad[hash] = [ { callback: done, encoding: options.encoding, start: start } ];

                // Remove the encoding so we get a buffer back.
                delete options.encoding;

                readFile(fn, options, function (err, contents) {
                    onFileLoaded(err, fn, hash, contents);
                });
            }
        }
        return self;
    }

    /**
     * Gets a file asynchronously and caches it.
     * @return {Keepr} The current Keepr instance.
     */
    this.get = function getAsync () {
        var args = arguments._.toArray();
        args.unshift(false);
        get.apply(self, args);
        return self;
    };

    /**
     * Gets a file synchronously and caches it.
     * @return {Buffer|String|Error} The results of the fs.readFileSync call.
     */
    this.getSync = function getSync () {
        var args = arguments._.toArray();
        args.unshift(true);
        return get.apply(self, args);
    };

    /**
     * Determines if a file is in the cache or not.
     * @param {String} fn The file in question.
     * @return {Boolean} True if the file is in cache, false otherwise.
     */
    this.isCached = function isCached (file) {
        if(typeof file === 'string') {
            // If hash has been passed in, check for hash match.
            if(cache[file]) return true;
            // Hash didn't exist or wasn't passed in, check filenames.
            return !cache._.every(function (c) {
                if(c.source === file) return false;
            });
        }
        return false;
    };

    /**
     * Gets/sets where this Keepr instance is relative to.
     * @param {String} path The new path to set this Keepr instance relative to,
     * @return {String} The prefix to where all the files will be relative to.
     * @throws {Error}
     */
    this.relativeTo = function (path) {
        if(path !== undefined) {
            if(typeof path === 'string') {
                try {
                    var stat = fs.statSync(path.resolve(relativeTo._.tildeToHome()));
                    if(!stat.isDirectory())
                        throw new Error('Keepr#relativeTo: "relativeTo" path is invalid. Path "' + relativeTo + '" is not a directory!');
                }
                catch (e) {
                    throw new Error('Keepr#relativeTo: "relativeTo" path is invalid: ' + e.message);
                }
            }
            else if(!relativeTo) {
                relativeTo = null;
            }
        }
        return relativeTo || '';
    };

    /**
     * Alias for Keepr#get
     * @function
     */
    this.read = self.get;

    /**
     * Alias for Keepr#getSync
     * @function
     */
    this.readSync = self.getSync;

    /**
     * Purges the file cache.
     * @param {String=} file If present, purge will only delete the cache for this file. If omitted all cache will be cleared.
     * @return {Keepr} The current Keepr instance.
     */
    this.purge = function purge (file) {
        // Purge cache for a specific file
        if(typeof file === 'string') {
            file = path.resolve(file);

            cache._.every(function (c, k) {
                if(c.filename === file) {
                    if(cache[k].watcher) cache[k].watcher.close();
                    cache[k] = undefined;
                    delete cache[k];
                    debug('Cache was purged for file ' + file + '...');
                    return false;
                }
            });
        }
        // Purge all cache
        else {
            debug('Cache was purged...');
            currentCacheSize = 0;
            cache._.every(function (c) { if(c.watcher) c.watcher.close(); });
            cache = {};
        }
        return self;
    };

    /**
     * Dumps a copy of the cache with the data removed.
     * Mostly for debugging purposes.
     * @return {Object} A copy of the cache variable.
     */
    this.dump = function dump () {
        return cache._.clone(function (key, value) {
            if(key === 'data' || key === 'watcher') return undefined;
            return value;
        });
    };

    /**
     * Sets options for this Keepr instance.
     * @param {Object} options Options to init this instance with.
     * @return {Keepr} The current Keepr instance.
     */
    this.setOptions = function setOptions (options) {
        options = typeof options === 'object' ? options : {};

        // Set initial cache limit...
        if(typeof options.size === 'number' || typeof options.size === 'string') self.setCacheLimit(options.size);
        // Set relativeTo option
        if(typeof options.relativeTo === 'string') self.relativeTo(options.relativeTo);
        // Set file watching options
        if(options.watch !== undefined) watchForChanges = !!options.watch;
        // Set debug options
        if(options.debug === true) debugEnabled = true;
        // Set historyFactor option
        if(lib.object.isNumeric(options.historyFactor)) self.setHistoryFactor(options.historyFactor);

        debug('Max cache size is set to ' +  (cacheLimitSize * 1e-6)._.withPlaceholders() + 'mb.');
        debug('History factorization is ' +  historyFactor + '.');
        return self;
    };

    // Initialize!
    init(options);

    // Mute all properties
    self._.each(function (m) {
        Object.defineProperty(self, m, { configuable: false, writable: false });
    });
}

// Export singleton...
var keepr = new Keepr( /* Default Options */ ),
    bound = false;

module.exports = keepr;

/**
 * Binds the keepr functions to the fs module, wrapping fs.readFile and fs.readFileSync with the Keepr instance's
 * get and getSync methods.
 * @return {Keepr} The singleton keepr instance.
 */
keepr.wrapFS = function bindFS () {
    if(!bound) {
        bound = true;
        fs.readFile     = keepr.get;
        fs.readFileSync = keepr.getSync;
    }
    return keepr;
};

/**
 * Unbinds the Keepr functions from the fs module.
 * @return {Keepr} The singleton keepr instance.
 */
keepr.unwrapFS = function bindFS () {
    if(bound) {
        bound = false;
        fs.readFile     = readFile;
        fs.readFileSync = readFileSync;
    }
    return keepr;
};

// ...Expose a reference to the class.
keepr.Keepr = Keepr;
