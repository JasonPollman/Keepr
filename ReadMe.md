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

### Performance Results

#### 0.1KB File
5/14/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 7.12 MS | 9.07 MS | -21.48% | 0.79 | 5MB | 6MB |
| 2 | 1 | UTF-8 | 1.95 MS | 3.06 MS | -36.13% | 0.64 | 5MB | 6MB |
| 3 | 1 | Hex | 1.75 MS | 3.21 MS | -45.51% | 0.54 | 5MB | 6MB |
| 4 | 1 | Base64 | 1.81 MS | 3.19 MS | -43.46% | 0.57 | 5MB | 6MB |
| 5 | 2 | Buffer | 2.59 MS | 0.51 MS | **80.38%** | **5.1** | 5MB | 6MB |
| 6 | 2 | UTF-8 | 2.14 MS | 0.62 MS | **71.04%** | **3.45** | 5MB | 6MB |
| 7 | 2 | Hex | 2.96 MS | 0.22 MS | **92.64%** | **13.59** | 5MB | 6MB |
| 8 | 2 | Base64 | 2.89 MS | 0.31 MS | **89.09%** | **9.16** | 5MB | 6MB |
| 9 | 5 | Buffer | 4.21 MS | 1.05 MS | **74.99%** | **4** | 5MB | 6MB |
| 10 | 5 | UTF-8 | 3.8 MS | 0.59 MS | **84.36%** | **6.39** | 5MB | 6MB |
| 11 | 5 | Hex | 3.53 MS | 0.58 MS | **83.57%** | **6.09** | 5MB | 6MB |
| 12 | 5 | Base64 | 2.9 MS | 1.56 MS | 46.15% | **1.86** | 5MB | 6MB |
| 13 | 20 | Buffer | 6.69 MS | 2.44 MS | **63.48%** | **2.74** | 6MB | 6MB |
| 14 | 20 | UTF-8 | 5.83 MS | 3.17 MS | 45.69% | **1.84** | 6MB | 5MB |
| 15 | 20 | Hex | 5.11 MS | 0.55 MS | **89.27%** | **9.32** | 6MB | 5MB |
| 16 | 20 | Base64 | 4.38 MS | 0.53 MS | **88.00%** | **8.33** | 6MB | 6MB |

#### 1.0KB File
5/14/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 7.79 MS | 8.39 MS | -7.23% | 0.93 | 5MB | 6MB |
| 2 | 1 | UTF-8 | 1.65 MS | 3.39 MS | -**51.35%** | 0.49 | 5MB | 6MB |
| 3 | 1 | Hex | 1.43 MS | 3.2 MS | -**55.39%** | 0.45 | 5MB | 6MB |
| 4 | 1 | Base64 | 1.39 MS | 3.66 MS | -**62.15%** | 0.38 | 5MB | 6MB |
| 5 | 2 | Buffer | 4.42 MS | 0.51 MS | **88.51%** | **8.7** | 5MB | 6MB |
| 6 | 2 | UTF-8 | 3.85 MS | 0.63 MS | **83.73%** | **6.15** | 5MB | 6MB |
| 7 | 2 | Hex | 3.75 MS | 0.23 MS | **93.91%** | **16.41** | 5MB | 6MB |
| 8 | 2 | Base64 | 2.95 MS | 0.4 MS | **86.56%** | **7.44** | 5MB | 6MB |
| 9 | 5 | Buffer | 2.65 MS | 0.94 MS | **64.60%** | **2.82** | 5MB | 6MB |
| 10 | 5 | UTF-8 | 2.36 MS | 0.74 MS | **68.57%** | **3.18** | 5MB | 6MB |
| 11 | 5 | Hex | 2.2 MS | 1.35 MS | 38.70% | **1.63** | 5MB | 6MB |
| 12 | 5 | Base64 | 2.05 MS | 1.55 MS | 24.24% | 1.32 | 5MB | 6MB |
| 13 | 20 | Buffer | 5.14 MS | 2.29 MS | **55.39%** | **2.24** | 6MB | 6MB |
| 14 | 20 | UTF-8 | 4.26 MS | 3.46 MS | 18.76% | 1.23 | 6MB | 5MB |
| 15 | 20 | Hex | 3.98 MS | 0.6 MS | **84.92%** | **6.63** | 6MB | 5MB |
| 16 | 20 | Base64 | 3.71 MS | 0.75 MS | **79.87%** | **4.97** | 6MB | 6MB |

