/* Band Playverse · shell: modos de visualização, Band AI, roteiro, QR */
(function(){
const U = BP.u, $ = U.$, esc = U.esc;
const APP_URL = "";
BP.toast = t => { const e = $("#toast"); e.textContent = t; e.classList.add("on"); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove("on"), 2400); };
BP.modal = (title, html) => { $("#modal").innerHTML = `<div class="mbox"><div class="mh"><b>${esc(title)}</b><span class="sp"></span><button class="btn sm" data-close="1">Fechar</button></div><div class="mbd">${html}</div></div>`; $("#modal").classList.remove("hide"); };
document.addEventListener("click", e => { if (e.target.dataset && (e.target.dataset.close || e.target.id === "modal")) $("#modal").classList.add("hide"); });

const isPhone = location.hash === "#fa" || (!location.hash && innerWidth < 720);
if (isPhone) {
  document.body.classList.add("phone-only");
  $("#app").innerHTML = `<div id="fanFull" class="fanfull"></div>`;
  BP.Fan($("#fanFull"));
  return;
}
let mode = U.ls.get("bpx-mode") || "pres";
$("#app").innerHTML = `<header class="top"><div class="tbrand"><div class="mk">VF</div><div><b>BAND <span>PLAYVERSE</span></b><small>Demo funcional · Virtual Fans + ClubBrain.ai</small></div></div>
<div class="modes">${[["pres", "Apresentação"], ["fan", "App do fã"], ["bo", "Backoffice"]].map(([k, l]) => `<button data-mode="${k}">${l}</button>`).join("")}</div><span class="sp"></span>
<div class="seg" id="bots" title="Audiência simulada"><button data-l="0">Plateia: off</button><button data-l="1">baixa</button><button data-l="2">alta</button></div>
<button class="hb" id="qrBtn">📱 Abrir no celular</button><button class="hb" id="rotBtn">Roteiro</button><button class="hb" id="rstBtn">Reiniciar</button></header>
<div class="stage" id="stage"><div class="phonecol"><div class="phone"><div class="notch"></div><div class="pscr" id="fanPhone"></div></div><p class="pcap">App do fã · Band Pass</p></div><div class="bocol" id="bo"></div></div>
<div class="drawer" id="ai"><div class="dh"><b>Band AI</b><small>IA real · consulta CDP, ontologia, marketing e ERP</small><span class="sp"></span><button class="btn sm" id="aiX">Fechar</button></div><div class="msgs" id="msgs"></div><div class="sugs" id="sugs"></div><form class="ask" id="askF"><input id="askI" placeholder="Pergunte sobre fãs, programas, segmentos, receita..." autocomplete="off"><button class="btn p">Enviar</button></form></div>`;
BP.Fan($("#fanPhone"));
BP.BO.mount($("#bo"));
const setMode = m => { mode = m; U.ls.set("bpx-mode", m); $("#stage").className = "stage m-" + m; document.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("on", b.dataset.mode === m)); };
setMode(mode);
/* modo embutido (?embed=1): usado quando a demo roda dentro de outro painel, ex.: o ClubBrain OS. A página vem do hash: #pres, #fan ou uma página do backoffice (#cdp, #hub...) */
if (new URLSearchParams(location.search).get("embed") === "1") {
  document.body.classList.add("embed");
  const route = () => { const h = location.hash.slice(1) || "analytics"; if (h === "fan") setMode("fan"); else if (h === "pres") setMode("pres"); else { setMode("bo"); if (BP.BO.go) BP.BO.go(h); } };
  route(); window.addEventListener("hashchange", route);
}
document.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => setMode(b.dataset.mode));
const setBots = l => { BP.setBots(l); document.querySelectorAll("#bots button").forEach(b => b.classList.toggle("on", +b.dataset.l === l)); };
$("#bots").onclick = e => { const b = e.target.closest("button"); if (b) setBots(+b.dataset.l); };
setBots(1);
$("#rstBtn").onclick = () => BP.reset();
$("#qrBtn").onclick = () => { const url = (APP_URL.startsWith("http") ? APP_URL : location.href.split("#")[0]) + "#fa"; BP.modal("Abrir o app do fã no celular", `<div class="qrwrap"><div id="qrc"></div><div><p>Aponte a câmera do celular para abrir o <b>app do fã</b>. As interações aparecem neste backoffice em tempo real.</p><p class="mut" style="font-size:12px">${esc(url)}</p><p class="note">Na mesma máquina, as janelas conversam entre si em tempo real. Entre aparelhos diferentes, o tempo real depende do backend de eventos (próximo passo do MVP).</p></div></div>`); try { new QRCode($("#qrc"), { text: url, width: 180, height: 180, colorDark: "#0a0d1a", colorLight: "#fff" }); } catch (e) { $("#qrc").innerHTML = "<p class='mut'>QR indisponível</p>"; } };
$("#rotBtn").onclick = () => BP.modal("Roteiro da demo · 15 minutos", `<div class="rot">${[
  ["1 · O fã chega pela TV", "No celular, crie o Band Pass com consentimento LGPD. No backoffice, abra CDP · Perfis: o fã aparece em dourado, ao vivo.", "Lilian e Johnny"],
  ["2 · Navega pela Band", "Programas → TV aberta, BandSports, rádio e YouTube, com a grade de 2026. Entre no Os Donos da Bola e responda ao Neto. Depois faça o 2º turno no rádio (2× XP).", "Denis"],
  ["3 · Joga", "Jogos → Pênalti do Craque e Stock Car Reta Final (Phaser). Cada partida gera XP, mídia para o patrocinador e um CPM no ERP.", "Denis e comercial"],
  ["4 · Troca na Minu", "Carteira → troque XP por uma micro-recompensa. Veja o resgate em Recompensas, a despesa no ERP e o recibo em Marketing.", "Johnny"],
  ["5 · A inteligência", "Analytics, Segmentos (crie um no construtor), Marketing (jornada TV → rádio disparando) e Modelo de dados (o que coletar e o que não coletar).", "Lilian"],
  ["6 · Integrações", "Integration Hub: Vibra, CRM, mídia paga, WhatsApp, Minu e ERP. Clique e veja o mapeamento. Em ERP, troque SAP, TOTVS, Oracle ou REST e gere um pedido de cota.", "Lilian e financeiro"],
  ["7 · Bastidores", "Media Ontology Studio: o grafo do fã que acabou de jogar, a linhagem do toque até o lançamento contábil e o inspetor de eventos.", "Todos"],
  ["8 · Pergunte à Band AI", "\"Quais fãs da sessão devo ativar para a Stock Car e com qual oferta?\"", "Johnny"]].map(([t, d, w]) => `<div><b>${t}</b><p>${d}</p><small>Para: ${w}</small></div>`).join("")}</div>`);
