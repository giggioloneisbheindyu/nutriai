export type AISettings = { endpoint?: string; token: string };
export type AITask = 'plan' | 'photo' | 'chat' | 'recipes';

const MAX_REQUEST_BYTES = 1_500_000;

export async function askAI(_settings: AISettings, task: AITask, payload: unknown): Promise<any> {
  const token = _settings.token.trim();
  if (!token) throw new Error('Inserisci il token personale nelle impostazioni');
  const body = JSON.stringify({ task, payload });
  if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) throw new Error('Richiesta troppo grande');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 55_000);
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body,
      signal: controller.signal,
      cache: 'no-store'
    });
    const result = await response.json().catch(() => ({ error: 'Risposta non valida dal server' }));
    if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : `Errore HTTP ${response.status}`);
    if (!Object.prototype.hasOwnProperty.call(result, 'result')) throw new Error('Risposta AI non valida');
    return result.result;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Tempo massimo per la risposta AI superato');
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function boundedString(value: unknown, max: number, field: string, allowEmpty = true): string {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) throw new Error(`Risposta AI non valida (${field})`);
  return value.trim();
}
function validGrams(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 10_000) throw new Error('Grammatura AI non valida');
  return value;
}

export function validatePlanAI(value: any) {
  if (!value || !Array.isArray(value.meals) || value.meals.length < 1 || value.meals.length > 80) throw new Error('Il modello non ha restituito pasti validi');
  return value.meals.map((meal: any) => {
    if (!meal || !Array.isArray(meal.alternatives) || meal.alternatives.length > 20) throw new Error('Formato alternative non valido');
    return {
      name: boundedString(meal.name, 120, 'pasto', false),
      dayType: boundedString(meal.dayType, 100, 'giornata'),
      notes: boundedString(meal.notes, 1_000, 'note'),
      alternatives: meal.alternatives.map((alternative: any) => {
        if (!Array.isArray(alternative) || alternative.length > 30) throw new Error('Formato ingredienti non valido');
        return alternative.map((item: any) => {
          if (!item) throw new Error('Ingrediente AI non valido');
          if (!['crudo', 'cotto', 'non_specificato'].includes(item.weightState)) throw new Error('Stato ingrediente non valido');
          return {
            name: boundedString(item.name, 150, 'ingrediente', false),
            grams: validGrams(item.grams),
            weightState: item.weightState
          };
        });
      })
    };
  });
}

export function validatePhotoAI(value: any) {
  if (!value || !Array.isArray(value.ingredients) || value.ingredients.length > 30 || !Array.isArray(value.questions) || value.questions.length > 10) throw new Error('Risposta fotografica non valida');
  return {
    ingredients: value.ingredients.map((item: any) => {
      if (!item || item.grams !== null || !['non_specificato', 'crudo', 'cotto'].includes(item.weightState) || !['bassa', 'media', 'alta'].includes(item.confidence)) throw new Error('Stima fotografica non valida');
      return {
        name: boundedString(item.name, 120, 'ingrediente', false),
        grams: null,
        weightState: item.weightState,
        uncertainty: boundedString(item.uncertainty, 500, 'incertezza', false),
        confidence: item.confidence
      };
    }),
    questions: value.questions.map((question: unknown) => boundedString(question, 300, 'domanda', false)),
    summary: boundedString(value.summary, 1_000, 'riepilogo')
  };
}

export async function imageToDataURL(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  const ratio = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.78);
}