#### 5.0KB File
5/14/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 6.9 MS | 9.27 MS | -25.61% | 0.74 | 5MB | 6MB |
| 2 | 1 | UTF-8 | 1.79 MS | 2.98 MS | -39.93% | 0.6 | 5MB | 6MB |
| 3 | 1 | Hex | 1.62 MS | 2.8 MS | -41.92% | 0.58 | 5MB | 6MB |
| 4 | 1 | Base64 | 1.58 MS | 3.08 MS | -48.76% | 0.51 | 5MB | 6MB |
| 5 | 2 | Buffer | 2.89 MS | 0.53 MS | **81.81%** | **5.5** | 5MB | 6MB |
| 6 | 2 | UTF-8 | 2.42 MS | 0.61 MS | **74.89%** | **3.98** | 5MB | 6MB |
| 7 | 2 | Hex | 3.15 MS | 0.22 MS | **93.05%** | **14.38** | 5MB | 6MB |
| 8 | 2 | Base64 | 3.06 MS | 0.32 MS | **89.45%** | **9.48** | 5MB | 6MB |
| 9 | 5 | Buffer | 4.19 MS | 1.02 MS | **75.60%** | **4.1** | 5MB | 6MB |
| 10 | 5 | UTF-8 | 3.7 MS | 0.56 MS | **84.85%** | **6.6** | 5MB | 6MB |
| 11 | 5 | Hex | 3.5 MS | 0.44 MS | **87.33%** | **7.89** | 5MB | 6MB |
| 12 | 5 | Base64 | 2.89 MS | 1.44 MS | **50.17%** | **2.01** | 6MB | 6MB |
| 13 | 20 | Buffer | 5.58 MS | 2.19 MS | **60.85%** | **2.55** | 6MB | 6MB |
| 14 | 20 | UTF-8 | 4.93 MS | 3.52 MS | 28.68% | 1.4 | 6MB | 5MB |
| 15 | 20 | Hex | 4.66 MS | 0.55 MS | **88.10%** | **8.41** | 6MB | 5MB |
| 16 | 20 | Base64 | 5.3 MS | 0.54 MS | **89.83%** | **9.83** | 5MB | 6MB |

#### 50.0KB File
5/14/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 6.84 MS | 8.2 MS | -16.56% | 0.83 | 5MB | 6MB |
| 2 | 1 | UTF-8 | 1.72 MS | 2.98 MS | -42.33% | 0.58 | 5MB | 6MB |
| 3 | 1 | Hex | 1.6 MS | 2.92 MS | -45.03% | 0.55 | 5MB | 6MB |
| 4 | 1 | Base64 | 1.74 MS | 3.32 MS | -47.74% | 0.52 | 5MB | 6MB |
| 5 | 2 | Buffer | 2.84 MS | 0.52 MS | **81.59%** | **5.43** | 5MB | 6MB |
| 6 | 2 | UTF-8 | 3.17 MS | 0.61 MS | **80.78%** | **5.2** | 6MB | 6MB |
| 7 | 2 | Hex | 3.48 MS | 0.22 MS | **93.67%** | **15.79** | 6MB | 6MB |
| 8 | 2 | Base64 | 3.63 MS | 0.31 MS | **91.46%** | **11.71** | 6MB | 6MB |
| 9 | 5 | Buffer | 3.73 MS | 1.04 MS | **72.10%** | **3.58** | 6MB | 6MB |
| 10 | 5 | UTF-8 | 4.65 MS | 0.57 MS | **87.79%** | **8.19** | 5MB | 6MB |
| 11 | 5 | Hex | 4.79 MS | 0.69 MS | **85.61%** | **6.95** | 6MB | 6MB |
| 12 | 5 | Base64 | 4.69 MS | 1.49 MS | **68.24%** | **3.15** | 6MB | 6MB |
| 13 | 20 | Buffer | 7.2 MS | 4 MS | 44.44% | **1.8** | 6MB | 5MB |
| 14 | 20 | UTF-8 | 7.23 MS | 1.29 MS | **82.20%** | **5.62** | 5MB | 6MB |
| 15 | 20 | Hex | 8.1 MS | 0.54 MS | **93.36%** | **15.07** | 5MB | 6MB |
| 16 | 20 | Base64 | 8.55 MS | 0.6 MS | **92.98%** | **14.25** | 7MB | 6MB |

