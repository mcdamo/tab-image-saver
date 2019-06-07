# tab-image-saver [![Addon Version](https://img.shields.io/amo/v/tab-image-saver.svg)](https://addons.mozilla.org/firefox/addon/tab-image-saver/) [![Build Status](https://travis-ci.com/mcdamo/tab-image-saver.svg?branch=master)](https://travis-ci.com/mcdamo/tab-image-saver)

Tab Image Saver ist ein Firefox-Addon, das es einfach macht, Bilder von Browser-Tabs zu speichern, die Sie geöffnet haben.

Download von [Firefox Addons](https://addons.mozilla.org/firefox/addon/tab-image-saver/).

## Funktionen

**Standardmäßig speichert dieses Addon das größte Bild, das in dem aktiven Tab gefunden wurde.**

Sie können steuern, wie dies funktioniert, indem Sie die Addon-Einstellungen unter **Firefox > Add-ons > Erweiterungen > Tab Image Saver > Einstellungen** ändern

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
| name          | URL-Dateiname des Bildes ohne Erweiterung                | dateiname                    |
| xName         | Dateiname des Bildes vom Content-Disposition-Header      | dateiname                    |
| ext           | Bild-URL Erweiterung                                     | .jpg                         |
| xExt          | Erweiterung des Bildes vom Content-Disposition-Header    | .jpg                         |
| xMimeExt      | Erweiterung des Bildes vom Content-Type-Header           | .jpg                         |
| host          | URL-Hostname des Bildes                                  | beispiel.com                 |
| path          | URL-Pfad des Bildes                                      | pfad/zu                      |
| index         | Bildnummer beginnend bei '1', wird für jedes Bild erhöht | 1                            |
| tabTitle      | Titel des Tab's                                          | (JPEG Bild, 500 x 500 Pixel) |
| tabHost       | URL-Hostname des Tab's                                   | beispiel.com                 |
| tabPath       | URL-Pfad des Tab's                                       | pfad/zu                      |
| tabFile       | URL-Dateiname des Tab's ohne Erweiterung                 | dateiname                    |
| tabExt        | URL des Tab's ohne Erweiterung                           | .jpg                         |

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