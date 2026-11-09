/* Band Playverse · núcleo: dados, barramento de eventos e pipeline (CDP → segmentos → marketing → ERP → ontologia) */
(function(){
const BP = window.BP = {};
/* ---------- util ---------- */
let seed = 20261109; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = a => a[Math.floor(rnd() * a.length)];
const rpick = a => a[Math.floor(Math.random() * a.length)];
BP.u = {
  $: s => document.querySelector(s),
  uid: () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4),
  fmt: n => Math.round(n || 0).toLocaleString("pt-BR"),
  brl: n => "R$ " + Math.round(n || 0).toLocaleString("pt-BR"),
  brl2: n => "R$ " + (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  kk: n => n >= 1e6 ? (n / 1e6).toFixed(1).replace(".", ",") + "M" : n >= 1e4 ? Math.round(n / 1e3) + "K" : Math.round(n).toLocaleString("pt-BR"),
  esc: s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
  ini: n => String(n || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase(),
  time: t => new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  ls: { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } },
  nowSP() { return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })); },
  md(s) { const e = BP.u.esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"); return e.split(/\n/).map(l => /^\s*[-•]\s+/.test(l) ? `<li>${l.replace(/^\s*[-•]\s+/, "")}</li>` : (l.trim() ? `<p>${l}</p>` : "")).join("").replace(/(<li>.*?<\/li>)+/g, m => `<ul>${m}</ul>`); }
};
const U = BP.u;

/* ---------- catálogos ---------- */
BP.TEAMS = { Corinthians: "#f1f1f1", Palmeiras: "#1fa35a", "São Paulo": "#e53935", Santos: "#9aa6bd", Flamengo: "#c8102e", Vasco: "#222", Outros: "#8b6cff" };
BP.SPONSORS = [
  { id: "pulso", n: "Pulso Energy", c: "Bebida energética" }, { id: "brasa", n: "Brasa Burger", c: "Delivery" },
  { id: "vila", n: "Mercado Vila", c: "Supermercado" }, { id: "rota", n: "Rota Bank", c: "Banco digital" }, { id: "atl", n: "Atlântica Seguros", c: "Seguros" }
];
BP.CHANNELS = [
  { id: "tv", n: "TV aberta", ic: "📺" }, { id: "bs", n: "BandSports", ic: "🏟️" }, { id: "radio", n: "Rádio", ic: "📻" }, { id: "yt", n: "YouTube", ic: "▶️" }
];
/* grade 2026 (pesquisa 09/11/2026); horários marcados com tbc estão a confirmar com a Band */
BP.PROGRAMS = [
  { id: "ja", n: "Jogo Aberto", host: "Renata Fan", ch: ["tv", "yt"], days: [1, 2, 3, 4, 5], s: "11:00", e: "12:50", color: "#2f6bff", sponsor: "pulso", ix: ["poll", "quiz", "game:penalti"], tag: "O torcedor vira comentarista" },
  { id: "db", n: "Os Donos da Bola", host: "Craque Neto", ch: ["tv", "yt"], days: [1, 2, 3, 4, 5], s: "12:50", e: "14:30", color: "#ff6a1a", sponsor: "brasa", ix: ["opinion", "game:penalti"], tag: "Concorde ou desafie o Neto" },
  { id: "dbr", n: "Os Donos da Bola · Rádio", host: "Neto, Sergio e Leandro Guerreiro", ch: ["radio", "yt"], days: [1, 2, 3, 4, 5], s: "18:00", e: "19:00", tbc: 1, color: "#ff6a1a", sponsor: "brasa", ix: ["opinion"], tag: "2º turno do desafio: 2× XP" },
  { id: "af", n: "Apito Final", host: "Neto, Marília Ruiz, Quesada e Godói", ch: ["tv"], days: [1], s: "22:30", e: "23:59", color: "#f5b82e", sponsor: "rota", ix: ["var", "poll"], tag: "VAR da audiência" },
  { id: "bec", n: "Band Esporte Clube", host: "Kalinka Schutel", ch: ["tv"], days: [6], s: "12:00", e: "13:00", tbc: 1, color: "#22c55e", sponsor: "vila", ix: ["game:penalti", "game:stock"], tag: "Novo formato com games" },
  { id: "se", n: "Show do Esporte", host: "Equipe Band", ch: ["tv"], days: [0], s: "12:00", e: "18:00", tbc: 1, color: "#a86bff", sponsor: "atl", ix: ["memory", "gincana"], tag: "História Viva e Gincana das Torcidas" },
  { id: "stock", n: "Stock Car", host: "Sérgio Maurício", ch: ["tv", "bs"], days: [0], s: "etapa", e: "", color: "#ef4444", sponsor: "rota", ix: ["bolao", "game:stock"], tag: "Exclusiva na Band · bolão do pódio" },
  { id: "indy", n: "Fórmula Indy", host: "Geferson Kern e Reginaldo Leme", ch: ["tv"], days: [0], s: "etapa", e: "", color: "#0ea5e9", sponsor: "rota", ix: ["indy"], tag: "Palpite de corrida" },
  { id: "res", n: "Resenha", host: "Pedro Martelli e equipe", ch: ["radio", "yt"], days: [1, 2, 3, 4, 5], s: "17:00", e: "18:00", color: "#14b8a6", sponsor: "brasa", ix: ["poll"], tag: "Bate-papo com o ouvinte" },
  { id: "eed", n: "Esporte em Debate", host: "Capriotti, Praetzel, Quesada e Gavazzi", ch: ["radio", "yt"], days: [1, 2, 3, 4, 5], s: "21:00", e: "22:30", tbc: 1, color: "#0ea5e9", sponsor: "atl", ix: ["poll"], tag: "Palpite do ouvinte" },
  { id: "bna", n: "BandNews na Área", host: "Mauricio Ferreira e Bruno Camarão", ch: ["radio", "yt"], days: [0, 1, 2, 3, 4, 5, 6], s: "20:30", e: "22:00", tbc: 1, color: "#e11d48", sponsor: "pulso", ix: ["poll"], tag: "Diário · NBA, NFL e F1 no rádio" },
  { id: "stu", n: "STU · Skate", host: "BandSports", ch: ["bs", "tv"], days: [], s: "etapa", e: "", color: "#eab308", sponsor: "pulso", ix: ["nota"], tag: "Dê a nota da manobra" },
  { id: "pbr", n: "Mundo PBR", host: "BandSports", ch: ["bs"], days: [3], s: "11:30", e: "12:00", color: "#b45309", sponsor: "vila", ix: ["pbr"], tag: "Rodeio: o peão para 8 segundos?" }
];
BP.prog = id => BP.PROGRAMS.find(p => p.id === id);
BP.onAir = p => { const d = U.nowSP(); if (!p.days.includes(d.getDay()) || !p.e) return false; const m = d.getHours() * 60 + d.getMinutes(); const [a, b] = p.s.split(":").map(Number), [c, e] = p.e.split(":").map(Number); return m >= a * 60 + b && m <= c * 60 + e; };
BP.MINU = [["📱", "Recarga de celular", 10, null], ["🚗", "Crédito de corrida por app", 15, null], ["🍔", "Vale-delivery", 20, "brasa"], ["🎬", "Ingresso de cinema", 25, null], ["🎧", "1 mês de streaming de música", 22, null], ["🛒", "Vale-supermercado", 30, "vila"], ["⚡", "Bebida energética", 8, "pulso"]];
BP.XP_PER_REAL = 100;
BP.MEDALS = { comentarista: ["🎙️", "Comentarista"], polemico: ["🔥", "Polêmico"], artilheiro: ["⚽", "Artilheiro"], piloto: ["🏁", "Piloto"], memoria: ["📼", "Memória viva"], explorador: ["🌐", "Explorador"] };
BP.PERSONAS = { "Superfã do clássico": "#2f6bff", "Ouvinte fiel do rádio": "#14b8a6", "Fã de velocidade": "#ef4444", "Nostálgico do acervo": "#a86bff", "Gamer de fim de semana": "#22c55e", "Casual": "#64748b" };

