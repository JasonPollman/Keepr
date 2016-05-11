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

### Performance Results (Cached Encoding → Same Encoding)

#### 0.1MB File
5/10/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 5.31 MS | 6.11 MS | -13.08% | 0.87 | 5MB | 5MB |
| 2 | 1 | UTF-8 | 0.4 MS | 0.71 MS | -43.85% | 0.56 | 5MB | 6MB |
| 3 | 1 | Hex | 0.35 MS | 0.73 MS | -**52.92%** | 0.47 | 5MB | 6MB |
| 4 | 1 | Base64 | 0.28 MS | 0.98 MS | -**71.58%** | 0.28 | 5MB | 6MB |
| 5 | 5 | Buffer | 0.46 MS | 1.16 MS | -**60.50%** | 0.39 | 5MB | 6MB |
| 6 | 5 | UTF-8 | 2.28 MS | 0.47 MS | **79.44%** | **4.86** | 5MB | 6MB |
| 7 | 5 | Hex | 1.04 MS | 0.3 MS | **71.62%** | **3.52** | 6MB | 6MB |
| 8 | 5 | Base64 | 1.06 MS | 0.25 MS | **76.49%** | **4.25** | 5MB | 6MB |
| 9 | 100 | Buffer | 6.62 MS | 5.33 MS | 19.58% | 1.24 | 5MB | 6MB |
| 10 | 100 | UTF-8 | 8.76 MS | 4.01 MS | **54.21%** | **2.18** | 8MB | 6MB |
| 11 | 100 | Hex | 16.89 MS | 2.38 MS | **85.89%** | **7.09** | 9MB | 7MB |
| 12 | 100 | Base64 | 13.49 MS | 3.05 MS | **77.36%** | **4.42** | 8MB | 7MB |
| 13 | 1000 | Buffer | 59.38 MS | 20.84 MS | **64.90%** | **2.85** | 5MB | 9MB |
| 14 | 1000 | UTF-8 | 51.74 MS | 18.56 MS | **64.12%** | **2.79** | 8MB | 8MB |
| 15 | 1000 | Hex | 154.74 MS | 17.79 MS | **88.50%** | **8.70** | 5MB | 7MB |
| 16 | 1000 | Base64 | 129.3 MS | 18.66 MS | **85.57%** | **6.93** | 6MB | 6MB |

#### 1.0MB File
5/10/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 5.98 MS | 9.32 MS | -35.89% | 0.64 | 5MB | 5MB |
| 2 | 1 | UTF-8 | 2.61 MS | 3.08 MS | -15.23% | 0.85 | 7MB | 7MB |
| 3 | 1 | Hex | 2.62 MS | 3.38 MS | -22.59% | 0.77 | 7MB | 7MB |
| 4 | 1 | Base64 | 1.88 MS | 2.68 MS | -30.02% | 0.70 | 7MB | 6MB |
| 5 | 5 | Buffer | 2.13 MS | 0.74 MS | **65.13%** | **2.87** | 7MB | 6MB |
| 6 | 5 | UTF-8 | 3.98 MS | 1.1 MS | **72.47%** | **3.63** | 8MB | 6MB |
| 7 | 5 | Hex | 10.44 MS | 0.81 MS | **92.21%** | **12.84** | 8MB | 6MB |
| 8 | 5 | Base64 | 7.52 MS | 0.24 MS | **96.85%** | **31.72** | 8MB | 7MB |
| 9 | 100 | Buffer | 43.26 MS | 3.98 MS | **90.81%** | **10.88** | 8MB | 7MB |
| 10 | 100 | UTF-8 | 47.7 MS | 3.6 MS | **92.46%** | **13.27** | 12MB | 7MB |
| 11 | 100 | Hex | 239.92 MS | 2.22 MS | **99.08%** | **108.21** | 4MB | 8MB |
| 12 | 100 | Base64 | 187.08 MS | 3.41 MS | **98.18%** | **54.81** | 4MB | 9MB |
| 13 | 1000 | Buffer | 449.96 MS | 22.1 MS | **95.09%** | **20.36** | 4MB | 8MB |
| 14 | 1000 | UTF-8 | 263.94 MS | 18.77 MS | **92.89%** | **14.06** | 15MB | 7MB |
| 15 | 1000 | Hex | 2,448.92 MS | 17.97 MS | **99.27%** | **136.29** | 4MB | 10MB |
| 16 | 1000 | Base64 | 1,903.53 MS | 25.1 MS | **98.68%** | **75.83** | 4MB | 9MB |

