// band/assets/band-site.js
//
// Base comum das páginas públicas da Band (Band Pass, História Viva,
// Experiências Band, confirmação). Tudo SIMULADO de propósito: a Band ainda
// não tem conta própria de checkout, CRM nem Minu, e as contas reais do
// Vasco (HubSpot, Stripe) não podem ser usadas aqui.
//
// O Band Pass é o MESMO do app do fã (/band/apps/playverse): ambos leem e
// gravam a chave "bpx-fan" no localStorage do site. Cada ação vira um evento
// no canal "band-playverse-x", o mesmo que o backoffice escuta — com o
// backoffice aberto em outra aba, compras e resgates aparecem lá ao vivo.
(function () {
const B = window.BAND = {};
const KEY = 'bpx-fan';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.round(n || 0).toLocaleString('pt-BR');
const brl = n => 'R$ ' + (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
B.esc = esc; B.fmt = fmt; B.brl = brl; B.$ = $;
B.TEAMS = { Corinthians: '#f1f1f1', Palmeiras: '#1fa35a', 'São Paulo': '#e53935', Santos: '#9aa6bd', Flamengo: '#c8102e', Vasco: '#222', Outros: '#8b6cff' };
B.LEVELS = [[0, 'Espectador', 0], [500, 'Fã', 5], [1500, 'Superfã', 10], [3000, 'Lenda Band', 20]]; // [xp mínimo, nome, % de desconto nas Experiências]
B.MEDALS = { comentarista: ['🎙️', 'Comentarista'], polemico: ['🔥', 'Polêmico'], artilheiro: ['⚽', 'Artilheiro'], piloto: ['🏁', 'Piloto'], memoria: ['📼', 'Memória viva'], explorador: ['🌐', 'Explorador'] };
B.XP_PER_REAL = 100;
B.MINU = [['📱', 'Recarga de celular', 'Telefonia', 10, null], ['🚗', 'Crédito de corrida por app', 'Transporte', 15, null], ['🍔', 'Vale-delivery', 'Alimentação', 20, 'Brasa Burger'], ['🎬', 'Ingresso de cinema', 'Entretenimento', 25, null], ['🎧', '1 mês de streaming de música', 'Entretenimento', 22, null], ['🛒', 'Vale-supermercado', 'Compras', 30, 'Mercado Vila'], ['⚡', 'Bebida energética', 'Alimentação', 8, 'Pulso Energy']];

/* ---------- Band Pass ---------- */
B.get = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
B.save = f => { try { localStorage.setItem(KEY, JSON.stringify(f)); } catch (e) {} };
B.fan = B.get();
B.level = xp => { let i = 0; B.LEVELS.forEach((l, j) => { if (xp >= l[0]) i = j; }); const nx = B.LEVELS[i + 1]; return { i, name: B.LEVELS[i][1], disc: B.LEVELS[i][2], next: nx ? nx[0] : null, nextName: nx ? nx[1] : null, pct: nx ? Math.min(100, (xp - B.LEVELS[i][0]) / (nx[0] - B.LEVELS[i][0]) * 100) : 100 }; };
B.balance = () => B.fan ? B.fan.xp - (B.fan.spent || 0) : 0;
B.addXP = (n, why) => { if (!B.fan) return; B.fan.xp += n; B.save(B.fan); if (n) B.toast(`+${fmt(n)} XP ${why || ''}`); };
B.medal = id => { if (!B.fan || B.fan.medals.includes(id)) return; B.fan.medals.push(id); B.save(B.fan); const m = B.MEDALS[id]; setTimeout(() => B.toast(`${m[0]} Medalha: ${m[1]}`), 1400); B.emit('medal', null, { id, xp: 0 }); };

/* ---------- eventos para o backoffice ---------- */
let bc = null; try { bc = new BroadcastChannel('band-playverse-x'); } catch (e) {}
B.emit = (type, prog, p, src) => {
  if (!B.fan) return;
  const f = B.fan;
  const ev = { id: Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4), ts: Date.now(), type, prog: prog || null, p: p || {}, fan: { id: f.id, name: f.name, team: f.team, city: f.city, uf: f.uf, region: f.region, birth: f.birth, consent: f.consent }, src: src || 'Site Band', sim: false };
  try { bc && bc.postMessage(ev); } catch (e) {}
};

/* ---------- modo app (dentro do Site do Fã, /band/fan) ----------
   As páginas do fã são abertas pelo Site do Fã, num formato de celular e
   separado do Intelligence Hub interno. Fora dele, quem chega direto por
   /band/pass, /band/historia-viva ou /band/loja é levado ao Site do Fã. */
let inFanShell = false; try { inFanShell = window.top !== window && window.top.location.pathname.indexOf('/band/fan') === 0; } catch (e) {}
B.app = inFanShell || new URLSearchParams(location.search).get('app') === '1';
if (B.app) document.documentElement.classList.add('app-mode');
if (window.top === window && !B.app) {
  const tab = { '/band/pass': 'pass', '/band/pass.html': 'pass', '/band/historia-viva': 'hv', '/band/historia-viva.html': 'hv', '/band/loja': 'loja', '/band/loja.html': 'loja', '/band/sucesso': 'loja', '/band/sucesso.html': 'loja' }[location.pathname];
  if (tab) { location.replace('/band/fan#' + tab); B.redirecting = true; ['top', 'login', 'rewards', 'checkout', 'toast', 'modal', 'close'].forEach(k => B[k] = () => {}); document.documentElement.style.visibility = 'hidden'; return; }
}

/* ---------- topo, rodapé, toast, modal ---------- */
B.top = active => {
  const links = [['/band/pass', 'Band Pass'], ['/band/historia-viva', 'História Viva'], ['/band/loja', 'Experiências Band'], ['/band/apps/playverse/#fa', 'App do fã']];
  $('#top').innerHTML = `<a class="b-logo" href="/band/pass" title="Band"><img src="/band/assets/band-logo.svg" alt="Band"></a><div class="b-brand"><b>BAND <span>PLAYVERSE</span></b><small>Grupo Bandeirantes × Virtual Fans</small></div>
  <nav class="b-nav">${links.map(([h, l]) => `<a href="${h}" class="${active === h ? 'active' : ''}">${l}</a>`).join('')}</nav><span class="b-badge">Ambiente de demonstração · pagamentos simulados</span>`;
  $('#top').className = 'b-top';
  const ft = document.createElement('div'); ft.className = 'b-foot';
  ft.innerHTML = `Demo conceitual — Virtual Fans, by ClubBrain.ai · Grupo Bandeirantes · <a href="/band/os">Painel Band (ClubBrain OS)</a><br>Marcas de patrocinadores fictícias · integrações (pagamento, CRM, Minu) simuladas`;
  document.body.appendChild(ft);
  const t = document.createElement('div'); t.className = 'toast'; t.id = 'toast'; document.body.appendChild(t);
  const ov = document.createElement('div'); ov.className = 'ov'; ov.id = 'ov'; ov.addEventListener('click', e => { if (e.target.id === 'ov') B.close(); }); document.body.appendChild(ov);
};
B.toast = t => { const e = $('#toast'); if (!e) return; e.textContent = t; e.classList.add('on'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('on'), 2200); };
B.modal = html => { $('#ov').innerHTML = `<div class="modal">${html}</div>`; $('#ov').classList.add('on'); };
B.close = () => $('#ov').classList.remove('on');

/* ---------- barra de login (Band Pass) ---------- */
B.login = (el, onChange) => {
  const draw = () => {
    const f = B.fan;
    if (f) {
      const lv = B.level(f.xp);
      el.innerHTML = `<div class="av" style="background:${B.TEAMS[f.team] || '#888'}">${esc(f.name.slice(0, 1).toUpperCase())}</div><div><b>${esc(f.name)} <span class="tier t${lv.i}">${lv.name}</span></b><small>${esc(f.id)} · ${esc(f.team)} · saldo <b style="display:inline;color:var(--gold)">${fmt(B.balance())} XP</b></small></div><span style="flex:1"></span><a class="btn ghost sm" href="/band/apps/playverse/#fa">Jogar no app</a><button class="btn ghost sm" id="bpOut">Sair</button>`;
      el.querySelector('#bpOut').onclick = () => { try { localStorage.removeItem(KEY); } catch (e) {} B.fan = null; draw(); onChange && onChange(); };
    } else {
      el.innerHTML = `<div><b>Entre com seu Band Pass</b><small>O mesmo do app do fã. Ainda não tem? Crie em 10 segundos.</small></div><span style="flex:1"></span>
      <input id="bpNm" placeholder="Apelido" maxlength="20" style="width:130px"><select id="bpTm">${Object.keys(B.TEAMS).map(t => `<option>${t}</option>`).join('')}</select>
      <label><input type="checkbox" id="bpC1"> Aceito os termos (LGPD)</label><label><input type="checkbox" id="bpC2"> Ofertas de patrocinadores</label><button class="btn sm" id="bpGo">Criar Band Pass</button>`;
      el.querySelector('#bpGo').onclick = () => {
        const nm = el.querySelector('#bpNm').value.trim(); if (!nm || !el.querySelector('#bpC1').checked) { B.toast('Informe o apelido e aceite os termos'); return; }
        const mk = el.querySelector('#bpC2').checked;
        B.fan = { id: 'BP-' + Math.floor(30000 + Math.random() * 60000), name: nm, team: el.querySelector('#bpTm').value, city: 'São Paulo', uf: 'SP', region: 'Sudeste', birth: 1990, consent: { participation: true, marketing: mk, personalization: true, push: mk, whatsapp: mk, email: false, date: Date.now(), version: 'v1.3' }, xp: mk ? 50 : 0, spent: 0, medals: [], done: {}, votes: {}, progs: {}, games: {} };
        B.save(B.fan); B.emit('join', null, { xp: mk ? 50 : 0 }, 'Site Band'); B.toast('Band Pass criado!'); draw(); onChange && onChange();
      };
    }
  };
  draw(); B.redrawLogin = draw;
  window.addEventListener('storage', e => { if (e.key === KEY) { B.fan = B.get(); draw(); onChange && onChange(); } });
};

/* ---------- Minu (simulada) ---------- */
B.rewards = el => {
  const draw = () => {
    el.innerHTML = B.MINU.map((c, i) => { const cost = c[3] * B.XP_PER_REAL; return `<div class="rw"><span class="ic">${c[0]}</span><b>${esc(c[1])}</b><small>${esc(c[2])} · R$ ${c[3]} em valor${c[4] ? ' · cortesia ' + esc(c[4]) : ''}</small><span class="cost">${fmt(cost)} XP</span><button class="btn sm" data-rw="${i}" ${B.fan && B.balance() >= cost ? '' : 'disabled'}>${B.fan ? (B.balance() >= cost ? 'Resgatar' : 'XP insuficiente') : 'Entre com o Band Pass'}</button></div>`; }).join('');
  };
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-rw]'); if (!b || !B.fan) return; const c = B.MINU[+b.dataset.rw], cost = c[3] * B.XP_PER_REAL; if (B.balance() < cost) return;
    B.fan.spent = (B.fan.spent || 0) + cost; B.save(B.fan); const code = 'MINU-' + B.fan.id.slice(-4) + '-' + Math.floor(1000 + Math.random() * 9000);
    B.emit('reward', null, { item: c[1], xp: cost, value: c[3], sponsored: !!c[4] });
    B.modal(`<h3>Voucher emitido</h3><div class="voucher"><small>Minu · recompensa instantânea</small><b>${esc(c[1])}</b>${c[4] ? `<small>Cortesia ${esc(c[4])}</small>` : ''}<div class="code">${code}</div></div><p class="note">Também enviado por WhatsApp${B.fan.consent.whatsapp ? '' : ' (ative em Perfil, no app)'}. Integração Minu simulada nesta demo.</p><button class="btn" onclick="BAND.close()">Fechar</button>`);
    draw(); B.redrawLogin && B.redrawLogin();
  });
  draw(); B.redrawRewards = draw;
};

