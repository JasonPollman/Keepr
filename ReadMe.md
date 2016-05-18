# Keepr
------
**The simple file caching module for Node.js.**    
*Keepr* is handy in those I/O intensive applications where files are read and processed frequently. It caches file content up to a given maximum byte size, while keeping the most frequently used files in memory and purging the least frequently used.    

## Features
---
- **Caches file content in memory for quick retrieval.**
    - Reduces expensive file system I/O calls.
    - Keeps frequently used content readily available.
    - You can set the maximum cache size.
- **Keeps the newest, most frequently used files first.**
    - Uses a LFU/Oldest First composite algorithm.
    - Retrieve cached contents in any supported encoding or get a safe copy of the buffer contents.
- **Safely store file contents in memory**
    - Keepr helps prevent heap allocation errors by capping stored file contents to a preset size.
    - If a file is modified or deleted it is uncached automagically.
- **99% Test Coverage**

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
``Keepr#getSync`` can be used to perform synchronous file reads (if you feel it's *absolutely* necessary).    

You can also use the aliases: ``Keepr#read`` and ``Keepr#readSync``.    

``fs.readFileSync`` is also wrapped when you call ``keepr.wrapFS``.

### Keepr exports a singleton...    
You can require it from any file and the same instance will be returned.   
However, if desired, multiple instances of Keepr can be created using the ``require('keepr').Keepr`` class.

