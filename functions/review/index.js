export async function onRequestGet(context) {
  const ADMIN_TOKEN = "7af0d91c1af641fd9087c6f7416072a6d9af53a157a141b4891827d921d495a4";
  const API = "https://qvmewmebcrkmyutvbzxv.functions.supabase.co/goodlede-admin";
  const APPROVE = "/approve";

  const url = new URL(context.request.url);
  const urlToken = url.searchParams.get('t');
  const isAuthed = urlToken === ADMIN_TOKEN;

  let serverStories = null;
  if (isAuthed) {
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: ADMIN_TOKEN, action: 'pending' })
      });
      const d = await r.json();
      if (d.ok) serverStories = d.stories || [];
    } catch (_) {}
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function sigCls(s) {
    const l = (s || '').toLowerCase();
    if (l.includes('systemic') || l.includes('trend')) return 's-strong';
    if (l.includes('notable')) return 's-mid';
    return 's-soft';
  }
  function dotCls(s) {
    const l = (s || '').toLowerCase();
    if (l.includes('well')) return 'd-s';
    if (l.includes('mod')) return 'd-m';
    return '';
  }
  function renderCard(s) {
    const isPol = (s.review_reason || '').toLowerCase().startsWith('political');
    const polFlag = isPol ? '<div class="pol-flag">&#9888; Political content &mdash; editorial approval sought</div>' : '';
    const sig = s.significance ? '<span class="sig ' + sigCls(s.significance) + '">' + esc(s.significance) + '</span>' : '';
    const conf = s.confidence ? '<span class="conf"><span class="dot ' + dotCls(s.confidence) + '"></span>' + esc(s.confidence) + '</span>' : '';
    const id = esc(s.id);
    const tok = esc(s.review_token);
    const src = esc(s.source_url || '#');
    return '<div class="card' + (isPol ? ' political' : '') + '" id="c-' + id + '">'
      + '<div class="done-badge" id="b-' + id + '"></div>'
      + polFlag
      + '<div class="cat">' + esc(s.category || '') + '</div>'
      + '<h2 class="hl"><a href="' + src + '" target="_blank" rel="noopener">' + esc(s.headline) + '</a></h2>'
      + (s.basis ? '<p class="basis"><span class="lbl lbl-b">What backs it</span>' + esc(s.basis) + '</p>' : '')
      + (s.caveat ? '<p class="caveat"><span class="lbl lbl-a">What it does not mean</span>' + esc(s.caveat) + '</p>' : '')
      + '<div class="meta">' + sig + conf + '</div>'
      + '<div class="actions">'
      + '<button class="btn-a" onclick="act(\'' + id + '\',\'' + tok + '\',\'approve\')">&#10003; Approve</button>'
      + '<button class="btn-s" onclick="pendSkip(\'' + id + '\')">&#10007; Skip &#9660;</button>'
      + '<button class="btn-l" onclick="act(\'' + id + '\',\'' + tok + '\',\'defer\',\'\')">&#8635; Later</button>'
      + '<a class="src" href="' + src + '" target="_blank" rel="noopener">' + esc(s.source_name || 'Source') + ' &#8599;</a>'
      + '</div>'
      + '<div class="skip-reasons">'
      + '<button class="sr-btn" onclick="act(\'' + id + '\',\'' + tok + '\',\'skip\',\'redundant\')">Redundant</button>'
      + '<button class="sr-btn" onclick="act(\'' + id + '\',\'' + tok + '\',\'skip\',\'too-many-similar\')">Too many similar</button>'
      + '<button class="sr-btn" onclick="act(\'' + id + '\',\'' + tok + '\',\'skip\',\'too-local\')">Too local</button>'
      + '<button class="sr-btn" onclick="act(\'' + id + '\',\'' + tok + '\',\'skip\',\'not-good-news\')">Not good news</button>'
      + '<button class="sr-btn" onclick="act(\'' + id + '\',\'' + tok + '\',\'skip\',\'political\')">Political</button>'
      + '<button class="sr-btn" onclick="act(\'' + id + '\',\'' + tok + '\',\'skip\',\'off-topic\')">Off topic</button>'
      + '<button class="sr-btn" onclick="act(\'' + id + '\',\'' + tok + '\',\'skip\',\'poor-source\')">Poor source</button>'
      + '<button class="sr-btn sr-none" onclick="act(\'' + id + '\',\'' + tok + '\',\'skip\',\'\')">Skip (no reason)</button>'
      + '</div>'
      + '</div>';
  }

  let sorted = [];
  let storiesHtml = '';
  let counterText = '';
  let statusText = 'Loading…';

  if (isAuthed && serverStories !== null) {
    sorted = [...serverStories].sort((a, b) => {
      const ap = (a.review_reason || '').toLowerCase().startsWith('political');
      const bp = (b.review_reason || '').toLowerCase().startsWith('political');
      return ap && !bp ? -1 : !ap && bp ? 1 : 0;
    });
    if (sorted.length === 0) {
      statusText = 'No stories pending review right now.';
    } else {
      storiesHtml = sorted.map(renderCard).join('');
      counterText = sorted.length + ' remaining';
      statusText = sorted.length + ' stories to review.';
    }
  }

  const reviewScreenStyle = isAuthed ? '' : 'display:none;';
  const gateScreenStyle = isAuthed ? 'display:none;' : '';
  const initialCount = sorted.length;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Goodlede Review</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet">