/* ---------- checkout simulado ---------- */
B.checkout = item => {
  if (!B.fan) { B.toast('Entre com o Band Pass (barra no topo)'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  const lv = B.level(B.fan.xp); const disc = item.noDiscount ? 0 : lv.disc; const total = item.price * (1 - disc / 100);
  let method = 'pix';
  B.modal(`<h3>${esc(item.name)}</h3><div class="row"><span>Valor</span><b>${brl(item.price)}</b></div>${disc ? `<div class="row"><span>Desconto ${lv.name} (${disc}%)</span><b style="color:#6ee7a0">− ${brl(item.price - total)}</b></div>` : ''}<div class="row"><span>Total</span><b style="color:var(--gold);font-size:18px">${brl(total)}</b></div><div class="row"><span>Você ganha</span><b>+${fmt(Math.round(total))} XP</b></div>
  <div class="pay"><button class="on" data-m="pix">Pix</button><button data-m="cartao">Cartão</button></div>
  <button class="btn" id="payGo" style="width:100%">Pagar ${brl(total)} (simulado)</button><p class="note">Pagamento simulado: nenhum dado de cartão é coletado e nada é cobrado. Na versão integrada, este passo abre o checkout de um gateway de pagamento em modo de teste.</p>`);
  $('#ov').querySelectorAll('[data-m]').forEach(b => b.onclick = () => { method = b.dataset.m; $('#ov').querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); });
  $('#payGo').onclick = () => {
    const btn = $('#payGo'); btn.disabled = true; btn.textContent = 'Processando…';
    setTimeout(() => {
      const order = { id: 'BND-' + Date.now().toString(36).toUpperCase().slice(-6), item: item.name, kind: item.kind, emoji: item.emoji, price: item.price, disc, total, method, xp: Math.round(total), when: item.when || '', ts: Date.now(), fan: B.fan.name, fanId: B.fan.id };
      B.addXP(order.xp, 'pela compra');
      try { localStorage.setItem('band-last-order', JSON.stringify(order)); } catch (e) {}
      B.emit('purchase', item.prog || null, { item: item.name, value: total, method, order: order.id, xp: order.xp });
      location.href = '/band/sucesso?pedido=' + encodeURIComponent(order.id);
    }, 900);
  };
};
})();