/* ---------- modelo de dados sugerido para o CDP da Band ---------- */
BP.SCHEMA = [
  { g: "Identidade", d: "Quem é o fã, de forma única entre TV, rádio e digital", f: [
    ["band_pass_id", "ID", "BP-10231", "Gerado no cadastro", "Execução do serviço", "Chave única do fã em todo o grupo"],
    ["apelido / nome", "texto", "Cassio S.", "Cadastro", "Execução do serviço", "Ranking e personalização"],
    ["e-mail", "texto (hash)", "c***@gmail.com", "Cadastro / Minha Band", "Execução do serviço", "Login, recibos e e-mail marketing (se opt-in)"],
    ["celular (WhatsApp)", "texto (hash)", "+55 11 9****-1234", "Cadastro", "Consentimento", "WhatsApp, antifraude de resgate"],
    ["CPF", "texto (cifrado)", "opcional", "Resgate de recompensa", "Execução do serviço", "Só para resgates acima de um valor (antifraude)"],
    ["ano de nascimento / faixa etária", "número", "1991 · 25–34", "Cadastro", "Execução do serviço", "Classificação indicativa e segmentação por faixa"],
    ["cidade · UF · praça", "texto", "Campinas · SP · Band Campinas", "Cadastro / IP aproximado", "Legítimo interesse", "Conteúdo regional (Séries C e D) e praças comerciais"],
    ["IDs vinculados", "lista", "Bandplay, YouTube, Minha Band", "Login social / SSO", "Consentimento", "Unificar consumo entre plataformas (Identity Graph)"],
    ["dispositivos", "lista", "Android · Smart TV", "SDK do app", "Legítimo interesse", "Push e segunda tela"]] },
  { g: "Consentimento (LGPD)", d: "O que o fã autorizou, quando e onde", f: [
    ["base legal por finalidade", "objeto", "participação: contrato · marketing: consentimento", "Termo aceito", "—", "Prova de conformidade"],
    ["opt-in marketing", "booleano + data", "sim · 09/11/2026 11:42", "Cadastro / central de privacidade", "Consentimento", "Ofertas de patrocinadores"],
    ["opt-in por canal", "objeto", "push ✓ · WhatsApp ✓ · e-mail ✗", "Central de privacidade", "Consentimento", "Respeitar canal preferido"],
    ["personalização", "booleano", "sim", "Central de privacidade", "Consentimento", "Recomendações e próxima melhor ação"],
    ["versão do termo · canal de coleta", "texto", "v1.3 · QR no Jogo Aberto", "Sistema", "—", "Auditoria"]] },
  { g: "Preferências e afinidades", d: "O que o fã ama: o coração da segmentação", f: [
    ["time do coração (+ 2º time)", "texto", "Corinthians · Bahia", "Cadastro / comportamento", "Execução do serviço", "Disputa das torcidas, conteúdo do clube"],
    ["modalidades", "lista", "futebol, automobilismo, skate", "Comportamento", "Legítimo interesse", "Vertical certa: Stock Car, Indy, STU, PBR"],
    ["programas e apresentadores favoritos", "lista", "Donos da Bola · Neto", "Comportamento", "Legítimo interesse", "Grade personalizada e lembretes"],
    ["plataformas de consumo", "objeto", "TV 60% · rádio 25% · YouTube 15%", "Eventos", "Legítimo interesse", "Jornada cross-tela (TV → rádio)"],
    ["horários de consumo", "lista", "almoço, noite", "Eventos", "Legítimo interesse", "Hora certa do push"]] },
  { g: "Comportamento", d: "O que o fã faz, em cada programa e canal", f: [
    ["interações por programa e tipo", "contadores", "palpite 14 · quiz 9 · opinião 22", "Eventos", "Execução do serviço", "Engajamento por programa (relatório ao patrocinador)"],
    ["jogos: partidas e recordes", "objeto", "Pênalti 4/5 · Reta Final 1.240 pts", "Eventos", "Execução do serviço", "Ranking, medalhas e cota de games"],
    ["acertos de palpite e quiz", "taxa", "62%", "Eventos", "Execução do serviço", "Perfil 'especialista' e conteúdo"],
    ["opiniões (concordância com o Neto)", "taxa", "30% concorda", "Eventos", "Execução do serviço", "Pauta e provocações no ar"],
    ["memórias enviadas ao acervo", "lista", "Copa 2002", "Eventos", "Consentimento", "História Viva (curadoria editorial)"],
    ["recência · frequência · sequência", "números", "há 2 dias · 3×/semana · 5 dias", "Eventos", "Legítimo interesse", "Retenção e risco de evasão"],
    ["canal de origem", "texto", "QR na TV", "Primeiro evento", "Legítimo interesse", "Atribuição: qual programa traz fãs"]] },
  { g: "Valor e comercial", d: "Como o fã gera receita, sempre agregado para o anunciante", f: [
    ["XP · nível · saldo", "números", "2.340 XP · Superfã", "Gamificação", "Execução do serviço", "Programa de benefícios"],
    ["resgates (categoria Minu)", "lista", "delivery, cinema", "Minu", "Execução do serviço", "Sinal de consumo para segmentos"],
    ["cupons usados por patrocinador", "lista", "Pulso Energy ×2", "Patrocinadores", "Consentimento", "Prova de resultado ao anunciante"],
    ["exposição a patrocinadores", "contadores", "Pulso 18 impressões", "Eventos", "Legítimo interesse", "Relatório de entrega das cotas"],
    ["valor estimado (LTV)", "R$", "R$ 84/ano", "Modelo", "Legítimo interesse", "Priorizar investimento em retenção"]] },
  { g: "Predição (modelos ClubBrain)", d: "O que o fã deve fazer em seguida", f: [
    ["Fan Score", "0–100", "78", "Modelo", "Legítimo interesse", "Nível de paixão e engajamento"],
    ["risco de evasão", "%", "12%", "Modelo", "Legítimo interesse", "Disparo de retenção"],
    ["persona", "categoria", "Fã de velocidade", "Clusterização", "Legítimo interesse", "Comunicação e oferta"],
    ["propensão por categoria de marca", "objeto", "delivery 0,71 · banco 0,42", "Modelo", "Consentimento", "Venda de segmentos agregados"],
    ["próxima melhor ação", "texto", "Bolão da Stock Car com 2× XP", "Agente", "Legítimo interesse", "Orquestração pelos agentes"]] }
];
BP.NOCOLLECT = ["Dados sensíveis (saúde, religião, orientação sexual, biometria)", "Opinião política ou intenção de voto: a Band cobre eleições, e esse dado não deve entrar no perfil", "Dados de menores de 18 anos sem consentimento dos responsáveis", "Venda de dado pessoal individual a patrocinadores: só segmentos agregados"];

