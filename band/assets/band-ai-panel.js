/* band/assets/band-ai-panel.js
 *
 * Painel fixo do Agente Band, na coluna da direita do Intelligence Hub.
 * Aparece sempre que o tenant é o Grupo Bandeirantes (login por papel ou admin).
 *
 * - Conversa contextual: o agente sabe o papel (CEO, Op, MKT, IT), a tela aberta
 *   e os dados que essa tela tem agora (lê o contexto do iframe da página:
 *   osContext() no BandBrain OS, BO.ctx() no backoffice do Playverse, BP no
 *   início do papel e no site do fã).
 * - Depois de cada resposta vêm cartões de insight (impacto, número-chave, ação
 *   e atalho para a página certa) e perguntas de continuação.
 * - Aba Insights: tudo que o agente encontrou na sessão, com fixar e copiar.
 *
 * Usa a mesma function de IA do painel (CHAT_BACKEND_URL) e o contexto da Band
 * de buildClubAiContext(); depende de globais do index.html (currentClubId,
 * BAND_ROLES, BAND_SITE...). Sem a function, mostra um aviso.
 */
(function () {
  const W = 392;
  const $ = s => document.querySelector(s);
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const md = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').split(/\n/).map(l => /^\s*[-•]\s+/.test(l) ? `<li>${l.replace(/^\s*[-•]\s+/, '')}</li>` : (l.trim() ? `<p>${l}</p>` : '')).join('').replace(/(<li>.*?<\/li>)+/g, m => `<ul>${m}</ul>`);

  const ROLE_INFO = {
    ceo: { agent: 'Agente do CEO', focus: 'estratégia, receita incremental, patrocinadores, governança 50/50 e decisões da diretoria',
      sug: ['Quais 3 decisões destravam mais receita neste trimestre?', 'Onde está o maior risco do MVP de 90 dias?', 'Como está o retorno para os patrocinadores?', 'Resuma esta tela em 3 pontos para o conselho'] },
    op: { agent: 'Agente de Operações', focus: 'programação no ar, participação ao vivo, moderação, grade e produção',
      sug: ['O que precisa de ação agora no ar?', 'Qual programa puxa mais participação hoje?', 'Como encaixar o QR sem atrapalhar o programa?', 'Resuma esta tela em 3 pontos para a produção'] },
    mkt: { agent: 'Agente de Marketing', focus: 'audiência, CDP, segmentos, consentimento, jornadas, campanhas e ativação de patrocinadores',
      sug: ['Qual segmento ativar primeiro, e com qual patrocinador?', 'Como aumentar o opt-in sem perder participação?', 'Que jornada criar para fãs inativos há 14 dias?', 'Resuma esta tela em 3 pontos para o time de CRM'] },
    it: { agent: 'Agente de TI', focus: 'integrações, conectores, dados, segurança, LGPD e escala nos picos do ao vivo',
      sug: ['Quais integrações bloqueiam o MVP?', 'Quais os riscos de LGPD nesta arquitetura?', 'Como aguentar o pico do Jogo Aberto?', 'Resuma esta tela em 3 pontos para a arquitetura'] },
    band: { agent: 'Agente Band', focus: 'visão completa do Band Playverse: audiência, receita, operação, marketing e tecnologia',
      sug: ['O que mais importa nesta tela agora?', 'Qual a próxima melhor ação para a Band?', 'Onde está a maior oportunidade de receita?', 'Resuma esta tela em 3 pontos'] }
  };
  const role = () => (window.BAND_ROLE && ROLE_INFO[window.BAND_ROLE]) ? window.BAND_ROLE : 'band';
  const S = { open: true, tab: 'chat', busy: false, hist: {}, insights: [], screen: '', screenKey: '' };
  const hist = () => (S.hist[role()] = S.hist[role()] || []);
  try { const st = JSON.parse(localStorage.getItem('band-ai-ui') || '{}'); if (st.open === false) S.open = false; } catch (e) {}

  /* ---------- estilos e estrutura ---------- */
  const css = `
  .app.bai-on{grid-template-columns:252px minmax(0,1fr) ${W}px}
  .app.bai-on.bai-min{grid-template-columns:252px minmax(0,1fr) 60px}
  #bai{display:none;position:sticky;top:0;height:100vh;border-left:1px solid var(--border);background:linear-gradient(180deg,#0e1222,#0a0d19);flex-direction:column;min-width:0;z-index:6}
  .app.bai-on #bai{display:flex}
  #bai .bh{padding:14px 16px 10px;border-bottom:1px solid var(--border);flex:none}
  #bai .bt{display:flex;align-items:center;gap:10px}
  #bai .orb{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;flex:none;background:conic-gradient(from 200deg,#2dd4a7,#7c6cff,#f5b82e,#2dd4a7);box-shadow:0 0 22px -4px rgba(45,212,167,.6);color:#071019;font-weight:900;font-size:17px}
  #bai .bt b{font-size:14.5px;display:block;line-height:1.15}#bai .bt small{color:var(--text-faint);font-size:11px}
  #bai .ib{margin-left:auto;width:30px;height:30px;border-radius:9px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-dim);cursor:pointer;display:grid;place-items:center;font-size:14px}
  #bai .ctx{margin-top:10px;display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--text-dim);background:rgba(45,212,167,.08);border:1px solid rgba(45,212,167,.25);border-radius:9px;padding:6px 9px}
  #bai .ctx i{width:7px;height:7px;border-radius:50%;background:#2dd4a7;flex:none;box-shadow:0 0 0 3px rgba(45,212,167,.18)}
  #bai .ctx span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #bai .tabs{display:flex;gap:4px;margin-top:10px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:3px}
  #bai .tabs button{flex:1;padding:7px;border-radius:7px;border:0;background:none;color:var(--text-dim);font:600 12.5px Inter,sans-serif;cursor:pointer}
  #bai .tabs button.on{background:linear-gradient(135deg,#7c6cff,#a86bff);color:#fff}
  #bai .tabs em{font-style:normal;background:rgba(255,255,255,.18);border-radius:999px;padding:0 6px;margin-left:4px;font-size:11px}
  #bai .bb{flex:1;overflow-y:auto;padding:14px 16px}
  #bai .welcome{border:1px solid var(--border);border-radius:14px;padding:14px;background:var(--surface)}
  #bai .welcome h4{margin:0 0 6px;font-size:14px}#bai .welcome p{margin:0;color:var(--text-dim);font-size:12.5px;line-height:1.5}
  #bai .scan{width:100%;margin-top:12px;padding:11px;border-radius:11px;border:1px solid rgba(45,212,167,.45);background:rgba(45,212,167,.1);color:#2dd4a7;font:700 13px Inter,sans-serif;cursor:pointer}
  #bai .scan:hover{background:rgba(45,212,167,.18)}
  #bai .sl{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--text-faint);font-weight:700;margin:16px 0 8px}
  #bai .sug{display:block;width:100%;text-align:left;padding:10px 12px;margin-bottom:7px;border-radius:11px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font:500 12.8px/1.4 Inter,sans-serif;cursor:pointer}
  #bai .sug:hover{border-color:#7c6cff;background:rgba(124,108,255,.1)}
  #bai .mu{margin:12px 0 8px auto;max-width:88%;width:fit-content;padding:9px 12px;border-radius:13px 13px 3px 13px;background:linear-gradient(135deg,#7c6cff,#a86bff);color:#fff;font-size:13px;line-height:1.45}
  #bai .ma{margin:8px 0;padding:11px 13px;border-radius:13px 13px 13px 3px;background:var(--surface);border:1px solid var(--border);font-size:13px;line-height:1.55;color:var(--text)}
  #bai .ma p{margin:0 0 6px}#bai .ma p:last-child{margin:0}#bai .ma ul{margin:4px 0 6px;padding-left:18px}#bai .ma li{margin:3px 0}
  #bai .ma.err{border-color:rgba(255,92,114,.5);color:#ffb3bf}
  #bai .ins{margin:8px 0;padding:11px 12px;border-radius:12px;background:linear-gradient(135deg,rgba(245,184,46,.09),var(--surface));border:1px solid rgba(245,184,46,.35);border-left:3px solid var(--ic,#f5b82e)}
  #bai .ins .h{display:flex;align-items:flex-start;gap:8px}#bai .ins .h b{font-size:13px;flex:1;line-height:1.35}
  #bai .ins .imp{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:2px 7px;border-radius:999px;white-space:nowrap}
  #bai .ins p{margin:6px 0 0;color:var(--text-dim);font-size:12.3px;line-height:1.45}
  #bai .ins .m{margin-top:7px;font-size:20px;font-weight:800;color:#ffd76a;letter-spacing:-.01em}
  #bai .ins .a{margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
  #bai .ins .a span{font-size:12px;color:var(--text);flex:1 1 100%}
  #bai .ins .a button{padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font:600 11.5px Inter,sans-serif;cursor:pointer}
  #bai .ins .a button.go{border-color:rgba(124,108,255,.6);background:rgba(124,108,255,.16)}
  #bai .ins .a button.pin.on{border-color:#f5b82e;color:#f5b82e}
  #bai .fu{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 4px}
  #bai .fu button{padding:6px 10px;border-radius:999px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-dim);font:500 11.8px Inter,sans-serif;cursor:pointer;text-align:left}
  #bai .fu button:hover{color:var(--text);border-color:#7c6cff}
  #bai .typing{display:flex;gap:5px;padding:12px}#bai .typing span{width:7px;height:7px;border-radius:50%;background:#7c6cff;animation:baiT 1s infinite}#bai .typing span:nth-child(2){animation-delay:.15s}#bai .typing span:nth-child(3){animation-delay:.3s}
  @keyframes baiT{50%{opacity:.25;transform:translateY(-3px)}}
  #bai .bf{padding:12px 16px 14px;border-top:1px solid var(--border);flex:none}
  #bai .bf .box{display:flex;align-items:flex-end;gap:8px;background:var(--surface-2);border:1px solid var(--border);border-radius:13px;padding:8px 8px 8px 12px}
  #bai .bf .box:focus-within{border-color:#7c6cff}
  #bai .bf textarea{flex:1;border:0;background:none;color:var(--text);font:13px/1.45 Inter,sans-serif;resize:none;outline:none;max-height:140px;min-height:40px;padding:2px 0}
  #bai .bf .send{width:36px;height:36px;border-radius:10px;border:0;background:linear-gradient(135deg,#7c6cff,#a86bff);color:#fff;cursor:pointer;font-size:16px;flex:none}
  #bai .bf .send:disabled{opacity:.5}
  #bai .bf small{display:block;margin-top:7px;color:var(--text-faint);font-size:10.5px}
  #bai .empty{color:var(--text-faint);font-size:12.5px;text-align:center;padding:30px 10px}
  #bai .itb{display:flex;gap:6px;margin-bottom:8px}#bai .itb button{padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-dim);font:600 11.5px Inter,sans-serif;cursor:pointer}
  #bai .rail{display:none;flex-direction:column;align-items:center;gap:12px;padding-top:16px}
  .app.bai-min #bai .bh,.app.bai-min #bai .bb,.app.bai-min #bai .bf{display:none}.app.bai-min #bai .rail{display:flex}
  #bai .rail .orb{cursor:pointer}#bai .rail .v{writing-mode:vertical-rl;transform:rotate(180deg);font:700 12px Inter,sans-serif;color:var(--text-dim);letter-spacing:.08em;cursor:pointer}
  #bai .rail .n{background:#f5b82e;color:#1a1200;font:800 11px Inter,sans-serif;border-radius:999px;padding:1px 7px}
  #bai-fab{display:none}
  @media(max-width:1180px){
    .app.bai-on,.app.bai-on.bai-min{grid-template-columns:252px minmax(0,1fr)}
    #bai{position:fixed;right:0;top:0;width:min(${W}px,94vw);transform:translateX(100%);transition:transform .25s;box-shadow:-20px 0 50px -20px #000;z-index:210}
    .app.bai-mob #bai{transform:none}
    .app.bai-min #bai .bh,.app.bai-min #bai .bb,.app.bai-min #bai .bf{display:flex}.app.bai-min #bai .bb{display:block}.app.bai-min #bai .rail{display:none}
    body.bai-on #bai-fab{display:grid;position:fixed;right:18px;bottom:18px;width:54px;height:54px;border-radius:16px;place-items:center;z-index:209;cursor:pointer;background:conic-gradient(from 200deg,#2dd4a7,#7c6cff,#f5b82e,#2dd4a7);color:#071019;font-size:22px;font-weight:900;box-shadow:0 10px 30px -8px rgba(45,212,167,.7);border:0}
  }
  @media(max-width:900px){.app.bai-on,.app.bai-on.bai-min{grid-template-columns:1fr}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const aside = document.createElement('aside'); aside.id = 'bai';
  aside.innerHTML = `
    <div class="bh"><div class="bt"><div class="orb">✦</div><div style="min-width:0"><b id="baiName">Agente Band</b><small>IA real · lê o seu papel e a tela aberta</small></div><button class="ib" id="baiMin" title="Recolher">⟩</button></div>
      <div class="ctx" title="O agente usa os dados desta tela"><i></i><span id="baiCtx">Contexto: —</span></div>
      <div class="tabs"><button data-t="chat" class="on">Conversa</button><button data-t="ins">Insights<em id="baiN">0</em></button></div></div>
    <div class="bb" id="baiBody"></div>
    <div class="bf"><div class="box"><textarea id="baiIn" rows="1" placeholder="Pergunte ao agente sobre esta tela…"></textarea><button class="send" id="baiGo" title="Enviar">➤</button></div><small>Enter envia · Shift+Enter quebra linha · dados simulados da proposta</small></div>
    <div class="rail"><div class="orb" id="baiOpen1" title="Abrir agente">✦</div><span class="n" id="baiRailN">0</span><span class="v" id="baiOpen2">AGENTE BAND</span></div>`;
  const app = document.querySelector('.app');
  app.appendChild(aside);
  const fab = document.createElement('button'); fab.id = 'bai-fab'; fab.textContent = '✦'; fab.title = 'Agente Band'; document.body.appendChild(fab);

  /* ---------- contexto ---------- */
  function frame() { return Array.from(document.querySelectorAll('#band-frames iframe')).find(f => f.style.display !== 'none') || null; }
  function snapshot() {
    const f = frame(); let data = null;
    try {
      const w = f && f.contentWindow;
      if (w) {
        if (typeof w.osContext === 'function') data = w.osContext();
        else if (w.BO && typeof w.BO.ctx === 'function') data = w.BO.ctx();
        else if (w.BP && w.BP.S) {
          const BP = w.BP, all = Array.from(BP.S.profiles.values()), sc = BP.SCALE();
          data = { perfis_projecao: all.length * sc, opt_in_pct: Math.round(all.filter(p => p.consent.marketing).length / Math.max(1, all.length) * 100),
            no_ar: BP.PROGRAMS.filter(BP.onAir).map(p => p.n), segmentos: BP.SEGMENTS.map(s => s.n + ': ' + BP.segCount(s.f) * sc),
            jornadas: BP.JOURNEYS.map(j => j.n + ' (' + j.sent + ' envios)'), conectores: BP.CONNECTORS.map(c => c.n + ' (' + c.st + ')'),
            ledger_recente: BP.S.ledger.slice(0, 6).map(l => l.kind + ' ' + l.desc + ' R$ ' + Math.round(l.value)), eventos_sessao: BP.S.events.length };
          if (w.BAND && w.BAND.fan) data.fa_logado = { xp: w.BAND.fan.xp, medalhas: w.BAND.fan.medals };
        }
        const txt = w.document && w.document.body ? w.document.body.innerText.replace(/\s+\n/g, '\n').replace(/[ \t]+/g, ' ') : '';
        if (!data && txt) data = { texto_visivel: txt.slice(0, 3500) };
        else if (txt) data.texto_visivel_resumo = txt.slice(0, 1500);
      }
    } catch (e) {}
    let s = ''; try { s = JSON.stringify(data || {}); } catch (e) { s = '{}'; }
    return s.length > 9000 ? s.slice(0, 9000) + '…' : s;
  }
  function menuPages() {
    const sel = window.BAND_ROLE ? '.role-nav.nav-item' : '.band-only-nav.nav-item:not(.role-nav)';
    return Array.from(document.querySelectorAll(sel)).map(el => { const t = document.createElement('div'); t.innerHTML = el.dataset.title; return [el.dataset.band, t.textContent]; });
  }
  function goPage(key) {
    const sel = window.BAND_ROLE ? `.role-nav.nav-item[data-band="${key}"]` : `.band-only-nav.nav-item:not(.role-nav)[data-band="${key}"]`;
    const el = document.querySelector(sel) || document.querySelector(`.band-only-nav.nav-item[data-band="${key}"]`);
    if (el) el.click();
  }

  /* ---------- render ---------- */
  const IMP = { alto: ['#ff5c72', 'rgba(255,92,114,.16)', '#ff8ea0', 'Alto'], medio: ['#f5b82e', 'rgba(245,184,46,.16)', '#f5b82e', 'Médio'], baixo: ['#2dd4a7', 'rgba(45,212,167,.14)', '#2dd4a7', 'Baixo'] };
  function insCard(x) {
    const k = IMP[(x.impacto || '').toLowerCase().replace('é', 'e')] || IMP.medio;
    const pg = x.pagina && menuPages().find(p => p[0] === x.pagina);
    return `<div class="ins" style="--ic:${k[0]}" data-id="${x.id}"><div class="h"><b>${esc(x.titulo)}</b><span class="imp" style="background:${k[1]};color:${k[2]}">${k[3]}</span></div>
      ${x.metrica ? `<div class="m">${esc(x.metrica)}</div>` : ''}<p>${esc(x.detalhe)}</p>
      <div class="a">${x.acao ? `<span>→ ${esc(x.acao)}</span>` : ''}${pg ? `<button class="go" data-go="${esc(pg[0])}">Abrir ${esc(pg[1])}</button>` : ''}<button class="pin ${x.pinned ? 'on' : ''}" data-pin="${x.id}">${x.pinned ? '★ Fixado' : '☆ Fixar'}</button></div></div>`;
  }
  function render() {
    const R = ROLE_INFO[role()], body = $('#baiBody');
    $('#baiName').textContent = R.agent;
    $('#baiCtx').textContent = 'Contexto: ' + (S.screen || 'Intelligence Hub');
    $('#baiN').textContent = S.insights.length; $('#baiRailN').textContent = S.insights.length;
    aside.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === S.tab));
    if (S.tab === 'ins') {
      const list = S.insights.slice().sort((a, b) => (b.pinned - a.pinned) || (b.t - a.t));
      body.innerHTML = list.length ? `<div class="itb"><button id="baiCopy">Copiar insights</button><button id="baiClear">Limpar não fixados</button></div>` + list.map(x => `<div class="sl" style="margin:12px 0 4px">${esc(x.screen)} · ${new Date(x.t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>` + insCard(x)).join('')
        : `<div class="empty">Ainda sem insights.<br>Pergunte algo ou use "Analisar esta tela".</div>`;
      return;
    }
    const h = hist();
    let html = '';
    if (!h.length) {
      html += `<div class="welcome"><h4>${esc(R.agent)}</h4><p>Pergunte em linguagem natural. Eu leio a tela aberta (${esc(S.screen || 'Intelligence Hub')}) com os dados dela, respondo e devolvo insights com o próximo passo e um atalho para a página certa. Foco: ${esc(R.focus)}.</p><button class="scan" data-scan="1">✦ Analisar esta tela</button></div>
        <div class="sl">Sugestões para você</div>` + R.sug.map(q => `<button class="sug" data-q="${esc(q)}">${esc(q)}</button>`).join('');
    }
    h.forEach((m, i) => {
      if (m.role === 'user') html += `<div class="mu">${esc(m.show || m.content)}</div>`;
      else {
        html += `<div class="ma ${m.err ? 'err' : ''}">${md(m.content)}</div>`;
        (m.ins || []).forEach(id => { const x = S.insights.find(y => y.id === id); if (x) html += insCard(x); });
        if (i === h.length - 1 && m.fu && m.fu.length) html += `<div class="fu">${m.fu.map(q => `<button data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>`;
      }
    });
    if (h.length) html += `<div class="fu"><button data-scan="1">✦ Analisar esta tela</button></div>`;
    if (S.busy) html += `<div class="typing"><span></span><span></span><span></span></div>`;
    body.innerHTML = html; body.scrollTop = body.scrollHeight;
  }

  /* ---------- IA ---------- */
  async function ask(q, show) {
    if (S.busy || !q.trim()) return;
    if (S.tab !== 'chat') S.tab = 'chat';
    const R = ROLE_INFO[role()], h = hist();
    h.push({ role: 'user', content: q, show: show || q });
    S.busy = true; $('#baiGo').disabled = true; render();
    const pages = menuPages();
    const sys = (typeof buildClubAiContext === 'function' ? buildClubAiContext() : '') + `

Você é o ${R.agent} do Intelligence Hub da Band (Band Playverse: Grupo Bandeirantes × Virtual Fans, by ClubBrain.ai). Papel do usuário: ${window.BAND_ROLE ? (BAND_ROLES[window.BAND_ROLE].name + ' — ' + BAND_ROLES[window.BAND_ROLE].role) : 'administrador (visão completa)'}. Foco: ${R.focus}.
Responda em português do Brasil, direto e executivo, usando os dados da tela e do contexto. Todos os números são simulados para a proposta: não invente números que não estejam no contexto (pode fazer contas simples com eles). Nunca proponha vender dado pessoal; só segmentos agregados com opt-in. Não colete nem analise opinião política.
FORMATO OBRIGATÓRIO: responda SOMENTE com um objeto JSON válido, sem texto antes ou depois, sem cercas de código:
{"resposta":"até 110 palavras; pode usar linhas começando com '- '","insights":[{"titulo":"até 9 palavras","detalhe":"1 ou 2 frases","impacto":"alto|medio|baixo","metrica":"número-chave curto do contexto ou vazio","acao":"próximo passo concreto, começando com verbo","pagina":"uma das chaves abaixo ou vazio"}],"perguntas":["2 ou 3 perguntas de continuação curtas"]}
Traga de 2 a 3 insights, ordenados por impacto. Chaves de página válidas: ${pages.map(p => p[0] + ' = ' + p[1]).join('; ')}.`;
    const msgs = h.slice(-9, -1).map(m => ({ role: m.role, content: m.role === 'assistant' ? m.content : (m.show || m.content) }));
    msgs.push({ role: 'user', content: `Tela aberta: ${S.screen || 'Intelligence Hub'}\nDados da tela (JSON):\n${snapshot()}\n\nPergunta: ${q}` });
    let out;
    try {
      const r = await fetch(typeof CHAT_BACKEND_URL !== 'undefined' ? CHAT_BACKEND_URL : '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system: sys, messages: msgs }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d.error && (d.error.message || d.error)) || ('HTTP ' + r.status));
      const txt = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
      let j = null; try { j = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1)); } catch (e) {}
      if (j && j.resposta) {
        const ids = (j.insights || []).slice(0, 4).filter(x => x && x.titulo).map(x => { const id = 'i' + Math.random().toString(36).slice(2, 8); S.insights.unshift({ id, t: Date.now(), screen: S.screen || 'Intelligence Hub', role: role(), pinned: false, ...x }); return id; });
        out = { role: 'assistant', content: j.resposta, ins: ids, fu: (j.perguntas || []).slice(0, 3) };
      } else out = { role: 'assistant', content: txt || '(sem resposta)' };
    } catch (e) {
      out = { role: 'assistant', err: 1, content: 'Não consegui falar com a IA agora (' + (e.message || 'erro') + '). Confira se a function /api/chat está publicada com a chave da Anthropic.' };
    }
    h.push(out); S.busy = false; $('#baiGo').disabled = false; render();
  }
  const scan = () => ask(`Analise a tela "${S.screen || 'Intelligence Hub'}" com os dados dela e traga o que mais importa para o meu papel agora: o que está bem, o que preocupa e o que fazer em seguida.`, '✦ Analisar esta tela: ' + (S.screen || 'Intelligence Hub'));

  /* ---------- eventos ---------- */
  aside.addEventListener('click', e => {
    const t = e.target.closest('button,[data-scan],.orb,.v'); if (!t) return;
    if (t.dataset.t) { S.tab = t.dataset.t; render(); return; }
    if (t.dataset.q) { ask(t.dataset.q); return; }
    if (t.dataset.scan) { scan(); return; }
    if (t.dataset.go) { goPage(t.dataset.go); app.classList.remove('bai-mob'); return; }
    if (t.dataset.pin) { const x = S.insights.find(y => y.id === t.dataset.pin); if (x) { x.pinned = !x.pinned; render(); } return; }
    if (t.id === 'baiMin') { setOpen(false); return; }
    if (t.id === 'baiOpen1' || t.id === 'baiOpen2') { setOpen(true); return; }
    if (t.id === 'baiGo') { send(); return; }
    if (t.id === 'baiCopy') { const txt = S.insights.map(x => `• [${x.impacto}] ${x.titulo}${x.metrica ? ' (' + x.metrica + ')' : ''}: ${x.detalhe}${x.acao ? ' → ' + x.acao : ''}`).join('\n'); try { navigator.clipboard.writeText(txt); t.textContent = 'Copiado!'; } catch (er) {} return; }
    if (t.id === 'baiClear') { S.insights = S.insights.filter(x => x.pinned); render(); return; }
  });
  const inp = () => $('#baiIn');
  function send() { const v = inp().value.trim(); if (!v) return; inp().value = ''; inp().style.height = ''; ask(v); }
  aside.addEventListener('keydown', e => { if (e.target.id === 'baiIn' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  aside.addEventListener('input', e => { if (e.target.id === 'baiIn') { e.target.style.height = 'auto'; e.target.style.height = Math.min(140, e.target.scrollHeight) + 'px'; } });
  fab.onclick = () => { app.classList.toggle('bai-mob'); };
  function setOpen(v) { S.open = v; app.classList.toggle('bai-min', !v); try { localStorage.setItem('band-ai-ui', JSON.stringify({ open: v })); } catch (e) {} if (v) setTimeout(() => inp() && inp().focus(), 50); }

  /* ---------- integração com o painel ---------- */
  window.BandAI = {
    sync() {
      const on = typeof currentClubId !== 'undefined' && currentClubId === 'band';
      app.classList.toggle('bai-on', on); document.body.classList.toggle('bai-on', on);
      app.classList.toggle('bai-min', on && !S.open);
      if (!on) app.classList.remove('bai-mob');
      if (on) render();
    },
    onScreen(title, key) { S.screen = title; S.screenKey = key || ''; if (app.classList.contains('bai-on')) render(); },
    focus() { if (window.matchMedia('(max-width:1180px)').matches) app.classList.add('bai-mob'); setOpen(true); S.tab = 'chat'; render(); },
    reset() { S.hist = {}; S.insights = []; S.tab = 'chat'; render(); }
  };
  render();
  window.BandAI.sync();
})();
