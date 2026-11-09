/* Adaptador para rodar as demos da Band fora do claude.ai.
   As demos usam claude.use("sample") para IA; aqui esse pedido vai para a
   Netlify Function /api/chat (netlify/functions/chat.js), que guarda a chave
   da Anthropic no servidor. Sem a function, as demos caem no modo offline. */
(function () {
  if (window.claude && window.claude.use) return;
  async function sample(input, opts) {
    opts = opts || {};
    var messages = typeof input === "string" ? [{ role: "user", content: input }] : input;
    var r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: messages }), signal: opts.signal });
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok) throw { code: "error", message: (d.error && (d.error.message || d.error)) || ("HTTP " + r.status) };
    var text = (d.content || []).filter(function (c) { return c.type === "text"; }).map(function (c) { return c.text; }).join("");
    if (opts.onText) opts.onText({ text: text, delta: text });
    return { text: text, truncated: d.stop_reason === "max_tokens" };
  }
  sample.json = async function (input, opts) { var r = await sample(input, opts); var t = r.text; return JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)); };
  window.claude = { use: async function (name) { return name === "sample" ? sample : null; } };
})();
