# tab-image-saver [![Addon Version](https://img.shields.io/amo/v/tab-image-saver.svg)](https://addons.mozilla.org/firefox/addon/tab-image-saver/) [![Build Status](https://travis-ci.com/mcdamo/tab-image-saver.svg?branch=master)](https://travis-ci.com/mcdamo/tab-image-saver)

Tab Image Saver is a Firefox addon that makes it easy to save images from browser tabs you have open.

Download from [Firefox Addons](https://addons.mozilla.org/firefox/addon/tab-image-saver/).

## Features

**By default this addon saves the largest image found on the active tab.**

You may control how this functions by changing the addon preferences at in **Firefox > Add-ons > Extensions > Tab Image Saver > Preferences** or right-click the toolbar icon.

- Multitasking Support - run addon concurrently in separate windows
- Keyboard shortcut options
- Select from active tab, tabs to the left/right of current tab, or all tabs.
- Cancel running operations
- Set minimum image size in pixels
- Option to only save tabs with images, ignoring tabs with webpages
- Filenames renamed automatically
- Display badge on icon with runtime information and count of downloads
- Close tabs after saving
- Hide saved images from download history
- Show notification when complete

## Path rules

Path rules are a flexible method for setting the image filenames when downloading.

The Path rules syntax is based off [template strings](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals), this will be familiar to anyone who has coded Javascript.

Path rules are processed top-down: if the first rule does not evaluate to a valid path then it will proceed to the next rule in the list and so on.

### Variables

All the following variables are available for use in _Path rules_ and _Download folder_.

**Tab** and **Date** variables may also be used in _Image URL regex match_ options.

#### Image

| Variable | Description                                              | Example\*   |
| -------- | -------------------------------------------------------- | ----------- |
| alt      | image's alt content                                      | Caption     |
| name     | image's url filename without extension                   | filename    |
| xName    | image's filename from Content-Disposition header         | filename    |
| ext      | image's url extension                                    | jpg         |
| xExt     | image's extension from Content-Disposition header        | jpg         |
| xMimeExt | image's extension from Content-Type header               | jpg         |
| host     | image's url hostname                                     | example.com |
| path     | image's url path                                         | path/to     |
| index    | image number starting at '1', incremented for each image | 1           |

#### Tab

| Variable | Description                          | Example\*                      |
| -------- | ------------------------------------ | ------------------------------ |
| tabTitle | tab's page title                     | (JPEG Image, 500 x 500 pixels) |
| tabHost  | tab's url hostname                   | example.com                    |
| tabPath  | tab's url path                       | path/to                        |
| tabFile  | tab's url filename without extension | filename                       |
| tabExt   | tab's url extension                  | jpg                            |

#### Date

| Variable | Description | Example |
| -------- | ----------- | ------- |

<<<<<<< HEAD
| date | date string in your locale | 1995-12-17 |
| year | full year | 1995 |
| month | month (zero padded) | 12 |
| day | day of month (zero padded) | 17 |
| time | time string in your locale | 03:24:01 |
| hours | hours (zero padded) | 03 |
| minutes | minutes (zero padded) | 24 |
| seconds | seconds (zero padded) | 01 |
| timestamp | unix timestamp in seconds | 819170641 |

# \*Example source:

| date | date string in your locale | 1970-01-31 |
| year | full year | 1970 |
| month | month (zero padded) | 01 |
| day | day of month (zero padded) | 31 |
| time | time string in your locale | 00:00:00 |
| hours | hours (zero padded) | 00 |
| minutes | minutes (zero padded) | 00 |
| seconds | seconds (zero padded) | 00 |
| timestamp | unix timestamp | 2592000 |

> > > > > > > 2001e4e (Update readme)

\*Example source:

```
<img src="http://example.com/path/to/filename.jpg" alt="Caption">
```

#### Boolean logic

Empty variables can be skipped with boolean logic using double-pipe: `||`

##### Example

```
${name}.${ext||xExt||xMimeExt||'jpg'}
```

This will attempt to find the filename extension from the URL, Content-Disposition header, Content-Type header, and finally if all else fails will use `jpg`

### Methods

String methods can be chained to variables or strings in the Path rule.

#### Zero padding

The [padStart](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart) method can be used to string pad the `index` variable.

##### Example

```
img_${index.padStart(4, 0)}.jpg
```

This will use the index of the image in the active download session. The index is incremented for each image saved and processed in tab order. The output will be zero padded, such as `img_0001.jpg`

#### String replacement and regular expressions

The [replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace) method can use [regular expresions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) on variables.

##### Example

Using `replace()`, if `alt` variable contains a pipe symbol `|` then it and any trailing characters are removed:

```
${alt.replace(/\s*\|.*/, '')}
```

#### Path sanitization helpers

Path sanitization helper methods will quickly remove most problematic characters from a string.

- `sanitizeFile("string", "_")` removes all slashes and replaces illegal characters with underscores to create a valid filename.
- `sanitizePath("string", "_")` replaces illegal characters with underscores and retains slashes to allow multi-level folders.

## Rulesets

Rulesets can apply rules and options to a specific _domain_ or _url_ of the **tab** page.

Rulesets are tested in order from top to bottom. Any pages that are unmatched by a Ruleset will default to the Global settings.

The standard form of domain rule allows for simple wildcard matching (**\***).

Domain rules can also be interpreted as a [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) by wrapping in hash characters (**#**).

### Matching domains

The following examples are for `https://example.com/page.html`

| Domain rule           | Match |
| --------------------- | ----- |
| example.com/          | Yes   |
| example.co            | Yes   |
| example.co/           | No    |
| ample.com/            | Yes   |
| e\*e.com/             | Yes   |
| /page.html            | Yes   |
| #//example\.[^/]{3}/# | Yes   |

## Download method

The download method does not need to be changed unless you are using the cache workaround or having issues with downloads.

| Method                      | Advantages                                                                                                                                      | Disadvantages                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Fetch**                   | fast cancellation                                                                                                                               | does not use cache [#91](https://github.com/mcdamo/tab-image-saver/issues/91)                     |
| **Content-fetch** (default) | [multi-account containers](https://addons.mozilla.org/firefox/addon/multi-account-containers/); [cache-workaround](#cache-is-not-used)          | slowest                                                                                           |
| **Download**                | [multi-account containers](https://addons.mozilla.org/firefox/addon/multi-account-containers/); [cache-workaround](#cache-is-not-used); fastest | _Clear download history_ does not work [#93](https://github.com/mcdamo/tab-image-saver/issues/93) |

## FAQ

### Filenames are `_name_._ext_`

Path rules are not in the latest format. Follow the [update instructions](CHANGES-4.0.md)

### Cache is not used

Since Firefox 85.0 the network partitioning means that the addon cannot access the browser cache and images are re-fetched from the network for every download.

This security feature can be disabled to improve download performance by editing Firefox config:

`about:config` -> `privacy.partition.network_state` -> `false`

### Images fail to download

If images load in the browser but fail to download this is often caused by Tracking Protection.

In Firefox settings try reducing the protection level from _Strict_ or adding a site exception.

## Acknowledgements

Libraries:

- [l10n](http://github.com/piroor/webextensions-lib-l10n)
- [react-sortablejs](https://github.com/SortableJS/react-sortablejs)
- [Sortable](https://github.com/SortableJS/Sortable)
- [jse-eval](https://github.com/6utt3rfly/jse-eval)
- React toolchain based on [react-extension-boilerplate](https://github.com/kryptokinght/react-extension-boilerplate)

Graphics:

- [images](https://thenounproject.com/term/images/329997) by lastspark
- [angle-down](https://fontawesome.com/icons/angle-down?style=solid)
- [angle-double-down](https://fontawesome.com/icons/angle-double-down?style=solid)
- [angle-double-left](https://fontawesome.com/icons/angle-double-left?style=solid)
- [angle-double-right](https://fontawesome.com/icons/angle-double-right?style=solid)
- [ban](https://fontawesome.com/icons/ban?style=solid)
- [cog](https://fontawesome.com/icons/cog?style=solid)
- [columns](https://fontawesome.com/icons/columns?style=solid)
- [download](https://fontawesome.com/icons/download?style=solid)
- [exclamation-triangle](https://fontawesome.com/icons/exclamation-triangle?style=solid)
- [folder-open](https://fontawesome.com/icons/folder-open?style=solid)
- [grip-lines](https://fontawesome.com/icons/grip-lines?style=solid)
- [history](https://fontawesome.com/icons/history?style=solid)
- [plus](https://fontawesome.com/icons/plus?s=solid)
- [tasks](https://fontawesome.com/icons/tasks?style=solid)
- [tools](https://fontawesome.com/icons/tools?style=solid)
- [trash](https://fontawesome.com/icons/trash-alt?style=solid)
- [upload](https://fontawesome.com/icons/upload?style=solid)
