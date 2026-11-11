const SETTINGS_TITLE = 'AI online gratuita';

function addModelsButton() {
  const heading = [...document.querySelectorAll('h2')].find((item) => item.textContent?.trim() === SETTINGS_TITLE);
  const card = heading?.closest('.card');
  if (!card || card.querySelector('[data-gemini-model-check]')) return;

  const tokenLabel = [...card.querySelectorAll('label')].find((item) => item.textContent?.trim().startsWith('Token personale'));
  const tokenInput = tokenLabel?.querySelector('input');
  if (!tokenInput) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary';
  button.textContent = 'Verifica modelli Gemini';
  button.dataset.geminiModelCheck = 'true';
  const output = document.createElement('div');
  output.className = 'card soft';
  output.setAttribute('aria-live', 'polite');
  output.hidden = true;
  tokenLabel.insertAdjacentElement('afterend', button);
  button.insertAdjacentElement('afterend', output);

  button.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    if (!token) {
      output.hidden = false;
      output.textContent = 'Inserisci il token personale nelle impostazioni.';
      return;
    }

    button.disabled = true;
    output.hidden = false;
    output.textContent = 'Verifica dei modelli Gemini…';
    try {
      const response = await fetch('/api/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ task: 'models', payload: {} }),
        cache: 'no-store'
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : `Errore HTTP ${response.status}`);
      if (!Array.isArray(result.models) || typeof result.configuredModel !== 'string' || typeof result.hasMore !== 'boolean') {
        throw new Error('Risposta non valida dal server');
      }

      output.replaceChildren();
      const configured = document.createElement('p');
      configured.textContent = `Modello configurato: ${result.configuredModel}`;
      output.append(configured);
      const listTitle = document.createElement('strong');
      listTitle.textContent = 'Modelli disponibili per generateContent';
      output.append(listTitle);
      const list = document.createElement('ul');
      for (const model of result.models) {
        if (typeof model !== 'string') continue;
        const item = document.createElement('li');
        item.textContent = model;
        list.append(item);
      }
      if (!list.childElementCount) {
        const item = document.createElement('li');
        item.textContent = 'Nessun modello disponibile restituito.';
        list.append(item);
      }
      output.append(list);
      if (result.hasMore) {
        const more = document.createElement('p');
        more.textContent = 'Sono disponibili altre pagine di risultati.';
        output.append(more);
      }
    } catch (error) {
      output.textContent = error instanceof Error ? error.message : 'Verifica dei modelli non riuscita.';
    } finally {
      button.disabled = false;
    }
  });
}

const observer = new MutationObserver(addModelsButton);
observer.observe(document.body, { childList: true, subtree: true });
addModelsButton();
