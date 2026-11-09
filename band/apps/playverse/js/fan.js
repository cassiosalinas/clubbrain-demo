/* Band Playverse · app do fã */
(function(){
const U = BP.u, S = BP.S, esc = U.esc, fmt = U.fmt;
const CITIES = [["São Paulo", "SP", "Sudeste"], ["Campinas", "SP", "Sudeste"], ["Rio de Janeiro", "RJ", "Sudeste"], ["Belo Horizonte", "MG", "Sudeste"], ["Salvador", "BA", "Nordeste"], ["Recife", "PE", "Nordeste"], ["Fortaleza", "CE", "Nordeste"], ["Curitiba", "PR", "Sul"], ["Porto Alegre", "RS", "Sul"], ["Goiânia", "GO", "Centro-Oeste"], ["Belém", "PA", "Norte"]];
const POLLS = {
  ja: { key: "ja-classico", q: "Quem vence o clássico do fim de semana?", o: ["Mandante", "Empate", "Visitante"], xp: 100 },
  res: { key: "res-casa", q: "Seu time rende mais em casa ou fora?", o: ["Em casa", "Fora", "Tanto faz"], xp: 100 },
  eed: { key: "eed-ouvinte", q: "Palpite do ouvinte: onde seu time termina o Brasileirão?", o: ["Brigando pelo título", "Meio da tabela", "Fugindo da queda"], xp: 100 },
  bna: { key: "bna-liga", q: "Qual liga americana você mais acompanha?", o: ["NBA", "NFL", "MLB / NHL"], xp: 100 },
  af: { key: "af-arb", q: "Que nota você dá para a arbitragem da rodada?", o: ["Boa", "Regular", "Ruim"], xp: 80 }
};
const VAR = { key: "af-var", q: "VAR da audiência", txt: "Aos 38 do 2º tempo, o atacante invade a área, o zagueiro chega atrasado e toca no tornozelo. O árbitro manda seguir. Qual a sua decisão?", o: ["Pênalti", "Segue o jogo", "Simulação · amarelo"], ref: "Leitura ilustrativa do comentarista de arbitragem: contato claro e atrasado. Pênalti.", xp: 80 };
const QUIZ = [
  { q: "Como é conhecido o clássico São Paulo × Corinthians?", o: ["Derby", "Majestoso", "Choque-Rei", "San-São"], a: 1, e: "São Paulo × Corinthians é o Majestoso. Derby é Corinthians × Palmeiras." },
  { q: "Em que ano foi disputado o primeiro Derby paulista?", o: ["1910", "1917", "1923", "1942"], a: 1, e: "Em 1917. O então Palestra Itália venceu por 3 a 0." },
  { q: "Qual clube venceu o primeiro Mundial de Clubes da FIFA, em 2000?", o: ["São Paulo", "Vasco", "Corinthians", "Palmeiras"], a: 2, e: "O Corinthians venceu o Vasco na final, no Maracanã." }
];
const OPS = ["Um grande craque decide um campeonato sozinho.", "Time que joga por uma bola não merece ser campeão.", "Clássico se ganha na raça, não na tática."];
const OPO = ["Concordo", "Depende do time", "Discordo"];
const OTHER = {
  gincana: { key: "se-causa", q: "Gincana das Torcidas: qual causa sua torcida abraça nesta rodada?", o: ["Combate à fome", "Meio ambiente", "Educação"], xp: 100, type: "poll" },
  bolao: { key: "stock-mont", q: "Bolão do pódio: qual montadora vence a próxima etapa da Stock Car?", o: ["Chevrolet", "Toyota", "Mitsubishi"], xp: 120, type: "bolao", note: "+300 XP se acertar · oferecido por Rota Bank" },
  indy: { key: "indy-br", q: "Fórmula Indy: um brasileiro termina no top 10 na próxima etapa?", o: ["Sim", "Não"], xp: 100, type: "poll" },
  pbr: { key: "pbr-8", q: "Mundo PBR: o peão para os 8 segundos na montaria principal?", o: ["Para!", "Cai antes"], xp: 60, type: "poll" }
};
const MOMENTS = ["Copa 2002 · o penta", "Um Derby histórico", "Um Majestoso no estádio", "Outro momento"];
const IXLABEL = { poll: ["🎯", "Palpite no ar"], quiz: ["🧠", "Quiz do acervo"], opinion: ["🔥", "Desafio do Craque"], var: ["🖥️", "VAR da audiência"], memory: ["📼", "E você, onde estava?"], gincana: ["🤝", "Gincana das Torcidas"], bolao: ["🏁", "Bolão do pódio"], indy: ["🏎️", "Palpite da Indy"], nota: ["🛹", "Nota da manobra"], pbr: ["🐂", "Montaria da galera"], "game:penalti": ["⚽", "Jogo: Pênalti do Craque"], "game:stock": ["🏁", "Jogo: Stock Car Reta Final"] };
// base para as enquetes não começarem vazias
const BASE = {}; ["ja-classico", "res-casa", "eed-ouvinte", "bna-liga", "af-arb", "af-var", "se-causa", "stock-mont", "indy-br", "pbr-8", "db-op0", "db-op1", "db-op2"].forEach((k, i) => { BASE[k] = [40 + i * 7 % 30, 25 + i * 11 % 40, 30 + i * 5 % 35]; });

BP.Fan = function (root, opts = {}) {
  const KEY = opts.key || "bpx-fan";
  let fan = U.ls.get(KEY); let scr = fan ? "home" : "onboard"; let tab = "home"; let ctx = {}; let tmp = {}; let game = null; let qs = null, th = null;
  const save = () => U.ls.set(KEY, fan);
  const snap = () => ({ id: fan.id, name: fan.name, team: fan.team, city: fan.city, uf: fan.uf, region: fan.region, birth: fan.birth, consent: fan.consent });
  const emit = (type, prog, p, src) => BP.emit(type, prog, p, snap(), { src: src || (prog && BP.prog(prog) && BP.prog(prog).ch[0] === "radio" ? "Rádio" : "App") });
  const toast = t => { const el = root.querySelector(".ftoast"); if (!el) return; el.textContent = t; el.classList.add("on"); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("on"), 1600); };
  const addXP = (n, l) => { fan.xp += n; save(); if (n) toast(`+${fmt(n)} XP ${l || ""}`); };
  const bal = () => fan.xp - (fan.spent || 0);
  const lvl = xp => xp >= 3000 ? ["Lenda Band", null] : xp >= 1500 ? ["Superfã", 3000] : xp >= 500 ? ["Fã", 1500] : ["Espectador", 500];
  function medal(id) { if (fan.medals.includes(id)) return; fan.medals.push(id); save(); const m = BP.MEDALS[id]; setTimeout(() => toast(`${m[0]} Medalha: ${m[1]}`), 1200); emit("medal", null, { id, xp: 0 }); }
  function checkExplorer() { if (Object.keys(fan.progs || {}).length >= 3) medal("explorador"); }
  function touch(prog) { fan.progs = fan.progs || {}; fan.progs[prog] = 1; save(); checkExplorer(); }
  function pollBars(key, opts2, mine) { const live = S.polls[key] || {}; const v = opts2.map((_, i) => (BASE[key] ? BASE[key][i] || 20 : 20) + (live[i] || 0)); const t = v.reduce((a, b) => a + b, 0) || 1; return opts2.map((o, i) => `<button class="fop ${mine === i ? "me" : ""}" data-vote="${i}" ${mine != null ? "disabled" : ""}><i style="width:${mine != null ? v[i] / t * 100 : 0}%"></i><span>${esc(o)}</span>${mine != null ? `<b>${Math.round(v[i] / t * 100)}%</b>` : ""}</button>`).join(""); }

  /* ---------- telas ---------- */
  function header() { return `<div class="fhd"><div class="flogo">BAND <span>PLAYVERSE</span></div>${fan ? `<div class="fxp">${fmt(bal())} XP</div>` : ""}</div>`; }
  function nav() { return fan ? `<nav class="fnav">${[["home", "🏠", "Início"], ["progs", "📺", "Programas"], ["games", "🎮", "Jogos"], ["wallet", "🎁", "Carteira"], ["me", "👤", "Perfil"]].map(([k, i, l]) => `<button data-tab="${k}" class="${tab === k ? "on" : ""}"><span>${i}</span>${l}</button>`).join("")}</nav>` : ""; }
  function render() {
    if (game && scr !== "game") { game.destroy(); game = null; }
    let h = "";
    if (scr === "onboard") {
      h = `<div class="fct"><div class="fhero"><small>Grupo Bandeirantes × Virtual Fans</small><h2>Seu <span>Band Pass</span></h2><p>Um passe para jogar com toda a Band: TV, rádio, BandSports e YouTube. XP, medalhas e recompensas de verdade.</p></div>
      <label class="ff"><span>Apelido no ranking</span><input id="o-nm" maxlength="20" value="${esc(tmp.nm || "")}" placeholder="Como quer aparecer?"></label>
      <div class="ff"><span>Time do coração</span><div class="fteams">${Object.keys(BP.TEAMS).map(k => `<button class="ftm ${tmp.team === k ? "on" : ""}" data-team="${k}"><i style="background:${BP.TEAMS[k]}"></i>${k}</button>`).join("")}</div></div>
      <div class="frow2"><label class="ff"><span>Cidade</span><select id="o-city">${CITIES.map((c, i) => `<option value="${i}" ${tmp.city == i ? "selected" : ""}>${c[0]} · ${c[1]}</option>`).join("")}</select></label><label class="ff"><span>Ano de nascimento</span><input id="o-birth" type="number" min="1930" max="2010" value="${tmp.birth || 1990}"></label></div>
      <div class="fconsent"><b>Privacidade (LGPD)</b>
      <label><input type="checkbox" id="o-c1" ${tmp.c1 ? "checked" : ""}> Aceito os termos e a política de privacidade para participar <em>(obrigatório)</em></label>
      <label><input type="checkbox" id="o-c2" ${tmp.c2 ? "checked" : ""}> Quero ofertas e benefícios dos patrocinadores <em>(+50 XP)</em></label>
      <label><input type="checkbox" id="o-c3" ${tmp.c3 !== false ? "checked" : ""}> Personalizar conteúdo e lembretes pelo que eu gosto</label></div>
      <button class="fcta" id="o-go">Criar meu Band Pass</button><p class="ffoot">Demo conceitual · dados de teste</p></div>`;
    } else if (scr === "home") {
      const [ln, nx] = lvl(fan.xp); const air = BP.PROGRAMS.filter(BP.onAir); const d = U.nowSP().getDay();
      const next = BP.PROGRAMS.filter(p => p.days.includes(d) && p.e && !BP.onAir(p) && p.s > `${String(U.nowSP().getHours()).padStart(2, "0")}:${String(U.nowSP().getMinutes()).padStart(2, "0")}`).slice(0, 3);
      const top = Array.from(S.profiles.values()).sort((a, b) => b.xp - a.xp).slice(0, 5);
      h = `<div class="fct"><div class="fpass"><div class="r1"><span>Band Pass · ${esc(fan.id)}</span><span>${esc(fan.team)}</span></div><b>${esc(fan.name)}</b><div class="r2"><span>${ln}</span><span>${nx ? fmt(nx - fan.xp) + " XP para o próximo nível" : "nível máximo"}</span></div><div class="pb"><i style="width:${nx ? Math.min(100, fan.xp / nx * 100) : 100}%"></i></div><div class="fmed">${Object.entries(BP.MEDALS).map(([k, m]) => `<span class="${fan.medals.includes(k) ? "on" : ""}" title="${m[1]}">${m[0]}</span>`).join("")}</div></div>
      <div class="fsec">${air.length ? "● No ar agora" : "Hoje na Band"}</div>
      ${(air.length ? air : next.length ? next : BP.PROGRAMS.slice(0, 2)).map(p => progCard(p)).join("")}
      <div class="fsec">Em destaque</div>
      <div class="fgrid2"><button class="fpromo" data-game="penalti" style="background:linear-gradient(135deg,#123072,#0b1638)"><span>⚽</span><b>Pênalti do Craque</b><small>5 cobranças · oferecido por Pulso Energy</small></button><button class="fpromo" data-open="stock" style="background:linear-gradient(135deg,#5b0f14,#170c12)"><span>🏁</span><b>Bolão da Stock Car</b><small>Exclusiva na Band · +300 XP</small></button></div>
      <div class="fsec">Ranking Band Pass</div><div class="frank">${top.map((p, i) => `<div class="${p.id === fan.id ? "me" : ""}"><em>${i + 1}</em><i style="background:${BP.TEAMS[p.team] || "#888"}"></i><b>${esc(p.name)}</b><span>${fmt(p.xp)}</span></div>`).join("")}</div></div>`;
    } else if (scr === "progs") {
      const ch = ctx.ch || "tv";
      h = `<div class="fct"><h3 class="fh3">Programas da Band</h3><div class="fchips">${BP.CHANNELS.map(c => `<button data-ch="${c.id}" class="${ch === c.id ? "on" : ""}">${c.ic} ${c.n}</button>`).join("")}</div>
      ${ch === "yt" ? `<p class="fnote">No YouTube: Esporte na Band (programas da TV ao vivo e Liga Saudita), BandNews Esportes e o canal da Bandeirantes.</p>` : ""}
      ${BP.PROGRAMS.filter(p => p.ch.includes(ch)).map(p => progCard(p)).join("")}</div>`;
    } else if (scr === "prog") {
      const p = BP.prog(ctx.prog); const sp = BP.SPONSORS.find(s => s.id === p.sponsor);
      h = `<div class="fct"><button class="fback" data-tab="${ctx.from || "progs"}">‹ voltar</button><div class="fphead" style="--c:${p.color}">${BP.onAir(p) ? '<span class="flive">AO VIVO</span>' : ""}<b>${esc(p.n)}</b><small>${esc(p.host)}</small><small>${sched(p)} · ${p.ch.map(c => BP.CHANNELS.find(x => x.id === c).n).join(" · ")}${p.tbc ? " · horário a confirmar" : ""}</small></div>
      <p class="fnote">${esc(p.tag)} · oferecido por <b>${esc(sp.n)}</b></p>
      <div class="fms">${p.ix.map(ix => { const [ic, l] = IXLABEL[ix]; const done = fan.done[p.id + ":" + ix]; return `<button class="fmi ${done ? "done" : ""}" data-ix="${ix}"><span>${ic}</span><div><b>${l}</b><small>${ixSub(p, ix)}</small></div><em>${done ? "✓" : "jogar"}</em></button>`; }).join("")}</div></div>`;
    } else if (scr === "poll") {
      const c = ctx.cfg; const mine = fan.votes[c.key];
      h = `<div class="fct"><button class="fback" data-back="1">‹ voltar</button><h3 class="fh3">${esc(c.q)}</h3>${c.txt ? `<div class="flance">${esc(c.txt)}</div>` : ""}${c.note ? `<p class="fnote">${esc(c.note)}</p>` : ""}<div class="fops">${pollBars(c.key, c.o, mine)}</div>${mine != null && c.ref ? `<div class="flance">🧑‍⚖️ ${esc(c.ref)}</div>` : ""}${mine != null ? `<p class="fnote">Voto registrado. Resultado ao vivo da audiência.</p>` : ""}</div>`;
    } else if (scr === "nota") {
      const mine = fan.votes["stu-nota"];
      h = `<div class="fct"><button class="fback" data-back="1">‹ voltar</button><h3 class="fh3">Nota da manobra: o kickflip no corrimão da final</h3><div class="fnota"><b id="nv">${mine ?? 7}</b><input type="range" id="nslider" min="0" max="10" value="${mine ?? 7}" ${mine != null ? "disabled" : ""}></div>${mine != null ? `<p class="fnote">Média da galera: <b>${(7.2 + Math.random() * .6).toFixed(1)}</b> · juízes: 8,4</p>` : `<button class="fcta" id="nGo">Enviar nota</button>`}</div>`;
    } else if (scr === "quiz") {
      const q = QUIZ[qs.i];
      h = `<div class="fct"><button class="fback" data-back="1">‹ sair</button><div class="fqm"><span>Quiz do acervo · Jogo Aberto</span><span>${qs.i + 1}/3</span></div><div class="ftimer"><i id="tmr"></i></div><h3 class="fh3">${esc(q.q)}</h3><div class="fops">${q.o.map((o, i) => { let c = ""; if (qs.ans != null) { if (i === q.a) c = "right"; else if (i === qs.ans) c = "wrong"; } return `<button class="fop ${c}" data-ans="${i}" ${qs.ans != null ? "disabled" : ""}><span>${esc(o)}</span></button>`; }).join("")}</div>${qs.ans != null ? `<div class="flance">${qs.ans === q.a ? "✅" : "❌"} ${esc(q.e)}</div><button class="fcta" data-qn="1">${qs.i < 2 ? "Próxima" : "Concluir"}</button>` : ""}</div>`;
    } else if (scr === "opinion") {
      const i = ctx.i || 0, key = "db-op" + i, mine = fan.votes[key]; const radio = ctx.prog === "dbr";
      h = `<div class="fct"><button class="fback" data-back="1">‹ voltar</button><div class="fqm"><span>Desafio do Craque${radio ? " · rádio 2× XP" : ""}</span><span>${i + 1}/3</span></div><div class="flance big">🎙️ <b>Neto:</b> "${esc(OPS[i])}"</div><div class="fops">${pollBars(key, OPO, mine)}</div>${mine != null ? `<p class="fnote">${mine === 0 ? "Você está com o Neto." : mine === 2 ? "Você desafiou o Neto! Polêmica vale pontos." : "Em cima do muro, mas com argumento."}</p><button class="fcta" data-opn="1">${i < 2 ? "Próxima provocação" : "Concluir"}</button>` : ""}</div>`;
    } else if (scr === "memory") {
      h = `<div class="fct"><button class="fback" data-back="1">‹ voltar</button><h3 class="fh3">E você, onde estava?</h3><p class="fnote">Sua memória pode entrar no quadro História Viva do Show do Esporte.</p>${tmp.hist == null ? `<div class="fops two">${MOMENTS.map((m, i) => `<button class="fop ${tmp.mom === i ? "me" : ""}" data-mom="${i}"><span>${m}</span></button>`).join("")}</div><textarea id="mtxt" class="ftext" placeholder="Onde você estava, com quem, o que sentiu...">${esc(tmp.mt || "")}</textarea><button class="fcta" id="mGo" ${tmp.mom == null ? "disabled" : ""}>Enviar memória</button>` : `<div class="fhist"><b>✦ AI Historian · História Viva</b><p id="hist">${esc(tmp.hist || "Consultando o acervo...")}</p><div class="facv">▶ Trecho do acervo Band<br><small>a licenciar · placeholder</small></div></div>`}</div>`;
    } else if (scr === "game") {
      h = `<div class="fct fgame"><button class="fback" data-back="1">‹ sair do jogo</button><div id="gameHost" class="gamehost"></div><div id="gameEnd"></div></div>`;
    } else if (scr === "games") {
      const gp = fan.games || {};
      h = `<div class="fct"><h3 class="fh3">Jogos do Band E.C.</h3><p class="fnote">Jogos rápidos ligados aos programas. Cada partida gera XP e mídia para o patrocinador da cota.</p>
      <button class="fgcard" data-game="penalti" style="background:linear-gradient(135deg,#0d3b1f,#0b1638)"><span>⚽</span><div><b>Pênalti do Craque</b><small>5 cobranças contra o goleiro · Pulso Energy</small><small>Seu recorde: ${gp.penalti ? gp.penalti + " gols" : "—"}</small></div></button>
      <button class="fgcard" data-game="stock" style="background:linear-gradient(135deg,#4a0d10,#1a1020)"><span>🏁</span><div><b>Stock Car · Reta Final</b><small>Desvie e acelere por 30 segundos · Rota Bank</small><small>Seu recorde: ${gp.stock ? fmt(gp.stock) + " pts" : "—"}</small></div></button>
      <div class="fsec">Ranking dos games</div><div class="frank">${Array.from(S.profiles.values()).filter(p => p.games.stock).sort((a, b) => b.games.stock.best - a.games.stock.best).slice(0, 5).map((p, i) => `<div class="${p.id === fan.id ? "me" : ""}"><em>${i + 1}</em><i style="background:${BP.TEAMS[p.team] || "#888"}"></i><b>${esc(p.name)}</b><span>${fmt(p.games.stock.best)} pts</span></div>`).join("")}</div></div>`;
    } else if (scr === "wallet") {
      h = `<div class="fct"><h3 class="fh3">Carteira</h3><div class="fbal"><small>Saldo para trocar</small><b>${fmt(bal())} XP</b><small>${BP.XP_PER_REAL} XP = R$ 1 · recompensas via <b>Minu</b></small></div>
      ${tmp.voucher ? `<div class="fvoucher"><small>Minu · voucher instantâneo</small><b>${esc(tmp.voucher.n)}</b>${tmp.voucher.sp ? `<small>Cortesia ${esc(tmp.voucher.sp)}</small>` : ""}<div class="code">MINU-${esc(fan.id.slice(-4))}-${tmp.voucher.k}</div><small>Enviado também por WhatsApp${fan.consent.whatsapp ? "" : " (ative em Perfil)"}</small></div>` : ""}
      <div class="fms">${BP.MINU.map((c, i) => { const cost = c[2] * BP.XP_PER_REAL; const sp = c[3] && BP.SPONSORS.find(s => s.id === c[3]); return `<button class="fmi ${bal() < cost ? "lock" : ""}" data-minu="${i}"><span>${c[0]}</span><div><b>${esc(c[1])}</b><small>R$ ${c[2]} em valor${sp ? " · cortesia " + sp.n : ""}</small></div><em>${fmt(cost)} XP</em></button>`; }).join("")}</div>
      <div class="fsec">Medalhas</div><div class="fmedals">${Object.entries(BP.MEDALS).map(([k, m]) => `<div class="${fan.medals.includes(k) ? "on" : ""}"><span>${m[0]}</span>${m[1]}</div>`).join("")}</div><p class="ffoot">Integração Minu simulada · valores ilustrativos</p></div>`;
    } else if (scr === "me") {
      const c = fan.consent;
      h = `<div class="fct"><h3 class="fh3">Meu perfil</h3><div class="fprof"><i style="background:${BP.TEAMS[fan.team]}">${U.ini(fan.name)}</i><div><b>${esc(fan.name)}</b><small>${esc(fan.team)} · ${esc(fan.city)}/${esc(fan.uf)} · ${fan.id}</small></div></div>
      <div class="fsec">Central de privacidade</div><div class="ftoggles">${[["marketing", "Ofertas dos patrocinadores"], ["personalization", "Personalização"], ["push", "Notificações push"], ["whatsapp", "WhatsApp"], ["email", "E-mail"]].map(([k, l]) => `<label><span>${l}</span><input type="checkbox" data-consent="${k}" ${c[k] ? "checked" : ""}></label>`).join("")}</div>
      <button class="fcta ghost" id="myData">Ver meus dados (LGPD)</button>${tmp.mydata ? `<pre class="fpre">${esc(JSON.stringify(myData(), null, 1))}</pre>` : ""}
      <button class="fcta ghost danger" id="del">Excluir minha conta</button><p class="ffoot">Seus dados de participação ficam no Band Pass. Marcas só veem segmentos agregados.</p></div>`;
    }
    root.innerHTML = `<div class="fapp">${header()}${h}${nav()}<div class="ftoast"></div></div>`;
    if (scr === "quiz" && qs.ans == null) timer();
    if (scr === "game") startGame();
  }
  function sched(p) { return p.days.length === 7 ? "Diário · " + p.s : p.days.join() === "1,2,3,4,5" ? "Seg a sex · " + p.s : p.s === "etapa" ? "Dias de etapa" : ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].filter((_, i) => p.days.includes(i)).join(", ") + " · " + p.s; }
  function progCard(p) { return `<button class="fprog" data-open="${p.id}" style="--c:${p.color}"><div><b>${esc(p.n)}</b><small>${esc(p.host)}</small><small>${sched(p)}</small></div>${BP.onAir(p) ? '<span class="flive">AO VIVO</span>' : `<em>${p.ch.map(c => BP.CHANNELS.find(x => x.id === c).ic).join(" ")}</em>`}</button>`; }
  function ixSub(p, ix) { if (ix === "poll") return (POLLS[p.id] || POLLS.ja).q; if (ix === "opinion") return p.id === "dbr" ? "3 provocações · 2× XP no rádio" : "3 provocações do Neto"; if (ix === "quiz") return "3 perguntas · bônus de velocidade"; if (OTHER[ix]) return OTHER[ix].q; if (ix === "var") return "Você decide o lance polêmico"; if (ix === "memory") return "Conte e receba resposta do AI Historian"; if (ix === "nota") return "Dê nota de 0 a 10"; if (ix.startsWith("game:")) return "Partida rápida · XP por desempenho"; return ""; }
  function myData() { const p = S.profiles.get(fan.id) || {}; return { band_pass_id: fan.id, apelido: fan.name, time: fan.team, cidade: fan.city + "/" + fan.uf, nascimento: fan.birth, consentimentos: fan.consent, xp: fan.xp, gasto_xp: fan.spent, medalhas: fan.medals, persona: p.persona, fan_score: p.score, interacoes: p.inter, programas: p.progs, jogos: p.games, resgates: p.rewards }; }
  function timer() { clearInterval(th); qs.t0 = Date.now(); const el = root.querySelector("#tmr"); th = setInterval(() => { const r = Math.max(0, 1 - (Date.now() - qs.t0) / 15000); if (el) el.style.width = r * 100 + "%"; if (r <= 0) { clearInterval(th); answer(-1); } }, 100); }
  function answer(i) { if (qs.ans != null) return; clearInterval(th); const q = QUIZ[qs.i], ok = i === q.a, sec = (Date.now() - qs.t0) / 1000, xp = ok ? 150 + Math.max(0, Math.round(30 * (1 - sec / 15))) : 0; qs.ans = i; if (ok) qs.ok++; addXP(xp, ok ? "acerto" : ""); emit("quiz", "ja", { i: qs.i, ok, xp }); render(); }
  function startGame() {
    const host = root.querySelector("#gameHost"); if (!host) return;
    const g = ctx.game, sp = g === "penalti" ? "pulso" : "rota";
    emit("game_start", ctx.prog || "bec", { game: g, xp: 0 });
    game = BP.Games.start(g, host, score => {
      const xp = g === "penalti" ? score * 60 + (score >= 4 ? 100 : 0) : Math.round(score / 10);
      fan.games = fan.games || {}; fan.games[g] = Math.max(fan.games[g] || 0, score); addXP(xp, "no jogo"); touch(ctx.prog || "bec");
      emit("game_end", ctx.prog || "bec", { game: g, score, xp, sponsor: sp });
      if (g === "penalti" && score >= 4) medal("artilheiro"); if (g === "stock" && score >= 1200) medal("piloto");
      const end = root.querySelector("#gameEnd"); if (end) end.innerHTML = `<div class="fend"><b>${g === "penalti" ? score + " de 5 gols" : fmt(score) + " pontos"}</b><span>+${fmt(xp)} XP · ${g === "penalti" ? "Pulso Energy" : "Rota Bank"} agradece</span><button class="fcta" data-game="${g}">Jogar de novo</button></div>`;
    });
  }
  function openIx(ix) {
    const p = BP.prog(ctx.prog); touch(p.id);
    if (ix === "poll") { ctx.cfg = { ...(POLLS[p.id] || POLLS.ja), type: "poll" }; scr = "poll"; }
    else if (ix === "var") { ctx.cfg = { ...VAR, type: "var" }; scr = "poll"; }
    else if (OTHER[ix]) { ctx.cfg = OTHER[ix]; scr = "poll"; }
    else if (ix === "quiz") { qs = { i: 0, ans: null, ok: 0 }; scr = "quiz"; }
    else if (ix === "opinion") { ctx.i = 0; [0, 1, 2].forEach(i => delete fan.votes["db-op" + i]); scr = "opinion"; }
    else if (ix === "memory") { tmp.hist = null; tmp.mom = null; scr = "memory"; }
    else if (ix === "nota") scr = "nota";
    else if (ix.startsWith("game:")) { ctx.game = ix.split(":")[1]; ctx.gameFrom = "prog"; scr = "game"; }
    ctx.ix = ix; render();
  }
  function done(k) { fan.done[ctx.prog + ":" + k] = 1; save(); }
  async function historian(moment, text) {
    const fb = `Que memória, ${fan.name}! "${moment}" é o tipo de momento que o acervo da Band guarda com carinho. Sua lembrança entra agora na linha do tempo da História Viva, ao lado das imagens daquele dia. Quer ver o trecho?`;
    const r = await BP.llm(`Você é o AI Historian do Band Playverse (quadro História Viva, Grupo Bandeirantes). Um torcedor do ${fan.team} contou uma memória. Momento: ${moment}. Relato: ${text || "(sem texto)"}. Responda em português do Brasil, em 2 ou 3 frases calorosas, como um narrador esportivo, chamando-o de ${fan.name}. Use só fatos amplamente conhecidos; se não tiver certeza de um detalhe, não cite. Termine convidando a ver o trecho do acervo da Band. Sem emojis nem markdown.`, t => { const el = root.querySelector("#hist"); if (el) el.textContent = t; }, "quick");
    return r || fb;
  }

  /* ---------- eventos ---------- */
  root.addEventListener("click", async e => {
    const b = e.target.closest("button"); if (!b) return; const d = b.dataset;
    if (d.team) { tmp.team = d.team; syncTmp(); render(); return; }
    if (b.id === "o-go") { syncTmp(); if (!tmp.nm || !tmp.team || !tmp.c1) { toast("Preencha apelido, time e aceite os termos"); return; } const c = CITIES[+tmp.city || 0];
      fan = { id: "BP-" + Math.floor(30000 + Math.random() * 60000), name: tmp.nm, team: tmp.team, city: c[0], uf: c[1], region: c[2], birth: +tmp.birth || 1990, consent: { participation: true, marketing: !!tmp.c2, personalization: tmp.c3 !== false, push: !!tmp.c2, whatsapp: !!tmp.c2, email: false, date: Date.now(), version: "v1.3" }, xp: 0, spent: 0, medals: [], done: {}, votes: {}, progs: {}, games: {} };
      save(); emit("join", null, { xp: tmp.c2 ? 50 : 0 }, "QR na TV"); if (tmp.c2) addXP(50, "opt-in"); tmp = {}; scr = "home"; tab = "home"; render(); return; }
    if (d.tab) { tab = d.tab; scr = d.tab; tmp.voucher = null; tmp.mydata = false; render(); return; }
    if (d.back) { scr = scr === "game" && ctx.gameFrom && ctx.gameFrom !== "prog" ? ctx.gameFrom : "prog"; ctx.gameFrom = null; render(); return; }
    if (d.ch) { ctx.ch = d.ch; render(); return; }
    if (d.open) { ctx.prog = d.open; ctx.from = scr === "home" ? "home" : "progs"; scr = "prog"; emit("view_program", d.open, { xp: 0 }); render(); return; }
    if (d.ix) { openIx(d.ix); return; }
    if (d.game) { const pp = ctx.prog && BP.prog(ctx.prog); if (scr !== "game") ctx.gameFrom = scr; if (!(pp && pp.ix.includes("game:" + d.game))) ctx.prog = d.game === "stock" ? "stock" : "bec"; ctx.game = d.game; if (scr === "game") { scr = "x"; render(); } scr = "game"; render(); return; }
    if (d.vote != null && scr === "opinion") { const i = ctx.i || 0, key = "db-op" + i, v = +d.vote; if (fan.votes[key] != null) return; fan.votes[key] = v; const radio = ctx.prog === "dbr"; const xp = radio ? 120 : 60; addXP(xp, radio ? "(2× no rádio)" : v === 2 ? "desafiou o Neto" : ""); emit("opinion", ctx.prog, { key, i, c: v, xp }, radio ? "Rádio" : "App"); render(); return; }
    if (d.vote != null) { const c = ctx.cfg, v = +d.vote; if (fan.votes[c.key] != null) return; fan.votes[c.key] = v; addXP(c.xp); done(ctx.ix); emit(c.type === "bolao" ? "bolao" : c.type === "var" ? "var" : "poll", ctx.prog, { key: c.key, c: v, xp: c.xp }, BP.prog(ctx.prog).ch[0] === "radio" ? "Rádio" : "App"); if (fan.votes["af-var"] != null && fan.votes["af-arb"] != null) medal("comentarista"); render(); return; }
    if (d.ans != null) { answer(+d.ans); return; }
    if (d.qn) { if (qs.i < 2) { qs = { i: qs.i + 1, ans: null, ok: qs.ok }; render(); } else { done("quiz"); scr = "prog"; render(); toast(`Quiz: ${qs.ok}/3 acertos`); } return; }
    if (d.opn) { if ((ctx.i || 0) < 2) { ctx.i++; render(); } else { done("opinion"); fan.opCount = (fan.opCount || 0) + 3; save(); if (fan.opCount >= 3) medal("polemico"); scr = "prog"; render(); } return; }
    if (d.mom != null) { tmp.mt = (root.querySelector("#mtxt") || {}).value || tmp.mt; tmp.mom = +d.mom; render(); return; }
    if (b.id === "mGo") { const moment = MOMENTS[tmp.mom], text = (root.querySelector("#mtxt").value || "").slice(0, 400); tmp.hist = ""; addXP(200, "memória"); done("memory"); medal("memoria"); emit("memory", ctx.prog, { moment, text, xp: 200 }); render(); const r = await historian(moment, text); tmp.hist = r; if (scr === "memory") render(); return; }
    if (b.id === "nGo") { const v = +root.querySelector("#nslider").value; fan.votes["stu-nota"] = v; addXP(60); done("nota"); emit("nota", ctx.prog, { key: "stu-nota", c: v, xp: 60 }); render(); return; }
    if (d.minu != null) { const c = BP.MINU[+d.minu], cost = c[2] * BP.XP_PER_REAL; if (bal() < cost) { toast(`Faltam ${fmt(cost - bal())} XP`); return; } fan.spent = (fan.spent || 0) + cost; save(); const sp = c[3] && BP.SPONSORS.find(s => s.id === c[3]); tmp.voucher = { n: c[1], k: Math.floor(1000 + Math.random() * 9000), sp: sp && sp.n }; emit("reward", null, { item: c[1], xp: cost, value: c[2], sponsored: !!c[3] }); toast("Voucher emitido via Minu"); render(); return; }
    if (b.id === "myData") { tmp.mydata = !tmp.mydata; render(); return; }
    if (b.id === "del") { U.ls.del(KEY); fan = null; scr = "onboard"; tmp = {}; render(); return; }
  });
  root.addEventListener("change", e => { const t = e.target; if (t.dataset.consent) { fan.consent[t.dataset.consent] = t.checked; save(); emit("consent", null, { field: t.dataset.consent, value: t.checked, xp: 0 }); toast("Preferência salva"); } if (t.id && t.id.startsWith("o-")) syncTmp(); });
  root.addEventListener("input", e => { if (e.target.id === "nslider") root.querySelector("#nv").textContent = e.target.value; if (e.target.id === "o-nm") tmp.nm = e.target.value; });
  function syncTmp() { const g = id => root.querySelector("#" + id); if (!g("o-nm")) return; tmp.nm = g("o-nm").value.trim(); tmp.city = g("o-city").value; tmp.birth = g("o-birth").value; tmp.c1 = g("o-c1").checked; tmp.c2 = g("o-c2").checked; tmp.c3 = g("o-c3").checked; }
  let rt = 0, rp = null; const live = ["home", "poll", "opinion", "games"];
  BP.on(ev => { if (!fan || !live.includes(scr)) return; if (scr === "poll" && ctx.cfg && fan.votes[ctx.cfg.key] == null) return; if (scr === "opinion" && fan.votes["db-op" + (ctx.i || 0)] == null) return; if (ev.fan && ev.fan.id === fan.id && scr !== "home") return; const now = Date.now(); if (now - rt > 1500) { rt = now; render(); } else if (!rp) rp = setTimeout(() => { rp = null; rt = Date.now(); if (live.includes(scr)) render(); }, 1500); });
  render();
  return { render, reset: () => { U.ls.del(KEY); fan = null; scr = "onboard"; render(); } };
};
})();
