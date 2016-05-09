# Keepr
------
**The simple file caching module for Node.js.**    
*Keepr* is handy in those I/O intensive applications where files are read and processed frequently. It caches file content up to a given byte size, ands keeps the most frequently used files in memory while purging others.    

## Features
---
- **Caches file content in memory for quick retrieval.**
    - Reduces expensive file system I/O calls.
    - Keeps frequently used content readily available.
    - You can set the maximum cache size.
    - Changes in files will automatically invalidate cache.
- **Keeps the newest, most frequently used files first.**
    - The most frequently used content stays in memory for subsequent calls.
    - Uses a LFU/Oldest First composite algorithm.
    - Retrieve cached contents in any supported encoding, or just get the buffer contents.
- **Safely store file contents in memory**
    - Keepr prevents allocation errors by capping memory contents to a preset size.
    - Keepr won't cache anything if it will overflow the available heap space.
    - If a file is modified or deleted it is uncached automatically.

## Install
---
```bash
$ npm install keepr --save
```

## Getting Started
---

```js
var keepr = require('keepr');

// 1st call: file is read and cached.
keepr.get('./some/file.js', function (err, contents) { ... });

// All subsequent calls will return the cached contents.
keepr.get('./some/file.js', function (err, contents) { ... });

// Or wrap the fs.module...
keepr.wrapFS();

// Now fs will use Keepr's cache!
var fs = require('fs');
fs.readFile('./some/file.js', function (err, contents) { ... });
```

**Keepr#get performs async file reads...**    
``Keepr#getSync`` can be used to perform synchronous file reads (although synchronous operations are *highly* discouraged).

You can also use the aliases: ``Keepr#read`` and ``Keepr#readSync``.

**Keepr returns a singleton!**    
You can require it from any file and the same instance will be returned. However, if desired, multiple instances of Keepr can be created using the ``require('keepr').Keepr`` class.