/* ---------- conectores do Integration Hub ---------- */
BP.CONNECTORS = [
  { id: "vf", cat: "Experiência", n: "App Virtual Fans (SDK)", ex: "Este app", st: "live", dir: "in", obj: ["Fã", "Interação", "Jogo"], auth: "SDK + token de app", d: "Todos os eventos do fã chegam por aqui." },
  { id: "qr", cat: "Broadcast", n: "Playout · QR na tela", ex: "Gerador de caracteres", st: "sim", dir: "out", obj: ["Exibição", "Pergunta no ar"], auth: "API interna", d: "Coloca a pergunta e o QR no ar e devolve o resultado para a tela." },
  { id: "sso", cat: "Identidade", n: "Login Band (Minha Band)", ex: "SSO / OAuth", st: "sim", dir: "both", obj: ["Fã"], auth: "OAuth 2.0", d: "Um login para Bandplay, site e Band Pass." },
  { id: "bp", cat: "Streaming", n: "Bandplay", ex: "App e web", st: "sim", dir: "in", obj: ["Sessão de consumo"], auth: "API + webhook", d: "Consumo ao vivo e sob demanda." },
  { id: "yt", cat: "Streaming", n: "YouTube Live", ex: "Data API (chat, enquetes)", st: "sim", dir: "in", obj: ["Interação", "Audiência"], auth: "OAuth 2.0", d: "Chat e enquetes do Esporte na Band e do BandNews Esportes." },
  { id: "vibra", cat: "Dados", n: "Vibra Digital · data lake", ex: "ex.: BigQuery", st: "att", dir: "out", obj: ["Eventos", "Perfis (consentidos)"], auth: "Service account", d: "Dados com consentimento seguem para o data lake da Band. Arquitetura a validar com a Vibra." },
  { id: "ga", cat: "Dados", n: "Web analytics", ex: "ex.: Google Analytics 4", st: "sim", dir: "in", obj: ["Sessão web"], auth: "API", d: "Tráfego de band.com.br e páginas dos programas." },
  { id: "crm", cat: "CRM", n: "CRM corporativo", ex: "ex.: Salesforce, HubSpot, Dynamics", st: "sim", dir: "both", obj: ["Contato", "Conta (patrocinador)"], auth: "OAuth 2.0", d: "Contatos dos fãs com opt-in e contas comerciais dos patrocinadores." },
  { id: "mkt", cat: "Marketing", n: "Automação de marketing", ex: "ex.: RD Station, SFMC, Braze", st: "sim", dir: "out", obj: ["Audiência", "Jornada"], auth: "API key", d: "Recebe audiências e gatilhos de jornada." },
  { id: "push", cat: "Marketing", n: "Push notifications", ex: "ex.: Firebase Cloud Messaging", st: "sim", dir: "out", obj: ["Mensagem"], auth: "Service account", d: "Lembretes de programa e desafios." },
  { id: "wa", cat: "Marketing", n: "WhatsApp Business API", ex: "BSP homologado", st: "sim", dir: "out", obj: ["Mensagem"], auth: "Token BSP", d: "Vouchers, desafios e lembretes com template aprovado." },
  { id: "ads", cat: "Mídia", n: "Audiências de mídia paga", ex: "ex.: Google Customer Match, Meta Custom Audiences", st: "sim", dir: "out", obj: ["Audiência (hash SHA-256)"], auth: "OAuth 2.0", d: "Lookalikes e retargeting de segmentos com opt-in." },
  { id: "adsrv", cat: "Mídia", n: "Ad server Band", ex: "Inventário digital", st: "sim", dir: "both", obj: ["Cota", "Impressão"], auth: "API", d: "Entrega e mede as cotas novas (games, quiz patrocinado)." },
  { id: "minu", cat: "Recompensas", n: "Minu", ex: "Micro-recompensas e clube de benefícios", st: "att", dir: "both", obj: ["Resgate", "Voucher"], auth: "API key + webhook", d: "Catálogo e emissão de vouchers. A contratar e homologar." },
  { id: "erp", cat: "ERP", n: "ERP (genérico)", ex: "ex.: SAP S/4HANA, TOTVS Protheus, Oracle", st: "sim", dir: "out", obj: ["Pedido", "Título a receber", "Título a pagar"], auth: "API REST / SOAP / arquivo", d: "Faturamento pela VF, contas a pagar das recompensas e conciliação 50/50." },
  { id: "nfe", cat: "ERP", n: "Emissor de NF-e / NFS-e", ex: "Fiscal", st: "sim", dir: "out", obj: ["Nota fiscal"], auth: "Certificado A1", d: "Nota das cotas vendidas aos patrocinadores." },
  { id: "pay", cat: "Pagamentos", n: "Gateway / Pix", ex: "Cobrança", st: "sim", dir: "in", obj: ["Pagamento"], auth: "API + webhook", d: "Baixa automática dos títulos a receber." }
];
BP.conn = id => BP.CONNECTORS.find(c => c.id === id);

