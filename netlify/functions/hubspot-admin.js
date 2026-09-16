// netlify/functions/hubspot-admin.js
//
// Setup e seed do CRM HubSpot com dado fictício, mas relevante, de
// torcedores do Vasco — nível de sócio, Fan Score, jogador favorito, LTV,
// risco de churn, propensão de upgrade — em vez dos campos padrão de CRM
// de vendas (empresa, cargo) que não dizem nada sobre um torcedor.
//
// A chave HUBSPOT_API_KEY fica só no servidor (variável de ambiente no
// Netlify), nunca exposta no navegador. Chame esta function com:
//   { "action": "setup" } → cria as propriedades customizadas no Contact
//                           (idempotente — roda de novo sem duplicar)
//   { "action": "seed" }  → cria/atualiza os 15 torcedores fictícios
//                           (upsert por e-mail, idempotente também)
//
// Configuração necessária no painel do Netlify:
//   Site settings → Environment variables → HUBSPOT_API_KEY
//   (token de um Private App do HubSpot com escopo crm.objects.contacts.*)

const ALLOWED_ORIGINS = [
  'https://clubbrain.ai',
  'https://www.clubbrain.ai',
  'https://demo.clubbrain.ai',
  'https://demo-clubbrain.netlify.app',
];

function corsHeaders(event) {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
  if (!ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// Propriedades customizadas do Contact — o que de fato importa pra um
// clube, não pra um time de vendas B2B.
const CUSTOM_PROPERTIES = [
  {
    name: 'nivel_socio', label: 'Nível de sócio-torcedor', type: 'enumeration', fieldType: 'select',
    options: [
      { label: 'Básico', value: 'basico' },
      { label: 'Bronze', value: 'bronze' },
      { label: 'Prata', value: 'prata' },
      { label: 'Ouro', value: 'ouro' },
      { label: 'Platina', value: 'platina' },
    ],
  },
  { name: 'fan_score', label: 'Fan Score (0-100)', type: 'number', fieldType: 'number' },
  { name: 'jogador_favorito', label: 'Jogador favorito', type: 'string', fieldType: 'text' },
  { name: 'ltv_torcedor', label: 'LTV do torcedor (R$)', type: 'number', fieldType: 'number' },
  {
    name: 'risco_churn', label: 'Risco de churn', type: 'enumeration', fieldType: 'select',
    options: [
      { label: 'Baixo', value: 'baixo' },
      { label: 'Médio', value: 'medio' },
      { label: 'Alto', value: 'alto' },
    ],
  },
  { name: 'propensao_upgrade', label: 'Propensão de upgrade (%)', type: 'number', fieldType: 'number' },
  { name: 'segmento_torcedor', label: 'Segmento do torcedor', type: 'string', fieldType: 'text' },
  { name: 'socio_desde', label: 'Sócio-torcedor desde', type: 'date', fieldType: 'date' },
  { name: 'time_coracao', label: 'Time do coração', type: 'string', fieldType: 'text' },
];

// 15 torcedores fictícios do Vasco — mesmo estilo já usado em
// FANS_DB_BY_CLUB.vasco no index.html, ampliado. E-mails em domínio
// reservado para documentação/teste (RFC 2606), nunca alcançam ninguém real.
const TORCEDORES_VASCO = [
  { firstname:'Rafael', lastname:'Colina', email:'rafael.colina@vasco-demo.example.com', city:'Rio de Janeiro', state:'RJ',
    nivel_socio:'platina', fan_score:81, jogador_favorito:'Philippe Coutinho', ltv_torcedor:1240, risco_churn:'baixo', propensao_upgrade:66, segmento_torcedor:'Torcedor fiel', socio_desde:'2019-03-01' },
  { firstname:'Fernanda', lastname:'Malta', email:'fernanda.malta@vasco-demo.example.com', city:'Niterói', state:'RJ',
    nivel_socio:'prata', fan_score:37, jogador_favorito:'Pablo Vegetti', ltv_torcedor:260, risco_churn:'alto', propensao_upgrade:21, segmento_torcedor:'Em risco de churn', socio_desde:'2023-07-01' },
  { firstname:'Eduardo', lastname:'Colina', email:'eduardo.colina@vasco-demo.example.com', city:'Rio de Janeiro', state:'RJ',
    nivel_socio:'platina', fan_score:91, jogador_favorito:'Thiago Mendes', ltv_torcedor:4680, risco_churn:'baixo', propensao_upgrade:85, segmento_torcedor:'Top torcedor', socio_desde:'2017-08-01' },
  { firstname:'Camila', lastname:'Cruzmaltina', email:'camila.cruzmaltina@vasco-demo.example.com', city:'São Gonçalo', state:'RJ',
    nivel_socio:'ouro', fan_score:75, jogador_favorito:'Lucas Piton', ltv_torcedor:1920, risco_churn:'baixo', propensao_upgrade:65, segmento_torcedor:'Torcedora fiel', socio_desde:'2021-02-01' },
  { firstname:'Gustavo', lastname:'Januário', email:'gustavo.januario@vasco-demo.example.com', city:'Rio de Janeiro', state:'RJ',
    nivel_socio:'bronze', fan_score:36, jogador_favorito:'—', ltv_torcedor:70, risco_churn:'medio', propensao_upgrade:33, segmento_torcedor:'Sócio novo', socio_desde:'2026-08-01' },
  { firstname:'Marina', lastname:'Vascaína', email:'marina.vascaina@vasco-demo.example.com', city:'Duque de Caxias', state:'RJ',
    nivel_socio:'ouro', fan_score:69, jogador_favorito:'Carlos Cuesta', ltv_torcedor:1580, risco_churn:'baixo', propensao_upgrade:58, segmento_torcedor:'Torcedora fiel', socio_desde:'2020-05-01' },
  { firstname:'Thiago', lastname:'Malta', email:'thiago.malta@vasco-demo.example.com', city:'Rio de Janeiro', state:'RJ',
    nivel_socio:'bronze', fan_score:44, jogador_favorito:'Carlos Andrés Gómez', ltv_torcedor:180, risco_churn:'medio', propensao_upgrade:39, segmento_torcedor:'Sócio novo', socio_desde:'2026-05-01' },
  { firstname:'Larissa', lastname:'Sãojanuário', email:'larissa.saojanuario@vasco-demo.example.com', city:'Nova Iguaçu', state:'RJ',
    nivel_socio:'prata', fan_score:58, jogador_favorito:'Léo Jardim', ltv_torcedor:410, risco_churn:'baixo', propensao_upgrade:47, segmento_torcedor:'Torcedora fiel', socio_desde:'2022-11-01' },
  { firstname:'Bruno', lastname:'Colina', email:'bruno.colina@vasco-demo.example.com', city:'São João de Meriti', state:'RJ',
    nivel_socio:'basico', fan_score:22, jogador_favorito:'—', ltv_torcedor:0, risco_churn:'alto', propensao_upgrade:14, segmento_torcedor:'Identificado, não-sócio' },
  { firstname:'Patrícia', lastname:'Malta', email:'patricia.malta@vasco-demo.example.com', city:'Rio de Janeiro', state:'RJ',
    nivel_socio:'ouro', fan_score:72, jogador_favorito:'Hugo Moura', ltv_torcedor:1340, risco_churn:'baixo', propensao_upgrade:55, segmento_torcedor:'Torcedora fiel', socio_desde:'2021-09-01' },
  { firstname:'Felipe', lastname:'Almirante', email:'felipe.almirante@vasco-demo.example.com', city:'Niterói', state:'RJ',
    nivel_socio:'platina', fan_score:88, jogador_favorito:'Philippe Coutinho', ltv_torcedor:3900, risco_churn:'baixo', propensao_upgrade:78, segmento_torcedor:'Top torcedor', socio_desde:'2018-04-01' },
  { firstname:'Juliana', lastname:'Cruzmaltina', email:'juliana.cruzmaltina@vasco-demo.example.com', city:'Rio de Janeiro', state:'RJ',
    nivel_socio:'bronze', fan_score:41, jogador_favorito:'Paulo Henrique', ltv_torcedor:150, risco_churn:'alto', propensao_upgrade:19, segmento_torcedor:'Em risco de churn', socio_desde:'2024-01-01' },
  { firstname:'Rodrigo', lastname:'Colina', email:'rodrigo.colina@vasco-demo.example.com', city:'Belford Roxo', state:'RJ',
    nivel_socio:'prata', fan_score:63, jogador_favorito:'Lucas Freitas', ltv_torcedor:520, risco_churn:'baixo', propensao_upgrade:50, segmento_torcedor:'Torcedor fiel', socio_desde:'2022-06-01' },
  { firstname:'Ana', lastname:'Sãojanuário', email:'ana.saojanuario@vasco-demo.example.com', city:'Rio de Janeiro', state:'RJ',
    nivel_socio:'basico', fan_score:18, jogador_favorito:'—', ltv_torcedor:0, risco_churn:'alto', propensao_upgrade:11, segmento_torcedor:'Identificado, não-sócio' },
  { firstname:'Diego', lastname:'Malta', email:'diego.malta@vasco-demo.example.com', city:'Rio de Janeiro', state:'RJ',
    nivel_socio:'ouro', fan_score:70, jogador_favorito:'Pablo Vegetti', ltv_torcedor:1210, risco_churn:'baixo', propensao_upgrade:54, segmento_torcedor:'Torcedor fiel', socio_desde:'2020-10-01' },
];

exports.handler = async function (event) {
  const cors = corsHeaders(event);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Método não permitido. Use POST.' }) };
  }

  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'HUBSPOT_API_KEY não configurada no Netlify (Site settings → Environment variables).' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'JSON inválido no corpo da requisição.' }) };
  }

  const hsFetch = (path, opts = {}) => fetch('https://api.hubapi.com' + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
      ...(opts.headers || {}),
    },
  });

  try {
    if (payload.action === 'setup') {
      const results = [];
      for (const prop of CUSTOM_PROPERTIES) {
        const body = {
          name: prop.name,
          label: prop.label,
          type: prop.type,
          fieldType: prop.fieldType,
          groupName: 'contactinformation',
          ...(prop.options ? { options: prop.options } : {}),
        };
        const r = await hsFetch('/crm/v3/properties/contacts', { method: 'POST', body: JSON.stringify(body) });
        const data = await r.json().catch(() => ({}));
        results.push({ name: prop.name, status: r.status, alreadyExists: r.status === 409, detail: data.message || data });
      }
      return { statusCode: 200, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify({ ok: true, results }) };
    }

    if (payload.action === 'seed') {
      const inputs = TORCEDORES_VASCO.map(t => ({
        idProperty: 'email',
        id: t.email,
        properties: {
          firstname: t.firstname,
          lastname: t.lastname,
          email: t.email,
          city: t.city,
          state: t.state,
          nivel_socio: t.nivel_socio,
          fan_score: t.fan_score,
          jogador_favorito: t.jogador_favorito,
          ltv_torcedor: t.ltv_torcedor,
          risco_churn: t.risco_churn,
          propensao_upgrade: t.propensao_upgrade,
          segmento_torcedor: t.segmento_torcedor,
          ...(t.socio_desde ? { socio_desde: t.socio_desde } : {}),
          time_coracao: 'Vasco da Gama',
        },
      }));
      const r = await hsFetch('/crm/v3/objects/contacts/batch/upsert', {
        method: 'POST',
        body: JSON.stringify({ inputs }),
      });
      const data = await r.json();
      return { statusCode: r.status, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify(data) };
    }

    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Campo "action" deve ser "setup" ou "seed".' }) };
  } catch (err) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'Falha ao chamar a API do HubSpot: ' + err.message }) };
  }
};
