# tab-image-saver [![Addon Version](https://img.shields.io/amo/v/tab-image-saver.svg)](https://addons.mozilla.org/firefox/addon/tab-image-saver/) [![Build Status](https://travis-ci.com/mcdamo/tab-image-saver.svg?branch=master)](https://travis-ci.com/mcdamo/tab-image-saver)

Tab Image Saver ist ein Firefox-Addon, das es einfach macht, Bilder von Browser-Tabs zu speichern, die Sie geöffnet haben.

Download von [Firefox Addons](https://addons.mozilla.org/firefox/addon/tab-image-saver/).

## Funktionen

**Standardmäßig speichert dieses Addon das größte Bild, das in dem aktiven Tab gefunden wurde.**

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

### Schlüsselwörter

- Schlüsselwörter werden von abgewinkelten Klammern umschlossen `< >`
- They can use simple OR logic with the pipe symbol `|`
- Keywords prepended with hashes `#` will be zero-padded

Example source: `<img src="http://example.com/path/to/filename.jpg" alt="Caption">`

| Schlüsselwort | Beschreibung                                             | Beispiel                       |
| ------------- | -------------------------------------------------------- | ------------------------------ |
| alt           | alt-Content des Bildes                                   | Bildbeschriftung               |
| name          | url-Dateiname des Bildes ohne Erweiterung                | filename                       |
| xName         | image's filename from Content-Disposition header         | filename                       |
| ext           | image's url extension                                    | .jpg                           |
| xExt          | image's extension from Content-Disposition header        | .jpg                           |
| xMimeExt      | image's extension from Content-Type header               | .jpg                           |
| host          | image's url hostname                                     | example.com                    |
| path          | image's url path                                         | path/to                        |
| index         | image number starting at '1', incremented for each image | 1                              |
| tabTitle      | tab's page title                                         | (JPEG Image, 500 x 500 pixels) |
| tabHost       | tab's url hostname                                       | example.com                    |
| tabPath       | tab's url path                                           | path/to                        |
| tabFile       | tab's url filename without extension                     | filename                       |
| tabExt        | tab's url extension                                      | .jpg                           |

Any tag not defined above will be treated as static text. For example `<undef>.jpg` will output `undef.jpg`

#### Beispiele

`<name><ext|xExt|xMimeExt|.jpg>`

Dies wird versuchen, die Dateinamenerweiterung aus der URL, den Content-Disposition-Header, den Content-Type-Header zu finden, und schließlich, wenn alles andere fehlschlägt, wird `.jpg` verwendet

`img_<####index>.jpg`

This will use the index of the image in the active download session. The index is incremented for each image saved and processed in tab order. The output will be zero padded, such as `img_0001.jpg`

### Ausdrücke (Experimentell)

Ausdrücke sind eine experimentelle Erweiterung von Pfadregeln zur Unterstützung der Zeichenkettenmanipulation.

Zurzeit implementiert ist [replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace) mit [regulären Ausdrücken](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp).

Ausdrücke sind von doppelten Anführungszeichen `"` umgeben und müssen unmittelbar nach einem Schlüsselwort oder einer Pfadregel folgen.

Syntax eines Ausdrucks:

    <alt>"/replace/regexp/newSubstr/flags"
          | | | | +- optionale Flags zu RegExp
          | | | +- ersetzt Zeichenketten oder Muster
          | | +- suche Zeichenketten oder Muster
          | +- 'replace' Ausdrucksname. andere Ausdrücke können in Zukunft unterstützt werden.
          +- abgrenzer
    

Jedes beliebige Zeichen kann als Trennzeichen ausgewählt werden, solange dieses Zeichen nicht irgendwo innerhalb der Ausdrucksmuster verwendet wird. Das obige Beispiel verwendet Schrägstrich `/`, obwohl, wenn Ihre Ausdrucksmuster oder Zeichenketten Schrägstriche enthalten, Sie ein anderes Symbol als Trennzeichen auswählen sollten.

#### Beispiele

Wenn `alt` ein Rohrsymbol enthält `|` dann entfernen Sie es und alle nachfolgenden Zeichen: `<alt>"/replace/\s*\|.*/"`