/* ---------- estado ---------- */
const S = BP.S = { profiles: new Map(), events: [], mkt: [], sync: [], ledger: [], audiences: [], polls: {}, counts: { byType: {}, byProg: {}, bySource: {}, byConn: {}, sponsorImp: {} }, timeline: {}, me: null, startedAt: Date.now(), nfe: 23810, order: 5120 };

function blank(id, name) { return { id, name, team: "Outros", city: "", uf: "", region: "Sudeste", birth: 1990, origin: "QR na TV", consent: { participation: true, marketing: false, personalization: true, push: false, whatsapp: false, email: false, date: Date.now(), version: "v1.3" }, xp: 0, spent: 0, medals: [], inter: {}, progs: {}, games: {}, hits: 0, tries: 0, agree: 0, opinions: 0, memories: [], rewards: [], exposures: {}, platforms: { TV: 0, "Rádio": 0, YouTube: 0, App: 0 }, first: Date.now(), last: Date.now(), sim: true, tl: [] }; }
const CITIES = [["São Paulo", "SP", "Sudeste"], ["Campinas", "SP", "Sudeste"], ["Rio de Janeiro", "RJ", "Sudeste"], ["Belo Horizonte", "MG", "Sudeste"], ["Salvador", "BA", "Nordeste"], ["Recife", "PE", "Nordeste"], ["Fortaleza", "CE", "Nordeste"], ["Curitiba", "PR", "Sul"], ["Porto Alegre", "RS", "Sul"], ["Goiânia", "GO", "Centro-Oeste"], ["Belém", "PA", "Norte"]];
const FIRST = ["Rafael", "Camila", "Diego", "Bruno", "Larissa", "Ana", "Pedro", "Juliana", "Marcos", "Fernanda", "Lucas", "Beatriz", "Thiago", "Mariana", "Gustavo", "Helena", "Otávio", "Yasmin", "Caio", "Letícia", "Renan", "Patrícia", "Felipe", "Sofia"];
const LAST = ["Souza", "Alves", "Farias", "Lima", "Melo", "Costa", "Rocha", "Pereira", "Gomes", "Ribeiro"];
function seedProfiles() {
  for (let i = 0; i < 64; i++) {
    const p = blank("BP-" + (10231 + i * 7), pick(FIRST) + " " + pick(LAST)[0] + ".");
    const c = pick(CITIES); p.city = c[0]; p.uf = c[1]; p.region = c[2];
    p.team = pick(Object.keys(BP.TEAMS)); p.birth = 1960 + Math.floor(rnd() * 45); p.origin = pick(["QR na TV", "QR na TV", "YouTube", "Bandplay", "Rádio", "App"]);
    p.consent.marketing = rnd() < .44; p.consent.push = p.consent.marketing && rnd() < .8; p.consent.whatsapp = p.consent.marketing && rnd() < .6; p.consent.email = p.consent.marketing && rnd() < .5;
    const progs = BP.PROGRAMS.filter(() => rnd() < .3); if (!progs.length) progs.push(BP.PROGRAMS[0]);
    progs.forEach(pr => { p.progs[pr.id] = 1 + Math.floor(rnd() * 14); });
    p.inter = { poll: Math.floor(rnd() * 20), quiz: Math.floor(rnd() * 12), opinion: Math.floor(rnd() * 15), game: Math.floor(rnd() * 8), memory: rnd() < .2 ? 1 : 0 };
    p.tries = p.inter.quiz + p.inter.poll; p.hits = Math.floor(p.tries * (.3 + rnd() * .5));
    p.opinions = p.inter.opinion; p.agree = Math.floor(p.opinions * rnd());
    if (p.inter.game) p.games = { penalti: { plays: Math.ceil(p.inter.game / 2), best: Math.floor(rnd() * 6) }, ...(rnd() < .5 ? { stock: { plays: 1 + Math.floor(rnd() * 4), best: Math.floor(400 + rnd() * 1600) } } : {}) };
    p.platforms = { TV: Math.floor(rnd() * 40), "Rádio": progs.some(x => x.ch.includes("radio")) ? Math.floor(rnd() * 25) : 0, YouTube: Math.floor(rnd() * 15), App: Math.floor(rnd() * 30) };
    p.xp = Object.values(p.inter).reduce((a, b) => a + b, 0) * 70; p.spent = rnd() < .3 ? 1000 : 0;
    if (p.spent) p.rewards.push({ item: pick(BP.MINU)[1], xp: 1000, t: Date.now() - rnd() * 864e6 });
    p.last = Date.now() - Math.floor(rnd() * 20) * 864e5; p.first = p.last - Math.floor(rnd() * 60) * 864e5;
    derive(p); S.profiles.set(p.id, p);
  }
  // ledger semente
  [["Receita", "Cota master · Pré-Jogo do Jogo Aberto", "Pulso Energy", 120000, "ja"], ["Receita", "Placar de concordância · naming", "Brasa Burger", 45000, "db"], ["Receita", "Bolão do pódio · Stock Car (3 etapas)", "Rota Bank", 105000, "stock"], ["Despesa", "Recompensas Minu · outubro", "Minu", -18400, "—"]].forEach(([k, d, cp, v, pr], i) => S.ledger.push({ id: "LC-" + (9001 + i), t: Date.now() - (4 - i) * 864e5 * 3, kind: k, desc: d, cp, value: v, prog: pr, status: v > 0 ? (i ? "A receber" : "Recebido") : "Pago", doc: v > 0 ? "NFS-e " + (S.nfe++) : "Fatura Minu" }));
}
function derive(p) {
  const tot = Object.values(p.inter).reduce((a, b) => a + b, 0);
  const days = (Date.now() - p.last) / 864e5;
  p.score = Math.max(5, Math.min(99, Math.round(30 + tot * 1.6 + Object.keys(p.progs).length * 4 - days * 1.5)));
  p.churn = Math.max(.02, Math.min(.9, +(days / 30 + (tot < 5 ? .2 : 0)).toFixed(2)));
  p.level = p.xp >= 3000 ? "Lenda Band" : p.xp >= 1500 ? "Superfã" : p.xp >= 500 ? "Fã" : "Espectador";
  const pl = p.platforms; const radio = pl["Rádio"] > (pl.TV * .5);
  p.persona = ((p.progs.stock || 0) + (p.progs.indy || 0) >= 18 || (p.games.stock && p.games.stock.plays >= 3)) ? "Fã de velocidade" : radio ? "Ouvinte fiel do rádio" : p.inter.memory ? "Nostálgico do acervo" : (p.inter.game || 0) >= 4 ? "Gamer de fim de semana" : tot >= 15 ? "Superfã do clássico" : "Casual";
  p.ltv = Math.round(8 + tot * 2.4 + (p.consent.marketing ? 22 : 0) + p.rewards.length * 6);
  p.prop = { "Delivery": +(.3 + (p.inter.game || 0) * .05 + (p.consent.marketing ? .2 : 0)).toFixed(2), "Banco digital": +(.2 + (p.progs.stock ? .25 : 0) + (p.consent.marketing ? .15 : 0)).toFixed(2), "Bebida": +(.25 + (p.inter.poll || 0) * .02).toFixed(2), "Seguros": +(.15 + (p.birth < 1980 ? .3 : 0)).toFixed(2) };
  Object.keys(p.prop).forEach(k => p.prop[k] = Math.min(.95, p.prop[k]));
  p.nba = p.churn > .4 ? "Retenção: desafio do apresentador favorito com 2× XP" : !p.consent.marketing ? "Pedir opt-in de marcas em troca de 50 XP" : p.persona === "Fã de velocidade" ? "Bolão do pódio da Stock Car (Rota Bank)" : p.persona === "Ouvinte fiel do rádio" ? "Desafio do Neto no rádio às 18h" : "Oferta Brasa Burger no próximo programa";
}

