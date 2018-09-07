# tab-image-saver
Tab Image Saver is a Firefox addon that makes it easy to save images from browser tabs you have open.

Download from [Firefox Addons](https://addons.mozilla.org/en-US/firefox/addon/tab-image-saver/).

## Features
**By default this addon saves the largest image found on the active tab.**

You may control how this functions by changing the addon preferences at in **Firefox > Add-ons > Extensions > Tab Image Saver > Preferences**

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
    
Addon icon: images by lastspark from the Noun Project.

## Path rules
Path rules are a flexible method for choosing the download filenames.

Rules can contain any combination of text strings and **keywords**.

Rules are processed top-down, if the rule does not evaluate to a valid path then it will proceed to the next rule in the list.

### Keywords
  - Keywords are enclosed by angled brackets `< >`
  - They can use simple OR logic with the pipe symbol `|`
  - Keywords prepended with hashes `#` will be zero-padded

Example source: `<img src="http://example.com/path/to/filename.gif" alt="Caption">`

| Keyword | Description | Example |
|-----|-------------|---------|
| alt | image's alt content | Caption |
| name | image's filename without extension | filename |
| ext  | image's extension | .gif |
| path | full path to image | path/to |
| host | hostname | example.com |
| index | incremented number starting at '1' | 1 |
| xName | filename from Content-Disposition header | filename |
| xExt | extension from Content-Disposition header | .gif |
| xMimeExt | extension from Content-Type header | .gif |

Any tag not defined above will be treated as static text.
For example `<undef>.jpg` will output `undef.jpg`

### Examples
`<name><ext|xExt|xMimeExt|.jpg>`

This will attempt to find the filename extension from the URL, Content-Disposition header, Content-Type header, and finally if all else fails will use `.jpg`

`img_<####index>.jpg`

This will use the index of the image in the active download session. The index is incremented for each image saved and processed in tab order. The output will be zero padded, such as `img_0001.jpg`