#### 5.0MB File
5/10/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 8.72 MS | 11.02 MS | -20.82% | 0.79 | 5MB | 5MB |
| 2 | 1 | UTF-8 | 5.71 MS | 7.16 MS | -20.19% | 0.80 | 10MB | 10MB |
| 3 | 1 | Hex | 11.08 MS | 14.96 MS | -25.94% | 0.74 | 10MB | 11MB |
| 4 | 1 | Base64 | 9.18 MS | 13.89 MS | -33.91% | 0.66 | 10MB | 11MB |
| 5 | 5 | Buffer | 11.79 MS | 0.68 MS | **94.25%** | **17.38** | 10MB | 11MB |
| 6 | 5 | UTF-8 | 24.15 MS | 0.47 MS | **98.04%** | **50.94** | 35MB | 11MB |
| 7 | 5 | Hex | 58.87 MS | 0.94 MS | **98.40%** | **62.58** | 35MB | 11MB |
| 8 | 5 | Base64 | 54.61 MS | 0.2 MS | **99.64%** | **276.52** | 35MB | 11MB |
| 9 | 100 | Buffer | 252.18 MS | 6.03 MS | **97.61%** | **41.83** | 4MB | 11MB |
| 10 | 100 | UTF-8 | 465.45 MS | 4.62 MS | **99.01%** | **100.77** | 49MB | 12MB |
| 11 | 100 | Hex | 1,099.48 MS | 3.48 MS | **99.68%** | **315.70** | 4MB | 11MB |
| 12 | 100 | Base64 | 846.14 MS | 3.68 MS | **99.56%** | **229.84** | 4MB | 11MB |
| 13 | 1000 | Buffer | 1,908.65 MS | 23.8 MS | **98.75%** | **80.19** | 4MB | 11MB |
| 14 | 1000 | UTF-8 | 4,392.34 MS | 21.29 MS | **99.52%** | **206.30** | 49MB | 11MB |
| 15 | 1000 | Hex | 9,939.4 MS | 18.25 MS | **99.82%** | **544.52** | 4MB | 10MB |
| 16 | 1000 | Base64 | 8,080.92 MS | 18.29 MS | **99.77%** | **441.76** | 4MB | 11MB |

#### 50.0MB File
5/10/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 29.98 MS | 55.23 MS | -45.73% | 0.54 | 5MB | 5MB |
| 2 | 1 | UTF-8 | 52.01 MS | 66.75 MS | -22.07% | 0.78 | 55MB | 56MB |
| 3 | 1 | Hex | 122.62 MS | 155.77 MS | -21.28% | 0.79 | 55MB | 56MB |
| 4 | 1 | Base64 | 97.82 MS | 114.38 MS | -14.47% | 0.86 | 55MB | 56MB |
| 5 | 5 | Buffer | 138.97 MS | 0.58 MS | **99.58%** | **238.80** | 4MB | 56MB |
| 6 | 5 | UTF-8 | 298.37 MS | 0.41 MS | **99.86%** | **724.28** | 204MB | 56MB |
| 7 | 5 | Hex | 616.19 MS | 1.08 MS | **99.82%** | **568.99** | 4MB | 56MB |
| 8 | 5 | Base64 | 432.45 MS | 1.05 MS | **99.76%** | **411.55** | 4MB | 56MB |
| 9 | 100 | Buffer | 1,976.4 MS | 6.4 MS | **99.68%** | **309.05** | 4MB | 55MB |
| 10 | 100 | UTF-8 | 4,841.45 MS | 3.53 MS | **99.93%** | **1372.57** | 204MB | 56MB |
| 11 | 100 | Hex | 9,716.81 MS | 19.74 MS | **99.80%** | **492.27** | 4MB | 55MB |
| 12 | 100 | Base64 | 8,300.95 MS | 3.29 MS | **99.96%** | **2525.53** | 4MB | 56MB |
| 13 | 1000 | Buffer | 19,336.15 MS | 16.86 MS | **99.91%** | **1146.94** | 4MB | 55MB |
| 14 | 1000 | UTF-8 | 47,754.15 MS | 16.39 MS | **99.97%** | **2914.30** | 204MB | 57MB |
| 15 | 1000 | Hex | 97,482.03 MS | 15.47 MS | **99.98%** | **6300.18** | 4MB | 56MB |
| 16 | 1000 | Base64 | 81,340.44 MS | 15.54 MS | **99.98%** | **5235.29** | 4MB | 57MB |
