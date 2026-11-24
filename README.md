# Werkraum

Das Dashboard besteht aus statischen HTML-, CSS- und JavaScript-Dateien.
Du brauchst keine Installation, keinen Build und keine Datenbank auf dem Server.

## Eigener Webserver

1. Entpacke die ZIP.
2. Lade den gesamten Inhalt in das gewünschte Webverzeichnis hoch. Die Datei
   index.html liegt direkt in diesem Verzeichnis, zusammen mit den zugehörigen
   CSS-, JavaScript- und gegebenenfalls Bilddateien.
3. Öffne die Adresse des Verzeichnisses per HTTPS, etwa
   https://example.com/werkraum/. Zum lokalen Testen geht auch localhost über
   einen lokalen Webserver.

## GitHub Pages

1. Entpacke die gewählte ZIP und lade die enthaltenen Dateien ins Hauptverzeichnis
   deines GitHub-Repositories hoch. Dort muss index.html direkt liegen.
   Übernimm auch die Datei .nojekyll. Je nach Dateimanager ist sie ausgeblendet.
2. Öffne im Repository **Settings → Pages**.
3. Wähle unter **Source** den Eintrag **Deploy from a branch**.
4. Wähle deinen Branch, üblicherweise **main**, und **/(root)**. Klicke **Save**.
5. Öffne anschließend die von GitHub unter **Pages** angezeigte Adresse.

[GitHub-Anleitung zur Veröffentlichung aus einem Branch](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Apps und Einstellungen an die neue Adresse übertragen

Die ZIP enthält den Dashboard-Code. Deine importierten Apps, Ordner, Links
und Einstellungen liegen im Browser. Öffne in der bisherigen Version
**Einstellungen → Backup exportieren**. Öffne dann die neue Adresse und
wähle **Einstellungen → Backup importieren**.

Verwende die Backup-Datei zum Import im Dashboard und behalte sie bei dir.
Das selbst gehostete Dashboard hat keine eingebaute Anmeldung. Falls die
Adresse privat bleiben soll, regle den Zugriff über dein Hosting.

## Logos lokal einblenden

Werkraum startet neutral. Wähle **Einstellungen → Logos importieren** und
öffne eine Werkraum-Logo-Datei. Das Logo erscheint in der ausgeklappten
Seitenleiste, das Tab-Symbol in Schwarz-Weiß. **Logos entfernen** aktiviert
wieder die neutrale Darstellung.

Die importierten Logos bleiben im Browser und sind vom Werkraum-Backup getrennt.
Bewahre die Logo-Datei außerhalb des Webverzeichnisses auf.

Die Logo-Datei ist ein JSON-Objekt mit `format: "werkraum-branding"`, `version: 1`,
`name` als Alternativtext und `logoPng` als Base64-kodiertes PNG. Optional können
`tabPng` als separates PNG und `tabCrop` mit `x`, `y`, `width` und `height` in
Bildpixeln gesetzt werden. Ein PNG darf bis zu 512 KiB groß sein und bis zu
2048 Pixel pro Seite haben.
