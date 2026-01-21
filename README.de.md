# tab-image-saver [![Addon Version](https://img.shields.io/amo/v/tab-image-saver.svg)](https://addons.mozilla.org/firefox/addon/tab-image-saver/) [![Build Status](https://travis-ci.com/mcdamo/tab-image-saver.svg?branch=master)](https://travis-ci.com/mcdamo/tab-image-saver)

Tab Image Saver ist ein Firefox-Addon, das es einfach macht, Bilder von Browser-Tabs zu speichern, die Sie geöffnet haben.

Download von [Firefox Addons](https://addons.mozilla.org/firefox/addon/tab-image-saver/).

## Funktionen

**Standardmäßig speichert dieses Addon das größte Bild, das in dem aktiven Tab gefunden wurde.**

You may control how this functions by changing the addon preferences at in **Firefox > Add-ons > Extensions > Tab Image Saver > Preferences** or right-click the toolbar icon.

- Multitasking Unterstützung - Das Addon gleichzeitig in separaten Fenstern ausführen
- Tastaturkürzel Option
- Ausführen von dem aktivem Tab, den Tabs links/rechts des aktuellen Tabs oder allen Tabs.
- Laufenden Vorgang abbrechen (auf das Addon-Symbol klicken)
- Minimale Bildgröße in Pixeln festlegen
- Option, nur Tabs mit Bildern zu speichern, ignoriert Tabs mit Webseiten
- Dateinamen werden automatisch umbenannt
- Anzeige des Badge auf dem Symbol mit Laufzeitinformationen und Anzahl der Downloads
- Tabs nach dem Speichern schließen
- Gespeicherte Bilder aus dem Download-Verlauf ausblenden
- Benachrichtigung anzeigen, wenn abgeschlossen

## Pfadregeln

Path rules are a flexible method for choosing the download filenames.

Rules can contain any combination of text strings and **keywords**.

Rules are processed top-down, if the rule does not evaluate to a valid path then it will proceed to the next rule in the list.

### Schlüsselwörter

- Schlüsselwörter werden von abgewinkelten Klammern umschlossen `< >`
- Sie können eine einfache ODER-Logik mit dem Rohrsymbol verwenden `|`
- Schlüsselwörter, die mit Hashes `#` vorangestellt sind, werden mit Null gepolstert

Example source: `<img src="http://example.com/path/to/filename.jpg" alt="Caption">`

| Schlüsselwort | Beschreibung                                             | Beispiel                     |
| ------------- | -------------------------------------------------------- | ---------------------------- |
| alt           | alt-Content des Bildes                                   | Bildbeschriftung             |
| name          | URL-Dateiname des Bildes ohne Erweiterung                | dateiname                    |
| xName         | Dateiname des Bildes vom Content-Disposition-Header      | dateiname                    |
| ext           | Bild-URL Erweiterung                                     | jpg                          |
| xExt          | Erweiterung des Bildes vom Content-Disposition-Header    | jpg                          |
| xMimeExt      | Erweiterung des Bildes vom Content-Type-Header           | jpg                          |
| host          | URL-Hostname des Bildes                                  | beispiel.com                 |
| path          | URL-Pfad des Bildes                                      | pfad/zu                      |
| index         | Bildnummer beginnend bei '1', wird für jedes Bild erhöht | 1                            |
| tabTitle      | Titel des Tab's                                          | (JPEG Bild, 500 x 500 Pixel) |
| tabHost       | URL-Hostname des Tab's                                   | beispiel.com                 |
| tabPath       | URL-Pfad des Tab's                                       | pfad/zu                      |
| tabFile       | URL-Dateiname des Tab's ohne Erweiterung                 | dateiname                    |
| tabExt        | URL des Tab's ohne Erweiterung                           | jpg                          |

Any tag not defined above will be treated as static text. For example `<undef>.jpg` will output `undef.jpg`

#### Beispiele

`<name>.<ext|xExt|xMimeExt|jpg>`

This will attempt to find the filename extension from the URL, Content-Disposition header, Content-Type header, and finally if all else fails will use `jpg`

`img_<####index>.jpg`

This will use the index of the image in the active download session. The index is incremented for each image saved and processed in tab order. The output will be zero padded, such as `img_0001.jpg`

### Expressions

Expressions are an experimental extension to path rules to support string manipulation.

Currently implemented is [replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace) using [regular expresions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp).

Expressions are surrounded by double quotes `"` and must immediately follow after a keyword or path rule.

Syntax of an expression:

    <alt>"/replace/regexp/newSubstr/flags"
          | | | | +- optionale Flags zu RegExp
          | | | +- ersetzt Zeichenketten oder Muster
          | | +- suche Zeichenketten oder Muster
          | +- 'replace' Ausdrucksname. andere Ausdrücke können in Zukunft unterstützt werden.
          +- abgrenzer
    

Any character may be selected as the delimiter as long as that character is not used anywhere within the expression patterns. The above example uses slash `/`, though if your expression patterns or strings contain slashes then you should select another symbol as the delimiter.

#### Beispiele

If `alt` contains a pipe symbol `|` then strip it and any trailing characters: `<alt>"/replace/\s*\|.*/"`

## Rulesets

Rulesets can apply rules and options to a specific *domain* or *url* of the **tab** page.

Rulesets are tested in order from top to bottom. Any pages that are unmatched by a Ruleset will default to the Global settings.

The standard form of domain rule allows for simple wildcard matching (**\***).

Domain rules can also be interpreted as a [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) by wrapping in hash characters (**#**).

### Examples

The following examples are for `https://example.com/page.html`

| Domain rule            | Match |
| ---------------------- | ----- |
| example.com/           | Yes   |
| example.co             | Yes   |
| example.co/            | No    |
| ample.com/             | Yes   |
| e*e.com/               | Yes   |
| /page.html             | Yes   |
| #//example\.[^/]{3}/# | Yes   |

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