/* ---------- segmentos ---------- */
BP.SEGMENTS = [
  { id: "s1", n: "Superfãs com opt-in", rule: "Fan Score ≥ 70 e opt-in de marketing", f: p => p.score >= 70 && p.consent.marketing },
  { id: "s2", n: "Cross-tela: TV + rádio", rule: "Participou na TV e no rádio", f: p => p.platforms.TV > 0 && p.platforms["Rádio"] > 0 },
  { id: "s3", n: "Fãs de velocidade", rule: "Persona = Fã de velocidade", f: p => p.persona === "Fã de velocidade" },
  { id: "s4", n: "Em risco de evasão", rule: "Risco de evasão ≥ 40%", f: p => p.churn >= .4 },
  { id: "s5", n: "Nordeste · Séries C e D", rule: "Região = Nordeste", f: p => p.region === "Nordeste" },
  { id: "s6", n: "Gamers do Band E.C.", rule: "Jogou 3+ partidas", f: p => Object.values(p.games).reduce((a, g) => a + g.plays, 0) >= 3 },
  { id: "s7", n: "Discordam do Neto", rule: "≥ 3 opiniões e < 40% de concordância", f: p => p.opinions >= 3 && p.agree / p.opinions < .4 }
];
BP.segCount = f => { let n = 0; S.profiles.forEach(p => { if (f(p)) n++; }); return n; };
BP.SCALE = () => Math.round(128450 / Math.max(1, S.profiles.size));

