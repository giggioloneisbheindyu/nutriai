import { timingSafeEqual } from 'node:crypto';

const json = (res, status, value) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(value));
};

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Metodo non consentito' });
  }

  const accessToken = process.env.NUTRIAI_ACCESS_TOKEN;
  const authorization = req.headers.authorization || '';
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!accessToken || accessToken.length < 24) return json(res, 503, { error: 'Servizio AI non configurato' });
  if (!supplied || !safeEqual(supplied, accessToken)) return json(res, 401, { error: 'Token personale non valido' });

  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (!contentType.startsWith('application/json')) return json(res, 415, { error: 'È richiesto un body JSON' });

  let body;
  try {
    if (typeof req.body === 'string') body = JSON.parse(req.body);
    else if (Buffer.isBuffer(req.body)) body = JSON.parse(req.body.toString('utf8'));
    else body = req.body;
  } catch {
    return json(res, 400, { error: 'JSON non valido' });
  }
  if (!body || body.task !== 'models' || !body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) {
    return json(res, 400, { error: 'Operazione non valida' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json(res, 503, { error: 'Servizio AI non configurato' });
  const configuredModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!/^[a-zA-Z0-9._-]{1,100}$/.test(configuredModel)) return json(res, 503, { error: 'Modello AI non configurato correttamente' });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      method: 'GET',
      headers: { 'x-goog-api-key': apiKey },
      signal: controller.signal,
      cache: 'no-store'
    });
    if (!upstream.ok) return json(res, 502, { error: 'Impossibile verificare i modelli Gemini' });

    const data = await upstream.json();
    const models = Array.isArray(data?.models)
      ? data.models
        .filter((model) => Array.isArray(model?.supportedGenerationMethods) && model.supportedGenerationMethods.includes('generateContent'))
        .map((model) => typeof model.name === 'string' ? model.name.replace(/^models\//, '') : '')
        .filter((name) => /^[a-zA-Z0-9._-]{1,150}$/.test(name))
        .slice(0, 100)
      : [];
    return json(res, 200, {
      models,
      configuredModel,
      hasMore: typeof data?.nextPageToken === 'string' && data.nextPageToken.length > 0
    });
  } catch (error) {
    if (error?.name === 'AbortError') return json(res, 504, { error: 'Tempo massimo per la verifica dei modelli superato' });
    return json(res, 502, { error: 'Impossibile contattare il servizio Gemini' });
  } finally {
    clearTimeout(timeout);
  }
}
