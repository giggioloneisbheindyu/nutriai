# NutriAI — PWA personale local-first con AI online

## Funzioni
- PDF.js e OCR locale; estrazione AI di pasti e alternative come bozza da revisionare manualmente.
- Diario IndexedDB, registrazioni manuali e fotografiche, modifica/cancellazione e pasti associati.
- Riconoscimento fotografico prudente: quantità non verificabili restano vuote e sono segnalate come incerte.
- Ricette AI, lista della spesa, chat contestuale con piano e diario.
- Preferenze/allergie, tema, esportazione CSV, stampa PDF, backup JSON e ripristino.
- PWA installabile e navigazione mobile. Nessun database remoto: il diario resta in IndexedDB sul dispositivo.

## Sviluppo
Dalla cartella `nutriai/`:

```sh
npm install
npm run dev
npm run build
```

La funzione serverless `/api/ai` viene eseguita da Vercel. In sviluppo locale, per provarla serve `vercel dev` (oltre alle variabili d'ambiente); il server Vite da solo serve solo il frontend.

## Pubblicazione su Vercel
La Root Directory del progetto Vercel deve essere `nutriai` (abilita l'installazione delle dipendenze in tale directory). `vercel.json` imposta build Vite, output statico `dist` e funzione serverless Node `/api/ai`; Vercel serve insieme PWA e funzione senza Worker o rewrites esterni.

In Vercel → **Project Settings → Environment Variables**, imposta queste variabili per gli ambienti desiderati (Production e, se necessario, Preview/Development):

| Variabile | Necessaria | Descrizione |
| --- | --- | --- |
| `GEMINI_API_KEY` | Sì | Chiave server Gemini creata in Google AI Studio. Mai usare una variabile `VITE_` o inserirla nel frontend. |
| `NUTRIAI_ACCESS_TOKEN` | Sì | Token personale casuale, condiviso con l'utente dell'app e di almeno 24 caratteri. Generane uno localmente, ad esempio con `openssl rand -hex 32`, e inseriscilo solo nelle impostazioni del progetto Vercel e nel campo token dell'app. |
| `GEMINI_MODEL` | No | Modello Gemini selezionato. Default `gemini-2.5-flash`; verifica disponibilità e quote del modello nel tuo account Google AI Studio. |

Dopo aver salvato o modificato le variabili, esegui un nuovo deployment. Non committare file `.env` con valori reali. Il token Gemini non viene mai inviato al browser. Il token personale viene richiesto nell'app e mantenuto solo in memoria: non viene scritto in IndexedDB, localStorage o nei backup; va reinserito dopo aver riaperto la pagina.

## Protezioni e limiti
L'endpoint richiede `NUTRIAI_ACCESS_TOKEN` con confronto a tempo costante, accetta solo POST JSON, limita la dimensione delle richieste, convalida rigorosamente task e risultati, applica timeout e un limite di frequenza per IP nell'istanza serverless. Il limite in memoria è best-effort e non è condiviso fra istanze o deployment: se il progetto è esposto a più utenti, configura anche le regole di rate limiting/WAF disponibili nel progetto Vercel. CORS non è usato come autenticazione né considerato una protezione sufficiente.

Non vengono registrati nel codice dell'app foto, piani, token o dati personali. Le richieste AI inviate volontariamente (testo del piano, contesto del diario o foto) sono trasmesse a Google Gemini: consulta le condizioni e la privacy del provider. Non inviare dati che non desideri condividere.

## Accuratezza e dati locali
- L'AI non crea valori nutrizionali. Questi restano vuoti fino a verifica su una fonte o inserimento manuale documentato.
- Non sommare alternative: nel piano ogni alternativa è un gruppo distinto.
- Grammature estratte dal PDF sono riportate solo se presenti nel testo. Le quantità degli alimenti nelle fotografie non sono misurabili e non sono stimate.
- I risultati AI sono proposte da controllare; la revisione manuale del piano e degli ingredienti rimane necessaria.
- Le ricette suggerite non modificano il piano. I dati alimentari esterni possono essere incompleti e devono essere verificati.
- Il diario, le preferenze e i PDF restano in IndexedDB sul dispositivo; i dati locali non hanno cifratura applicativa. Backup JSON non cifrato: conservalo privatamente.
- Le quote gratuite e la disponibilità dei modelli Gemini possono cambiare; la modalità manuale resta disponibile.