/* ---------- jornadas de marketing ---------- */
BP.JOURNEYS = [
  { id: "j1", n: "Boas-vindas ao Band Pass", trig: "join", cond: p => true, steps: ["Push: bem-vindo + 1ª missão", "Espera o próximo programa", "WhatsApp: lembrete com 2× XP (se opt-in)"], ch: "push", entered: 2140, sent: 1980 },
  { id: "j2", n: "Da TV para o rádio", trig: "opinion", cond: (p, e) => e.prog === "db", steps: ["Respondeu ao Neto na TV", "Push às 17h50: 2º turno no rádio vale 2× XP"], ch: "push", entered: 860, sent: 812 },
  { id: "j3", n: "Recorde no game", trig: "game_end", cond: (p, e) => (e.p.score || 0) >= (e.p.game === "penalti" ? 4 : 1200), steps: ["Recorde no jogo", "WhatsApp: cupom do patrocinador do game"], ch: "whatsapp", entered: 410, sent: 377 },
  { id: "j4", n: "Recibo de resgate", trig: "reward", cond: () => true, steps: ["Resgate na Minu", "E-mail/WhatsApp com voucher e marca patrocinadora"], ch: "email", entered: 1190, sent: 1190 },
  { id: "j5", n: "Bolão da Stock Car", trig: "bolao", cond: () => true, steps: ["Palpite enviado", "Push no domingo: largada em 10 min", "Resultado + XP"], ch: "push", entered: 530, sent: 498 },
  { id: "j6", n: "Pós-compra · Experiências Band", trig: "purchase", cond: () => true, steps: ["Compra no site da Band", "E-mail com ingresso e nota fiscal", "Véspera: lembrete + missão bônus no app"], ch: "email", entered: 96, sent: 96 }
];

/* ---------- barramento ---------- */
const listeners = []; const seen = new Set();
let bc = null, room = null;
try { bc = new BroadcastChannel("band-playverse-x"); bc.onmessage = e => recv(e.data); } catch (e) {}
try { if (window.claude && claude.use) claude.use("room").then(r => { if (!r) return; room = r; r.on("evt", (a, b) => { const d = (a && a.id) ? a : (a && a.data && a.data.id ? a.data : (b && b.id ? b : null)); if (d) recv(d); }); }).catch(() => {}); } catch (e) {}
BP.on = f => listeners.push(f);
BP.emit = (type, prog, p, fan, opts = {}) => {
  const ev = { id: U.uid(), ts: Date.now(), type, prog: prog || null, p: p || {}, fan, src: opts.src || "App", sim: !!opts.sim };
  recv(ev); try { bc && bc.postMessage(ev); } catch (e) {} if (!ev.sim) { try { room && room.emit("evt", ev); } catch (e) {} }
  return ev;
};
function recv(ev) { if (!ev || !ev.id || seen.has(ev.id)) return; seen.add(ev.id); if (ev.type === "reset") { location.reload(); return; } ingest(ev); listeners.forEach(f => { try { f(ev); } catch (e) { console.error(e); } }); }
BP.reset = () => { U.ls.del("bpx-fan"); BP.emit("reset", null, {}, null); location.reload(); };