#### 100.0KB File
5/14/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 7.68 MS | 8.44 MS | -8.93% | 0.91 | 5MB | 6MB |
| 2 | 1 | UTF-8 | 2.15 MS | 3.1 MS | -30.55% | 0.69 | 5MB | 6MB |
| 3 | 1 | Hex | 2.09 MS | 3.48 MS | -40.01% | 0.6 | 5MB | 6MB |
| 4 | 1 | Base64 | 2.16 MS | 4.08 MS | -47.12% | 0.53 | 6MB | 6MB |
| 5 | 2 | Buffer | 3.05 MS | 0.6 MS | **80.15%** | **5.04** | 6MB | 6MB |
| 6 | 2 | UTF-8 | 3.37 MS | 0.66 MS | **80.50%** | **5.13** | 6MB | 6MB |
| 7 | 2 | Hex | 4.69 MS | 0.23 MS | **95.17%** | **20.69** | 5MB | 6MB |
| 8 | 2 | Base64 | 4.89 MS | 0.33 MS | **93.21%** | **14.72** | 6MB | 6MB |
| 9 | 5 | Buffer | 2.28 MS | 0.94 MS | **58.55%** | **2.41** | 6MB | 6MB |
| 10 | 5 | UTF-8 | 2.47 MS | 2.41 MS | 2.36% | 1.02 | 6MB | 6MB |
| 11 | 5 | Hex | 3.74 MS | 0.24 MS | **93.47%** | **15.31** | 6MB | 6MB |
| 12 | 5 | Base64 | 3.83 MS | 0.88 MS | **77.14%** | **4.38** | 6MB | 6MB |
| 13 | 20 | Buffer | 8.83 MS | 1.38 MS | **84.35%** | **6.39** | 6MB | 6MB |
| 14 | 20 | UTF-8 | 8.49 MS | 1.56 MS | **81.58%** | **5.43** | 6MB | 6MB |
| 15 | 20 | Hex | 11.06 MS | 0.63 MS | **94.29%** | **17.52** | 7MB | 6MB |
| 16 | 20 | Base64 | 12.52 MS | 0.61 MS | **95.14%** | **20.56** | 5MB | 6MB |

#### 1.0MB File
5/14/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 7.24 MS | 9.94 MS | -27.14% | 0.73 | 5MB | 6MB |
| 2 | 1 | UTF-8 | 3.42 MS | 5.67 MS | -39.69% | 0.6 | 7MB | 7MB |
| 3 | 1 | Base64 | 4.53 MS | 8.02 MS | -43.46% | 0.57 | 7MB | 7MB |
| 4 | 1 | Hex | 6.73 MS | 10.75 MS | -37.41% | 0.63 | 7MB | 7MB |
| 5 | 2 | Buffer | 4.2 MS | 1.46 MS | **65.21%** | **2.87** | 6MB | 6MB |
| 6 | 2 | UTF-8 | 4.34 MS | 0.62 MS | **85.77%** | **7.03** | 7MB | 6MB |
| 7 | 2 | Hex | 10.35 MS | 0.19 MS | **98.18%** | **54.87** | 7MB | 6MB |
| 8 | 2 | Base64 | 11.67 MS | 0.31 MS | **97.34%** | **37.58** | 7MB | 7MB |
| 9 | 5 | Buffer | 5.33 MS | 0.89 MS | **83.37%** | **6.01** | 5MB | 7MB |
| 10 | 5 | UTF-8 | 6.21 MS | 0.52 MS | **91.66%** | **11.99** | 7MB | 7MB |
| 11 | 5 | Hex | 16.02 MS | 0.4 MS | **97.50%** | **39.92** | 7MB | 7MB |
| 12 | 5 | Base64 | 22.97 MS | 1.4 MS | **93.88%** | **16.35** | 7MB | 7MB |
| 13 | 20 | Buffer | 16.35 MS | 2.02 MS | **87.66%** | **8.11** | 5MB | 7MB |
| 14 | 20 | UTF-8 | 20.43 MS | 2.3 MS | **88.76%** | **8.9** | 5MB | 7MB |
| 15 | 20 | Hex | 53.54 MS | 0.69 MS | **98.71%** | **77.64** | 5MB | 7MB |
| 16 | 20 | Base64 | 78.34 MS | 0.64 MS | **99.18%** | **121.92** | 5MB | 7MB |

