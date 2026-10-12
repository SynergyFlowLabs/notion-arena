import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/sync/probe?download=1
 *
 * The four open questions in docs/DATA_SYNC_RESEARCH.md §8, turned into a file.
 *
 * Q1 does an HTML block's iframe allow localStorage (or is the origin opaque)?
 * Q2 does the embed iframe permit popups and clipboard writes?
 * Q3 does PATCH /v1/blocks/{id} swap an embed's file_upload in place?
 * Q4 does the Notion mobile app render an HTML block where it refuses embeds?
 *
 * The first two are answered by this file rendering its own measurements: it has
 * no network dependency, so it behaves identically whether it is opened as an
 * embed URL, uploaded as an HTML block, or opened from disk. Q3 is answered by
 * the publish endpoint (`refreshes` counter). Q4 is answered by opening the same
 * page on a phone and looking.
 */
export async function GET(req: NextRequest) {
  const download = req.nextUrl.searchParams.get("download") === "1";
  const html = PROBE_HTML.replace("__DATE__", new Date().toISOString().slice(0, 10));
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...(download ? { "content-disposition": 'attachment; filename="arena-probe.html"' } : {}),
      "cache-control": "no-store",
      "content-security-policy":
        "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors *",
    },
  });
}

const PROBE_HTML = `<!doctype html>
<html lang="en" data-theme="auto">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Arena environment probe</title>
<style>
:root{--bg:#fff;--fg:#37352f;--muted:#787774;--ok:#0f7b6c;--warn:#d9730d;--bad:#cb3939;--line:#e9e9e7;--soft:#f7f7f5}
@media (prefers-color-scheme:dark){:root{--bg:#191919;--fg:#e6e6e4;--muted:#9b9a97;--line:#2f2f2f;--soft:#252525}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:13px/1.5 ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;padding:14px}
h1{font-size:13.5px;margin:0 0 2px}.sub{color:var(--muted);font-size:11.5px;margin-bottom:10px}
table{border-collapse:collapse;width:100%;font-size:12.5px}
td{padding:5px 6px;border-bottom:1px solid var(--line);vertical-align:top}
td:first-child{color:var(--muted);white-space:nowrap;width:44%}
code{font:11.5px ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--soft);padding:1px 4px;border-radius:4px}
.ok{color:var(--ok)}.warn{color:var(--warn)}.bad{color:var(--bad)}
.actions{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
button{font:inherit;font-size:11.5px;border:1px solid var(--line);background:var(--soft);color:var(--fg);border-radius:7px;padding:4px 9px;cursor:pointer}
.note{margin-top:10px;color:var(--muted);font-size:11.5px}
</style>
</head>
<body>
<h1>Arena environment probe</h1>
<div class="sub">Built __DATE__. Upload this file as a Notion HTML block, or paste this URL into an /embed block. The table reports what the frame can actually do.</div>
<table id="rows"></table>
<div class="actions">
  <button id="popup">Test window.open</button>
  <button id="clip">Test clipboard write</button>
  <button id="storage">Test storage round trip</button>
</div>
<div class="note" id="note"></div>
<script>
(function(){
  var q=new URLSearchParams(location.search);
  function row(label,value,cls){var t=document.getElementById('rows');var tr=document.createElement('tr');var a=document.createElement('td');a.textContent=label;var b=document.createElement('td');b.innerHTML=value;if(cls)b.className=cls;tr.appendChild(a);tr.appendChild(b);t.appendChild(tr);}
  var framed=false;try{framed=!!(window.parent&&window.parent!==window);}catch(e){framed=true;}
  var origin='unknown';try{origin=String(location.origin||'null');}catch(e){origin='null';}
  row('Framed','<code>'+ (framed?'yes':'no (top level)') +'</code>');
  row('Frame origin','<code>'+origin+'</code>'+(origin==='null'?' <span class="warn">opaque</span>':''));
  row('Parent origin','<code>'+ (function(){try{return document.referrer? new URL(document.referrer).origin : (framed?'hidden by cross-origin policy':'n/a');}catch(e){return 'hidden';}})() +'</code>');

  var storage='memory',err='';
  try{localStorage.setItem('arena.probe','1');if(localStorage.getItem('arena.probe')!=='1')throw new Error('read back failed');localStorage.removeItem('arena.probe');storage='localStorage';}
  catch(e){err=String(e&&e.message||e);}
  row('localStorage', storage==='localStorage'
    ? '<span class="ok">works</span>'
    : '<span class="bad">throws</span> <code>'+(err||'unknown').replace(/[<>&]/g,'')+'</code>');
  var bc=false;try{bc=typeof BroadcastChannel==='function';}catch(e){}
  row('BroadcastChannel', bc?'<span class="ok">available</span>':'<span class="bad">missing</span>');
  var sse=false;try{sse=typeof EventSource==='function';}catch(e){}
  row('EventSource', sse?'<span class="ok">available</span>':'<span class="bad">missing</span>');
  var popups='untested';
  document.getElementById('popup').addEventListener('click',function(){
    var w=null;try{w=window.open('about:blank','arena_probe','width=200,height=120');}catch(e){}
    document.getElementById('note').innerHTML = w ? '<span class="ok">window.open worked</span>' : '<span class="bad">window.open was blocked</span>';
    if(w){setTimeout(function(){try{w.close();}catch(e){}},800);}
  });
  document.getElementById('clip').addEventListener('click',function(){
    var el=document.getElementById('note');
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText('arena probe').then(function(){el.innerHTML='<span class="ok">clipboard write allowed</span>';},function(e){el.innerHTML='<span class="bad">clipboard refused</span> <code>'+String(e&&e.name||e)+'</code>';});
      } else { el.innerHTML='<span class="warn">navigator.clipboard unavailable: use selection fallback</span>'; }
    }catch(e){ el.innerHTML='<span class="bad">clipboard threw</span> <code>'+String(e&&e.message||e)+'</code>'; }
  });
  document.getElementById('storage').addEventListener('click',function(){
    var el=document.getElementById('note');
    try{localStorage.setItem('arena.probe','1');var v=localStorage.getItem('arena.probe');localStorage.removeItem('arena.probe');
      el.innerHTML= v==='1'?'<span class="ok">storage round trip works</span>':'<span class="bad">storage wrote but did not read back</span>';}
    catch(e){el.innerHTML='<span class="bad">storage threw</span> <code>'+String(e&&e.message||e).replace(/[<>&]/g,'')+'</code>';}
  });
  if(q.get('i')){row('Arena instance','<code>'+q.get('i')+'</code>');}
})();
</script>
</body>
</html>
`;
