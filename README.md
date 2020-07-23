# tab-image-saver [![Addon Version](https://img.shields.io/amo/v/tab-image-saver.svg)](https://addons.mozilla.org/firefox/addon/tab-image-saver/) [![Build Status](https://travis-ci.com/mcdamo/tab-image-saver.svg?branch=master)](https://travis-ci.com/mcdamo/tab-image-saver)

Tab Image Saver is a Firefox addon that makes it easy to save images from browser tabs you have open.

Download from [Firefox Addons](https://addons.mozilla.org/firefox/addon/tab-image-saver/).

## Features
**By default this addon saves the largest image found on the active tab.**

You may control how this functions by changing the addon preferences at in **Firefox > Add-ons > Extensions > Tab Image Saver > Preferences** or right-click the toolbar icon.

   - Multitasking Support - run addon concurrently in separate windows
   - Keyboard shortcut option
   - Run from active tab, tabs to the left/right of current tab, or all tabs.
   - Cancel running operation (click addon icon)
   - Set minimum image size in pixels
   - Option to only save tabs with images, ignoring tabs with webpages
   - Filenames renamed automatically
   - Display badge on icon with runtime information and count of downloads
   - Close tabs after saving
   - Hide saved images from download history
   - Show notification when complete
    
## Path rules
Path rules are a flexible method for choosing the download filenames.

Rules can contain any combination of text strings and **keywords**.

Rules are processed top-down, if the rule does not evaluate to a valid path then it will proceed to the next rule in the list.

### Keywords
  - Keywords are enclosed by angled brackets `< >`
  - They can use simple OR logic with the pipe symbol `|`
  - Keywords prepended with hashes `#` will be zero-padded

Example source: `<img src="http://example.com/path/to/filename.jpg" alt="Caption">`

| Keyword | Description | Example |
|-----|-------------|---------|
| alt | image's alt content | Caption |
| name | image's url filename without extension | filename |
| xName | image's filename from Content-Disposition header | filename |
| ext  | image's url extension | jpg |
| xExt | image's extension from Content-Disposition header | jpg |
| xMimeExt | image's extension from Content-Type header | jpg |
| host | image's url hostname | example.com |
| path | image's url path | path/to |
| index | image number starting at '1', incremented for each image | 1 |
| tabTitle | tab's page title | (JPEG Image, 500 x 500 pixels) |
| tabHost | tab's url hostname | example.com |
| tabPath | tab's url path | path/to |
| tabFile | tab's url filename without extension | filename |
| tabExt  | tab's url extension | jpg |

Any tag not defined above will be treated as static text.
For example `<undef>.jpg` will output `undef.jpg`

#### Examples
`<name>.<ext|xExt|xMimeExt|jpg>`

This will attempt to find the filename extension from the URL, Content-Disposition header, Content-Type header, and finally if all else fails will use `jpg`

`img_<####index>.jpg`

This will use the index of the image in the active download session. The index is incremented for each image saved and processed in tab order. The output will be zero padded, such as `img_0001.jpg`

### Expressions
Expressions are an experimental extension to path rules to support string manipulation.

Currently implemented is [replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace) using [regular expresions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp).

Expressions are surrounded by double quotes `"` and must immediately follow after a keyword or path rule.

Syntax of an expression:

```
<alt>"/replace/regexp/newSubstr/flags"
      |   |       |       |       +- optional flags to RegExp
      |   |       |       +- replacement string or pattern
      |   |       +- search string or pattern
      |   +- 'replace' expression name. other expressions may be supported in future.
      +- delimiter
```
Any character may be selected as the delimiter as long as that character is not used anywhere within the expression patterns. The above example uses slash `/`, though if your expression patterns or strings contain slashes then you should select another symbol as the delimiter.

#### Examples
If `alt` contains a pipe symbol `|` then strip it and any trailing characters:
`<alt>"/replace/\s*\|.*/"`

## Rulesets
Rulesets can apply rules and options to a specific _domain_ or _url_ of the **tab** page.

Rulesets are tested in order from top to bottom. Any pages that are unmatched by a Ruleset will default to the Global settings.

The standard form of domain rule allows for simple wildcard matching (**\***).

Domain rules can also be interpreted as a [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) by wrapping in hash characters (**#**).

### Examples
The following examples are for `https://example.com/page.html`

| Domain rule | Match |
|-------------|-------|
| example.com/ | Yes |
| example.co | Yes |
| example.co/ | No |
| ample.com/ | Yes |
| e*e.com/ | Yes |
| /page.html | Yes |
| #//example\.[^/]{3}/# | Yes |

## Acknowledgements

Libraries:

- [l10n](http://github.com/piroor/webextensions-lib-l10n)
- [react-sortablejs](https://github.com/SortableJS/react-sortablejs)
- [Sortable](https://github.com/SortableJS/Sortable)
- React toolchain based on [react-extension-boilerplate](https://github.com/kryptokinght/react-extension-boilerplate)

Graphics:

- [images](https://thenounproject.com/term/images/329997) by lastspark
- [grip-lines](https://fontawesome.com/icons/grip-lines?style=solid)
- [trash](https://fontawesome.com/icons/trash-alt?style=solid)
- [exclamation-triangle](https://fontawesome.com/icons/exclamation-triangle?style=solid)
- [ban](https://fontawesome.com/icons/ban?style=solid)
- [cog](https://fontawesome.com/icons/cog?style=solid)
- [folder-open](https://fontawesome.com/icons/folder-open?style=solid)
- [columns](https://fontawesome.com/icons/columns?style=solid)
- [angle-down](https://fontawesome.com/icons/angle-down?style=solid)
- [angle-double-right](https://fontawesome.com/icons/angle-double-right?style=solid)
- [angle-double-left](https://fontawesome.com/icons/angle-double-left?style=solid)
- [angle-double-down](https://fontawesome.com/icons/angle-double-down?style=solid)
