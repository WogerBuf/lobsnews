/* Goodlede embeddable widget v1 — https://goodlede.com/feed.html
   Usage:
   <script src="https://goodlede.com/widget.js" data-key="YOUR_KEY"
           data-limit="4" data-category="" data-theme="light" async></script>
*/
(function () {
  var script = document.currentScript;
  if (!script) return;
  var key = script.getAttribute("data-key") || "";
  var limit = Math.min(Math.max(parseInt(script.getAttribute("data-limit") || "4", 10) || 4, 1), 12);
  var category = script.getAttribute("data-category") || "";
  var theme = (script.getAttribute("data-theme") || "light").toLowerCase();
  if (theme === "auto") {
    theme = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  }
  if (!key) { console.warn("[goodlede-widget] missing data-key"); return; }

  var API = "https://qvmewmebcrkmyutvbzxv.functions.supabase.co/goodlede-api";

  var host = document.createElement("div");
  host.setAttribute("data-goodlede-widget", "");
  script.parentNode.insertBefore(host, script);
  var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

  var C = theme === "dark"
    ? { bg: "#16150F", card: "#1E1C15", ink: "#EDE8DC", soft: "#A79F8D", line: "#33301F", link: "#9DB8DD", badge: "#2A2717" }
    : { bg: "transparent", card: "#FFFFFF", ink: "#1C1810", soft: "#58503F", line: "#E7DECE", link: "#2B4B78", badge: "#F3EEE3" };

  var css = [
    ":host{all:initial;}",
    ".gl{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:" + C.bg + ";color:" + C.ink + ";line-height:1.45;}",
    ".gl-card{background:" + C.card + ";border:1px solid " + C.line + ";border-radius:10px;padding:14px 16px;margin:0 0 10px;}",
    ".gl-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:" + C.soft + ";margin:0 0 6px;display:flex;gap:8px;align-items:center;}",
    ".gl-badge{background:" + C.badge + ";border-radius:999px;padding:2px 8px;font-size:10px;letter-spacing:.05em;}",
    ".gl-h{font-size:15px;font-weight:600;margin:0 0 6px;}",
    ".gl-h a{color:" + C.ink + ";text-decoration:none;}",
    ".gl-h a:hover{text-decoration:underline;}",
    ".gl-note{font-size:12.5px;font-style:italic;color:" + C.soft + ";margin:0 0 6px;}",
    ".gl-src{font-size:12px;color:" + C.soft + ";margin:0;}",
    ".gl-src a{color:" + C.link + ";text-decoration:none;}",
    ".gl-attr{font-size:11.5px;color:" + C.soft + ";margin:6px 0 0;text-align:right;}",
    ".gl-attr a{color:" + C.link + ";text-decoration:none;font-weight:600;}"
  ].join("\n");

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var url = API + "?key=" + encodeURIComponent(key) + "&limit=" + limit +
    (category ? "&category=" + encodeURIComponent(category) : "");

  fetch(url).then(function (r) {
    if (!r.ok) throw new Error("goodlede-api " + r.status);
    return r.json();
  }).then(function (d) {
    var style = document.createElement("style");
    style.textContent = css;
    root.appendChild(style);
    var wrap = el("div", "gl");
    (d.stories || []).forEach(function (s) {
      var card = el("div", "gl-card");
      var eyebrow = el("p", "gl-eyebrow", esc(s.category || ""));
      if (s.verification === "Verified") eyebrow.appendChild(el("span", "gl-badge", "Verified"));
      card.appendChild(eyebrow);
      card.appendChild(el("h3", "gl-h",
        '<a href="' + esc(s.goodlede_url) + '" target="_blank" rel="noopener">' + esc(s.headline) + "</a>"));
      if (s.worth_noting) card.appendChild(el("p", "gl-note", "Worth noting: " + esc(s.worth_noting)));
      if (s.source_name) card.appendChild(el("p", "gl-src",
        'Source: <a href="' + esc(s.source_url || s.goodlede_url) + '" target="_blank" rel="noopener">' + esc(s.source_name) + "</a>"));
      wrap.appendChild(card);
    });
    if (d.meta && d.meta.attribution_required) {
      wrap.appendChild(el("p", "gl-attr",
        '<a href="https://goodlede.com" target="_blank" rel="noopener">Powered by Goodlede</a>'));
    }
    root.appendChild(wrap);
  }).catch(function (e) {
    console.warn("[goodlede-widget]", e.message);
  });
})();