/* ---------- pipeline ---------- */
function sync(conn, op, obj, n, ok = true) { S.sync.unshift({ t: Date.now(), conn, op, obj, n, ok }); S.sync.length = Math.min(S.sync.length, 60); S.counts.byConn[conn] = (S.counts.byConn[conn] || 0) + n; }
function mkt(j, p, ch, msg) { S.mkt.unshift({ t: Date.now(), j: j.n, fan: p.name, ch, msg, st: "Enviado" }); S.mkt.length = Math.min(S.mkt.length, 50); j.entered++; j.sent++; sync(ch === "whatsapp" ? "wa" : ch === "email" ? "mkt" : "push", "POST /messages", "Mensagem", 1); }
function ledger(kind, desc, cp, value, prog, doc, status) { S.ledger.unshift({ id: "LC-" + (9100 + S.ledger.length), t: Date.now(), kind, desc, cp, value, prog, doc, status }); }
function ingest(ev) {
  S.events.unshift(ev); if (S.events.length > 400) S.events.length = 400;
  const c = S.counts; c.byType[ev.type] = (c.byType[ev.type] || 0) + 1; if (ev.prog) c.byProg[ev.prog] = (c.byProg[ev.prog] || 0) + 1; c.bySource[ev.src] = (c.bySource[ev.src] || 0) + 1;
  const mnt = Math.floor(ev.ts / 60000); S.timeline[mnt] = (S.timeline[mnt] || 0) + 1;
  sync("vf", "event." + ev.type, "Interação", 1);
  if (!ev.fan) return;
  let p = S.profiles.get(ev.fan.id);
  if (!p) { p = blank(ev.fan.id, ev.fan.name); S.profiles.set(p.id, p); }
  // identity resolution / merge
  Object.assign(p, { name: ev.fan.name || p.name, team: ev.fan.team || p.team, sim: !!ev.sim });
  if (ev.fan.city) { p.city = ev.fan.city; p.uf = ev.fan.uf; p.region = ev.fan.region; }
  if (ev.fan.consent) p.consent = { ...p.consent, ...ev.fan.consent };
  if (ev.fan.birth) p.birth = ev.fan.birth;
  p.last = ev.ts;
  const pr = ev.prog && BP.prog(ev.prog);
  if (pr) { p.progs[pr.id] = (p.progs[pr.id] || 0) + 1; const plat = ev.src === "Rádio" ? "Rádio" : ev.src === "YouTube" ? "YouTube" : pr.ch.includes("radio") && !pr.ch.includes("tv") ? "Rádio" : "TV"; p.platforms[plat] = (p.platforms[plat] || 0) + 1; if (pr.sponsor) { p.exposures[pr.sponsor] = (p.exposures[pr.sponsor] || 0) + 1; c.sponsorImp[pr.sponsor] = (c.sponsorImp[pr.sponsor] || 0) + 1; } }
  const t = ev.type, d = ev.p;
  if (["poll", "quiz", "opinion", "game_end", "memory", "bolao", "var", "nota"].includes(t)) { const k = t === "game_end" ? "game" : t === "var" || t === "nota" || t === "bolao" ? "poll" : t; p.inter[k] = (p.inter[k] || 0) + 1; }
  if (t === "quiz") { p.tries++; if (d.ok) p.hits++; }
  if (t === "opinion") { p.opinions++; if (d.c === 0) p.agree++; }
  if (t === "memory") p.memories.push(d.moment);
  if (t === "game_end") { const g = p.games[d.game] || (p.games[d.game] = { plays: 0, best: 0 }); g.plays++; g.best = Math.max(g.best, d.score || 0); const sp = d.sponsor; if (sp) { c.sponsorImp[sp] = (c.sponsorImp[sp] || 0) + 6; ledger("Receita", `CPM game ${d.game === "penalti" ? "Pênalti do Craque" : "Reta Final"} · 6 impressões`, BP.SPONSORS.find(s => s.id === sp).n, 6 * 0.045, ev.prog || "bec", "Apuração ad server", "Provisionado"); sync("adsrv", "POST /impressions", "Impressão", 6); } }
  if (d.xp) p.xp += d.xp;
  if (t === "medal") p.medals = Array.from(new Set([...p.medals, d.id]));
  if (t === "reward") { p.spent += d.xp; p.rewards.push({ item: d.item, xp: d.xp, t: ev.ts }); sync("minu", "POST /redemptions", "Resgate", 1); ledger("Despesa", `Recompensa Minu · ${d.item}`, "Minu", -(d.value || d.xp / BP.XP_PER_REAL) * (d.sponsored ? 0 : 1), ev.prog || "—", "Pedido Minu #" + (S.order++), d.sponsored ? "Custeado pelo patrocinador" : "A pagar"); sync("erp", "POST /payables", "Título a pagar", 1); }
  if (t === "purchase") { sync("pay", "WEBHOOK payment.confirmed", "Pagamento", 1); ledger("Receita", `Experiência Band · ${d.item}`, p.name, d.value || 0, ev.prog || "—", "Pedido " + (d.order || "#" + S.order++), "Recebido via " + (d.method === "cartao" ? "cartão" : "Pix")); sync("erp", "POST /receivables", "Título recebido", 1); sync("nfe", "POST /nfse", "Nota fiscal", 1); sync("crm", "PATCH /contacts/orders", "Pedido", 1); }
  if (t === "join") { sync("crm", "UPSERT /contacts", "Contato", 1); if (p.consent.marketing) sync("vibra", "STREAM profiles", "Perfil consentido", 1); }
  if (t === "consent") { sync("crm", "PATCH /contacts/consent", "Consentimento", 1); }
  p.tl.unshift({ t: ev.ts, type: t, prog: ev.prog, p: d }); if (p.tl.length > 40) p.tl.length = 40;
  derive(p);
  if (p.consent.marketing && !ev.sim) sync("vibra", "STREAM events", "Evento consentido", 1);
  // jornadas
  BP.JOURNEYS.forEach(j => { if (j.trig === (t === "reward" ? "reward" : t) && j.cond(p, ev)) { const ok = j.ch === "push" ? (p.consent.push || !ev.sim) : j.ch === "whatsapp" ? p.consent.whatsapp : true; if (ok && (Math.random() < .5 || !ev.sim)) mkt(j, p, j.ch, j.steps[j.steps.length - 1]); } });
  // enquetes ao vivo
  if (["poll", "var", "bolao", "nota", "opinion"].includes(t) && d.key != null) { const k = d.key; const pl = S.polls[k] || (S.polls[k] = {}); pl[d.c] = (pl[d.c] || 0) + 1; }
}
BP.ingestSeed = seedProfiles;

