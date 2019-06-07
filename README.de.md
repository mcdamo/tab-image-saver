# tab-image-saver [![Addon Version](https://img.shields.io/amo/v/tab-image-saver.svg)](https://addons.mozilla.org/firefox/addon/tab-image-saver/) [![Build Status](https://travis-ci.com/mcdamo/tab-image-saver.svg?branch=master)](https://travis-ci.com/mcdamo/tab-image-saver)

Tab Image Saver ist ein Firefox-Addon, das es einfach macht, Bilder von Browser-Tabs zu speichern, die Sie geöffnet haben.

Download von [Firefox Addons](https://addons.mozilla.org/firefox/addon/tab-image-saver/).

## Funktionen

**Standardmäßig speichert dieses Addon das größte Bild, das in dem aktiven Tab gefunden wurde.**

Sie können steuern, wie dies funktioniert, indem Sie die Addon-Einstellungen unter **Firefox > Add-ons > Erweiterungen > Tab Image Saver > Einstellungen** ändern

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

Addon-Symbol: Bilder von lastspark von dem Noun Project.

## Pfadregeln

Pfadregeln sind eine flexible Methode zur Auswahl der Download-Dateinamen.

Regeln können eine beliebige Kombination von Textzeichenketten enthalten und **Schlüsselwörtern**.

Regeln werden von oben nach unten verarbeitet, wenn die Regel nicht zu einem gültigen Pfad auswertet, geht sie zur nächsten Regel in der Liste über.

### Schlüsselwörter

- Schlüsselwörter werden von abgewinkelten Klammern umschlossen `< >`
- Sie können eine einfache ODER-Logik mit dem Rohrsymbol verwenden `|`
- Schlüsselwörter, die mit Hashes `#` vorangestellt sind, werden mit Null gepolstert

Beispiel source: `<img src="http://example.com/path/to/filename.jpg" alt="Caption">`

| Schlüsselwort | Beschreibung                                             | Beispiel                     |
| ------------- | -------------------------------------------------------- | ---------------------------- |
| alt           | alt-Content des Bildes                                   | Bildbeschriftung             |
| name          | url-Dateiname des Bildes ohne Erweiterung                | dateiname                    |
| xName         | image's filename from Content-Disposition header         | dateiname                    |
| ext           | bild-Url Erweiterung                                     | .jpg                         |
| xExt          | image's extension from Content-Disposition header        | .jpg                         |
| xMimeExt      | image's extension from Content-Type header               | .jpg                         |
| host          | image's url hostname                                     | beispiel.com                 |
| path          | image's url path                                         | pfad/zu                      |
| index         | image number starting at '1', incremented for each image | 1                            |
| tabTitle      | tab's page title                                         | (JPEG Bild, 500 x 500 Pixel) |
| tabHost       | tab's url hostname                                       | beispiel.com                 |
| tabPath       | tab's url path                                           | pfad/zu                      |
| tabFile       | tab's url filename without extension                     | dateiname                    |
| tabExt        | tab's url extension                                      | .jpg                         |

Jeder nicht oben definierte Tag wird als statischer Text behandelt. Zum Beispiel `<undef>.jpg` wird `undef.jpg` ausgeben

#### Beispiele

`<name><ext|xExt|xMimeExt|.jpg>`

Dies wird versuchen, die Dateinamenerweiterung aus der URL, den Content-Disposition-Header, den Content-Type-Header zu finden, und schließlich, wenn alles andere fehlschlägt, wird `.jpg` verwendet

`img_<####index>.jpg`

Dabei wird der Index des Bildes in der aktiven Download-Sitzung verwendet. Der Index wird für jedes gespeicherte und verarbeitete Bild in Tabulatorfolge erhöht. Die Ausgabe wird Null gepolstert, wie z.B `img_0001.jpg`

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