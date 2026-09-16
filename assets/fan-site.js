// assets/fan-site.js
//
// "Login" compartilhado do ShopVasco / Sócio Torcedor — sem senha, é uma
// consulta real ao contato no HubSpot por e-mail ({action:'lookup_fan'} em
// hubspot-admin.js), usada só pra saudar o torcedor e mostrar o preço
// estimado do ingresso por nível de sócio. O preço final é sempre recalculado
// no servidor (stripe-checkout.js) — nada aqui é fonte de verdade de preço.

const FAN_BACKEND = '/.netlify/functions/hubspot-admin';
const TIER_LABELS = { basico: 'Não-sócio', bronze: 'Sócio Bronze', prata: 'Sócio Prata', ouro: 'Sócio Ouro', platina: 'Sócio Platina' };
const TIER_TICKET_PRICE_BRL = { basico: 80, bronze: 65, prata: 50, ouro: 30, platina: 15 };

let currentFan = null;

function getStoredFanEmail() {
  try { return localStorage.getItem('vasco_fan_email') || ''; } catch (e) { return ''; }
}
function setStoredFanEmail(email) {
  try { email ? localStorage.setItem('vasco_fan_email', email) : localStorage.removeItem('vasco_fan_email'); } catch (e) {}
}
function fanTier() {
  if (!currentFan || !currentFan.found) return null;
  return currentFan.eSocioTorcedor === 'sim' ? currentFan.nivelSocio : 'basico';
}

async function lookupFan(email) {
  const r = await fetch(FAN_BACKEND, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'lookup_fan', email }),
  });
  const d = await r.json();
  if (!r.ok || !d.ok) throw new Error(d.error || 'Falha ao consultar o torcedor no HubSpot.');
  return d;
}

function renderLoginBar() {
  const bar = document.getElementById('login-bar');
  if (!bar) return;
  if (currentFan && currentFan.found) {
    const tier = fanTier();
    const initials = ((currentFan.firstname || '?')[0] + ((currentFan.lastname || '')[0] || '')).toUpperCase();
    bar.innerHTML = `
      <div class="fan-avatar">${initials}</div>
      <div>
        <div class="login-name">${currentFan.firstname || ''} ${currentFan.lastname || ''}</div>
        <div class="login-sub"><span class="tier-pill tier-${tier}">${TIER_LABELS[tier]}</span> · ${(currentFan.pontosLoyalty || 0).toLocaleString('pt-BR')} pontos de fidelidade</div>
      </div>
      <span class="logout-link" onclick="fanLogout()">Sair</span>`;
  } else {
    bar.innerHTML = `
      <div class="login-form">
        <input type="email" id="login-email" placeholder="seuemail@exemplo.com (torcedor cadastrado no clube)" value="${getStoredFanEmail()}">
        <button class="login-btn" id="login-btn" onclick="fanLogin()">Entrar</button>
      </div>`;
  }
}

async function fanLogin() {
  const input = document.getElementById('login-email');
  const btn = document.getElementById('login-btn');
  const email = (input.value || '').trim();
  if (!email) return;
  btn.disabled = true;
  btn.textContent = 'Consultando…';
  try {
    const d = await lookupFan(email);
    if (!d.found) {
      btn.disabled = false;
      btn.textContent = 'Entrar';
      alert('Torcedor não encontrado no CRM do clube. Tente rafael.colina@vasco-demo.example.com ou outro e-mail da base.');
      return;
    }
    currentFan = d;
    setStoredFanEmail(email);
    renderLoginBar();
    if (typeof onFanLogin === 'function') onFanLogin();
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Entrar';
    alert(e.message);
  }
}

function fanLogout() {
  currentFan = null;
  setStoredFanEmail('');
  renderLoginBar();
  if (typeof onFanLogout === 'function') onFanLogout();
}

async function initFanLogin() {
  renderLoginBar();
  const stored = getStoredFanEmail();
  if (!stored) return;
  try {
    const d = await lookupFan(stored);
    if (d.found) {
      currentFan = d;
      renderLoginBar();
      if (typeof onFanLogin === 'function') onFanLogin();
    }
  } catch (e) { /* silencioso — usuário só vê a barra de login vazia */ }
}
