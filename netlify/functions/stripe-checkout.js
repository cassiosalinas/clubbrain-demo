// netlify/functions/stripe-checkout.js
//
// Cria uma sessão real de checkout do Stripe (modo teste — sk_test_..., sem
// dinheiro real envolvido) para o catálogo do ShopVasco (9 produtos reais do
// clube) e para os ingressos dos próximos jogos reais em São Januário — com
// o preço do ingresso decidido pelo NÍVEL DE SÓCIO de verdade, consultado no
// HubSpot no servidor (nunca confiado do navegador). Devolve a URL hospedada
// pelo próprio Stripe pra onde o navegador redireciona — checkout de
// verdade, cadeado de verdade, cartão de teste (4242 4242 4242 4242,
// qualquer validade futura/CVC).
//
// Chame esta function com:
//   { "type": "produto", "id": "camisa1", "fanEmail": "..." }
//   { "type": "ingresso", "id": "vascocoritiba", "fanEmail": "..." }
//
// Configuração necessária no painel do Netlify:
//   Site settings → Environment variables → STRIPE_SECRET_KEY
//   (chave secreta de teste do Stripe, Developers → API keys, sk_test_...)
//   HUBSPOT_API_KEY também é usada aqui (só leitura) pra decidir o preço do
//   ingresso pelo nível de sócio real do torcedor.

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

// Catálogo real do ShopVasco (mesmos 9 itens do PRODUCTS_BY_CLUB.vasco no
// index.html) — preço fica no servidor de propósito, não é manipulável pelo
// navegador. Valores em centavos.
const MERCH = {
  camisa1: { name: 'Camisa I Vasco da Gama 2026', category: 'Camisas', amount: 29990 },
  camisa2: { name: 'Camisa II Vasco da Gama 2026', category: 'Camisas', amount: 29990 },
  camisaretro: { name: 'Camisa Retrô Cruz de Malta', category: 'Camisas', amount: 32990 },
  camisainfantil: { name: 'Camisa Infantil Vasco da Gama', category: 'Infantil', amount: 15990 },
  moletom: { name: 'Moletom oficial Gigante da Colina', category: 'Vestuário', amount: 16990 },
  bone: { name: 'Boné oficial Cruzmaltino', category: 'Acessórios', amount: 8990 },
  cachecol: { name: 'Cachecol oficial Vasco da Gama', category: 'Acessórios', amount: 4490 },
  caneca: { name: 'Caneca oficial Vasco da Gama', category: 'Colecionáveis', amount: 3490 },
  miniatura: { name: 'Miniatura de São Januário', category: 'Colecionáveis', amount: 6990 },
};

// Próximos jogos reais do Vasco em São Januário (ver EVENTS_BY_CLUB.vasco no
// index.html — mesma pesquisa). Setor Norte, preço-base de não-sócio.
const MATCHES = {
  vascocoritiba: { name: 'Vasco x Coritiba — Brasileirão (28ª rodada)', date: '19 set 2026' },
  vascoremo: { name: 'Vasco x Remo — Brasileirão (30ª rodada)', date: '10 out 2026' },
};

// Preço do ingresso Setor Norte por nível de sócio real (em centavos) — é
// isso que o programa de sócio-torcedor faz de verdade: quem paga mais de
// mensalidade paga menos no ingresso.
const TIER_TICKET_PRICE = { basico: 8000, bronze: 6500, prata: 5000, ouro: 3000, platina: 1500 };

async function lookupTier(fanEmail) {
  const hubspotKey = process.env.HUBSPOT_API_KEY;
  if (!hubspotKey || !fanEmail) return 'basico';
  try {
    const r = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/' + encodeURIComponent(fanEmail) + '?idProperty=email&properties=nivel_socio,e_socio_torcedor', {
      headers: { Authorization: 'Bearer ' + hubspotKey },
    });
    if (!r.ok) return 'basico';
    const data = await r.json();
    const p = data.properties || {};
    if (p.e_socio_torcedor === 'sim' && TIER_TICKET_PRICE[p.nivel_socio]) return p.nivel_socio;
    return 'basico';
  } catch (e) {
    return 'basico';
  }
}

// Stripe espera application/x-www-form-urlencoded com notação de colchetes
// pra objetos/arrays aninhados (ex.: line_items[0][price_data][currency]) —
// não é JSON. Esse helper achata um objeto JS nesse formato.
function toFormBody(obj, prefix) {
  const parts = [];
  for (const key in obj) {
    const value = obj[key];
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      parts.push(toFormBody(value, fullKey));
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (v && typeof v === 'object') parts.push(toFormBody(v, `${fullKey}[${i}]`));
        else parts.push(`${encodeURIComponent(fullKey + '[' + i + ']')}=${encodeURIComponent(v)}`);
      });
    } else {
      parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(value)}`);
    }
  }
  return parts.join('&');
}

exports.handler = async function (event) {
  const cors = corsHeaders(event);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Método não permitido. Use POST.' }) };
  }

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'STRIPE_SECRET_KEY não configurada no Netlify (Site settings → Environment variables).' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'JSON inválido no corpo da requisição.' }) };
  }

  if (!payload.fanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.fanEmail)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Campo "fanEmail" obrigatório e precisa ser um e-mail válido.' }) };
  }

  let productName, amount, category, matchDate, tier;
  if (payload.type === 'produto') {
    const item = MERCH[payload.id];
    if (!item) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Produto inválido.' }) };
    productName = item.name;
    amount = item.amount;
    category = item.category;
  } else if (payload.type === 'ingresso') {
    const match = MATCHES[payload.id];
    if (!match) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Jogo inválido.' }) };
    tier = await lookupTier(payload.fanEmail);
    amount = TIER_TICKET_PRICE[tier];
    productName = match.name + ' — Setor Norte, São Januário (' + match.date + ')';
    matchDate = match.date;
  } else {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Campo "type" deve ser "produto" ou "ingresso".' }) };
  }

  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || 'https://demo.clubbrain.ai';
  const cancelPage = payload.type === 'ingresso' ? '/vasco/socio' : '/vasco/loja';

  const body = toFormBody({
    mode: 'payment',
    line_items: [{
      price_data: { currency: 'brl', product_data: { name: productName }, unit_amount: amount },
      quantity: 1,
    }],
    success_url: origin + '/vasco/sucesso?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: origin + cancelPage,
    customer_email: payload.fanEmail,
    metadata: {
      fan_email: payload.fanEmail,
      kind: payload.type,
      item_id: payload.id,
      item_name: productName,
      category: category || '',
      tier: tier || '',
    },
  });

  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Bearer ' + apiKey,
      },
      body,
    });
    const data = await r.json();
    if (!r.ok) {
      return { statusCode: r.status, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify({ error: (data.error && data.error.message) || 'Erro ao criar sessão no Stripe.' }) };
    }
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify({ ok: true, url: data.url, tier: tier || null, amount }) };
  } catch (err) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'Falha ao chamar a API do Stripe: ' + err.message }) };
  }
};
