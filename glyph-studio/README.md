# GLYPH — ASCII Studio

Studio di conversione immagini → ASCII, ANSI, Unicode, Block, Braille e Mosaic Art. Applicazione statica in italiano, senza librerie di runtime, backend, analytics, CDN o servizi obbligatori. Le immagini vengono elaborate sul dispositivo e non vengono inviate al server che ospita il sito.

## Avvio

È sufficiente Node.js 20 o successivo; non occorre installare dipendenze.

```sh
npm run dev
# http://127.0.0.1:4173
npm test
npm run build
```

`dist/` è già il sito completo. Il comando build ne verifica la sintassi e gli asset. Aprire tramite HTTP/HTTPS: i moduli ES e i Web Worker non funzionano facendo doppio clic sul file HTML con `file://`.

## Funzionalità

- File picker e trascinamento di PNG, JPEG e WebP; orientamento EXIF tramite decoder nativo; massimo 8192 pixel per lato, 100 MB per file.
- Sorgente mantenuta in memoria, riduzione opzionale a 4096 pixel per accelerare il campionamento.
- Anteprima con massimo 160 colonne, debounce di 85 ms, annullamento delle richieste obsolete, zoom 25–800%, confronto prima/dopo e anteprima originale.
- Griglia finale 16–800 colonne e 8–600 righe. Proporzioni automatiche disattivabili; font, rapporto della cella, spaziatura e campionamento X/Y indipendenti.
- Sequenza di densità libera, anche con un singolo simbolo o simboli Unicode. Preset Classic, Terminal, Block, Unicode Dense, Minimal, Braille e Custom.
- Luminosità Rec. 709, Sobel orientato, contrasto adattivo locale e tone mapping logaritmico HDR Enhancement. Quest’ultimo migliora immagini SDR ad alto contrasto; non decodifica formati HDR/RAW.
- Dithering Floyd–Steinberg, Atkinson e Bayer 4 × 4; esposizione, luminosità, contrasto, gamma, saturazione, nitidezza, soglia e riduzione rumore.
- Colore medio originale, monocromatico, palette median-cut di 2/4/8/16/32 colori e palette HEX personalizzate fino a 32 colori. Sei atmosfere terminal.
- Braille con maschera spaziale reale di otto punti; Mosaic con quattro quadranti reali. ANSI Truecolor con export `.ans` aggiuntivo.
- Distribuzione delle tonalità, numero di simboli usati, analisi automatica con applicazione di risoluzione, densità, algoritmo, colore e dimensione della palette suggeriti.
- Rendering finale con supersampling 1×/2×/3×, anti-aliasing disattivabile, stretching dei percentili di contrasto e filtro leggero contro gli artefatti.
- TXT, HTML, SVG, PNG, JPG e PDF; copia ASCII; font WOFF/WOFF2 incorporabile negli export vettoriali/HTML.
- Cronologia IndexedDB con 8 immagini e 20 preset, import/export dei preset JSON, preferenze e tema in localStorage. Tema scuro, chiaro o automatico.

## Architettura

| File | Responsabilità |
| --- | --- |
| `dist/js/app.js` | Stato UI, caricamento, coordinamento e annullamento, progressi, clipboard |
| `dist/js/engine.js` | Algoritmi puri, filtri, quantizzazione, analisi e costruzione dei glifi |
| `dist/js/worker.js` | Conversioni fuori dal thread dell’interfaccia |
| `dist/js/render.js` | Misure delle celle, disegno Canvas a blocchi, limiti raster |
| `dist/js/exports.js` | Serializzazione sicura, raster e PDF binario con JPEG incorporato |
| `dist/js/controls.js` | Controlli accessibili e gruppi di parametri |
| `dist/js/config.js` | Default, preset, limiti e validazione dei preset importati |
| `dist/js/storage.js` | Archivio IndexedDB e preferenze locali |

Il browser decodifica l’immagine una volta. Canvas la campiona alla dimensione necessaria, poi trasferisce il buffer RGBA al worker senza copiarlo. Filtri, palette e conversione si svolgono nel worker; il rendering Canvas sul thread principale cede periodicamente il controllo all’interfaccia. I messaggi di progresso e un identificatore di richiesta impediscono ai risultati obsoleti di sovrascrivere quelli aggiornati.

## Esportazioni e limiti pratici

TXT è testo Unicode UTF-8 senza colori. ANSI contiene sequenze di escape Truecolor e richiede un terminale compatibile. HTML e SVG includono colori, sfondo e nome del font, non richiedono script o risorse esterne. Un font incorporato via Qualità rende il font disponibile anche su altri dispositivi; senza incorporamento si usa il font installato o il fallback monospace. I file del font non sono salvati nella cronologia.

Il PDF è una singola pagina proporzionata alla creazione, con immagine JPEG ad alta qualità incorporata. Il testo nel PDF non è selezionabile. PNG/JPG/PDF adattano il supersampling per restare entro 8192 pixel per lato e 24 megapixel. La griglia testuale resta completa anche quando il raster viene ridotto. Braille/Mosaic usano una soglia di 128 se il controllo soglia è a zero. I pixel trasparenti vengono campionati su nero.

La cronologia conserva copie ridotte a 1400 pixel, non i file originali: un ripristino è adatto a riprendere gli esperimenti, ma per la qualità massima ricaricare l’originale. La disponibilità dello storage dipende dal browser; in modalità privata la conversione e l’export continuano a funzionare anche se il salvataggio locale non è consentito. La memoria disponibile può limitare le immagini 8K sui dispositivi mobili.

## Deploy

Tutti i percorsi sono relativi: il sito funziona anche in una sottocartella come `nomeutente.github.io/glyph-studio/`.

### GitHub Pages

1. Pubblica **il contenuto di questa cartella** come root di un repository GitHub, sul branch `main`.
2. In **Settings → Pages → Source** seleziona **GitHub Actions**.
3. Il workflow `.github/workflows/pages.yml` esegue test, valida e pubblica `dist/`.

Se incorpori il progetto in un repository più ampio, aggiungi `working-directory: glyph-studio` ai comandi e usa `glyph-studio/dist` come percorso dell’artifact.

### Netlify / Vercel / hosting statico

- Netlify: usa questa cartella come base; `netlify.toml` imposta `dist` come publish directory.
- Vercel: importa questa cartella; `vercel.json` configura il controllo build e la directory di output.
- Altro hosting: carica direttamente il contenuto di `dist/` e servi `.js` con MIME JavaScript. Usa HTTPS per la clipboard; su localhost è consentita in contesto sicuro.

## Verifica

`npm test` verifica mapping di luminanza, inversione, trasparenza, sequenze a singolo carattere, quattro modalità di dithering, Braille e Mosaic spaziali, palette, filtri, annullamento, analisi automatica, dimensioni, input non attendibili e sicurezza degli export. Verifica inoltre gli offset binari della cross reference PDF.

Durante lo sviluppo è stato verificato il flusso UI in un browser Chromium, compresa una PNG di 7680 × 4320 pixel. Firefox e Safari usano API standard supportate e un fallback di decodifica tramite `Image`; non sono stati testati direttamente in questa sessione. Non è garantito un tempo di conversione fisso: sorgente, griglia, modalità e dispositivo incidono sulle prestazioni.

L’illustrazione alpina demo e il marchio sono asset SVG originali inclusi nel progetto.