/* ---------- plateia simulada (só na janela líder) ---------- */
BP.bots = { lv: 1, h: null };
const BOT_ACTS = [
  ["poll", "ja", () => ({ key: "ja-classico", c: Math.floor(Math.random() * 3), xp: 100 })],
  ["quiz", "ja", () => { const ok = Math.random() < .6; return { ok, xp: ok ? 150 : 0 }; }],
  ["opinion", "db", () => ({ key: "db-op0", c: Math.floor(Math.random() * 3), xp: 60 })],
  ["opinion", "dbr", () => ({ key: "db-op0", c: Math.floor(Math.random() * 3), xp: 120 })],
  ["game_end", "bec", () => { const g = Math.random() < .5 ? "penalti" : "stock"; return { game: g, score: g === "penalti" ? Math.floor(Math.random() * 6) : Math.floor(300 + Math.random() * 1600), sponsor: g === "penalti" ? "pulso" : "rota", xp: 120 }; }],
  ["bolao", "stock", () => ({ key: "stock-mont", c: Math.floor(Math.random() * 3), xp: 120 })],
  ["memory", "se", () => ({ moment: ["Copa 2002", "Derby histórico", "Majestoso"][Math.floor(Math.random() * 3)], xp: 200 })],
  ["poll", "eed", () => ({ key: "eed-ouvinte", c: Math.floor(Math.random() * 3), xp: 100 })],
  ["nota", "stu", () => ({ key: "stu-nota", c: Math.floor(5 + Math.random() * 5), xp: 60 })]
];
function botTick() {
  if (!BP.bots.lv) return;
  const n = BP.bots.lv === 2 ? 3 : 1;
  for (let i = 0; i < n; i++) {
    let p;
    if (Math.random() < .12) { const c = rpick(CITIES); p = { id: "BP-" + Math.floor(20000 + Math.random() * 70000), name: rpick(FIRST) + " " + rpick(LAST)[0] + ".", team: rpick(Object.keys(BP.TEAMS)), city: c[0], uf: c[1], region: c[2], consent: { marketing: Math.random() < .45, push: Math.random() < .4, whatsapp: Math.random() < .3 } }; BP.emit("join", null, { xp: p.consent.marketing ? 50 : 0 }, p, { sim: true, src: rpick(["QR na TV", "YouTube", "App"]) }); continue; }
    const arr = Array.from(S.profiles.values()).filter(x => x.sim); p = rpick(arr); if (!p) continue;
    const a = rpick(BOT_ACTS);
    if (Math.random() < .03 && p.xp - p.spent > 1500) { const it = rpick(BP.MINU); BP.emit("reward", null, { item: it[1], xp: it[2] * BP.XP_PER_REAL, value: it[2], sponsored: !!it[3] }, { id: p.id, name: p.name, team: p.team }, { sim: true }); continue; }
    BP.emit(a[0], a[1], a[2](), { id: p.id, name: p.name, team: p.team }, { sim: true, src: a[1] === "dbr" || a[1] === "eed" ? "Rádio" : rpick(["App", "App", "QR na TV", "YouTube"]) });
  }
}
BP.setBots = lv => { BP.bots.lv = lv; clearInterval(BP.bots.h); if (lv) BP.bots.h = setInterval(botTick, lv === 2 ? 700 : 1800); };

/* ---------- IA (capability sample) ---------- */
let SAMPLE; BP.sample = async () => { if (SAMPLE !== undefined) return SAMPLE; try { SAMPLE = await (window.claude && claude.use ? claude.use("sample") : null); } catch (e) { SAMPLE = null; } return SAMPLE; };
BP.llm = async (input, onText, tier = "default") => { const s = await BP.sample(); if (!s) return null; try { const r = await s(input, { modelTier: tier, cache: false, onText: onText ? ({ text }) => onText(text) : undefined }); return r && r.text; } catch (e) { return null; } };

seedProfiles();
})();