<style>
:root{--paper:#F5F0E6;--paper-2:#EBE5D6;--ink:#1C1810;--ink-soft:#58503F;--ink-faint:#9B9080;--line:#D6CBB5;--blue:#2B4B78;--blue-soft:rgba(43,75,120,.11);--amber:#8F6115;--amber-soft:rgba(143,97,21,.12);}
*{box-sizing:border-box;margin:0;padding:0;}
html,body{background:var(--paper);color:var(--ink);font-family:'Newsreader',Georgia,serif;min-height:100vh;overflow-x:hidden;}
.header{padding:16px 24px;border-bottom:2px solid var(--ink);display:flex;align-items:center;justify-content:space-between;max-width:860px;margin:0 auto;}
.wm{font-family:'Fraunces',serif;font-weight:600;font-size:22px;letter-spacing:-.3px;text-decoration:none;color:var(--ink);}
.wm b{color:var(--blue);}
.counter{font-size:14px;color:var(--ink-soft);}
.wrap{max-width:860px;margin:0 auto;padding:20px 24px;}
.status{font-size:15px;color:var(--ink-soft);margin-bottom:18px;}
.card{background:var(--paper-2);border:1px solid var(--line);border-radius:6px;padding:18px 18px 14px;margin-bottom:12px;position:relative;transition:opacity .3s,border-color .2s;}
.card.political{border-color:#FFCC00;background:#FFFDF0;}
.card.done{opacity:.28;pointer-events:none;}
.done-badge{display:none;position:absolute;top:0;left:0;right:0;bottom:0;border-radius:6px;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:22px;font-weight:600;letter-spacing:-.3px;}
.card.approved .done-badge{display:flex;background:rgba(43,75,120,.13);color:var(--blue);}
.card.skipped .done-badge{display:flex;background:rgba(143,97,21,.11);color:var(--amber);}
.card.approved{border-color:var(--blue);}
.card.skipped{border-color:var(--amber);}
.pol-flag{background:#FFF3CD;border:1px solid #FFCC00;border-radius:3px;padding:6px 10px;margin-bottom:10px;font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#856404;}
.cat{font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:var(--ink-soft);font-weight:500;margin-bottom:7px;}
.hl{font-family:'Fraunces',serif;font-weight:500;font-size:19px;line-height:1.25;margin-bottom:9px;}
.hl a{color:inherit;text-decoration:none;}
.hl a:hover{text-decoration:underline;text-decoration-color:var(--blue);}
.lbl{display:block;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;font-weight:500;margin-bottom:2px;}
.lbl-b{color:var(--blue);}.lbl-a{color:var(--amber);}
.basis{font-size:13px;color:var(--ink);margin-bottom:10px;line-height:1.55;}
.caveat{font-size:12.5px;color:var(--ink-soft);font-style:italic;border-left:2px solid var(--line);padding-left:9px;margin-bottom:10px;line-height:1.5;}
.meta{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:12px;}
.sig{font-size:11px;padding:2px 8px;border-radius:999px;display:inline-flex;align-items:center;}
.s-strong{background:var(--blue-soft);color:var(--blue);}
.s-mid{background:var(--amber-soft);color:var(--amber);}
.s-soft{background:rgba(88,80,63,.09);color:var(--ink-soft);}
.conf{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--ink-soft);}
.dot{width:7px;height:7px;border-radius:50%;display:inline-block;background:var(--line);}
.d-s{background:var(--blue);}.d-m{background:var(--amber);}
.actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.btn-a{font-family:'Newsreader',serif;font-size:15px;padding:8px 20px;background:var(--blue);color:#F5F0E6;border:none;border-radius:4px;cursor:pointer;}
.btn-a:hover{background:#1e3557;}
.btn-s{font-family:'Newsreader',serif;font-size:15px;padding:8px 20px;background:transparent;color:var(--amber);border:1px solid var(--amber);border-radius:4px;cursor:pointer;}
.btn-s:hover{background:var(--amber);color:#F5F0E6;}
.card.skip-pending .btn-s{background:var(--amber);color:#F5F0E6;}
.btn-l{font-family:'Newsreader',serif;font-size:15px;padding:8px 20px;background:transparent;color:var(--ink-soft);border:1px solid var(--line);border-radius:4px;cursor:pointer;}
.btn-l:hover{background:var(--ink-soft);color:#F5F0E6;border-color:var(--ink-soft);}
.card.deferred .done-badge{display:flex;background:rgba(88,80,63,.10);color:var(--ink-soft);}
.card.deferred{border-color:var(--ink-soft);}
.src{font-size:13px;color:var(--ink-soft);text-decoration:underline;padding:8px 4px;}
.skip-reasons{display:none;gap:6px;flex-wrap:wrap;padding-top:10px;}
.card.skip-pending .skip-reasons{display:flex;}
.sr-btn{font-family:'Newsreader',serif;font-size:12px;padding:4px 11px;background:transparent;border:1px solid var(--line);border-radius:3px;cursor:pointer;color:var(--ink-soft);}
.sr-btn:hover{border-color:var(--amber);color:var(--amber);background:var(--amber-soft);}
.sr-none{color:var(--ink-faint);font-style:italic;}
.gate{max-width:400px;margin:80px auto;text-align:center;background:var(--paper-2);border:1px solid var(--line);border-radius:8px;padding:32px 28px;}
.gate input{width:100%;font-family:'Newsreader',serif;font-size:16px;padding:10px 12px;border:1px solid var(--line);border-radius:4px;background:#FDFAF5;color:var(--ink);margin-bottom:10px;}
.gate input:focus{outline:none;border-color:var(--blue);}
.gate button{width:100%;font-family:'Newsreader',serif;font-size:16px;padding:10px;background:var(--blue);color:#F5F0E6;border:none;border-radius:4px;cursor:pointer;}
.gate-err{color:var(--amber);font-size:14px;margin-top:8px;min-height:20px;}
</style>
</head>
<body>
<div class="header">
  <a href="/" class="wm">Good<b>lede</b></a>
  <span class="counter" id="counter">${esc(counterText)}</span>
</div>
<div id="gate-screen" class="wrap" style="${gateScreenStyle}">
  <div class="gate">
    <p style="font-family:'Fraunces',serif;font-size:20px;font-weight:500;margin-bottom:16px;">Editorial Review</p>
    <input type="password" id="tok-input" placeholder="Admin token" autocomplete="off"/>
    <button onclick="unlock()">Unlock</button>
    <p class="gate-err" id="gate-err"></p>
  </div>
</div>
<div id="review-screen" class="wrap" style="${reviewScreenStyle}">
  <p class="status" id="status-msg">${esc(statusText)}</p>
  <div id="stories">${storiesHtml}</div>
</div>
<script>
const APPROVE='${APPROVE}';
let TOKEN='${isAuthed ? ADMIN_TOKEN : ''}';
let remaining=${initialCount};
function updateCounter(){
  const c=document.getElementById('counter');
  const m=document.getElementById('status-msg');
  if(remaining>0){c.textContent=remaining+' remaining';m.textContent=remaining+' stories to review.';}
  else{c.textContent='All done ✓';m.textContent='All done. You can close this tab.';}
}
function pendSkip(id){
  const card=document.getElementById('c-'+id);
  if(!card)return;
  card.classList.toggle('skip-pending');
}
async function act(id,token,action,skipReason){
  const card=document.getElementById('c-'+id);
  const badge=document.getElementById('b-'+id);
  if(!card)return;
  card.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{
    let url=APPROVE+'?id='+encodeURIComponent(id)+'&token='+encodeURIComponent(token)+'&action='+action;
    if(skipReason)url+='&skip_reason='+encodeURIComponent(skipReason);
    await fetch(url);
    card.classList.remove('skip-pending');
    const outcome=action==='approve'?'approved':action==='defer'?'deferred':'skipped';
    card.classList.add('done',outcome);
    badge.textContent=action==='approve'?'✓ Approved':action==='defer'?'↻ Back tomorrow':'✗ Skipped'+(skipReason?' — '+skipReason.replace(/-/g,' '):'');
    remaining=Math.max(0,remaining-1);
    updateCounter();
  }catch(e){card.querySelectorAll('button').forEach(b=>b.disabled=false);}
}
async function unlock(){
  const t=document.getElementById('tok-input').value.trim();
  if(!t)return;
  window.location='/review?t='+encodeURIComponent(t);
}
document.getElementById('tok-input')?.addEventListener('keydown',e=>{if(e.key==='Enter')unlock();});
</script>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
