export async function onRequestGet(context) {
  const API = "https://qvmewmebcrkmyutvbzxv.functions.supabase.co/goodlede-admin";
  const APPROVE = "/approve";

  const url = new URL(context.request.url);
  const urlToken = url.searchParams.get('t');

  // No secret in source: validate whatever token is in the URL against the server (admin first, then editor).
  let serverStories = null;
  let isAdmin = false;
  let editorMode = false;
  let editorInfo = null;
  if (urlToken) {
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: urlToken, action: 'pending' })
      });
      const d = await r.json();
      if (d.ok) { isAdmin = true; serverStories = d.stories || []; }
    } catch (_) {}
    if (!isAdmin) {
      try {
        const r = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ editor_token: urlToken, action: 'pending' })
        });
        const d = await r.json();
        if (d.ok) { editorMode = true; editorInfo = d.editor || null; serverStories = d.stories || []; }
      } catch (_) {}
    }
  }
  const isAuthed = isAdmin || editorMode;

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
  function editorBadge(s) {
    const who = esc(s.assigned_editor || 'editor');
    const note = s.editor_note ? '<span class="ed-note">&ldquo;' + esc(s.editor_note) + '&rdquo;</span>' : '';
    if (s.editor_status === 'with_editor') return '<div class="ed-badge ed-sent">&#8618; Sent to ' + who + ' for review</div>';
    if (s.editor_status === 'editor_approved') return '<div class="ed-badge ed-appr">&#10003; ' + who + ' approved &mdash; awaiting your sign-off' + note + '</div>';
    if (s.editor_status === 'editor_skipped') return '<div class="ed-badge ed-skip">&#10007; ' + who + ' skipped' + note + '</div>';
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
    return '<div class="card' + (isPol ? ' political' : '') + '" id="c-' + id + '" data-id="' + id + '" data-tok="' + tok + '">'
      + '<div class="done-badge" id="b-' + id + '"></div>'
      + polFlag
      + (!editorMode && s.editor_status ? editorBadge(s) : '')
      + '<div class="cat">' + esc(s.category || '') + '</div>'
      + '<h2 class="hl"><a href="' + src + '" target="_blank" rel="noopener">' + esc(s.headline) + '</a></h2>'
      + (s.basis ? '<p class="basis"><span class="lbl lbl-b">What backs it</span>' + esc(s.basis) + '</p>' : '')
      + (s.caveat
        ? '<div class="cav-block" id="cb-' + id + '">'
          + '<div class="cav-hd"><span class="lbl lbl-a">Worth noting</span>'
          + '<span class="cav-tools"><button class="cav-e" onclick="editCav(\'' + id + '\')">&#9998; Edit</button>'
          + '<button class="cav-x" id="cx-' + id + '" onclick="toggleCav(\'' + id + '\')">&#10007; Disapprove</button></span></div>'
          + '<p class="caveat" id="cv-' + id + '">' + esc(s.caveat) + '</p>'
          + '<div class="cav-edit" id="ce-' + id + '"><textarea class="cav-ta" id="ct-' + id + '">' + esc(s.caveat) + '</textarea>'
          + '<div class="cav-eb"><button class="cav-save" onclick="saveCav(\'' + id + '\')">Save edit</button><button class="cav-cancel" onclick="cancelCav(\'' + id + '\')">Cancel</button></div></div>'
          + '<div class="cav-why" id="cw-' + id + '"><span class="cav-why-lbl">Why? &mdash; optional, helps it learn</span><div class="cav-chips">'
          + ['too cynical','inaccurate','not needed here','wrong emphasis'].map(r => '<button type="button" class="cav-chip" onclick="pickReason(\'' + id + '\',this,\'' + r + '\')">' + r + '</button>').join('')
          + '</div><input class="cav-reason" id="cwr-' + id + '" type="text" placeholder="…or type your reason"></div>'
          + '</div>'
        : '<div class="cav-block" id="cb-' + id + '">'
          + '<div class="cav-hd"><span class="lbl lbl-a">Worth noting</span>'
          + '<span class="cav-tools"><button class="cav-e" onclick="addCav(\'' + id + '\')">&#9998; Add a note</button></span></div>'
          + '<p class="caveat" id="cv-' + id + '" style="display:none;"></p>'
          + '<div class="cav-edit" id="ce-' + id + '"><textarea class="cav-ta" id="ct-' + id + '" placeholder="Add a Worth noting note (optional)"></textarea>'
          + '<div class="cav-eb"><button class="cav-save" onclick="saveCav(\'' + id + '\')">Save</button><button class="cav-cancel" onclick="cancelAddCav(\'' + id + '\')">Cancel</button></div></div>'
          + '</div>')
      + '<div class="meta">' + sig + conf + '</div>'
      + '<div class="actions">'
      + '<button class="btn-a" onclick="act(\'' + id + '\',\'' + tok + '\',\'approve\')">&#10003; Approve</button>'
      + (editorMode ? '' : '<button class="btn-h" onclick="act(\'' + id + '\',\'' + tok + '\',\'hero\')">&#9733; Hero</button>')
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
      + '<div class="sr-custom">'
      + '<input class="sr-input" id="sri-' + id + '" type="text" placeholder="Other reason…" onkeydown="if(event.key===\'Enter\'){var v=this.value.trim();act(\'' + id + '\',\'' + tok + '\',\'skip\',v);}">'
      + '<button class="sr-send" onclick="var v=document.getElementById(\'sri-' + id + '\').value.trim();act(\'' + id + '\',\'' + tok + '\',\'skip\',v);">Skip &#8629;</button>'
      + '</div>'
      + '<button class="sr-btn sr-none" onclick="act(\'' + id + '\',\'' + tok + '\',\'skip\',\'\')">No reason</button>'
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
  const editorBanner = editorMode
    ? '<div class="ed-banner"><b>Editorial review &mdash; ' + esc(((editorInfo && editorInfo.categories) || []).join(', ')) + '</b><br>Hi ' + esc((editorInfo && editorInfo.name) || 'there') + ' &mdash; approve, edit or add a &ldquo;Worth noting&rdquo;, recategorize, or skip. Your decisions go to the editor for final sign-off before anything publishes.</div>'
    : '';

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
.caveat{font-size:12.5px;color:var(--ink-soft);font-style:italic;border-left:2px solid var(--line);padding-left:9px;margin-bottom:10px;line-height:1.5;}.cav-hd{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:2px;}.cav-toggle{display:inline-flex;align-items:center;gap:4px;font-size:10px;letter-spacing:1px;text-transform:uppercase;font-weight:500;color:var(--amber);cursor:pointer;user-select:none;}.cav-toggle input{accent-color:var(--amber);width:11px;height:11px;margin:0;vertical-align:middle;}.caveat.struck{opacity:.3;text-decoration:line-through;}.caveat.edited{color:var(--ink);font-style:normal;border-left-color:var(--blue);}
.cav-tools{display:inline-flex;gap:6px;flex-shrink:0;}
.cav-e,.cav-x{font-family:'Newsreader',serif;font-size:11px;padding:2px 9px;background:transparent;border-radius:3px;cursor:pointer;white-space:nowrap;}
.cav-e{color:var(--blue);border:1px solid var(--blue);}.cav-e:hover{background:var(--blue);color:#F5F0E6;}
.cav-x{color:var(--amber);border:1px solid var(--amber);}.cav-x:hover{background:var(--amber);color:#F5F0E6;}
.cav-edit{display:none;margin:8px 0 4px;}
.cav-ta{width:100%;font-family:'Newsreader',serif;font-size:13px;line-height:1.5;padding:8px 10px;border:1px solid var(--blue);border-radius:4px;background:#FDFAF5;color:var(--ink);resize:vertical;min-height:62px;}
.cav-ta:focus{outline:none;}
.cav-eb{display:flex;gap:6px;margin-top:6px;}
.cav-save{font-family:'Newsreader',serif;font-size:12px;padding:5px 13px;background:var(--blue);color:#F5F0E6;border:none;border-radius:3px;cursor:pointer;}
.cav-cancel{font-family:'Newsreader',serif;font-size:12px;padding:5px 13px;background:transparent;color:var(--ink-soft);border:1px solid var(--line);border-radius:3px;cursor:pointer;}
.cav-why{display:none;margin:8px 0 2px;padding-top:8px;border-top:1px dashed var(--line);}
.cav-why-lbl{display:block;font-size:11px;color:var(--ink-soft);margin-bottom:6px;}
.cav-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;}
.cav-chip{font-family:'Newsreader',serif;font-size:12px;padding:3px 10px;background:transparent;border:1px solid var(--line);border-radius:999px;cursor:pointer;color:var(--ink-soft);}
.cav-chip:hover{border-color:var(--amber);color:var(--amber);}
.cav-chip.on{background:var(--amber-soft);border-color:var(--amber);color:var(--amber);}
.cav-reason{width:100%;font-family:'Newsreader',serif;font-size:13px;padding:6px 10px;border:1px solid var(--line);border-radius:4px;background:#FDFAF5;color:var(--ink);}
.cav-reason:focus{outline:none;border-color:var(--amber);}
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
.btn-h{font-family:'Newsreader',serif;font-size:15px;padding:8px 20px;background:var(--amber);color:#F5F0E6;border:none;border-radius:4px;cursor:pointer;}
.btn-h:hover{background:#6b470f;}
.btn-nd{font-family:'Newsreader',serif;font-size:15px;padding:8px 16px;background:transparent;color:var(--blue);border:1px dashed var(--blue);border-radius:4px;cursor:pointer;}
.btn-nd:hover{background:var(--blue);color:#F5F0E6;}
#bulk-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--line);}
#bulk-bar .bulk-lbl{font-size:13px;color:var(--ink-soft);margin-right:4px;}
#bulk-bar button{font-family:'Newsreader',serif;font-size:14px;padding:7px 16px;border-radius:4px;cursor:pointer;}
#bulk-bar .ba{background:var(--blue);color:#F5F0E6;border:none;}
#bulk-bar .ba:hover{background:#1e3557;}
#bulk-bar .bnd{background:transparent;color:var(--blue);border:1px dashed var(--blue);}
#bulk-bar .bnd:hover{background:var(--blue);color:#F5F0E6;}
#bulk-bar button:disabled{opacity:.5;cursor:default;}
.card.deferred .done-badge{display:flex;background:rgba(88,80,63,.10);color:var(--ink-soft);}
.card.deferred{border-color:var(--ink-soft);}
.src{font-size:13px;color:var(--ink-soft);text-decoration:underline;padding:8px 4px;}
.skip-reasons{display:none;gap:6px;flex-wrap:wrap;padding-top:10px;}
.card.skip-pending .skip-reasons{display:flex;}
.sr-btn{font-family:'Newsreader',serif;font-size:12px;padding:4px 11px;background:transparent;border:1px solid var(--line);border-radius:3px;cursor:pointer;color:var(--ink-soft);}
.sr-btn:hover{border-color:var(--amber);color:var(--amber);background:var(--amber-soft);}
.sr-none{color:var(--ink-faint);font-style:italic;}
.sr-custom{flex:0 0 100%;display:flex;gap:6px;margin-top:6px;}
.sr-input{flex:1;font-family:'Newsreader',serif;font-size:13px;padding:5px 9px;border:1px solid var(--line);border-radius:3px;background:#FDFAF5;color:var(--ink);min-width:0;}
.sr-input:focus{outline:none;border-color:var(--amber);}
.sr-input::placeholder{color:var(--ink-faint);}
.sr-send{font-family:'Newsreader',serif;font-size:12px;padding:5px 12px;background:var(--amber);color:#F5F0E6;border:none;border-radius:3px;cursor:pointer;white-space:nowrap;}
.sr-send:hover{background:#6a4710;}
.undo-btn{font-family:'Newsreader',serif;font-size:11px;padding:2px 8px;background:transparent;border:1px solid currentColor;border-radius:3px;cursor:pointer;color:inherit;opacity:.65;margin-left:10px;}
.undo-btn:hover{opacity:1;}
.gate{max-width:400px;margin:80px auto;text-align:center;background:var(--paper-2);border:1px solid var(--line);border-radius:8px;padding:32px 28px;}
.gate input{width:100%;font-family:'Newsreader',serif;font-size:16px;padding:10px 12px;border:1px solid var(--line);border-radius:4px;background:#FDFAF5;color:var(--ink);margin-bottom:10px;}
.gate input:focus{outline:none;border-color:var(--blue);}
.gate button{width:100%;font-family:'Newsreader',serif;font-size:16px;padding:10px;background:var(--blue);color:#F5F0E6;border:none;border-radius:4px;cursor:pointer;}
.gate-err{color:var(--amber);font-size:14px;margin-top:8px;min-height:20px;}
.ed-banner{background:var(--blue-soft);border:1px solid var(--blue);border-radius:6px;padding:12px 14px;margin-bottom:16px;font-size:14px;color:var(--ink);line-height:1.5;}
.ed-banner b{color:var(--blue);}
.ed-badge{display:block;border-radius:3px;padding:5px 9px;margin-bottom:9px;font-size:11px;font-weight:600;letter-spacing:.4px;}
.ed-sent{background:rgba(43,75,120,.10);color:var(--blue);}
.ed-appr{background:var(--amber-soft);color:var(--amber);}
.ed-skip{background:rgba(88,80,63,.10);color:var(--ink-soft);}
.ed-note{display:block;font-style:italic;font-weight:400;margin-top:3px;color:var(--ink-soft);}
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
  ${editorBanner}
  <p class="status" id="status-msg">${esc(statusText)}</p>
  ${initialCount > 0 && !editorMode ? '<div id="bulk-bar"><span class="bulk-lbl">All remaining:</span><button class="ba" onclick="bulkApprove(false)">&#10003; Approve all</button><button class="bnd" onclick="bulkApprove(true)">&#10003; Approve all &middot; no disclaimers</button></div>' : ''}
  <div id="stories">${storiesHtml}</div>
</div>
<script>
const APPROVE='${APPROVE}';
let TOKEN='${isAdmin ? urlToken : ''}';
const AS_EDITOR='${editorMode ? urlToken : ''}';
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
function showWhy(id){var w=document.getElementById('cw-'+id);if(w)w.style.display='block';}
function maybeHideWhy(id){var card=document.getElementById('c-'+id);if(!card)return;if(card.dataset.dropcav!=='1'&&card.dataset.cavedit!=='1'){var w=document.getElementById('cw-'+id);if(w)w.style.display='none';}}
function toggleCav(id){
  const card=document.getElementById('c-'+id);
  const cv=document.getElementById('cv-'+id);
  const btn=document.getElementById('cx-'+id);
  if(!card)return;
  const off=card.dataset.dropcav==='1';
  if(off){card.dataset.dropcav='';if(cv)cv.classList.remove('struck');if(btn)btn.innerHTML='&#10007; Disapprove';maybeHideWhy(id);}
  else{card.dataset.dropcav='1';if(cv)cv.classList.add('struck');if(btn)btn.innerHTML='&#8635; Restore disclaimer';
    // disapproving cancels any in-progress edit
    card.dataset.cavedit='';var ce=document.getElementById('ce-'+id);if(ce)ce.style.display='none';
    showWhy(id);}
}
function editCav(id){
  const card=document.getElementById('c-'+id);if(!card)return;
  // editing un-disapproves
  if(card.dataset.dropcav==='1')toggleCav(id);
  const ce=document.getElementById('ce-'+id);const cv=document.getElementById('cv-'+id);
  if(ce)ce.style.display='block';if(cv)cv.style.display='none';
  const ta=document.getElementById('ct-'+id);if(ta){ta.focus();}
}
function saveCav(id){
  const card=document.getElementById('c-'+id);const ta=document.getElementById('ct-'+id);const cv=document.getElementById('cv-'+id);const ce=document.getElementById('ce-'+id);
  if(!card||!ta)return;
  const v=ta.value.trim();
  card.dataset.cavedit='1';
  if(cv){cv.textContent=v;cv.style.display='';cv.classList.remove('struck');cv.classList.add('edited');}
  if(ce)ce.style.display='none';
  showWhy(id);
}
function cancelCav(id){
  const ce=document.getElementById('ce-'+id);const cv=document.getElementById('cv-'+id);
  if(ce)ce.style.display='none';if(cv)cv.style.display='';
  maybeHideWhy(id);
}
function addCav(id){var ce=document.getElementById('ce-'+id);if(ce)ce.style.display='block';var ta=document.getElementById('ct-'+id);if(ta)ta.focus();}
function cancelAddCav(id){var card=document.getElementById('c-'+id);if(card)card.dataset.cavedit='';var ce=document.getElementById('ce-'+id);if(ce)ce.style.display='none';var cv=document.getElementById('cv-'+id);if(cv){cv.style.display='none';cv.textContent='';}}
function pickReason(id,btn,text){
  const ri=document.getElementById('cwr-'+id);if(ri)ri.value=text;
  var chips=btn.parentNode.querySelectorAll('.cav-chip');chips.forEach(function(c){c.classList.remove('on');});btn.classList.add('on');
}
async function act(id,token,action,skipReason,forceDrop){
  const card=document.getElementById('c-'+id);
  const badge=document.getElementById('b-'+id);
  if(!card)return;
  // Guard: don't allow approve/hero over an unsaved "Worth noting" edit.
  if(action==='approve'||action==='hero'){
    const ce=document.getElementById('ce-'+id);const ta=document.getElementById('ct-'+id);const cv=document.getElementById('cv-'+id);
    if(ce&&ce.style.display==='block'&&ta){
      const typed=ta.value.trim();const shown=cv?cv.textContent.trim():'';
      if(typed!==shown){alert('You’ve edited the “Worth noting” but haven’t saved it. Click “Save edit” to keep your change (or “Cancel” to discard) before approving.');return;}
    }
  }
  card.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{
    let url=APPROVE+'?id='+encodeURIComponent(id)+'&token='+encodeURIComponent(token)+'&action='+action;
    if(AS_EDITOR)url+='&as_editor='+encodeURIComponent(AS_EDITOR);
    if(action==='approve'||action==='hero'){
      url+='&confirmed=1';
      const drop=forceDrop||card.dataset.dropcav==='1';
      if(drop)url+='&drop_caveat=1';
      else if(card.dataset.cavedit==='1'){const ta=document.getElementById('ct-'+id);if(ta)url+='&caveat='+encodeURIComponent(ta.value.trim());}
      const ri=document.getElementById('cwr-'+id);const rsn=ri?ri.value.trim():'';
      if(rsn)url+='&caveat_reason='+encodeURIComponent(rsn);
    }
    if(action==='skip')url+='&skip_reason='+encodeURIComponent(skipReason||'');
    const resp=await fetch(url);
    if(!resp.ok){
      card.querySelectorAll('button').forEach(b=>b.disabled=false);
      alert('Action failed (HTTP '+resp.status+'). The story was NOT updated. Please try again.');
      return;
    }
    card.classList.remove('skip-pending');
    const outcome=(action==='approve'||action==='hero')?'approved':action==='defer'?'deferred':'skipped';
    card.classList.add('done',outcome);
    const label=action==='hero'?'★ Hero':action==='approve'?(AS_EDITOR?'✓ Sent for sign-off':'✓ Approved'):action==='defer'?'↻ Back tomorrow':'✗ Skipped'+(skipReason?' — '+skipReason.replace(/-/g,' '):'');
    badge.innerHTML=label+'<button class="undo-btn" data-id="'+id+'" data-tok="'+token+'" onclick="undoAct(this.dataset.id,this.dataset.tok)">↩ Undo</button>';
    remaining=Math.max(0,remaining-1);
    updateCounter();
  }catch(e){card.querySelectorAll('button').forEach(b=>b.disabled=false);alert('Network error — story NOT updated. Check your connection and try again.');}
}
async function bulkApprove(dropCaveat){
  const cards=[...document.querySelectorAll('#stories .card')].filter(c=>!c.classList.contains('done'));
  if(!cards.length){alert('Nothing left to approve.');return;}
  if(!confirm('Approve all '+cards.length+' remaining '+(cards.length===1?'story':'stories')+(dropCaveat?', dropping their disclaimers':'')+'? They publish live immediately.'))return;
  const bb=document.getElementById('bulk-bar');if(bb)bb.querySelectorAll('button').forEach(b=>b.disabled=true);
  for(const c of cards){ await act(c.dataset.id,c.dataset.tok,'approve',null,dropCaveat); }
  if(bb)bb.querySelectorAll('button').forEach(b=>b.disabled=false);
}
async function undoAct(id,token){
  const card=document.getElementById('c-'+id);
  const badge=document.getElementById('b-'+id);
  if(!card)return;
  const resp=await fetch(APPROVE+'?id='+encodeURIComponent(id)+'&token='+encodeURIComponent(token)+'&action=undo');
  if(!resp.ok){alert('Undo failed — the story was not restored. Please try again.');return;}
  card.classList.remove('done','approved','skipped','deferred','skip-pending');
  card.querySelectorAll('button').forEach(b=>b.disabled=false);
  badge.innerHTML='';
  remaining++;
  updateCounter();
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