## Contents
---
1. [Install](#install)
2. [Getting Started](#getting-started)
3. [Options](#options)
    - [Setting the Max Cache Size](#setting-the-max-cache-size)
        - [Size Strings](#size-strings)
5. [Purging Cache](#purging-cache)
6. [Wrapping FS](#wrapping-fs)
7. [Performance](#performance)
8. [Misc](#misc)

## Options   
**For most, the default options will suffice, however, you can tweak Keepr with the following options:**   

```js
var keepr = require('keepr');

// Default settings shown...

keepr.setOptions({
    // The maximum size the cache can grow to.
    size: require('v8').getHeapStatistics().total_available_size * 0.25,
    // If true, cache will be invalidated if the file is modified.
    watch: true,
    // Prints debug messages to the stdout.
    debug: false,
    // Alters the caching algorithm.
    historyFactor: 2
});
```
#### Keepr#setOptions(*{Object}* **options**) → *{Keepr}*

| Property                      | Description |
| :---------------------------- | :---------- |
| *{Number}* **size**           | Sets the *maxCacheLimit*; the maximum size the cache is allowed to grow to. This cannot be more than 75% of the available heap space and will default to 25% if unspecified. |
| *{Boolean}* **watch**         | Makes all file reads relative to the given path.<br>To remove this setting if set previously, pass ``null`` to ``Keepr#relativeTo``. |
| *{String}* **relativeTo**     | Invalidates cache when filesystem changes are made to cached files. *Default: true*.<br>If your **sure** that you don't need to watch for file changes, it may increase performance to disable this option. However, returned cache contents will **not** be updated if files are changed and this is false. |
| *{String}* **historyFactor**  | An number between 1.5 and 8.<br>Changes the portion of the cache that is considered for release when the cache is full. A higher setting will focus more on cache age, a lower setting will focus more on frequency. *Default: 2* |
| *{Boolean}* **debug**         | If true, Keepr will print debug information to the stdout. *Default: false*. |

### Setting the Max Cache Size
**By default the maximum size the cache can grow to is one fourth of the available heap size.**    
You can set this option using ``Keepr#setCacheLimit``.

#### Keepr#setCacheLimit(*{Number|String}* **size**) → *{Keepr}*

```js
// Set the max cache size.
keepr.setCacheLimit('500mb');
keepr.setCacheLimit('1.2gb');
keepr.setCacheLimit('7.5kb');

// A number value will set the cache limit in bytes.
keepr.setCacheLimit(10000);
```

#### Size Strings
A size string must match the following regular expression: ``/^ *(\d+(?:\.\d+)?) *(b|kb|mb|gb) *$/i``.
The following strings are *valid* "size strings" where *xxx* is a number:

| String   | Magnitude  |
| :------- | :--------- |
| 'xxxb'   | Bytes      |
| 'xxxkb'  | Kilobytes  |
| 'xxxmb'  | Megabytes  |
| 'xxxgb'  | Gigabytes  |

## Purging Cache
**To manually purge the cache call Keepr#purge.**
However, in most cases, manually purging the cache is unnecessary and should be avoided in favor of performance.

#### Keepr#purge(*{String=}* **filename**) → *{Keepr}*

```js
// Frees all cache for garbage collection...
keepr.purge();

// You can purge only a specific file by passing in a filename.
keepr.purge('./my/file.js');
```

## Wrapping FS
**Keepr provides a method to wrap the FS module.**
This ensures that all calls made to *fs.readFile* and *fs.readFileSync* will be cached. Thus, other modules that read from the file system will utilize the Keepr caching system as well.

#### Keepr#wrapFS() → *{Keepr}*

```js
var keepr = require('keepr');
    fs    = require('fs');

// Wrap fs.readFile and fs.readFileSync
keepr.wrapFS();

// First call, contents read and cached.
fs.readFile('./my/file.js', function (err, contents) { ... });

// Next call, cached contents returned.
fs.readFile('./my/file.js', function (err, contents) { ... });

// If for any reason you need to un-wrap the file system methods...
keepr.unwrapFS();
```

## Other Methods

#### Keepr#dump() → *{Object}*
Exports *a copy* of the the cache content as an object (without the data)
```js
var data = keepr.dump();
// Returns something like:

{
    '849207cb8456658bbb3c6393329c868e': {
        size: 714,
        source: '/somefile.txt',
        called: 0
    },
    '0874282a613ca9d11acd5600597e692c': {
        size: 10456,
        source: '/somefile.txt',
        called: 1
    }
    ...
}
```

#### Keepr#isCached(*{String}* **fileNameOrHashId**) → *{Boolean}*
Returns true if the provided filename or hash id exists in the cache, false otherwise.
```js
var isCached = keepr.isCached('./my/file.js'); // -> true or false
```

#### Keepr#utiltized() → *{Number}*
The *percentage* of the cache that is currently utilized.
```js
var utilized = keepr.utiltized(); // 0 >= x <= 1
```

#### Keepr#currentSize() → *{Number}*
The sum of all cached items in *bytes*.
```js
var cacheSize = keepr.currentSize(); // 0 >= x <= keepr.cacheLimit();
```

#### Keepr#cacheLimit() → *{Number}*
The maximum size the cache is allowed to grow to in *bytes*.
```js
var limit = keepr.cacheLimit();
```

#### Keepr#setCacheLimit(*{String|Number}* **size**) → *{Keepr}*
Sets the cache limit.
If the argument isn't a number or valid [size string](#size-strings), it will set the size to the default.

```js
keepr.setCacheLimit('128mb');
```

#### Keepr#sizeOf(*{String|Buffer}* **item**) → *{Number}*
Returns the size of the given argument in *bytes*.    
If the argument isn't a Buffer or string, it will be cast to a string. This is basically an alias for: *Buffer.byteLength*.
```js
var sizeOfString = keepr.sizeOf('a string'); // -> 8
```

## Performance

```js
var keepr = require('keepr').init({ /** Options */ });;

// Third argument is a process.hrtime tuple with
// the time taken to retrieve the file contents.

// Read *this* file
keepr.get('./ReadMe.md', function (err, contents, time) {
    var ns = time[0] * 1e9 + time[1];

    keepr.get('./ReadMe.md', function (err, contents, cachedTime) {
        var cachedNS = cachedTime[0] * 1e9 + cachedTime[1];

        // ~ 93-95% faster on my machine...
        console.log((1 - (cachedNS / ns)) * 100);
    });
});
```

### Performance Test Results
| Date | OS Type | CPU Count | Total Memory | P1 FS | P1 Keepr | % Faster | P2 FS | P2 Keepr | % Faster | P3 FS | P3 Keepr | % Faster | Total FS | Total Keepr | % Faster | Heap FS | Heap Keepr |
| :--- | :------ | :-------: | :----------: | :---: | :------: | :------: | :---: | :------: | :------: | :---: | :------: | :------: | :---: | :------: | :------: | :------: | :---------: | :------: | :-----: | :--------: |
| 5/9/2016 | Darwin | 8 | 17.18 GB | 154 MS | 186 MS | -20.5% | 8,113 MS | 5,123 MS | 36.9% | 25,166 MS | 15,203 MS | 39.6% | 33,446 MS | 20,521 MS | 38.6% | 204 MB  | 304 MB  |
| 5/9/2016 | Darwin | 8 | 17.18 GB | 180 MS | 179 MS | 0.5% | 8,441 MS | 5,001 MS | 40.8% | 25,248 MS | 15,101 MS | 40.2% | 33,881 MS | 20,290 MS | 40.1% | 204 MB  | 304 MB  |