#### 5.0MB File
5/14/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 10.57 MS | 12.66 MS | -16.50% | 0.84 | 5MB | 6MB |
| 2 | 1 | UTF-8 | 7.96 MS | 11.92 MS | -33.24% | 0.67 | 10MB | 11MB |
| 3 | 1 | Hex | 16.72 MS | 28.62 MS | -41.57% | 0.58 | 10MB | 11MB |
| 4 | 1 | Base64 | 24.28 MS | 39.03 MS | -37.78% | 0.62 | 10MB | 11MB |
| 5 | 2 | Buffer | 19.75 MS | 0.61 MS | **96.93%** | **32.55** | 15MB | 11MB |
| 6 | 2 | UTF-8 | 21.73 MS | 0.65 MS | **97.00%** | **33.34** | 20MB | 11MB |
| 7 | 2 | Hex | 30.46 MS | 0.22 MS | **99.29%** | **141.38** | 20MB | 11MB |
| 8 | 2 | Base64 | 45.59 MS | 0.33 MS | **99.28%** | **139.84** | 20MB | 11MB |
| 9 | 5 | Buffer | 16.61 MS | 0.97 MS | **94.19%** | **17.2** | 20MB | 11MB |
| 10 | 5 | UTF-8 | 37.14 MS | 0.57 MS | **98.47%** | **65.21** | 24MB | 11MB |
| 11 | 5 | Hex | 75.35 MS | 0.46 MS | **99.39%** | **163.46** | 24MB | 11MB |
| 12 | 5 | Base64 | 106.72 MS | 1.45 MS | **98.64%** | **73.46** | 24MB | 11MB |
| 13 | 20 | Buffer | 71.78 MS | 2.19 MS | **96.95%** | **32.81** | 5MB | 11MB |
| 14 | 20 | UTF-8 | 146.2 MS | 3.37 MS | **97.69%** | **43.37** | 44MB | 10MB |
| 15 | 20 | Hex | 343.01 MS | 0.59 MS | **99.83%** | **579.44** | 44MB | 11MB |
| 16 | 20 | Base64 | 519.77 MS | 0.56 MS | **99.89%** | **925.18** | 4MB | 11MB |

