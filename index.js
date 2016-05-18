'use strict';

var path = require('path'),
    lib  = require('proto-lib').get('_'),
    v8   = require('v8'),
    fs   = require('fs'),
    os   = require('os'),

    OS_TYPE = os.platform(),
    HOME    = os.homedir(),

    readFile     = fs.readFile,
    readFileSync = fs.readFileSync,

    /**
     * The default multipler to multiply against the available heap to set as the max space size if the provided
     * value is missing or invalid.
     * @type {Number}
     */
    DEFAULT_SIZE_PERCENTAGE_MULTIPLIER = 0.75;

/**
 * Replaces ~ or %HOME% with the user's home directory.
 * Extends the proto-lib library.
 */
lib.extend(String, 'tildeToHome', function (s) {
    return s.replace(/^(~|%HOME%)/, (HOME || (OS_TYPE === 'win32' ? '\\' : '/')));
});

/**
 * Normalizes and makes a path absolute.
 * @param {String} p The path to format.
 * @return {String} The formatted path.
 */
function formatPath (p) {
    return path.resolve(path.normalize(p._.tildeToHome()));
}

/**
 * Cache's files up to a specified byte size and keeps the most frequently files used in memory.
 * @constructor
 * @param {Object} options Various options to set class defaults.
 */
function Keepr (options) {
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
     * Default is [available heap] * 0.75.
     * @type {Number}
     */
    cacheLimitSize = v8.getHeapStatistics().total_available_size * DEFAULT_SIZE_PERCENTAGE_MULTIPLIER,

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
     * doesn't try to load the file again, but appends it's callback to a list of callbacks to invoke.
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
     * Sets the history factor.
     * @param {Number} factor A number between 1.5 and 8 (inclusive).
     * @return {Keepr} The current Keepr instance.
     */
    function setHistoryFactor (factor) {
        historyFactor = lib.object.isNumeric(factor) ? lib.object.getNumeric(factor) : 2;
        if(historyFactor < 1.5) historyFactor = 1.5;
        if(historyFactor > 8  ) historyFactor = 8;
        return self;
    }

    /**
     * Invoked by fs.readFile when a file load is complete.<br>
     * All callbacks subscribed to the file will then be invoked in the order they were requested.
     * @param {Error|null} err An error that occured while loading the file, if one existed.
     * @param {String} fn The filename of the file that's just finished loading.
     * @param {String} hash The hash of the filename (cache item) to invoke the pending callbacks with.
     * @param {Buffer} buffer The buffer results from fs.readFile.
     * @return {undefined}
     */
    function onFileLoaded (err, fn, hash, buffer) {
        var loadQueue = pendingLoad[fn];

        pendingLoad[fn] = undefined;
        delete pendingLoad[fn];

        if(!err) {
            debug('File "' + fn + '" finished loading.');
            addToCache(fn, fn + ':buffer', 'buffer', buffer);
        }
        else {
            debug('File "' + fn + '" failed to load: ' + err.message);
        }

        if(loadQueue instanceof Array) {
            debug('Invoking ' + loadQueue.length + ' callback(s) for file "' + path.basename(fn) + '" with hash "' + hash + '".');

            loadQueue._.every(function (request) {
                var encoded;

                if(err) {
                    request.callback.call(self, err, null, null);
                }
                else {
                    if(!cache[request.hash]) {
                        if(request.encoding !== 'buffer') {
                            encoded = buffer.toString(request.encoding);
                            addToCache(fn, request.hash, request.encoding, encoded);
                        }
                        // Don't need to copy or add to cache here, as this case indicates that
                        // the file was too big to be cached. So just return the buffer as-is.
                        else {
                            encoded = buffer;
                        }
                    }
                    else {
                        encoded = cache[request.hash].data;
                    }

                    if(request.encoding === 'buffer') {
                        var copy = new Buffer(self.sizeOf(encoded));
                        encoded.copy(copy);
                        encoded = copy;
                    }
                    return request.callback.call(self, null, encoded);
                }
            });
        }
        return err || buffer;
    }

    /**
     * Removes a line of cache.
     * @param {String} hash The cache's key
     * @return {undefined}
     */
    function removeCacheLine (hash) {
        currentCacheSize -= keepr.sizeOf(cache[hash].data);
        if(cache[hash].watcher) cache[hash].watcher.close();
        cache[hash] = undefined;
        delete cache[hash];
    }

    /**
     * Adds a cache item to the cache.
     * @param {String} filename The filename associated with this data.
     * @param {String} hash The string used to identify the cache.
     * @param {Buffer} data The data contents to store in the cache.
     * @return {undefined}
     */
    function addCacheLine (filename, hash, encoding, data) {
        var sz = self.currentByteSize(),
            ds = self.sizeOf(data);

        currentCacheSize += ds;
        cache[hash] = {
            data     : data,
            size     : ds,
            source   : filename,
            called   : 0,
            hash     : hash,
            encoding : encoding,
            watcher  : !watchForChanges ? null : fs.watch(filename, { persistent: false, }, function () {
                debug('Detected changes in file "' + filename + '" killing its cache (' + cache[hash].encoding + ').');
                removeCacheLine(hash);
            })
        };
        debug('Cache re-sized to: ' + ds + ' + ' + sz + ' = ' + currentCacheSize + ' (' + (self.utilized() * 100).toFixed(4) + '% utiliation).');
    }

    /**
     * Removes the oldest / least frequenly used cache item(s) until there's enough room in the cache to store "data".
     * @param {Buffer|String} data The data to make room for.
     * @return {undefined}
     */
    function makeRoomForBuffer (data) {
        var lfu, size, sizeOfData = self.sizeOf(data);

        while(cacheLimitSize < currentCacheSize + sizeOfData) {
            lfu = cache._.first(Math.ceil(cache._.size() / historyFactor))
                       ._.keyOfMin(function (line) { return line.called; });

            removeCacheLine(lfu);
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
    function addToCache (filename, hash, encoding, data) {
        debug('Adding hash "' + hash + '" to cache.');

        var sizeOfData    = self.sizeOf(data),
            hasEnoughHeap = v8.getHeapStatistics().total_available_size > sizeOfData;

        // Check that the filesize is less than the buffer size. If it's not, don't cache it.
        if(sizeOfData > (cacheLimitSize / historyFactor * 2) || !hasEnoughHeap) {
            debug(
                'File "' + filename + '" is too large to be cached. Skipping...' + os.EOL +
                '    Cache     : ' + currentCacheSize                            + os.EOL +
                '    Limit     : ' + cacheLimitSize                              + os.EOL +
                '    Available : ' + (cacheLimitSize - currentCacheSize)         + os.EOL +
                '    File      : ' + sizeOfData
            );
            return false;
        }

        // Check that we have the heap space to allocate the new cache line
        if(hasEnoughHeap) {
            // Still room for the file contents...
            if(currentCacheSize + sizeOfData < cacheLimitSize) {
                addCacheLine(filename, hash, encoding, data);
            }
            // Not enough room, gotta dump something...
            else {
                debug('Not enough room in cache, purging lines to make space.');
                makeRoomForBuffer(data);
                addCacheLine(filename, hash, encoding, data);
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
        n = parseInt(n, 10);

        switch(type.toLowerCase()) {
            case 'b'  : return n;
            case 'kb' : return n * 1e3;
            case 'mb' : return n * 1e6;
            case 'gb' : return n * 1e9;
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
     * Toggles the file watchers on/off for the cache.
     * @return {undefined}
     */
    function toggleWatchers () {
        cache._.every(function (c, key, i, cache) {
            if(watchForChanges === false) {
                if(c.watcher) {
                    c.watcher.close();
                    c.watcher = null;
                }
            }
            else {
                c.watcher = fs.watch(c.source, function () {
                    debug('Detected changes in file "' + c.source + '" killing its cache.');
                    removeCacheLine(key);
                });
            }
        });
    }

    /**
     * Sets the maximum size the cache can grow to.
     * @param {Number|String} bytesOrLimitString The number of bytes, or a string representing a storage size.
     * Examples: 1000b, 1500kb, 1.5mb, 3gb...
     * @return {Keepr} The current Keepr instance.
     */
    function setCacheLimit (bytesOrLimitString) {
        // User passed a number, treat it as bytes..
        if(lib.object.isNumeric(bytesOrLimitString)) {
            cacheLimitSize = checkLimitSize(parseInt(bytesOrLimitString, 10));
        }
        // Got "limit string", parse the string...
        else {
            var m = bytesOrLimitString.toLowerCase().match(/^ *(\d+(?:\.\d+)?) *(b|kb|mb|gb) *$/i);

            if(m) {
                cacheLimitSize = checkLimitSize(limitStringToBytes(m[1], m[2]));
            }
            else {
                // We'll throw here, because it's likely a user mistake.
                throw new Error('Invalid cache size string "' + bytesOrLimitString + '"');
            }
        }

        if(cacheLimitSize <= 0) cacheLimitSize = Number.MAX_VALUE; // Infinitely sized cached
        return self;
    }

    /**
     * Reads a file, if cached the cached contents will be returned, otherwise the file will be loaded and cached.
     * @param {String} filename The path to the file to load.
     * @param {Function=} done A callback for completion.
     * @params {Object} options Options passed to fs.readFile
     * @return {Keepr|Buffer|String} The current Keepr instance, or the file contents is "sync" is true.
     */
    function get (sync, filename, options, done) {
        var contents,
            encoding,
            bufferHash,
            hash,
            fn,
            e;

        done = arguments._.getCallback();

        if(typeof filename !== 'string') {
            e = new TypeError('Keepr~get expected argument #0 (get) to be a string, but got ' + typeof filename + '.');
            if(sync) throw e;
            return done.call(self, e, null, null);
        }

        if(typeof options === 'string') options = { encoding: options };
        options = typeof options === 'object' ? options : {};

        encoding = options.encoding;
        if(typeof encoding !== 'string') encoding = 'buffer';
        if(encoding === 'utf8') encoding = 'utf-8';

        switch(encoding) {
            case 'ascii' :
            case 'base64':
            case 'binary':
            case 'hex'   :
            case 'utf-8' :
            case 'buffer':
                break;

            default:
                e = new TypeError('Unknown encoding: ' + encoding);
                if(sync) {
                    throw e;
                }
                else {
                    return done.call(self, e, null, null);
                }

        }

        fn         = formatPath(filename);
        hash       = fn + ':' + encoding;
        bufferHash = fn + ':buffer';

        if(cache[hash]) {
            debug('Requested file "' + fn + '" present, returning cache for encoding "' + encoding + '".');
            cache[hash].called++;

            if(sync) {
                return cache[hash].data;
            }
            else {
                done.call(self, null, cache[hash].data);
            }
        }
        else if(cache[bufferHash]) {
            debug('Requested file "' + fn + '" present, converting cache to encoding "' + encoding + '" and returning.');
            var converted = cache[bufferHash].data.toString(encoding);
            addToCache(fn, hash, encoding, converted);

            if(sync) {
                return converted;
            }
            else {
                done.call(self, null, converted);
            }
        }
        // File doesn't exist in cache, read the file and cache it.
        else {

            // Remove the encoding so we always a buffer back to cache.
            delete options.encoding;

            // The file is currently being loaded, push the callback to be executed when it's finished.
            if(pendingLoad[fn] && sync === false) {
                debug('Requested file "' + fn + '" waiting for load... pushing callback to completion queue.');

                pendingLoad[fn].push({
                    filename : filename,
                    callback : done,
                    encoding : encoding,
                    hash     : hash
                });
                return self;
            }
            // Read the file synchronously
            else if(sync === true) {
                debug('Requested file "' + fn + '" not present, reading and caching (synchronously).');
                contents = onFileLoaded(null, fn, hash, readFileSync(fn, options));

                if(encoding !== 'buffer') {
                    var encoded = contents.toString(encoding);
                    addToCache(fn, hash, encoding, encoded);
                    return encoded;
                }
                else {
                    var copy = new Buffer(self.sizeOf(contents));
                    contents.copy(copy);
                    return copy;
                }
            }
            // Read the file aynchronously
            else {
                debug('Requested file "' + fn + '" not present, reading and caching (asynchronously).');
                pendingLoad[fn] = [
                    {
                        filename : filename,
                        callback : done,
                        encoding : encoding,
                        hash     : hash
                    }
                ];

                readFile(fn, options, function (err, contents) {
                    onFileLoaded(err, fn, hash, contents);
                });
            }
        }
        return self;
    }

    /**
     * Initalizes this Keepr instance.
     * @param {Object} options Options to init this instance with.
     * @return {Keepr} The current Keepr instance.
     */
    function init (options) {
        options = options && typeof options === 'object' ? options : {};

        // Set initial cache limit...
        if(typeof options.size === 'number' || typeof options.size === 'string') setCacheLimit(options.size);

        // Set debug options
        if(options.debug === true) debugEnabled = true; else debugEnabled = false;

        // Set historyFactor option
        if(lib.object.isNumeric(options.historyFactor)) setHistoryFactor(options.historyFactor);

        // Set file watching options
        if(options.watch !== undefined) {
            watchForChanges = !!options.watch;
            toggleWatchers(watchForChanges);
        }

        debug('Max cache size is set to ' +  (cacheLimitSize * 1e-6)._.withPlaceholders() + 'mb.');
        debug('History factorization is ' +  historyFactor + '.');
        return self;
    }

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
     * Returns the utilization percentage of the cache.
     * @return {Number} The utiliation percentage of the cache.
     */
    this.utilized = function utilized () {
        return currentCacheSize / cacheLimitSize;
    };

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
            file = formatPath(file);
            return !cache._.every(function (c) {
                if(c.source === file) return false;
            });
        }
        return false;
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
     * @param {...String=} files If present, purge will delete only the cache for the given string arguments.
     * If omitted all cache will be cleared.
     * @return {Keepr} The current Keepr instance.
     */
    this.purge = function purge () {
        if(arguments._.size() > 0) {
            arguments._.every(function (file) {
                if(typeof file === 'string') {
                    file = formatPath(file);

                    cache._.every(function (c, k) {
                        if(c.source === file) {
                            removeCacheLine(k);
                            debug('Cache was purged for file ' + file + '...');
                        }
                    });
                }
            });
        }
        else {
            currentCacheSize = 0;
            cache._.every(function (c) { if(c.watcher) c.watcher.close(); });
            cache = {};

            debug('All cache was purged...');
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
     * Returns the number of line items in the cache.
     * @return {Number}
     */
    this.count = function () {
        return cache._.size();
    };

    /**
     * Sets options for this Keepr instance.
     * @param {Object} options Options to init this instance with.
     * @return {Keepr} The current Keepr instance.
     */
    this.setOptions = init;

    /**
     * Returns the current Keepr options.
     * @return {Object<String|Boolean|Number>}
     */
    this.getOptions = function getOptions () {
        return {
            debug         : debugEnabled,
            size          : cacheLimitSize,
            watch         : watchForChanges,
            historyFactor : historyFactor
        };
    };

    /**
     * Exposes the vanilla fs.readFile function, so if the fs module is wrapped using Keepr#wrapFS it's still available.
     * @type {Function}
     */
    this.noCache = readFile;

    /**
     * Exposes the vanilla fs.readFileSync function, so if the fs module is wrapped using Keepr#wrapFS it's still available.
     * @type {Function}
     */
    this.noCacheSync = readFileSync;

    self._.every(function (m) {
        Object.defineProperty(self, m, { configuable: false, writable: false });
    });

    init(options);
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
keepr.unwrapFS = function unbindFS () {
    if(bound) {
        bound = false;
        fs.readFile     = readFile;
        fs.readFileSync = readFileSync;
    }
    return keepr;
};

/**
 * Adds Keepr#sizeOf to all strings via the Protolib library.
 */
lib.extend(String, 'sizeOf', function sizeOf (s) {
    return keepr.sizeOf(s);
});

/**
 * Adds Keepr#sizeOf to all Buffer objects via the Protolib library.
 */
lib.extend(Buffer, 'sizeOf', function sizeOf (s) {
    return keepr.sizeOf(s);
});

// ...Expose a reference to the class.
keepr.Keepr = Keepr;
