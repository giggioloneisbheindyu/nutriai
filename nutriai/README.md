# NutriAI — PWA personale local-first con AI online

## Funzioni
- PDF.js e OCR locale; bozza di pasti/alternative con revisione, opzionalmente interpretazione Gemini tramite Worker.
- Diario IndexedDB, registrazioni manuali e fotografiche, modifica/cancellazione, pasti associati multipli.
- AI fotografica che identifica ingredienti e domande di chiarimento; **non inventa valori nutrizionali**. Verifica valori con Open Food Facts o inserimento documentato.
- Ricette AI, lista della spesa, chat contestuale con piano e diario.
- Preferenze/allergie, tema, esportazione CSV, stampa PDF, backup JSON con immagini e PDF, ripristino.
- PWA installabile e navigazione mobile.

## Avvio
`npm install && npm run dev` — `npm run build` per generare `dist` e pubblicarla su HTTPS (Cloudflare Pages o simile). Il progetto non richiede database remoto né login.

## AI online: Cloudflare Worker (separato dalla PWA)
1. Crea una chiave Gemini su https://aistudio.google.com/apikey (soggetta a quote gratuite e condizioni del provider).
2. Installa Wrangler (`npx wrangler`) ed esegui nella cartella `worker`: `npx wrangler secret put GEMINI_API_KEY` e `npx wrangler secret put ACCESS_TOKEN` (scegli token personale casuale lungo).
3. Configura `APP_ORIGIN` come origine esatta HTTPS del sito NutriAI e facoltativamente `GEMINI_MODEL` (default `gemini-2.5-flash`) tra le variabili Worker. Esegui `npx wrangler deploy` nella cartella worker.
4. In NutriAI > Altro inserisci URL del Worker e token. L'endpoint viene salvato in IndexedDB, il token solo nella memoria della pagina e va reinserito dopo il riavvio.
5. **Non inserire la chiave Gemini nel frontend.** Il Worker ha autorizzazione token e controllo origine; per uso pubblico servirebbero ulteriori rate limit server-side, autenticazione robusta e verifica privacy.

## Sicurezza, accuratezza e limiti
- I dati del diario e il PDF sono salvati localmente senza cifratura applicativa; l'AI online riceve foto, testo e contesto inviati volontariamente. Verifica i termini privacy del provider: i contenuti del piano possono essere dati sanitari sensibili.
- Nessun calcolo calorico viene inventato dall'AI. Ingredienti fotografici hanno nutrienti null finché non vengono verificati; la somma rimane null se manca almeno un dato.
- Non sommare alternative: nel modello ogni alternativa è un gruppo distinto.
- Le ricette AI non cambiano il piano e richiedono verifica umana; le stime fotografiche non sono misurazioni.
- Open Food Facts è un database collaborativo, non sempre completo; i dati nutrizionali e le etichette vanno verificati.
- La quota gratuita Gemini e il modello selezionato possono cambiare, essere indisponibili o richiedere un piano diverso. In quel caso la modalità manuale continua a funzionare.
- **Non testato end-to-end in questa consegna**: l'installazione delle dipendenze è scaduta nell'ambiente. Eseguire `npm run build` e test su iPhone prima di considerare il progetto pronto per l'uso.
- Backup JSON esportato **non cifrato**: conservarlo in luogo privato. Non usare la PWA come unico archivio.