#### 50.0MB File
5/14/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 40.71 MS | 60.14 MS | -32.31% | 0.68 | 5MB | 6MB |
| 2 | 1 | Hex | 138.55 MS | 93.32 MS | 32.65% | 1.48 | 4MB | 56MB |
| 3 | 1 | Base64 | 214.2 MS | 221.88 MS | -3.46% | 0.97 | 4MB | 56MB |
| 4 | 1 | UTF-8 | 240.03 MS | 308.21 MS | -22.12% | 0.78 | 54MB | 56MB |
| 5 | 2 | Buffer | 80.25 MS | 0.64 MS | **99.20%** | **125.07** | 4MB | 56MB |
| 6 | 2 | UTF-8 | 133.53 MS | 0.65 MS | **99.51%** | **205.99** | 105MB | 56MB |
| 7 | 2 | Hex | 301.39 MS | 0.24 MS | **99.92%** | **1,269.4** | 105MB | 56MB |
| 8 | 2 | Base64 | 434.55 MS | 0.22 MS | **99.95%** | **1,980.57** | 105MB | 56MB |
| 9 | 5 | Buffer | 183.8 MS | 0.95 MS | **99.48%** | **192.94** | 4MB | 56MB |
| 10 | 5 | UTF-8 | 359.71 MS | 0.95 MS | **99.74%** | **378.86** | 104MB | 56MB |
| 11 | 5 | Hex | 859.41 MS | 1.11 MS | **99.87%** | **775.4** | 104MB | 56MB |
| 12 | 5 | Base64 | 1,318.74 MS | 1.22 MS | **99.91%** | **1,083.57** | 4MB | 56MB |
| 13 | 20 | Buffer | 852.54 MS | 4.77 MS | **99.44%** | **178.71** | 4MB | 56MB |
| 14 | 20 | UTF-8 | 1,714.93 MS | 5.28 MS | **99.69%** | **325.06** | 154MB | 55MB |
| 15 | 20 | Hex | 3,640.5 MS | 0.65 MS | **99.98%** | **5,610.74** | 4MB | 55MB |
| 16 | 20 | Base64 | 4,972.97 MS | 0.48 MS | **99.99%** | **10,311.56** | 4MB | 55MB |

#### 100.0MB File
5/14/2016 • Darwin • 17.18GB Memory • 8 CPUS

| Pass | Reads | Encoding | FS Time | Keepr Time | % Faster | X Faster | FS Heap | Keepr Heap |
| :--: | :---: | :------: | :-----: | :--------: | :------: | :------: | :-----: | :--------: |
| 1 | 1 | Buffer | 77.82 MS | 108.3 MS | -28.14% | 0.72 | 4MB | 6MB |
| 2 | 1 | Hex | 283.7 MS | 192.27 MS | 32.23% | 1.48 | 4MB | 106MB |
| 3 | 1 | UTF-8 | 343.05 MS | 445.66 MS | -23.02% | 0.77 | 104MB | 106MB |
| 4 | 1 | Base64 | 497.28 MS | 641.04 MS | -22.43% | 0.78 | 105MB | 106MB |
| 5 | 2 | Buffer | 112.2 MS | 0.39 MS | **99.65%** | **289.01** | 4MB | 106MB |
| 6 | 2 | UTF-8 | 480.76 MS | 0.54 MS | **99.89%** | **889.18** | 204MB | 106MB |
| 7 | 2 | Hex | 838.87 MS | 0.28 MS | **99.97%** | **2,955.97** | 4MB | 106MB |
| 8 | 2 | Base64 | 949.22 MS | 0.12 MS | **99.99%** | **8,030.91** | 4MB | 106MB |
| 9 | 5 | Buffer | 387.38 MS | 1.46 MS | **99.62%** | **265.56** | 4MB | 106MB |
| 10 | 5 | UTF-8 | 758.55 MS | 0.53 MS | **99.93%** | **1,425.4** | 204MB | 106MB |
| 11 | 5 | Hex | 1,841.96 MS | 1.39 MS | **99.92%** | **1,324.85** | 4MB | 106MB |
| 12 | 5 | Base64 | 2,563.94 MS | 0.66 MS | **99.97%** | **3,878.89** | 4MB | 106MB |
| 13 | 20 | Buffer | 1,721.91 MS | 5.19 MS | **99.70%** | **331.58** | 4MB | 105MB |
| 14 | 20 | UTF-8 | 3,487.77 MS | 1.7 MS | **99.95%** | **2,046.84** | 304MB | 105MB |
| 15 | 20 | Hex | 8,009.21 MS | 0.56 MS | **99.99%** | **14,375.06** | 4MB | 105MB |
| 16 | 20 | Base64 | 10,776.63 MS | 0.49 MS | **100.00%** | **21,774** | 4MB | 106MB |
