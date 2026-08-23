import { writeFile } from 'node:fs/promises';

const url = 'https://willi.cernion.de/api/openapi.json';
const response = await fetch(url, { headers: { accept: 'application/json' } });
if (!response.ok) {
  throw new Error(`OpenAPI fetch failed: ${response.status} ${response.statusText}`);
}
const spec = await response.json();

function sanitizePublicAppAuth(node) {
  if (!node || typeof node !== 'object') return;
  if (node.components?.securitySchemes) {
    delete node.components.securitySchemes.bearerAuth;
  }
  if (Array.isArray(node.security)) {
    node.security = node.security.filter((entry) => !entry || typeof entry !== 'object' || !('bearerAuth' in entry));
    if (node.security.length === 0) node.security = [{ cookieAuth: [] }];
  }
  if (Array.isArray(node.required)) {
    node.required = node.required.filter((name) => name !== 'sessionToken');
  }
  if (node.properties && typeof node.properties === 'object') {
    delete node.properties.sessionToken;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === 'description' && typeof value === 'string') {
      if (value.includes('Authorization: Bearer') || value.includes('sessionToken') || value.includes('Bearer-Token') || value.includes('bearerAuth')) {
        if (value.startsWith('Die REST-API hinter der eigentlichen Anwendung')) {
          node[key] = 'Die REST-API hinter der eigentlichen Anwendung — Login, Fallakten (Klärfälle), Coaching-Chat, Mandanten-/Team-Verwaltung und AVV-Onboarding. Authentifizierung erfolgt über das HttpOnly-Session-Cookie `wm_sid`, das POST /api/auth/verify bzw. POST /api/mandant/switch setzt. Jeder Request-Body muss `Content-Type: application/json` verwenden. Für die read-only, mandantenübergreifende Admin-Sicht auf Token-Basis siehe stattdessen `/api/agent/openapi.json`; das ist ein separater API- und Token-Typ.';
        } else if (value.startsWith('Setzt das Session-Cookie')) {
          node[key] = 'Setzt das Session-Cookie (wm_sid; HttpOnly; SameSite=Strict).';
        } else {
          node[key] = value
            .replace(/Authorization: Bearer <session-token>/g, 'Cookie: wm_sid=<session-token>')
            .replace(/Authorization: Bearer \*\*\*/g, 'Cookie: wm_sid=<session-token>')
            .replace(/sessionToken/g, 'wm_sid')
            .replace(/bearerAuth/g, 'cookieAuth');
        }
      }
    } else {
      sanitizePublicAppAuth(value);
    }
  }
}

sanitizePublicAppAuth(spec);
await writeFile('schemas/willi-cernion-openapi.json', JSON.stringify(spec, null, 2) + '\n');
console.log(`saved ${url} to schemas/willi-cernion-openapi.json`);