/* Band AI */
const CHAT = [];
const SUGS = ["Quais fãs desta sessão devo ativar para a Stock Car, e com qual oferta?", "Resuma o que aconteceu nos últimos minutos para a diretoria.", "Que dados a Band deveria priorizar no CDP nos primeiros 90 dias?", "Qual o resultado 50/50 até agora e o que falta validar?"];
const renderChat = () => { $("#msgs").innerHTML = CHAT.map(m => m.r === "u" ? `<div class="m u">${esc(m.t)}</div>` : `<div class="m a"><div class="who">Band AI</div>${U.md(m.t || "…")}</div>`).join("") || `<div class="m a"><div class="who">Band AI</div><p>Eu leio o CDP, a ontologia, o marketing e o financeiro desta sessão em tempo real. Pergunte o que quiser.</p></div>`; $("#msgs").scrollTop = 1e9; $("#sugs").innerHTML = SUGS.map(s => `<button class="sug">${esc(s)}</button>`).join(""); };
$("#aiX").onclick = () => $("#ai").classList.remove("on");
document.addEventListener("click", e => { if (e.target.id === "aiOpen") { $("#ai").classList.add("on"); renderChat(); } });
$("#sugs").onclick = e => { const b = e.target.closest(".sug"); if (b) ask(b.textContent); };
$("#askF").onsubmit = e => { e.preventDefault(); const v = $("#askI").value; $("#askI").value = ""; ask(v); };
async function ask(q) {
  if (!q.trim()) return; CHAT.push({ r: "u", t: q }); const m = { r: "a", t: "" }; CHAT.push(m); renderChat();
  const sys = `Você é a Band AI, agente executivo da plataforma Band Playverse (Virtual Fans + ClubBrain.ai) para o Grupo Bandeirantes. Responda à diretoria da Band em português do Brasil, direto: no máximo 170 palavras, 3 a 5 tópicos iniciados por "- " e uma linha final "Próximo passo: ...". Use **negrito** só em números-chave. Cite fãs reais da sessão pelo nome quando ajudar. Use só os dados do contexto e diga quando algo é projeção ou simulação. Respeite as regras.\nCONTEXTO AO VIVO (JSON):\n${JSON.stringify(BP.BO.ctx())}`;
  const hist = CHAT.slice(0, -1).slice(-5).map(x => ({ role: x.r === "u" ? "user" : "assistant", content: x.t || "-" }));
  const r = await BP.llm([{ role: "user", content: sys + "\n\nOk?" }, { role: "assistant", content: "Entendido." }, ...hist.slice(0, -1), { role: "user", content: q }], t => { m.t = t; renderChat(); });
  if (!r) { const c = BP.BO.ctx(); m.t = `**Leitura da sessão (modo offline)**\n- ${c.perfis_sessao} perfis, ${c.opt_in_pct}% com opt-in de marcas.\n- Programa com mais interações: ${Object.entries(c.interacoes_por_programa).sort((a, b) => b[1] - a[1])[0]?.[0] || "—"}.\n- ${c.resgates_minu} resgates Minu na sessão.\nPróximo passo: ativar o segmento "Fãs de velocidade" com o bolão da Stock Car.`; } else m.t = r;
  renderChat();
}
})();
