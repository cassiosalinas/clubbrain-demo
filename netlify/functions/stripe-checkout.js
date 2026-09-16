// netlify/functions/stripe-checkout.js
//
// Cria uma sessão real de checkout do Stripe (modo teste — sk_test_..., sem
// dinheiro real envolvido) para os dois produtos do storytelling "jornada do
// torcedor": camisa (Loja do Vasco) e ingresso (Área do Sócio Torcedor).
// Devolve a URL hospedada pelo próprio Stripe pra onde o navegador redireciona
// — checkout de verdade, cadeado de verdade, cartão de teste (4242 4242 4242
// 4242, qualquer validade futura/CVC).
//
// A chave STRIPE_SECRET_KEY fica só no servidor (variável de ambiente no
// Netlify), nunca exposta no navegador. Chame esta function com:
//   { "product": "camisa" | "ingresso", "fanEmail": "rafael.colina@vasco-demo.example.com" }
//
// Configuração necessária no painel do Netlify:
//   Site settings → Environment variables → STRIPE_SECRET_KEY
//   (chave secreta de teste do Stripe, Developers → API keys, sk_test_...)

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

// Preço fica no servidor de propósito — não dá pra manipular pelo navegador.
const PRODUCTS = {
  camisa: { name: 'Camisa Vasco da Gama 2026 — Edição 125 anos', amount: 29900 },
  ingresso: { name: 'Ingresso — Vasco x Flamengo, Setor Norte (São Januário)', amount: 8000 },
};

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

  const product = PRODUCTS[payload.product];
  if (!product) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Campo "product" deve ser "camisa" ou "ingresso".' }) };
  }
  if (!payload.fanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.fanEmail)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Campo "fanEmail" obrigatório e precisa ser um e-mail válido.' }) };
  }

  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || 'https://demo.clubbrain.ai';
  const cancelPage = payload.product === 'ingresso' ? 'socio.html' : 'loja.html';

  const body = toFormBody({
    mode: 'payment',
    line_items: [{
      price_data: { currency: 'brl', product_data: { name: product.name }, unit_amount: product.amount },
      quantity: 1,
    }],
    success_url: origin + '/sucesso.html?session_id={CHECKOUT_SESSION_ID}&produto=' + payload.product,
    cancel_url: origin + '/' + cancelPage,
    customer_email: payload.fanEmail,
    metadata: { fan_email: payload.fanEmail, product: payload.product },
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
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify({ ok: true, url: data.url }) };
  } catch (err) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'Falha ao chamar a API do Stripe: ' + err.message }) };
  }
};