## Contents
---
1. [Install](#install)
1. [Getting Started](#getting-started)
1. [Options](#options)
    - [Size Strings](#size-strings)
1. [Purging Cache](#purging-cache)
1. [Wrapping The FS Module](#wrapping-the-fs-module)
1. [Other Methods](#other-methods)
1. [Performance](#performance)

## Options   
**For most, the default options will suffice, however, you can tweak Keepr with the following options:**   

```js
var keepr = require('keepr');

// Default settings shown...

keepr.setOptions({
    // The finite maximum size the cache can grow to.
    // If set to < 0, the cache can grow infinitely.
    size: require('v8').getHeapStatistics().total_available_size * 0.75,
    // If true, cache will be invalidated if the file is modified.
    watch: true,
    // Alters the caching algorithm.
    historyFactor: 2,
    // Prints debug messages to the stdout.
    debug: false
});
```
#### Keepr#setOptions(*{Object}* **options**) → *{Keepr}*
Sets one or more of the following options...

| Property                      | Default                         | Description |
| :---------------------------- | :------------------------------ | :---------- |
| *{Number\|String}* **size**   | 75% of the available heap space | Sets the *maxCacheLimit*; the maximum size the cache is allowed to grow to. If ``maxCacheLimit <= 0``, the cache can grow infinitely. |
| *{Boolean}* **watch**         | ``true``                        | If true, cache will be invalidated when a file is modified (uses *fs.watch*).<br><br>**Note: If false, cache calls to changed files will return obsolete contents!** However, if you're *sure* the files won't change, this could provide a performance boost. |
| *{String}* **historyFactor**  | ``2``                           | An number between 1.5 and 8.<br><br>Changes the portion of the cache that is considered for release when the cache is full (2 = half the cache size, 4 = a quarter, etc.). A higher setting will focus more on cache age, a lower setting will focus more on frequency. |
| *{Boolean}* **debug**         | ``false``                       | If true, Keepr will print debug information to the stdout. |


#### Keepr#getOptions() → *{Object}*
Returns the current options as an object.

### Size Strings    
**A size string can be used instead of a byte size when setting the *maxCacheLimit***     
A size string must match the following regular expression: ``/^ *(\d+(?:\.\d+)?) *(b|kb|mb|gb) *$/i``.
The following strings are *valid* "size strings" where *xxx* is a number:

| String   | Magnitude  |
| :------- | :--------- |
| 'xxxb'   | Bytes      |
| 'xxxkb'  | Kilobytes  |
| 'xxxmb'  | Megabytes  |
| 'xxxgb'  | Gigabytes  |

#### Examples
```js
var keepr = require('keepr');

// Default settings shown...

keepr.setOptions({ size: '5000b' });
keepr.setOptions({ size: '5000kb' });
keepr.setOptions({ size: '200mb' });
keepr.setOptions({ size: '1.5gb' });
```

## Purging Cache
**To manually purge the cache call Keepr#purge.**
However, in most cases, manually purging the cache is unnecessary and should be avoided in favor of performance.

#### Keepr#purge(*{...String=}* **filename**) → *{Keepr}*

```js
// Frees all cache for garbage collection...
keepr.purge();

// You can purge a specific file by passing in a filename.
keepr.purge('./my/file.js');

// ...or multiple files...
keepr.purge('./my/file.js', './my/file2.js');
```

## Wrapping The FS Module
**Keepr provides a method to wrap the native Node FS module.**
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

**If you need to use the vanilla FS methods for a "don't cache" situation after wrapping the fs module, you can use [Keepr#noCache](#keeprnocache) or [Keepr#noCacheSync](#keeprnocachesync)**    

*Note, Keepr#wrapFS and Keepr#unwrapFS are available only to the singleton instance returned when required. Newly created instances will **not** have these methods.*


## Other Methods

#### Keepr#noCache()
Always returns the vanilla version of *fs.readFile*.

#### Keepr#noCacheSync()
Always returns the vanilla version of *fs.readFileSync*.

#### Keepr#dump() → *{Object}*
Exports *a skeleton copy* of the the cache content as an object (without the data)

```js
var data = keepr.dump();
// Returns something like:
{
    '/my/file.json:buffer': {
        size: 714,
        source: '/my/file.json',
        called: 0,
        encoding: 'buffer',
        hash: '/my/file.json:buffer'
    },
    '/my/other/file.xml:utf-8': {
        size: 10456,
        source: '/my/other/file.xml',
        called: 1,
        encoding: 'utf-8',
        hash: '/my/other/file:utf-8'
    }
    ...
}
```

#### Keepr#isCached(*{String}* **filename**) → *{Boolean}*
Returns true if the provided filename exists in the cache, false otherwise.
```js
var isCached = keepr.isCached('./my/file.js'); // -> true or false
```

#### Keepr#utiltized() → *{Number}*
The *percentage* of the cache that is currently utilized.
```js
var utilized = keepr.utiltized(); // 0 >= x <= 1
```

#### Keepr#currentSize() → *{Number}*
The sum of all cached data in *bytes*.
```js
var cacheSize = keepr.currentSize(); // 0 >= x <= keepr.getOptions().size;
```

#### Keepr#sizeOf(*{String|Buffer}* **item**) → *{Number}*
Returns the size of the given argument in *bytes*.    
If the argument isn't a Buffer or string, it will be cast to a string. This is essentially an alias for: *Buffer.byteLength*.

```js
var sizeOfString = keepr.sizeOf('a string'); // -> 8
```

## Performance
**Basically, the test was to read files of various sizes 1, 2, 5, and 20 times in succession, both asynchronously and synchronously.**       
*All tests were performed on a MacBook Pro, 2.8 GHz Intel Core i7, Apple SSD.*    

The result of each file [size] is listed [below](#async).

#### Summary
On average, the first file read takes about 30% longer using Keepr compared to the vanilla fs module. However, subsequent reads were *much* faster using Keepr ranging from 4 to 17,000+ times faster over vanilla fs.

**The larger the files, the better Keepr performs.**    
Async, multiple reads of small files (less than 100kb) are about 5x times faster using Keepr. Larger files can be up to 99.9% faster.

**Keepr works better asynchronously.**    
Keepr outperformed vanilla fs for all file sizes when reading async. For synchronous file reads, fs was faster for files smaller than 50kb. With files larger than 50kb sync, Keepr outperformed... and especially for files larger than 1mb.

*The performance test files can be found in the ``performance`` directory of this repo.*

#### The Bottom Line
So long as you have heap to spare and files to read, Keepr's a good choice.    

### Async    
**The files were read asynchronously using Keepr's fs.readFile wrapper.**

#### 0.1KB File
5/16/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 6.73 MS | 8.69 MS | -22.63% | 0.77 | 5MB | 6MB |
| 2 | 1 | Hex | 1.06 MS | 3.44 MS | -**69.11%** | 0.31 | 5MB | 6MB |
| 3 | 1 | Base64 | 1.14 MS | 3.22 MS | -**64.63%** | 0.35 | 5MB | 6MB |
| 4 | 1 | UTF-8 | 1.61 MS | 3.35 MS | -**52.06%** | 0.48 | 5MB | 6MB |
| 5 | 2 | Buffer | 2.36 MS | 0.54 MS | **76.95%** | **4.34** | 5MB | 6MB |
| 6 | 2 | UTF-8 | 1.83 MS | 0.24 MS | **86.84%** | **7.6** | 5MB | 6MB |
| 7 | 2 | Hex | 1.73 MS | 0.24 MS | **86.29%** | **7.3** | 5MB | 6MB |
| 8 | 2 | Base64 | 1.64 MS | 0.66 MS | **60.05%** | **2.5** | 5MB | 6MB |
| 9 | 5 | Buffer | 3.8 MS | 0.95 MS | **75.13%** | **4.02** | 5MB | 6MB |
| 10 | 5 | UTF-8 | 3.42 MS | 0.89 MS | **73.96%** | **3.84** | 5MB | 6MB |
| 11 | 5 | Hex | 3.17 MS | 0.43 MS | **86.44%** | **7.38** | 5MB | 6MB |
| 12 | 5 | Base64 | 2.5 MS | 0.71 MS | **71.77%** | **3.54** | 5MB | 6MB |
| 13 | 20 | Buffer | 6.89 MS | 2.42 MS | **64.90%** | **2.85** | 6MB | 6MB |
| 14 | 20 | UTF-8 | 6.03 MS | 3.7 MS | 38.62% | **1.63** | 6MB | 5MB |
| 15 | 20 | Hex | 5.37 MS | 1.02 MS | **80.98%** | **5.26** | 6MB | 6MB |
| 16 | 20 | Base64 | 4.52 MS | 0.65 MS | **85.61%** | **6.95** | 6MB | 6MB |

#### 1.0KB File
5/16/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 7.11 MS | 8.76 MS | -18.84% | 0.81 | 5MB | 6MB |
| 2 | 1 | UTF-8 | 2.24 MS | 3.45 MS | -35.04% | 0.65 | 5MB | 6MB |
| 3 | 1 | Hex | 2.1 MS | 3.24 MS | -35.07% | 0.65 | 5MB | 6MB |
| 4 | 1 | Base64 | 2.04 MS | 3.39 MS | -39.73% | 0.6 | 5MB | 6MB |
| 5 | 2 | Buffer | 2.86 MS | 0.38 MS | **86.65%** | **7.49** | 5MB | 6MB |
| 6 | 2 | UTF-8 | 3.2 MS | 0.14 MS | **95.73%** | **23.44** | 5MB | 6MB |
| 7 | 2 | Hex | 3.13 MS | 0.14 MS | **95.60%** | **22.71** | 5MB | 6MB |
| 8 | 2 | Base64 | 3.05 MS | 0.4 MS | **86.77%** | **7.56** | 5MB | 6MB |
| 9 | 5 | Buffer | 2.48 MS | 0.67 MS | **72.90%** | **3.69** | 5MB | 6MB |
| 10 | 5 | UTF-8 | 2.23 MS | 0.67 MS | **69.94%** | **3.33** | 5MB | 6MB |
| 11 | 5 | Hex | 2.09 MS | 0.54 MS | **73.98%** | **3.84** | 5MB | 6MB |
| 12 | 5 | Base64 | 1.67 MS | 0.82 MS | **51.01%** | **2.04** | 5MB | 6MB |
| 13 | 20 | Buffer | 5.1 MS | 1.58 MS | **69.00%** | **3.23** | 6MB | 6MB |
| 14 | 20 | UTF-8 | 4.37 MS | 1.21 MS | **72.32%** | **3.61** | 6MB | 5MB |
| 15 | 20 | Hex | 4.06 MS | 0.59 MS | **85.58%** | **6.94** | 6MB | 6MB |
| 16 | 20 | Base64 | 3.76 MS | 0.58 MS | **84.56%** | **6.48** | 6MB | 6MB |

#### 5.0KB File
5/16/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 7.48 MS | 10.26 MS | -27.04% | 0.73 | 5MB | 6MB |
| 2 | 1 | UTF-8 | 2.02 MS | 3.73 MS | -45.77% | 0.54 | 5MB | 6MB |
| 3 | 1 | Hex | 1.67 MS | 3.5 MS | -**52.47%** | 0.48 | 5MB | 6MB |
| 4 | 1 | Base64 | 1.64 MS | 3.65 MS | -**54.94%** | 0.45 | 5MB | 6MB |
| 5 | 2 | UTF-8 | 1.39 MS | 0.53 MS | **61.91%** | **2.63** | 5MB | 6MB |
| 6 | 2 | Buffer | 2.4 MS | 0.23 MS | **90.34%** | **10.35** | 5MB | 6MB |
| 7 | 2 | Hex | 2 MS | 0.22 MS | **89.11%** | **9.18** | 5MB | 6MB |
| 8 | 2 | Base64 | 1.96 MS | 0.61 MS | **68.69%** | **3.19** | 5MB | 6MB |
| 9 | 5 | Buffer | 4.4 MS | 0.96 MS | **78.12%** | **4.57** | 5MB | 6MB |
| 10 | 5 | UTF-8 | 4 MS | 0.9 MS | **77.46%** | **4.44** | 5MB | 6MB |
| 11 | 5 | Hex | 3.8 MS | 0.89 MS | **76.46%** | **4.25** | 5MB | 6MB |
| 12 | 5 | Base64 | 3.05 MS | 1.01 MS | **66.90%** | **3.02** | 6MB | 6MB |
| 13 | 20 | Buffer | 5.05 MS | 4.09 MS | 19.11% | 1.24 | 6MB | 5MB |
| 14 | 20 | UTF-8 | 4.44 MS | 1.23 MS | **72.29%** | **3.61** | 6MB | 5MB |
| 15 | 20 | Hex | 4.12 MS | 0.64 MS | **84.54%** | **6.47** | 6MB | 6MB |
| 16 | 20 | Base64 | 4.91 MS | 0.63 MS | **87.20%** | **7.81** | 5MB | 6MB |

#### 50.0KB File
5/16/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 6.87 MS | 11.79 MS | -41.76% | 0.58 | 5MB | 6MB |
| 2 | 1 | UTF-8 | 1.58 MS | 4.03 MS | -**60.72%** | 0.39 | 5MB | 6MB |
| 3 | 1 | Hex | 1.55 MS | 3.92 MS | -**60.48%** | 0.4 | 5MB | 6MB |
| 4 | 1 | Base64 | 1.61 MS | 4.14 MS | -**61.13%** | 0.39 | 5MB | 6MB |
| 5 | 2 | Buffer | 1.54 MS | 0.53 MS | **65.55%** | **2.9** | 5MB | 6MB |
| 6 | 2 | UTF-8 | 1.28 MS | 0.23 MS | **82.38%** | **5.68** | 6MB | 6MB |
| 7 | 2 | Hex | 2.29 MS | 0.44 MS | **80.58%** | **5.15** | 6MB | 6MB |
| 8 | 2 | Base64 | 2.34 MS | 0.65 MS | **72.30%** | **3.61** | 6MB | 6MB |
| 9 | 5 | Buffer | 4.45 MS | 0.83 MS | **81.30%** | **5.35** | 6MB | 6MB |
| 10 | 5 | UTF-8 | 5.19 MS | 0.63 MS | **87.88%** | **8.25** | 5MB | 6MB |
| 11 | 5 | Hex | 5.63 MS | 0.26 MS | **95.46%** | **22.01** | 6MB | 6MB |
| 12 | 5 | Base64 | 5.37 MS | 1.87 MS | **65.14%** | **2.87** | 6MB | 5MB |
| 13 | 20 | Buffer | 6.29 MS | 2.18 MS | **65.26%** | **2.88** | 6MB | 6MB |
| 14 | 20 | UTF-8 | 6.39 MS | 1.83 MS | **71.41%** | **3.5** | 6MB | 6MB |
| 15 | 20 | Hex | 7.14 MS | 0.92 MS | **87.05%** | **7.72** | 5MB | 6MB |
| 16 | 20 | Base64 | 7.77 MS | 0.83 MS | **89.37%** | **9.41** | 7MB | 6MB |

#### 100.0KB File
5/16/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 8.36 MS | 9.02 MS | -7.31% | 0.93 | 5MB | 6MB |
| 2 | 1 | UTF-8 | 2.07 MS | 4.09 MS | -49.47% | 0.51 | 5MB | 6MB |
| 3 | 1 | Base64 | 2 MS | 4.21 MS | -**52.56%** | 0.47 | 5MB | 6MB |
| 4 | 1 | Hex | 2.41 MS | 4.6 MS | -47.65% | 0.52 | 6MB | 6MB |
| 5 | 2 | Buffer | 2.7 MS | 0.38 MS | **86.04%** | **7.16** | 6MB | 6MB |
| 6 | 2 | Hex | 3.38 MS | 0.14 MS | **95.91%** | **24.42** | 5MB | 6MB |
| 7 | 2 | UTF-8 | 3.59 MS | 0.13 MS | **96.38%** | **27.61** | 5MB | 6MB |
| 8 | 2 | Base64 | 3.69 MS | 0.41 MS | **88.97%** | **9.06** | 6MB | 6MB |
| 9 | 5 | Buffer | 2.47 MS | 0.88 MS | **64.19%** | **2.79** | 6MB | 6MB |
| 10 | 5 | UTF-8 | 2.7 MS | 0.83 MS | **69.40%** | **3.27** | 6MB | 6MB |
| 11 | 5 | Hex | 3.49 MS | 0.71 MS | **79.58%** | **4.9** | 5MB | 6MB |
| 12 | 5 | Base64 | 3.7 MS | 1.05 MS | **71.52%** | **3.51** | 6MB | 6MB |
| 13 | 20 | Buffer | 7.07 MS | 1.67 MS | **76.34%** | **4.23** | 6MB | 6MB |
| 14 | 20 | UTF-8 | 7.23 MS | 1.36 MS | **81.20%** | **5.32** | 6MB | 6MB |
| 15 | 20 | Hex | 9.6 MS | 0.74 MS | **92.27%** | **12.93** | 7MB | 7MB |
| 16 | 20 | Base64 | 11.15 MS | 0.7 MS | **93.73%** | **15.95** | 5MB | 7MB |

#### 500.4KB File
5/16/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 7.14 MS | 8.83 MS | -19.15% | 0.81 | 5MB | 6MB |
| 2 | 1 | Hex | 4.03 MS | 4.26 MS | -5.48% | 0.95 | 7MB | 6MB |
| 3 | 1 | UTF-8 | 4.9 MS | 6.47 MS | -24.25% | 0.76 | 5MB | 7MB |
| 4 | 1 | Base64 | 5.19 MS | 8.39 MS | -38.21% | 0.62 | 7MB | 8MB |
| 5 | 2 | Buffer | 4.34 MS | 0.38 MS | **91.30%** | **11.5** | 7MB | 8MB |
| 6 | 2 | UTF-8 | 4.07 MS | 0.12 MS | **96.93%** | **32.62** | 6MB | 8MB |
| 7 | 2 | Hex | 5.71 MS | 0.12 MS | **97.96%** | **49.1** | 6MB | 8MB |
| 8 | 2 | Base64 | 6.92 MS | 0.4 MS | **94.26%** | **17.41** | 6MB | 8MB |
| 9 | 5 | Buffer | 3.38 MS | 0.89 MS | **73.73%** | **3.81** | 6MB | 8MB |
| 10 | 5 | UTF-8 | 3.86 MS | 0.84 MS | **78.21%** | **4.59** | 6MB | 8MB |
| 11 | 5 | Hex | 10.4 MS | 0.86 MS | **91.69%** | **12.03** | 5MB | 8MB |
| 12 | 5 | Base64 | 12.6 MS | 1.05 MS | **91.64%** | **11.95** | 6MB | 8MB |
| 13 | 20 | Buffer | 12.01 MS | 2.37 MS | **80.25%** | **5.06** | 6MB | 8MB |
| 14 | 20 | UTF-8 | 17.39 MS | 1.92 MS | **88.98%** | **9.08** | 6MB | 8MB |
| 15 | 20 | Hex | 28.38 MS | 0.78 MS | **97.27%** | **36.57** | 5MB | 9MB |
| 16 | 20 | Base64 | 38.67 MS | 0.78 MS | **97.99%** | **49.67** | 5MB | 9MB |

#### 1.0MB File
5/16/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 7.6 MS | 9.76 MS | -22.13% | 0.78 | 5MB | 6MB |
| 2 | 1 | Hex | 4.24 MS | 6.41 MS | -33.89% | 0.66 | 5MB | 7MB |
| 3 | 1 | Base64 | 5.8 MS | 8.63 MS | -32.79% | 0.67 | 5MB | 7MB |
| 4 | 1 | UTF-8 | 7.6 MS | 10.57 MS | -28.11% | 0.72 | 7MB | 7MB |
| 5 | 2 | Buffer | 2.93 MS | 0.97 MS | **66.95%** | **3.03** | 5MB | 6MB |
| 6 | 2 | UTF-8 | 5.59 MS | 0.12 MS | **97.82%** | **45.91** | 7MB | 6MB |
| 7 | 2 | Hex | 8.97 MS | 0.12 MS | **98.70%** | **77.08** | 7MB | 7MB |
| 8 | 2 | Base64 | 10.14 MS | 0.41 MS | **95.96%** | **24.74** | 7MB | 7MB |
| 9 | 5 | Buffer | 3.92 MS | 1.06 MS | **73.02%** | **3.71** | 5MB | 7MB |
| 10 | 5 | UTF-8 | 4.75 MS | 0.81 MS | **82.83%** | **5.83** | 7MB | 7MB |
| 11 | 5 | Hex | 14.15 MS | 0.62 MS | **95.61%** | **22.79** | 7MB | 7MB |
| 12 | 5 | Base64 | 22.24 MS | 0.96 MS | **95.67%** | **23.08** | 7MB | 7MB |
| 13 | 20 | Buffer | 16.34 MS | 1.44 MS | **91.18%** | **11.34** | 5MB | 7MB |
| 14 | 20 | UTF-8 | 20.84 MS | 1.35 MS | **93.53%** | **15.46** | 5MB | 7MB |
| 15 | 20 | Hex | 55.37 MS | 0.77 MS | **98.60%** | **71.45** | 5MB | 7MB |
| 16 | 20 | Base64 | 82.27 MS | 1.53 MS | **98.14%** | **53.8** | 5MB | 7MB |

#### 5.0MB File
5/16/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 10.69 MS | 15.21 MS | -29.71% | 0.7 | 5MB | 6MB |
| 2 | 1 | UTF-8 | 8.25 MS | 13.09 MS | -37.01% | 0.63 | 10MB | 11MB |
| 3 | 1 | Base64 | 15.95 MS | 27 MS | -40.93% | 0.59 | 10MB | 11MB |
| 4 | 1 | Hex | 27.07 MS | 37.05 MS | -26.94% | 0.73 | 10MB | 11MB |
| 5 | 2 | UTF-8 | 13.36 MS | 0.55 MS | **95.88%** | **24.27** | 20MB | 11MB |
| 6 | 2 | Buffer | 13.81 MS | 0.22 MS | **98.43%** | **63.49** | 20MB | 11MB |
| 7 | 2 | Hex | 31.47 MS | 0.22 MS | **99.30%** | **143.01** | 20MB | 11MB |
| 8 | 2 | Base64 | 46.23 MS | 0.67 MS | **98.56%** | **69.3** | 20MB | 11MB |
| 9 | 5 | Buffer | 18.84 MS | 1.09 MS | **94.20%** | **17.25** | 20MB | 11MB |
| 10 | 5 | UTF-8 | 40.08 MS | 0.89 MS | **97.78%** | **45.06** | 24MB | 11MB |
| 11 | 5 | Hex | 81.21 MS | 0.67 MS | **99.18%** | **121.93** | 24MB | 11MB |
| 12 | 5 | Base64 | 109.98 MS | 0.94 MS | **99.14%** | **116.72** | 24MB | 11MB |
| 13 | 20 | Buffer | 78.16 MS | 2.5 MS | **96.81%** | **31.31** | 5MB | 12MB |
| 14 | 20 | UTF-8 | 155.22 MS | 2.79 MS | **98.20%** | **55.54** | 44MB | 11MB |
| 15 | 20 | Hex | 345.08 MS | 0.65 MS | **99.81%** | **532.05** | 44MB | 11MB |
| 16 | 20 | Base64 | 518.09 MS | 0.64 MS | **99.88%** | **813.61** | 4MB | 11MB |

#### 50.0MB File
5/16/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 36.34 MS | 61.05 MS | -40.48% | 0.6 | 5MB | 6MB |
| 2 | 1 | UTF-8 | 59.42 MS | 95.03 MS | -37.48% | 0.63 | 55MB | 56MB |
| 3 | 1 | Hex | 159.32 MS | 216.76 MS | -26.50% | 0.74 | 55MB | 56MB |
| 4 | 1 | Base64 | 225.53 MS | 304.31 MS | -25.89% | 0.74 | 55MB | 56MB |
| 5 | 2 | Buffer | 66.71 MS | 0.56 MS | **99.15%** | **118.09** | 4MB | 56MB |
| 6 | 2 | UTF-8 | 124.67 MS | 0.24 MS | **99.81%** | **525.9** | 105MB | 56MB |
| 7 | 2 | Hex | 316.12 MS | 0.66 MS | **99.79%** | **481.58** | 105MB | 56MB |
| 8 | 2 | Base64 | 496.47 MS | 0.67 MS | **99.86%** | **737.41** | 4MB | 56MB |
| 9 | 5 | Buffer | 157.23 MS | 1.49 MS | **99.05%** | **105.6** | 4MB | 56MB |
| 10 | 5 | UTF-8 | 332.3 MS | 1.75 MS | **99.47%** | **190.36** | 104MB | 56MB |
| 11 | 5 | Hex | 989.95 MS | 1.1 MS | **99.89%** | **897.38** | 4MB | 56MB |
| 12 | 5 | Base64 | 1,256.03 MS | 1.8 MS | **99.86%** | **698.35** | 4MB | 56MB |
| 13 | 20 | Buffer | 895.78 MS | 7.27 MS | **99.19%** | **123.28** | 4MB | 55MB |
| 14 | 20 | UTF-8 | 1,819.7 MS | 1.25 MS | **99.93%** | **1,458.24** | 154MB | 55MB |
| 15 | 20 | Hex | 3,802.18 MS | 0.62 MS | **99.98%** | **6,091.13** | 4MB | 55MB |
| 16 | 20 | Base64 | 5,165.94 MS | 0.72 MS | **99.99%** | **7,127.95** | 4MB | 56MB |

#### 100.0MB File
5/16/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 74.05 MS | 115.99 MS | -36.16% | 0.64 | 4MB | 6MB |
| 2 | 1 | UTF-8 | 132.14 MS | 202.13 MS | -34.62% | 0.65 | 104MB | 106MB |
| 3 | 1 | Base64 | 286.77 MS | 474.95 MS | -39.62% | 0.6 | 105MB | 106MB |
| 4 | 1 | Hex | 479.06 MS | 665.56 MS | -28.02% | 0.72 | 105MB | 106MB |
| 5 | 2 | Buffer | 141.6 MS | 0.43 MS | **99.70%** | **328.23** | 4MB | 106MB |
| 6 | 2 | UTF-8 | 260.97 MS | 0.16 MS | **99.94%** | **1,673.47** | 205MB | 106MB |
| 7 | 2 | Base64 | 784.35 MS | 0.14 MS | **99.98%** | **5,566.85** | 4MB | 106MB |
| 8 | 2 | Hex | 1,040.47 MS | 0.41 MS | **99.96%** | **2,553.88** | 4MB | 106MB |
| 9 | 5 | Buffer | 318.48 MS | 1.34 MS | **99.58%** | **238.05** | 4MB | 106MB |
| 10 | 5 | UTF-8 | 689.47 MS | 1.66 MS | **99.76%** | **415.67** | 204MB | 106MB |
| 11 | 5 | Hex | 1,760.91 MS | 0.52 MS | **99.97%** | **3,380.6** | 4MB | 106MB |
| 12 | 5 | Base64 | 2,487.3 MS | 2.82 MS | **99.89%** | **881.2** | 4MB | 105MB |
| 13 | 20 | Buffer | 3,908.69 MS | 2.48 MS | **99.94%** | **1,576.16** | 4MB | 105MB |
| 14 | 20 | UTF-8 | 6,582.4 MS | 1.73 MS | **99.97%** | **3,801.71** | 304MB | 105MB |
| 15 | 20 | Hex | 12,025.29 MS | 1.14 MS | **99.99%** | **10,540.3** | 4MB | 106MB |
| 16 | 20 | Base64 | 15,092.66 MS | 0.87 MS | **99.99%** | **17,271.63** | 4MB | 106MB |

### Sync
**The files were read synchronously using Keepr's fs.readFileSync wrapper.**    
You probably **shouldn't** use Keepr if you're dealing with a lot of files less than 50kb and reading them **synchronously**.

#### 0.1KB File
5/16/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 0.16 MS | 1.38 MS | -**88.16%** | 0.12 | 5MB | 5MB |
| 2 | 1 | UTF-8 | 0.08 MS | 0.27 MS | -**69.76%** | 0.3 | 5MB | 5MB |
| 3 | 1 | Hex | 0.08 MS | 0.12 MS | -32.09% | 0.68 | 5MB | 6MB |
| 4 | 1 | Base64 | 0.06 MS | 1.48 MS | -**95.84%** | 0.04 | 5MB | 6MB |
| 5 | 2 | Buffer | 0.09 MS | 0.17 MS | -45.99% | 0.54 | 5MB | 6MB |
| 6 | 2 | UTF-8 | 0.1 MS | 0.12 MS | -12.69% | 0.87 | 5MB | 6MB |
| 7 | 2 | Hex | 0.1 MS | 0.12 MS | -16.76% | 0.83 | 5MB | 6MB |
| 8 | 2 | Base64 | 0.45 MS | 0.28 MS | 36.67% | **1.58** | 5MB | 6MB |
| 9 | 5 | Buffer | 0.13 MS | 0.34 MS | -**61.80%** | 0.38 | 5MB | 6MB |
| 10 | 5 | UTF-8 | 0.14 MS | 0.41 MS | -**67.26%** | 0.33 | 5MB | 6MB |
| 11 | 5 | Hex | 0.87 MS | 0.33 MS | **61.88%** | **2.62** | 5MB | 6MB |
| 12 | 5 | Base64 | 0.14 MS | 0.28 MS | -**50.12%** | 0.5 | 5MB | 6MB |
| 13 | 20 | Buffer | 0.42 MS | 1.28 MS | -**67.18%** | 0.33 | 5MB | 6MB |
| 14 | 20 | UTF-8 | 0.57 MS | 1.88 MS | -**69.62%** | 0.3 | 5MB | 5MB |
| 15 | 20 | Hex | 0.45 MS | 0.48 MS | -4.68% | 0.95 | 5MB | 5MB |
| 16 | 20 | Base64 | 0.53 MS | 0.51 MS | 4.33% | 1.05 | 5MB | 6MB |

#### 1.0KB File
5/16/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 0.16 MS | 1.36 MS | -**88.33%** | 0.12 | 5MB | 5MB |
| 2 | 1 | UTF-8 | 0.08 MS | 0.25 MS | -**67.69%** | 0.32 | 5MB | 5MB |
| 3 | 1 | Hex | 0.08 MS | 0.13 MS | -35.55% | 0.64 | 5MB | 6MB |
| 4 | 1 | Base64 | 0.09 MS | 0.77 MS | -**88.86%** | 0.11 | 5MB | 6MB |
| 5 | 2 | Buffer | 0.11 MS | 0.17 MS | -38.74% | 0.61 | 5MB | 6MB |
| 6 | 2 | UTF-8 | 0.1 MS | 0.27 MS | -**61.15%** | 0.39 | 5MB | 6MB |
| 7 | 2 | Hex | 0.11 MS | 0.27 MS | -**59.95%** | 0.4 | 5MB | 6MB |
| 8 | 2 | Base64 | 0.45 MS | 0.32 MS | 29.98% | 1.43 | 5MB | 6MB |
| 9 | 5 | Buffer | 0.15 MS | 0.42 MS | -**64.53%** | 0.35 | 5MB | 6MB |
| 10 | 5 | UTF-8 | 0.15 MS | 0.31 MS | -**53.18%** | 0.47 | 5MB | 6MB |
| 11 | 5 | Hex | 0.99 MS | 0.24 MS | **75.42%** | **4.07** | 5MB | 6MB |
| 12 | 5 | Base64 | 0.32 MS | 0.35 MS | -8.38% | 0.92 | 5MB | 6MB |
| 13 | 20 | Buffer | 0.52 MS | 1.32 MS | -**60.58%** | 0.39 | 5MB | 6MB |
| 14 | 20 | UTF-8 | 0.96 MS | 1.93 MS | -**50.17%** | 0.5 | 5MB | 5MB |
| 15 | 20 | Hex | 0.47 MS | 0.48 MS | -1.80% | 0.98 | 5MB | 5MB |
| 16 | 20 | Base64 | 0.55 MS | 1.34 MS | -**58.58%** | 0.41 | 5MB | 6MB |

#### 5.0KB File
5/16/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 0.16 MS | 1.36 MS | -**88.20%** | 0.12 | 5MB | 5MB |
| 2 | 1 | UTF-8 | 0.07 MS | 0.28 MS | -**74.08%** | 0.26 | 5MB | 5MB |
| 3 | 1 | Hex | 0.09 MS | 0.14 MS | -33.01% | 0.67 | 5MB | 6MB |
| 4 | 1 | Base64 | 0.11 MS | 0.76 MS | -**85.80%** | 0.14 | 5MB | 6MB |
| 5 | 2 | Buffer | 0.1 MS | 0.17 MS | -44.49% | 0.56 | 5MB | 6MB |
| 6 | 2 | UTF-8 | 0.11 MS | 0.12 MS | -4.28% | 0.96 | 5MB | 6MB |
| 7 | 2 | Hex | 0.14 MS | 0.12 MS | 14.03% | 1.16 | 5MB | 6MB |
| 8 | 2 | Base64 | 0.47 MS | 0.29 MS | 39.00% | **1.64** | 5MB | 6MB |
| 9 | 5 | Buffer | 0.14 MS | 0.5 MS | -**72.59%** | 0.27 | 5MB | 6MB |
| 10 | 5 | UTF-8 | 0.15 MS | 0.53 MS | -**71.07%** | 0.29 | 5MB | 6MB |
| 11 | 5 | Hex | 0.8 MS | 0.46 MS | 42.51% | **1.74** | 5MB | 6MB |
| 12 | 5 | Base64 | 0.24 MS | 0.35 MS | -32.35% | 0.68 | 5MB | 6MB |
| 13 | 20 | Buffer | 0.61 MS | 1.27 MS | -**52.31%** | 0.48 | 5MB | 6MB |
| 14 | 20 | UTF-8 | 0.9 MS | 1.72 MS | -47.72% | 0.52 | 6MB | 5MB |
| 15 | 20 | Hex | 0.73 MS | 0.47 MS | 36.40% | **1.57** | 6MB | 5MB |
| 16 | 20 | Base64 | 2 MS | 0.5 MS | **75.25%** | **4.04** | 5MB | 6MB |

#### 50.0KB File
5/16/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 0.17 MS | 1.41 MS | -**87.96%** | 0.12 | 5MB | 5MB |
| 2 | 1 | UTF-8 | 0.11 MS | 0.3 MS | -**63.47%** | 0.37 | 5MB | 6MB |
| 3 | 1 | Hex | 0.29 MS | 0.3 MS | -2.00% | 0.98 | 5MB | 6MB |
| 4 | 1 | Base64 | 0.21 MS | 0.81 MS | -**73.78%** | 0.26 | 5MB | 6MB |
| 5 | 2 | Buffer | 0.12 MS | 0.19 MS | -35.38% | 0.65 | 5MB | 6MB |
| 6 | 2 | UTF-8 | 0.2 MS | 0.1 MS | **51.62%** | **2.07** | 5MB | 6MB |
| 7 | 2 | Hex | 0.38 MS | 0.12 MS | **69.28%** | **3.26** | 6MB | 6MB |
| 8 | 2 | Base64 | 0.67 MS | 0.29 MS | **57.60%** | **2.36** | 6MB | 6MB |
| 9 | 5 | Buffer | 0.24 MS | 0.35 MS | -31.83% | 0.68 | 6MB | 6MB |
| 10 | 5 | UTF-8 | 1.97 MS | 0.42 MS | **78.93%** | **4.75** | 5MB | 6MB |
| 11 | 5 | Hex | 0.78 MS | 0.31 MS | **59.69%** | **2.48** | 5MB | 6MB |
| 12 | 5 | Base64 | 0.62 MS | 0.28 MS | **55.01%** | **2.22** | 6MB | 6MB |
| 13 | 20 | Buffer | 0.79 MS | 2.24 MS | -**64.71%** | 0.35 | 6MB | 5MB |
| 14 | 20 | UTF-8 | 1.61 MS | 0.93 MS | 42.33% | **1.73** | 5MB | 6MB |
| 15 | 20 | Hex | 1.83 MS | 0.57 MS | **68.69%** | **3.19** | 5MB | 6MB |
| 16 | 20 | Base64 | 1.54 MS | 0.9 MS | 41.65% | **1.71** | 7MB | 6MB |

#### 100.0KB File
5/16/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 0.17 MS | 1.46 MS | -**88.19%** | 0.12 | 5MB | 5MB |
| 2 | 1 | UTF-8 | 0.15 MS | 0.48 MS | -**69.22%** | 0.31 | 5MB | 6MB |
| 3 | 1 | Hex | 0.34 MS | 0.37 MS | -7.84% | 0.92 | 5MB | 6MB |
| 4 | 1 | Base64 | 0.34 MS | 0.91 MS | -**63.05%** | 0.37 | 5MB | 6MB |
| 5 | 2 | Buffer | 0.28 MS | 0.14 MS | 49.01% | **1.96** | 5MB | 6MB |
| 6 | 2 | UTF-8 | 0.53 MS | 0.08 MS | **85.26%** | **6.79** | 6MB | 6MB |
| 7 | 2 | Hex | 2.4 MS | 0.07 MS | **97.01%** | **33.49** | 5MB | 6MB |
| 8 | 2 | Base64 | 0.99 MS | 0.24 MS | **75.73%** | **4.12** | 5MB | 6MB |
| 9 | 5 | Buffer | 0.86 MS | 0.38 MS | **55.93%** | **2.27** | 5MB | 6MB |
| 10 | 5 | UTF-8 | 0.63 MS | 1.41 MS | -**55.56%** | 0.44 | 6MB | 6MB |
| 11 | 5 | Hex | 1.61 MS | 0.45 MS | **71.88%** | **3.56** | 6MB | 6MB |
| 12 | 5 | Base64 | 0.99 MS | 0.28 MS | **71.66%** | **3.53** | 6MB | 6MB |
| 13 | 20 | Buffer | 1.29 MS | 1.16 MS | 10.44% | 1.12 | 6MB | 6MB |
| 14 | 20 | UTF-8 | 1.47 MS | 1.01 MS | 31.54% | 1.46 | 7MB | 6MB |
| 15 | 20 | Hex | 4.34 MS | 0.59 MS | **86.37%** | **7.33** | 7MB | 7MB |
| 16 | 20 | Base64 | 3.58 MS | 0.57 MS | **84.19%** | **6.33** | 6MB | 7MB |


#### 500.4KB File
5/16/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 0.25 MS | 1.53 MS | -**83.63%** | 0.16 | 5MB | 5MB |
| 2 | 1 | UTF-8 | 0.39 MS | 0.74 MS | -47.79% | 0.52 | 6MB | 6MB |
| 3 | 1 | Hex | 3.6 MS | 3.33 MS | 7.35% | 1.08 | 7MB | 7MB |
| 4 | 1 | Base64 | 1.2 MS | 2.12 MS | -43.50% | 0.56 | 6MB | 8MB |
| 5 | 2 | Buffer | 0.24 MS | 0.15 MS | 38.32% | **1.62** | 6MB | 8MB |
| 6 | 2 | UTF-8 | 0.56 MS | 0.12 MS | **79.01%** | **4.76** | 6MB | 8MB |
| 7 | 2 | Hex | 1.92 MS | 0.11 MS | **94.52%** | **18.26** | 8MB | 8MB |
| 8 | 2 | Base64 | 2.62 MS | 0.28 MS | **89.49%** | **9.51** | 6MB | 8MB |
| 9 | 5 | Buffer | 0.39 MS | 0.45 MS | -12.29% | 0.88 | 6MB | 8MB |
| 10 | 5 | UTF-8 | 2.15 MS | 0.43 MS | **79.84%** | **4.96** | 6MB | 8MB |
| 11 | 5 | Hex | 5.71 MS | 0.3 MS | **94.78%** | **19.17** | 8MB | 8MB |
| 12 | 5 | Base64 | 2.94 MS | 0.28 MS | **90.52%** | **10.55** | 6MB | 8MB |
| 13 | 20 | Buffer | 2.85 MS | 1.22 MS | **57.19%** | **2.34** | 6MB | 8MB |
| 14 | 20 | UTF-8 | 8.42 MS | 1 MS | **88.13%** | **8.43** | 6MB | 8MB |
| 15 | 20 | Hex | 17.92 MS | 0.59 MS | **96.69%** | **30.23** | 13MB | 9MB |
| 16 | 20 | Base64 | 13.93 MS | 0.6 MS | **95.69%** | **23.19** | 11MB | 9MB |

#### 1.0MB File
5/16/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 0.72 MS | 2.44 MS | -**70.35%** | 0.3 | 5MB | 5MB |
| 2 | 1 | UTF-8 | 1.59 MS | 2.05 MS | -22.20% | 0.78 | 7MB | 7MB |
| 3 | 1 | Hex | 2.43 MS | 3.13 MS | -22.55% | 0.77 | 7MB | 6MB |
| 4 | 1 | Base64 | 2.37 MS | 2.21 MS | 7.01% | 1.08 | 7MB | 6MB |
| 5 | 2 | Buffer | 1.19 MS | 0.17 MS | **86.04%** | **7.16** | 7MB | 6MB |
| 6 | 2 | UTF-8 | 1.69 MS | 0.12 MS | **93.19%** | **14.68** | 7MB | 6MB |
| 7 | 2 | Hex | 3.4 MS | 0.11 MS | **96.83%** | **31.59** | 7MB | 6MB |
| 8 | 2 | Base64 | 3.43 MS | 0.27 MS | **92.03%** | **12.54** | 7MB | 6MB |
| 9 | 5 | Buffer | 3.07 MS | 0.38 MS | **87.51%** | **8** | 5MB | 6MB |
| 10 | 5 | UTF-8 | 2.25 MS | 0.41 MS | **81.55%** | **5.42** | 8MB | 7MB |
| 11 | 5 | Hex | 9.68 MS | 0.37 MS | **96.13%** | **25.83** | 8MB | 7MB |
| 12 | 5 | Base64 | 6.6 MS | 0.25 MS | **96.15%** | **25.95** | 8MB | 7MB |
| 13 | 20 | Buffer | 8 MS | 1.25 MS | **84.43%** | **6.42** | 8MB | 7MB |
| 14 | 20 | UTF-8 | 13.53 MS | 1.11 MS | **91.83%** | **12.23** | 10MB | 7MB |
| 15 | 20 | Hex | 43.99 MS | 0.61 MS | **98.61%** | **71.73** | 10MB | 7MB |
| 16 | 20 | Base64 | 36.56 MS | 1.18 MS | **96.77%** | **30.92** | 10MB | 6MB |

#### 5.0MB File
5/16/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 2.93 MS | 6.61 MS | -**55.73%** | 0.44 | 5MB | 5MB |
| 2 | 1 | UTF-8 | 6.92 MS | 4.44 MS | 35.86% | **1.56** | 10MB | 10MB |
| 3 | 1 | Hex | 13.71 MS | 13.92 MS | -1.49% | 0.99 | 10MB | 11MB |
| 4 | 1 | Base64 | 10.69 MS | 10.68 MS | 0.10% | 1 | 10MB | 11MB |
| 5 | 2 | Buffer | 4.67 MS | 0.15 MS | **96.74%** | **30.69** | 10MB | 11MB |
| 6 | 2 | UTF-8 | 11.9 MS | 0.12 MS | **98.98%** | **98.46** | 20MB | 11MB |
| 7 | 2 | Hex | 24.34 MS | 0.11 MS | **99.54%** | **218.34** | 20MB | 11MB |
| 8 | 2 | Base64 | 19.34 MS | 0.31 MS | **98.41%** | **62.81** | 20MB | 11MB |
| 9 | 5 | Buffer | 10.72 MS | 0.4 MS | **96.26%** | **26.76** | 20MB | 11MB |
| 10 | 5 | UTF-8 | 25.01 MS | 0.53 MS | **97.89%** | **47.35** | 45MB | 11MB |
| 11 | 5 | Hex | 60.79 MS | 0.36 MS | **99.41%** | **168.92** | 45MB | 11MB |
| 12 | 5 | Base64 | 56.48 MS | 0.32 MS | **99.43%** | **174.17** | 4MB | 11MB |
| 13 | 20 | Buffer | 45.7 MS | 1.32 MS | **97.11%** | **34.64** | 4MB | 11MB |
| 14 | 20 | UTF-8 | 128.92 MS | 1.07 MS | **99.17%** | **120.36** | 54MB | 10MB |
| 15 | 20 | Hex | 222.01 MS | 0.5 MS | **99.77%** | **441.85** | 4MB | 11MB |
| 16 | 20 | Base64 | 228.72 MS | 1.16 MS | **99.49%** | **197.29** | 4MB | 11MB |

#### 50.0MB File
5/16/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 24.99 MS | 53.3 MS | -**53.12%** | 0.47 | 5MB | 5MB |
| 2 | 1 | UTF-8 | 59 MS | 39.28 MS | 33.42% | **1.5** | 55MB | 56MB |
| 3 | 1 | Hex | 123.21 MS | 122.9 MS | 0.25% | 1 | 55MB | 56MB |
| 4 | 1 | Base64 | 94.75 MS | 95.44 MS | -0.72% | 0.99 | 55MB | 56MB |
| 5 | 2 | Buffer | 51.92 MS | 0.2 MS | **99.62%** | **262.75** | 55MB | 56MB |
| 6 | 2 | UTF-8 | 119.61 MS | 0.1 MS | **99.92%** | **1,179.8** | 104MB | 56MB |
| 7 | 2 | Hex | 232.46 MS | 0.2 MS | **99.91%** | **1,149.72** | 104MB | 56MB |
| 8 | 2 | Base64 | 232.81 MS | 0.31 MS | **99.87%** | **762.78** | 4MB | 56MB |
| 9 | 5 | Buffer | 126.82 MS | 0.83 MS | **99.35%** | **153.29** | 4MB | 56MB |
| 10 | 5 | UTF-8 | 227.61 MS | 1.06 MS | **99.53%** | **214.55** | 204MB | 56MB |
| 11 | 5 | Hex | 513.22 MS | 0.81 MS | **99.84%** | **633.05** | 4MB | 56MB |
| 12 | 5 | Base64 | 423.3 MS | 1.03 MS | **99.76%** | **412.53** | 4MB | 56MB |
| 13 | 20 | Buffer | 407.35 MS | 2.37 MS | **99.42%** | **172.18** | 4MB | 56MB |
| 14 | 20 | UTF-8 | 922.59 MS | 2.41 MS | **99.74%** | **382.66** | 404MB | 55MB |
| 15 | 20 | Hex | 1,997.72 MS | 0.5 MS | **99.98%** | **4,017** | 4MB | 55MB |
| 16 | 20 | Base64 | 1,619.55 MS | 1.04 MS | **99.94%** | **1,564.43** | 4MB | 56MB |

#### 100.0MB File
5/16/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 56.12 MS | 124.24 MS | -**54.82%** | 0.45 | 5MB | 5MB |
| 2 | 1 | UTF-8 | 125.66 MS | 110.62 MS | 11.97% | 1.14 | 105MB | 105MB |
| 3 | 1 | Hex | 249.48 MS | 298.64 MS | -16.46% | 0.84 | 105MB | 106MB |
| 4 | 1 | Base64 | 208 MS | 214.25 MS | -2.92% | 0.97 | 105MB | 106MB |
| 5 | 2 | Buffer | 112.44 MS | 0.18 MS | **99.84%** | **631.46** | 105MB | 106MB |
| 6 | 2 | UTF-8 | 278.67 MS | 0.36 MS | **99.87%** | **777.87** | 204MB | 106MB |
| 7 | 2 | Hex | 529.87 MS | 0.09 MS | **99.98%** | **6,164.46** | 204MB | 106MB |
| 8 | 2 | Base64 | 484.26 MS | 0.74 MS | **99.85%** | **650.12** | 4MB | 106MB |
| 9 | 5 | Buffer | 221.47 MS | 0.44 MS | **99.80%** | **497.82** | 4MB | 106MB |
| 10 | 5 | UTF-8 | 484.5 MS | 1.26 MS | **99.74%** | **384.7** | 504MB | 106MB |
| 11 | 5 | Hex | 1,345.82 MS | 1.38 MS | **99.90%** | **974.73** | 4MB | 106MB |
| 12 | 5 | Base64 | 835.84 MS | 0.8 MS | **99.90%** | **1,043.37** | 4MB | 106MB |
| 13 | 20 | Buffer | 866.66 MS | 4.63 MS | **99.47%** | **187.11** | 4MB | 105MB |
| 14 | 20 | UTF-8 | 2,536.83 MS | 0.99 MS | **99.96%** | **2,562.01** | 504MB | 105MB |
| 15 | 20 | Hex | 5,339.05 MS | 0.54 MS | **99.99%** | **9,900.21** | 4MB | 105MB |
| 16 | 20 | Base64 | 3,578.12 MS | 0.47 MS | **99.99%** | **7,620.51** | 4MB | 106MB |
