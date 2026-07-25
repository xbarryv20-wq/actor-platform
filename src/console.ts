import { Hono } from "hono";

const consoleRoute = new Hono();

consoleRoute.get("/", (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Actor Platform Console</title>
<style>
:root {
  --bg: #f1f5f9; --surface: #fff; --border: #e2e8f0;
  --text: #1e293b; --muted: #64748b;
  --primary: #2563eb; --primary-hover: #1d4ed8;
  --success: #16a34a; --warning: #d97706; --danger: #dc2626;
  --radius: 8px; --shadow: 0 1px 3px rgba(0,0,0,.08);
}
*,*::before,*::after{box-sizing:border-box;margin:0}
body{font-family:system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);line-height:1.5}
a{color:var(--primary);text-decoration:none}
a:hover{text-decoration:underline}
.layout{display:grid;grid-template-columns:220px 1fr;min-height:100vh}
.sidebar{background:var(--surface);border-right:1px solid var(--border);padding:1.5rem}
.sidebar h1{font-size:1.1rem;font-weight:700;margin-bottom:1.5rem;color:var(--primary)}
.sidebar nav{display:flex;flex-direction:column;gap:0.25rem}
.sidebar nav a{padding:0.5rem 0.75rem;border-radius:var(--radius);color:var(--text);font-size:0.9rem;font-weight:500;transition:background .1s}
.sidebar nav a:hover{background:#f1f5f9;text-decoration:none}
.sidebar nav a.active{background:#eff6ff;color:var(--primary)}
.main{display:flex;flex-direction:column}
.topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:0.75rem 1.5rem;display:flex;align-items:center;gap:1rem;font-size:0.85rem}
.topbar .ws-label{font-weight:600;color:var(--muted);margin-right:0.25rem}
.topbar select{padding:0.25rem 0.5rem;border:1px solid var(--border);border-radius:4px;font-size:0.85rem}
.content{padding:1.5rem;flex:1}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);margin-bottom:1rem}
.card-header{padding:1rem 1.25rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.card-header h2{font-size:1rem;font-weight:600}
.card-body{padding:1.25rem}
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:0.875rem}
th,td{padding:0.625rem 0.75rem;text-align:left;border-bottom:1px solid var(--border);white-space:nowrap}
th{font-weight:600;color:var(--muted);font-size:0.8rem;text-transform:uppercase;letter-spacing:.03em}
tr:hover td{background:#f8fafc}
.badge{display:inline-block;padding:0.125rem 0.5rem;border-radius:9999px;font-size:0.75rem;font-weight:600}
.badge-draft{background:#fef3c7;color:#92400e}
.badge-published{background:#dcfce7;color:#166534}
.badge-deprecated{background:#fce4ec;color:#9a0007}
.badge-pending{background:#fef3c7;color:#92400e}
.badge-running{background:#dbeafe;color:#1e40af}
.badge-succeeded{background:#dcfce7;color:#166534}
.badge-failed{background:#fce4ec;color:#9a0007}
.badge-canceled{background:#f1f5f9;color:#475569}
.btn{display:inline-flex;align-items:center;gap:0.375rem;padding:0.4rem 0.85rem;border:none;border-radius:6px;font-size:0.825rem;font-weight:500;cursor:pointer;transition:background .1s}
.btn-primary{background:var(--primary);color:#fff}
.btn-primary:hover{background:var(--primary-hover)}
.btn-success{background:var(--success);color:#fff}
.btn-success:hover{background:#15803d}
.btn-warning{background:var(--warning);color:#fff}
.btn-warning:hover{background:#b45309}
.btn-danger{background:var(--danger);color:#fff}
.btn-danger:hover{background:#b91c1c}
.btn-outline{background:transparent;border:1px solid var(--border);color:var(--text)}
.btn-outline:hover{background:#f1f5f9}
.btn-sm{padding:0.25rem 0.5rem;font-size:0.75rem}
.btn:disabled{opacity:0.5;cursor:default}
.tag{display:inline-block;padding:0.125rem 0.4rem;border-radius:4px;background:#f1f5f9;font-size:0.75rem;color:var(--muted);margin-right:0.25rem;margin-bottom:0.125rem}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:100;display:flex;align-items:center;justify-content:center}
.modal{background:var(--surface);border-radius:var(--radius);box-shadow:0 8px 32px rgba(0,0,0,.15);width:520px;max-width:90vw;max-height:85vh;overflow-y:auto}
.modal-header{padding:1rem 1.25rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.modal-header h3{font-size:1rem;font-weight:600}
.modal-body{padding:1.25rem}
.modal-footer{padding:1rem 1.25rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:0.5rem}
.form-group{margin-bottom:1rem}
.form-group label{display:block;font-size:0.85rem;font-weight:500;margin-bottom:0.375rem;color:var(--text)}
.form-group input,.form-group textarea,.form-group select{width:100%;padding:0.5rem 0.75rem;border:1px solid var(--border);border-radius:6px;font-size:0.875rem;font-family:inherit}
.form-group textarea{resize:vertical;min-height:60px;font-family:monospace}
.form-row{display:flex;gap:0.75rem}
.form-row .form-group{flex:1}
.empty-state{padding:2rem;text-align:center;color:var(--muted);font-size:0.9rem}
.detail-label{font-size:0.8rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;margin-bottom:0.25rem}
.detail-value{margin-bottom:1rem;font-size:0.9rem}
.detail-value.mono{font-family:monospace;font-size:0.825rem}
pre.logs{background:#1e293b;color:#e2e8f0;padding:1rem;border-radius:var(--radius);overflow:auto;max-height:400px;font-size:0.8rem;line-height:1.4}
.hidden{display:none!important}
.flex{display:flex}.gap-1{gap:0.5rem}.gap-2{gap:1rem}.items-center{align-items:center}.justify-between{justify-content:space-between}.mt-1{margin-top:0.5rem}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:1rem;margin-bottom:1.5rem}
.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem;text-align:center;box-shadow:var(--shadow)}
.stat-value{font-size:1.75rem;font-weight:700;color:var(--primary);line-height:1.2}
.stat-label{font-size:0.8rem;color:var(--muted);margin-top:0.25rem;text-transform:uppercase;letter-spacing:.03em}
.widget{margin-bottom:1rem}

/* Login screen */
.login-overlay{position:fixed;inset:0;background:var(--bg);z-index:200;display:flex;align-items:center;justify-content:center}
.login-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:0 8px 32px rgba(0,0,0,.12);width:400px;max-width:90vw;padding:2rem}
.login-card h2{margin-bottom:0.5rem;font-size:1.2rem}
.login-card p{color:var(--muted);font-size:0.85rem;margin-bottom:1.25rem}
.login-card input{width:100%;padding:0.6rem 0.75rem;border:1px solid var(--border);border-radius:6px;font-size:0.9rem;font-family:monospace;margin-bottom:0.75rem}
.login-error{color:var(--danger);font-size:0.85rem;margin-top:0.5rem}
.token-display{display:flex;align-items:center;gap:0.5rem;font-family:monospace;font-size:0.8rem;color:var(--muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
</style>
</head>
<body>
<div class="layout">
<aside class="sidebar">
<h1>&#9632; Actor Console</h1>
<nav id="nav">
<a href="#" data-view="dashboard" class="active">&#9654; Dashboard</a>
<a href="#" data-view="actors">&#9654; Actors</a>
<a href="#" data-view="runs">&#9654; Runs</a>
<a href="#" data-view="schedules">&#9654; Schedules</a>
<a href="#" data-view="storage">&#9654; Storage</a>
<a href="#" data-view="marketplace">&#9654; Marketplace</a>
<a href="#" data-view="billing">&#9654; Billing</a>
<a href="#" data-view="admin">&#9654; Admin</a>
</nav>
</aside>
<div class="main">
<div class="topbar">
<span><span class="ws-label">Workspace</span>
<select id="ws-select">
<option value="ws-1">ws-1</option>
</select></span>
<span id="view-title" style="font-weight:600;margin-left:auto">Dashboard</span>
<span id="status-msg" style="color:var(--muted);font-size:0.85rem"></span>
<span id="token-info" class="token-display hidden"></span>
<button id="logout-btn" class="btn btn-sm btn-outline hidden" onclick="logout()">Logout</button>
</div>
<div class="content" id="content"></div>
</div>
</div>

<div id="modal-root" class="hidden"></div>

<div id="login-overlay" class="login-overlay">
  <div class="login-card">
    <h2>&#9632; Actor Console</h2>
    <p>Enter an API token to connect. Generate tokens from the API tokens page.</p>
    <input id="token-input" type="password" placeholder="paste your api token" autocomplete="off">
    <button class="btn btn-primary" onclick="login()" style="width:100%">Connect</button>
    <div id="login-error" class="login-error"></div>
  </div>
</div>

<script>
// â”€â”€â”€ Token management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getToken(){ return localStorage.getItem('actor_console_token'); }
function setToken(t){ localStorage.setItem('actor_console_token', t); }
function clearToken(){ localStorage.removeItem('actor_console_token'); }
function isAuthed(){ return !!getToken(); }

function login(){
  const t = document.getElementById('token-input').value.trim();
  if(!t){ document.getElementById('login-error').textContent = 'Token is required'; return; }
  setToken(t);
  document.getElementById('login-overlay').classList.add('hidden');
  document.getElementById('login-error').textContent = '';
  render();
}
function logout(){
  if(!confirm('Disconnect?')) return;
  clearToken();
  document.getElementById('login-overlay').classList.remove('hidden');
  document.getElementById('token-input').value = '';
}

const WS = { get:()=>document.getElementById('ws-select').value || 'ws-1' };
let state = { view: 'dashboard', actorId: null, runId: null, scheduleId: null, storageType: null, storageId: null, marketplaceId: null };

function $(s,p){return(p||document).querySelector(s)}
function $$(s,p){return[...(p||document).querySelectorAll(s)]}

function api(path,opts={}){
  const headers = {'content-type':'application/json',...opts.headers};
  const token = getToken();
  if(token) headers['authorization'] = 'Bearer '+token;
  return fetch(path,{
    headers,
    ...opts
  }).then(r=>{
    if(r.status===401){
      clearToken();
      document.getElementById('login-overlay').classList.remove('hidden');
      document.getElementById('token-input').value = '';
      document.getElementById('login-error').textContent = 'Token expired or invalid. Please re-authenticate.';
      return Promise.reject({error:'Unauthorized'});
    }
    if(!r.ok) return r.json().then(e=>Promise.reject(e)).catch(e=>e.error?Promise.reject(e):Promise.reject({error:r.statusText}));
    return r.json().catch(()=>({}));
  });
}

function statusBadge(s){
  const cls = 'badge badge-' + s.toLowerCase();
  return '<span class="'+cls+'">'+s+'</span>';
}

function esc(s){
  if(s==null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function dateStr(d){
  if(!d) return '-';
  return new Date(d).toLocaleString();
}

setStatus = function(m){ document.getElementById('status-msg').textContent = m; };

// â”€â”€â”€ Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function navigate(view, id){
  state.view = view;
  if(view==='actor') state.actorId = id;
  if(view==='run') state.runId = id;
  if(view==='schedule') state.scheduleId = id;
  if(view==='dataset'||view==='kvstore'||view==='requestqueue'){ state.storageType=view; state.storageId=id; }
  if(view==='marketplace-listing') state.marketplaceId = id;
  render();
}

$$('#nav a').forEach(a=>{
  a.addEventListener('click',e=>{
    e.preventDefault();
    $$('#nav a').forEach(x=>x.classList.remove('active'));
    a.classList.add('active');
    navigate(a.dataset.view, null);
  });
});

document.getElementById('ws-select').addEventListener('change', ()=>render());

// â”€â”€â”€ Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showModal(html){
  const root = document.getElementById('modal-root');
  root.innerHTML = '<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" onclick="event.stopPropagation()">'+html+'</div></div>';
  root.classList.remove('hidden');
}
function closeModal(){
  document.getElementById('modal-root').classList.add('hidden');
}

// â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function render(){
  const el = document.getElementById('content');
  const title = document.getElementById('view-title');
  try {
    switch(state.view){
      case 'dashboard': title.textContent='Dashboard'; el.innerHTML=await renderDashboard(); break;
      case 'actors': title.textContent='Actors'; el.innerHTML=await renderActors(); break;
      case 'actor': title.textContent='Actor Detail'; el.innerHTML=await renderActor(); break;
      case 'runs': title.textContent='Runs'; el.innerHTML=await renderRuns(); break;
      case 'run': title.textContent='Run Detail'; el.innerHTML=await renderRun(); break;
      case 'schedules': title.textContent='Schedules'; el.innerHTML=await renderSchedules(); break;
      case 'schedule': title.textContent='Schedule Detail'; el.innerHTML=await renderSchedule(); break;
      case 'storage': title.textContent='Storage'; el.innerHTML=await renderStorage(); break;
      case 'dataset': title.textContent='Dataset Detail'; el.innerHTML=await renderDataset(); break;
      case 'kvstore': title.textContent='KV Store Detail'; el.innerHTML=await renderKvStore(); break;
      case 'requestqueue': title.textContent='Request Queue Detail'; el.innerHTML=await renderRequestQueue(); break;
      case 'marketplace': title.textContent='Marketplace'; el.innerHTML=await renderMarketplace(); break;
      case 'marketplace-listing': title.textContent='Listing Detail'; el.innerHTML=await renderMarketplaceListing(); break;
      case 'billing': title.textContent='Billing'; el.innerHTML=await renderBilling(); break;
      case 'admin': title.textContent='Admin'; el.innerHTML=await renderAdmin(); break;
    }
  } catch(e){
    el.innerHTML = '<div class="card"><div class="card-body" style="color:var(--danger)"><strong>Error:</strong> '+esc(e.error||e.message||String(e))+'</div></div>';
  }
}

// â”€â”€â”€ Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function renderDashboard(){
  let html = '';

  // Fetch summary data in parallel
  let actors=[], runs=[], schedules=[], datasets=[], kvStores=[], queues=[];
  try {
    const [ad,r,sch,d,k,q] = await Promise.all([
      api('/workspaces/'+WS.get()+'/actors?limit=100').catch(()=>({actors:[]})),
      api('/workspaces/'+WS.get()+'/runs?limit=10').catch(()=>({runs:[]})),
      api('/workspaces/'+WS.get()+'/schedules?limit=100').catch(()=>({schedules:[]})),
      api('/workspaces/'+WS.get()+'/datasets?limit=100').catch(()=>({datasets:[]})),
      api('/workspaces/'+WS.get()+'/kv-stores?limit=100').catch(()=>({keyValueStores:[]})),
      api('/workspaces/'+WS.get()+'/request-queues?limit=100').catch(()=>({requestQueues:[]})),
    ]);
    actors = ad.actors||[];
    runs = r.runs||r||[];
    schedules = sch.schedules||[];
    datasets = d.datasets||[];
    kvStores = k.keyValueStores||[];
    queues = q.requestQueues||[];
  } catch(e) {}

  const published = actors.filter(a=>a.status==='PUBLISHED').length;
  const running = (Array.isArray(runs)?runs:[]).filter(r=>r.status==='RUNNING').length;
  const enabledSchedules = schedules.filter(s=>s.enabled).length;
  const totalStorage = datasets.length + kvStores.length + queues.length;

  html += '<div class="stat-grid">';
  html += '<div class="stat-card"><div class="stat-value">'+actors.length+'</div><div class="stat-label">Actors</div><div style="font-size:0.75rem;color:var(--muted)">'+published+' published</div></div>';
  html += '<div class="stat-card"><div class="stat-value">'+(Array.isArray(runs)?runs.length:'-')+'</div><div class="stat-label">Recent Runs</div><div style="font-size:0.75rem;color:var(--muted)">'+running+' running</div></div>';
  html += '<div class="stat-card"><div class="stat-value">'+schedules.length+'</div><div class="stat-label">Schedules</div><div style="font-size:0.75rem;color:var(--muted)">'+enabledSchedules+' enabled</div></div>';
  html += '<div class="stat-card"><div class="stat-value">'+totalStorage+'</div><div class="stat-label">Storage</div><div style="font-size:0.75rem;color:var(--muted)">'+datasets.length+' datasets, '+kvStores.length+' KV, '+queues.length+' queues</div></div>';
  html += '</div>';

  // Recent runs widget
  if(Array.isArray(runs) && runs.length>0){
    html += '<div class="widget card"><div class="card-header"><h2>Recent Runs</h2></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Actor</th><th>Status</th><th>Created</th></tr></thead><tbody>';
    for(const r of runs.slice(0,10)){
      html += '<tr><td class="mono" style="font-family:monospace;font-size:0.8rem"><a href="#" data-nav="run" data-nav-id="'+r.id+'">'+esc(r.id.substring(0,12))+'</a></td>';
      html += '<td style="font-size:0.85rem">'+esc(r.actorId?(r.actorId.substring(0,12)):'-')+'</td>';
      html += '<td>'+statusBadge(r.status)+'</td>';
      html += '<td>'+dateStr(r.createdAt)+'</td></tr>';
    }
    html += '</tbody></table></div></div>';
  }

  // Upcoming schedules widget
  const upcoming = schedules.filter(s=>s.enabled && s.nextRunAt).sort((a,b)=>new Date(a.nextRunAt).getTime()-new Date(b.nextRunAt).getTime()).slice(0,10);
  if(upcoming.length>0){
    html += '<div class="widget card"><div class="card-header"><h2>Upcoming Schedules</h2></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Actor</th><th>Cron</th><th>Next Run</th></tr></thead><tbody>';
    for(const s of upcoming){
      html += '<tr><td class="mono" style="font-family:monospace;font-size:0.8rem"><a href="#" data-nav="schedule" data-nav-id="'+s.id+'">'+esc(s.id.substring(0,12))+'</a></td>';
      html += '<td>'+esc(s.actorId.substring(0,12))+'</td>';
      html += '<td><code>'+esc(s.cronExpression)+'</code></td>';
      html += '<td>'+dateStr(s.nextRunAt)+'</td></tr>';
    }
    html += '</tbody></table></div></div>';
  }

  // Storage summary widget
  if(totalStorage>0){
    html += '<div class="widget card"><div class="card-header"><h2>Storage Overview</h2></div><div class="table-wrap"><table><thead><tr><th>Type</th><th>Count</th><th></th></tr></thead><tbody>';
    html += '<tr><td><strong>Datasets</strong></td><td>'+datasets.length+'</td><td style="text-align:right"><button class="btn btn-sm btn-outline" data-nav="storage">View All</button></td></tr>';
    html += '<tr><td><strong>Key-Value Stores</strong></td><td>'+kvStores.length+'</td><td style="text-align:right"><button class="btn btn-sm btn-outline" data-nav="storage">View All</button></td></tr>';
    html += '<tr><td><strong>Request Queues</strong></td><td>'+queues.length+'</td><td style="text-align:right"><button class="btn btn-sm btn-outline" data-nav="storage">View All</button></td></tr>';
    html += '</tbody></table></div></div>';
  }

  if(!actors.length && !runs.length && !schedules.length && !totalStorage){
    html += '<div class="card"><div class="card-body"><div class="empty-state">Workspace is empty. Create an actor to get started.</div></div></div>';
  }

  return html;
}

// â”€â”€â”€ Actors List â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function renderActors(){
  const data = await api('/workspaces/'+WS.get()+'/actors?limit=50');
  const list = data.actors||[];
  let html = '<div class="flex justify-between items-center" style="margin-bottom:1rem">';
  html += '<div style="font-size:0.9rem;color:var(--muted)">'+list.length+' actor'+(list.length!==1?'s':'')+'</div>';
  html += '<button class="btn btn-primary" onclick="showCreateActor()">+ New Actor</button></div>';

  if(list.length===0) return html+'<div class="card"><div class="empty-state">No actors in this workspace</div></div>';

  html += '<div class="card"><div class="table-wrap"><table><thead><tr><th>Name</th><th>Slug</th><th>Status</th><th>Tags</th><th>Created</th><th></th></tr></thead><tbody>';
  for(const a of list){
    html += '<tr><td><a href="#" data-nav="actor" data-nav-id="'+a.id+'"><strong>'+esc(a.name)+'</strong></a></td>';
    html += '<td>'+esc(a.slug)+'</td>';
    html += '<td>'+statusBadge(a.status)+'</td>';
    html += '<td>'+(a.tags||[]).map(t=>'<span class="tag">'+esc(t)+'</span>').join('')+'</td>';
    html += '<td>'+dateStr(a.createdAt)+'</td>';
    html += '<td style="text-align:right">';
    html += '<button class="btn btn-sm btn-outline" data-nav="actor">View</button> ';
    if(a.status==='DRAFT') html += '<button class="btn btn-sm btn-success" onclick="doTransition(&#39;' + a.id + '&#39;,&#39;publish&#39;)">Publish</button> ';
    if(a.status==='PUBLISHED') html += '<button class="btn btn-sm btn-warning" onclick="doTransition(&#39;' + a.id + '&#39;,&#39;deprecate&#39;)">Deprecate</button> ';
    if(a.status==='DEPRECATED') html += '<button class="btn btn-sm btn-success" onclick="doTransition(&#39;' + a.id + '&#39;,&#39;republish&#39;)">Republish</button> ';
    html += '<button class="btn btn-sm btn-danger" onclick="deleteActor(&#39;' + a.id + '&#39;)">Del</button>';
    html += '</td></tr>';
  }
  html += '</tbody></table></div></div>';
  return html;
}

// â”€â”€â”€ Actor Detail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function renderActor(){
  const actor = await api('/workspaces/'+WS.get()+'/actors/'+state.actorId);
  let html = '<div class="flex gap-1" style="margin-bottom:1rem">';
  html += '<button class="btn btn-outline" data-nav="actors">&larr; Back</button>';
  if(actor.status==='DRAFT') html += '<button class="btn btn-success" onclick="doTransition(&#39;' + actor.id + '&#39;,&#39;publish&#39;)">Publish</button>';
  if(actor.status==='PUBLISHED') html += '<button class="btn btn-warning" onclick="doTransition(&#39;' + actor.id + '&#39;,&#39;deprecate&#39;)">Deprecate</button>';
  if(actor.status==='DEPRECATED') html += '<button class="btn btn-success" onclick="doTransition(&#39;' + actor.id + '&#39;,&#39;republish&#39;)">Republish</button>';
  html += '<button class="btn btn-outline" onclick="showEditActor(&#39;' + actor.id + '&#39;)">Edit</button>';
  html += '<button class="btn btn-outline" onclick="showCreateRun(&#39;' + actor.id + '&#39;)">Run</button>';
  html += '</div>';

  html += '<div class="card"><div class="card-header"><h2>'+esc(actor.name)+'</h2>'+statusBadge(actor.status)+'</div><div class="card-body">';
  html += '<div class="detail-label">ID</div><div class="detail-value mono">'+esc(actor.id)+'</div>';
  html += '<div class="detail-label">Slug</div><div class="detail-value">'+esc(actor.slug)+'</div>';
  html += '<div class="detail-label">Description</div><div class="detail-value">'+esc(actor.description||'-')+'</div>';
  html += '<div class="detail-label">Tags</div><div class="detail-value">'+(actor.tags||[]).map(t=>'<span class="tag">'+esc(t)+'</span>').join('')||'-'+'</div>';
  html += '<div class="detail-label">Icon</div><div class="detail-value">'+esc(actor.icon||'-')+'</div>';
  html += '<div class="detail-label">Created</div><div class="detail-value">'+dateStr(actor.createdAt)+'</div>';
  if(actor.inputSchema){
    html += '<div class="detail-label">Input Schema</div><div class="detail-value mono"><pre style="margin:0;background:#f8fafc;padding:0.75rem;border-radius:6px;font-size:0.8rem">'+esc(JSON.stringify(actor.inputSchema,null,2))+'</pre></div>';
  }
  html += '</div></div>';

  // Versions
  try {
    const vdata = await api('/workspaces/'+WS.get()+'/actors/'+actor.id+'/versions');
    const versions = vdata.versions||[];
    html += '<div class="card"><div class="card-header"><h2>Versions ('+versions.length+')</h2></div>';
    if(versions.length===0){
      html += '<div class="card-body"><div class="empty-state">No versions yet. Publish this actor to create a version snapshot.</div></div>';
    } else {
      html += '<div class="table-wrap"><table><thead><tr><th>#</th><th>Changelog</th><th>Source Ref</th><th>Created</th></tr></thead><tbody>';
      for(const v of versions){
        html += '<tr><td><strong>v'+v.version+'</strong></td>';
        html += '<td>'+esc(v.changelog||'-')+'</td>';
        html += '<td class="mono" style="font-family:monospace;font-size:0.8rem">'+esc(v.sourceReference||'-')+'</td>';
        html += '<td>'+dateStr(v.createdAt)+'</td></tr>';
      }
      html += '</tbody></table></div>';
    }
    html += '</div>';
  } catch(e){
    // versions endpoint may fail without DB
  }

  // Runs for this actor
  try {
    const rdata = await api('/workspaces/'+WS.get()+'/runs?limit=20');
    const runs = (rdata.runs||rdata||[]).filter(r=>r.actorId===actor.id);
    if(runs.length>0){
      html += '<div class="card"><div class="card-header"><h2>Recent Runs</h2></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Status</th><th>Version</th><th>Created</th></tr></thead><tbody>';
      for(const r of runs){
        html += '<tr><td class="mono" style="font-family:monospace;font-size:0.8rem">'+esc(r.id.substring(0,12))+'</td>';
        html += '<td>'+statusBadge(r.status)+'</td>';
        html += '<td>'+(r.actorVersionId?'<span class="badge badge-published">bound</span>':'-')+'</td>';
        html += '<td>'+dateStr(r.createdAt)+'</td></tr>';
      }
      html += '</tbody></table></div></div>';
    }
  } catch(e){}

  return html;
}

// â”€â”€â”€ Runs List â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function renderRuns(){
  try {
    const data = await api('/workspaces/'+WS.get()+'/runs?limit=50');
    const list = data.runs||data||[];
    let html = '<div style="font-size:0.9rem;color:var(--muted);margin-bottom:1rem">'+(Array.isArray(list)?list.length+' runs':'')+'</div>';

    if(!Array.isArray(list)||list.length===0){
      return html+'<div class="card"><div class="empty-state">No runs in this workspace</div></div>';
    }

    html += '<div class="card"><div class="table-wrap"><table><thead><tr><th>ID</th><th>Actor</th><th>Status</th><th>Created</th><th>Finished</th><th></th></tr></thead><tbody>';
    for(const r of list){
      html += '<tr><td class="mono" style="font-family:monospace;font-size:0.8rem">'+esc(r.id.substring(0,12))+'</td>';
      html += '<td>'+esc(r.actorId.substring(0,12))+'</td>';
      html += '<td>'+statusBadge(r.status)+'</td>';
      html += '<td>'+dateStr(r.createdAt)+'</td>';
      html += '<td>'+dateStr(r.finishedAt||r.completedAt)+'</td>';
      html += '<td style="text-align:right"><button class="btn btn-sm btn-outline" data-nav="run" data-nav-id="'+r.id+'">View</button></td></tr>';
    }
    html += '</tbody></table></div></div>';
    return html;
  } catch(e){
    // Runs list via the workspace endpoint requires the runs:read scope
    // If it fails, show a helpful message
    return '<div class="card"><div class="card-body" style="color:var(--danger)"><strong>Could not load runs.</strong> '+(e.error||e.message||'Check that the backend is running.')+'</div></div>';
  }
}

// â”€â”€â”€ Run Detail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function renderRun(){
  const run = await api('/runs/'+state.runId);
  let html = '<div class="flex gap-1" style="margin-bottom:1rem">';
  html += '<button class="btn btn-outline" data-nav="runs">&larr; Back</button>';
  if(run.status==='PENDING'||run.status==='RUNNING'){
    html += '<button class="btn btn-danger" onclick="cancelRun(&#39;' + run.id + '&#39;)">Cancel</button>';
  }
  html += '</div>';

  html += '<div class="card"><div class="card-header"><h2>Run</h2>'+statusBadge(run.status)+'</div><div class="card-body">';
  html += '<div class="detail-label">ID</div><div class="detail-value mono">'+esc(run.id)+'</div>';
  html += '<div class="detail-label">Actor</div><div class="detail-value mono">'+esc(run.actorId)+'</div>';
  html += '<div class="detail-label">Workspace</div><div class="detail-value">'+esc(run.workspaceId)+'</div>';
  html += '<div class="detail-label">Version</div><div class="detail-value">'+(run.actorVersionId?'<span class="mono">'+esc(run.actorVersionId)+'</span>':'<span style="color:var(--muted)">none (draft)</span>')+'</div>';
  if(run.errorMessage) html += '<div class="detail-label">Error</div><div class="detail-value" style="color:var(--danger)">'+esc(run.errorMessage)+'</div>';
  html += '<div class="detail-label">Created</div><div class="detail-value">'+dateStr(run.createdAt)+'</div>';
  if(run.startedAt) html += '<div class="detail-label">Started</div><div class="detail-value">'+dateStr(run.startedAt)+'</div>';
  if(run.finishedAt||run.completedAt) html += '<div class="detail-label">Finished</div><div class="detail-value">'+dateStr(run.finishedAt||run.completedAt)+'</div>';
  if(run.input){
    html += '<div class="detail-label">Input</div><div class="detail-value mono"><pre style="margin:0;background:#f8fafc;padding:0.75rem;border-radius:6px;font-size:0.8rem">'+esc(JSON.stringify(run.input,null,2))+'</pre></div>';
  }
  if(run.output){
    html += '<div class="detail-label">Output</div><div class="detail-value mono"><pre style="margin:0;background:#f8fafc;padding:0.75rem;border-radius:6px;font-size:0.8rem">'+esc(JSON.stringify(run.output,null,2))+'</pre></div>';
  }
  html += '</div></div>';

  // Logs
  try {
    const ldata = await api('/runs/'+run.id+'/logs');
    const logs = ldata.logs||ldata||[];
    if(Array.isArray(logs)&&logs.length>0){
      html += '<div class="card"><div class="card-header"><h2>Logs ('+logs.length+')</h2></div><div class="card-body">';
      html += '<pre class="logs">';
      for(const l of logs){
        const level = l.level||'INFO';
        const icon = level==='ERROR'?'&#x2716;':level==='WARN'?'&#x26A0;':'&#x25B8;';
        html += '<span style="color:'+(level==='ERROR'?'#f87171':level==='WARN'?'#fbbf24':'#94a3b8')+'">'+icon+' ['+level+']</span> ';
        html += '<span style="color:#94a3b8;font-size:0.75rem">'+dateStr(l.timestamp||l.createdAt)+'</span>';
        html += ' '+esc(l.message)+String.fromCharCode(10);
      }
      html += '</pre></div></div>';
    }
  } catch(e){}

  return html;
}

// â”€â”€â”€ Schedules List â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function renderSchedules(){
  try {
    const data = await api('/workspaces/'+WS.get()+'/schedules?limit=50');
    const list = data.schedules||[];
    let html = '<div class="flex justify-between items-center" style="margin-bottom:1rem">';
    html += '<div style="font-size:0.9rem;color:var(--muted)">'+list.length+' schedule'+(list.length!==1?'s':'')+'</div>';
    html += '<button class="btn btn-primary" onclick="showCreateSchedule()">+ New Schedule</button></div>';

    if(list.length===0) return html+'<div class="card"><div class="empty-state">No schedules in this workspace</div></div>';

    html += '<div class="card"><div class="table-wrap"><table><thead><tr><th>ID</th><th>Actor</th><th>Cron</th><th>Enabled</th><th>Next Run</th><th></th></tr></thead><tbody>';
    for(const s of list){
      html += '<tr><td class="mono" style="font-family:monospace;font-size:0.8rem">'+esc(s.id.substring(0,12))+'</td>';
      html += '<td>'+esc(s.actorId.substring(0,12))+'</td>';
      html += '<td><code>'+esc(s.cronExpression)+'</code></td>';
      html += '<td>'+(s.enabled?'<span class="badge badge-published">yes</span>':'<span class="badge badge-deprecated">no</span>')+'</td>';
      html += '<td>'+dateStr(s.nextRunAt)+'</td>';
      html += '<td style="text-align:right"><button class="btn btn-sm btn-outline" data-nav="schedule" data-nav-id="'+s.id+'">View</button></td></tr>';
    }
    html += '</tbody></table></div></div>';
    return html;
  } catch(e){
    return '<div class="card"><div class="card-body" style="color:var(--danger)"><strong>Could not load schedules.</strong> '+(e.error||e.message||'')+'</div></div>';
  }
}

// â”€â”€â”€ Schedule Detail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function renderSchedule(){
  const s = await api('/schedules/'+state.scheduleId);
  let html = '<div class="flex gap-1" style="margin-bottom:1rem">';
  html += '<button class="btn btn-outline" data-nav="schedules">&larr; Back</button>';
  html += '</div>';

  html += '<div class="card"><div class="card-header"><h2>Schedule</h2>'+(s.enabled?'<span class="badge badge-published">enabled</span>':'<span class="badge badge-deprecated">disabled</span>')+'</div><div class="card-body">';
  html += '<div class="detail-label">ID</div><div class="detail-value mono">'+esc(s.id)+'</div>';
  html += '<div class="detail-label">Actor</div><div class="detail-value mono">'+esc(s.actorId)+'</div>';
  html += '<div class="detail-label">Cron Expression</div><div class="detail-value"><code>'+esc(s.cronExpression)+'</code></div>';
  html += '<div class="detail-label">Version</div><div class="detail-value">'+(s.actorVersionId?'<span class="mono">'+esc(s.actorVersionId)+'</span>':'<span style="color:var(--muted)">latest</span>')+'</div>';
  html += '<div class="detail-label">Next Run</div><div class="detail-value">'+dateStr(s.nextRunAt)+'</div>';
  html += '<div class="detail-label">Last Run</div><div class="detail-value">'+dateStr(s.lastRunAt)+'</div>';
  if(s.errorMessage) html += '<div class="detail-label">Error</div><div class="detail-value" style="color:var(--danger)">'+esc(s.errorMessage)+'</div>';
  if(s.inputOverride){
    html += '<div class="detail-label">Input Override</div><div class="detail-value mono"><pre style="margin:0;background:#f8fafc;padding:0.75rem;border-radius:6px;font-size:0.8rem">'+esc(JSON.stringify(s.inputOverride,null,2))+'</pre></div>';
  }
  html += '</div></div>';
  return html;
}

// â”€â”€â”€ Admin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function renderAdmin(){
  let html = '';

  try {
    const [wdata, udata] = await Promise.all([
      api('/admin/workspaces').catch(()=>({workspaces:[]})),
      api('/admin/users').catch(()=>({users:[]})),
    ]);

    const workspaces = wdata.workspaces||[];
    const users = udata.users||[];

    html += '<div class="stat-grid" style="margin-bottom:1rem">';
    html += '<div class="stat-card"><div class="stat-value">'+workspaces.length+'</div><div class="stat-label">Workspaces</div></div>';
    html += '<div class="stat-card"><div class="stat-value">'+users.length+'</div><div class="stat-label">Users</div></div>';
    html += '</div>';

    if(workspaces.length>0){
      html += '<div class="card"><div class="card-header"><h2>Workspaces</h2></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Slug</th><th>Created</th></tr></thead><tbody>';
      for(const w of workspaces){
        html += '<tr><td class="mono" style="font-size:0.8rem">'+esc(w.id.substring(0,12))+'</td>';
        html += '<td>'+esc(w.name)+'</td><td>'+esc(w.slug)+'</td>';
        html += '<td>'+dateStr(w.createdAt)+'</td></tr>';
      }
      html += '</tbody></table></div></div>';
    }

    if(users.length>0){
      html += '<div class="card"><div class="card-header"><h2>Users</h2></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Created</th></tr></thead><tbody>';
      for(const u of users){
        html += '<tr><td class="mono" style="font-size:0.8rem">'+esc(u.id.substring(0,12))+'</td>';
        html += '<td>'+esc(u.name)+'</td><td>'+esc(u.email)+'</td>';
        html += '<td>'+dateStr(u.createdAt)+'</td></tr>';
      }
      html += '</tbody></table></div></div>';
    }
  } catch(e){
    html += '<div class="card"><div class="card-body" style="color:var(--danger)">Admin: '+(e.error||e.message||'error')+'</div></div>';
  }

  return html;
}

// â”€â”€â”€ Billing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function renderBilling(){
  let html = '';

  try {
    const [pdata, sdata, udata] = await Promise.all([
      api('/billing/plans').catch(()=>({plans:[]})),
      api('/workspaces/'+WS.get()+'/billing/subscription').catch(()=>({subscription:null})),
      api('/workspaces/'+WS.get()+'/billing/usage').catch(()=>({records:[], total:{ runsUsed:0, storageBytes:0 }})),
    ]);

    const plans = pdata.plans||[];
    const sub = sdata.subscription;
    const usage = udata.total||{ runsUsed:0, storageBytes:0 };

    // Current plan
    html += '<div class="card"><div class="card-header"><h2>Subscription</h2></div><div class="card-body">';
    if(sub){
      html += '<div class="detail-label">Plan</div><div class="detail-value"><strong>'+esc(sub.plan?.name||'Unknown')+'</strong></div>';
      html += '<div class="detail-label">Status</div><div class="detail-value"><span class="badge badge-published">'+esc(sub.status)+'</span></div>';
      html += '<div class="detail-label">Period End</div><div class="detail-value">'+dateStr(sub.currentPeriodEnd)+'</div>';
    } else {
      html += '<div class="empty-state">No active subscription</div>';
    }
    html += '</div></div>';

    // Usage
    html += '<div class="card"><div class="card-header"><h2>Usage This Period</h2></div><div class="card-body">';
    html += '<div class="stat-grid">';
    html += '<div class="stat-card"><div class="stat-value">'+usage.runsUsed+'</div><div class="stat-label">Runs</div></div>';
    html += '<div class="stat-card"><div class="stat-value">'+Math.round(usage.storageBytes/1024)+' KB</div><div class="stat-label">Storage</div></div>';
    html += '</div></div></div>';

    // Available plans
    if(plans.length>0){
      html += '<div class="card"><div class="card-header"><h2>Available Plans</h2></div><div class="table-wrap"><table><thead><tr><th>Plan</th><th>Price</th><th>Run Limit</th><th>Storage</th><th></th></tr></thead><tbody>';
      for(const p of plans){
        html += '<tr><td><strong>'+esc(p.name)+'</strong></td>';
        html += '<td>$'+(p.priceCents/100).toFixed(2)+'/'+esc(p.interval)+'</td>';
        html += '<td>'+p.runLimit+' runs</td>';
        html += '<td>'+p.storageMb+' MB</td>';
        html += '<td style="text-align:right"><button class="btn btn-sm btn-primary" onclick="subscribeToPlan(&#39;' + p.id + '&#39;)">Subscribe</button></td></tr>';
      }
      html += '</tbody></table></div></div>';
    }
  } catch(e){
    html += '<div class="card"><div class="card-body" style="color:var(--danger)">Billing: '+(e.error||e.message||'error')+'</div></div>';
  }

  return html;
}

// â”€â”€â”€ Marketplace Browser â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function renderMarketplace(){
  let html = '<div style="font-size:0.9rem;color:var(--muted);margin-bottom:1rem">Public actor marketplace</div>';

  try {
    const data = await api('/marketplace?limit=50');
    const listings = data.listings||[];
    if(listings.length===0){
      return html+'<div class="card"><div class="empty-state">No listings in the marketplace yet</div></div>';
    }
    html += '<div class="card"><div class="table-wrap"><table><thead><tr><th>Actor</th><th>Category</th><th>Tags</th><th>Published</th><th></th></tr></thead><tbody>';
    for(const l of listings){
      const a = l.actor||{};
      html += '<tr><td><a href="#" data-nav="marketplace-listing" data-nav-id="'+l.id+'"><strong>'+esc(a.name||'Unnamed')+'</strong></a><br><span style="font-size:0.8rem;color:var(--muted)">'+esc(a.slug||'')+'</span></td>';
      html += '<td>'+esc(l.category||'-')+'</td>';
      html += '<td>'+(a.tags||[]).map(t=>'<span class="tag">'+esc(t)+'</span>').join('')+'</td>';
      html += '<td>'+dateStr(l.createdAt)+'</td>';
      html += '<td style="text-align:right"><button class="btn btn-sm btn-outline" data-nav="marketplace-listing" data-nav-id="'+l.id+'">View</button></td></tr>';
    }
    html += '</tbody></table></div></div>';
  } catch(e){
    html += '<div class="card"><div class="card-body" style="color:var(--danger)">Marketplace: '+(e.error||e.message||'error')+'</div></div>';
  }

  return html;
}

// â”€â”€â”€ Marketplace Listing Detail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function renderMarketplaceListing(){
  let html = '<div class="flex gap-1" style="margin-bottom:1rem">';
  html += '<button class="btn btn-outline" data-nav="marketplace">&larr; Back to Marketplace</button></div>';

  try {
    const l = await api('/marketplace/'+state.marketplaceId);
    const a = l.actor||{};
    html += '<div class="card"><div class="card-header"><h2>'+esc(a.name||'Unnamed')+'</h2>';
    html += '<button class="btn btn-primary" onclick="showCreateRun(&#39;' + a.id + '&#39;)">Run This Actor</button>';
    html += '</div><div class="card-body">';
    html += '<div class="detail-label">ID</div><div class="detail-value mono">'+esc(a.id)+'</div>';
    html += '<div class="detail-label">Slug</div><div class="detail-value">'+esc(a.slug)+'</div>';
    html += '<div class="detail-label">Description</div><div class="detail-value">'+esc(a.description||'-')+'</div>';
    html += '<div class="detail-label">Category</div><div class="detail-value">'+esc(l.category||'-')+'</div>';
    html += '<div class="detail-label">Tags</div><div class="detail-value">'+(a.tags||[]).map(t=>'<span class="tag">'+esc(t)+'</span>').join('')||'-'+'</div>';
    html += '<div class="detail-label">Icon</div><div class="detail-value">'+esc(a.icon||'-')+'</div>';
    html += '<div class="detail-label">Listing Status</div><div class="detail-value">'+statusBadge(l.status)+'</div>';
    html += '<div class="detail-label">Actor Status</div><div class="detail-value"><span class="badge badge-published">'+esc(a.status)+'</span></div>';
    html += '<div class="detail-label">Listed</div><div class="detail-value">'+dateStr(l.createdAt)+'</div>';
    if(l.status==='PENDING'){
      html += '<div style="margin-top:1rem;display:flex;gap:0.5rem">';
      html += '<button class="btn btn-success" onclick="approveListing(&#39;' + l.id + '&#39;)">Approve</button>';
      html += '<button class="btn btn-danger" onclick="rejectListing(&#39;' + l.id + '&#39;)">Reject</button>';
      html += '</div>';
    }
    if(a.inputSchema){
      html += '<div class="detail-label">Input Schema</div><div class="detail-value mono"><pre style="margin:0;background:#f8fafc;padding:0.75rem;border-radius:6px;font-size:0.8rem">'+esc(JSON.stringify(a.inputSchema,null,2))+'</pre></div>';
    }
    html += '</div></div>';
  } catch(e){
    html += '<div class="card"><div class="card-body" style="color:var(--danger)">'+(e.error||e.message||'error')+'</div></div>';
  }

  return html;
}

// â”€â”€â”€ Storage List â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function renderStorage(){
  let html = '<div style="font-size:0.9rem;color:var(--muted);margin-bottom:1rem">Storage overview</div>';

  // Datasets
  try {
    const ddata = await api('/workspaces/'+WS.get()+'/datasets?limit=20');
    const dlist = ddata.datasets||[];
    html += '<div class="card"><div class="card-header"><h2>Datasets ('+dlist.length+')</h2></div>';
    if(dlist.length===0){
      html += '<div class="card-body"><div class="empty-state">No datasets</div></div>';
    } else {
      html += '<div class="table-wrap"><table><thead><tr><th>Name</th><th>Slug</th><th>Items</th><th>Created</th><th></th></tr></thead><tbody>';
      for(const d of dlist){
        html += '<tr><td><a href="#" data-nav="dataset" data-nav-id="'+d.id+'"><strong>'+esc(d.name)+'</strong></a></td>';
        html += '<td>'+esc(d.slug)+'</td>';
        html += '<td>'+(d._count?d._count.items:'?')+'</td>';
        html += '<td>'+dateStr(d.createdAt)+'</td>';
        html += '<td style="text-align:right"><button class="btn btn-sm btn-outline" data-nav="dataset" data-nav-id="'+d.id+'">View</button></td></tr>';
      }
      html += '</tbody></table></div>';
    }
    html += '</div>';
  } catch(e){
    html += '<div class="card"><div class="card-body" style="color:var(--danger)">Datasets: '+(e.error||e.message||'error')+'</div></div>';
  }

  // KV Stores
  try {
    const kdata = await api('/workspaces/'+WS.get()+'/kv-stores?limit=20');
    const klist = kdata.keyValueStores||[];
    html += '<div class="card"><div class="card-header"><h2>Key-Value Stores ('+klist.length+')</h2></div>';
    if(klist.length===0){
      html += '<div class="card-body"><div class="empty-state">No KV stores</div></div>';
    } else {
      html += '<div class="table-wrap"><table><thead><tr><th>Name</th><th>Slug</th><th>Records</th><th>Created</th><th></th></tr></thead><tbody>';
      for(const k of klist){
        html += '<tr><td><a href="#" data-nav="kvstore" data-nav-id="'+k.id+'"><strong>'+esc(k.name)+'</strong></a></td>';
        html += '<td>'+esc(k.slug)+'</td>';
        html += '<td>'+(k._count?k._count.records:'?')+'</td>';
        html += '<td>'+dateStr(k.createdAt)+'</td>';
        html += '<td style="text-align:right"><button class="btn btn-sm btn-outline" data-nav="kvstore" data-nav-id="'+k.id+'">View</button></td></tr>';
      }
      html += '</tbody></table></div>';
    }
    html += '</div>';
  } catch(e){
    html += '<div class="card"><div class="card-body" style="color:var(--danger)">KV Stores: '+(e.error||e.message||'error')+'</div></div>';
  }

  // Request Queues
  try {
    const qdata = await api('/workspaces/'+WS.get()+'/request-queues?limit=20');
    const qlist = qdata.requestQueues||[];
    html += '<div class="card"><div class="card-header"><h2>Request Queues ('+qlist.length+')</h2></div>';
    if(qlist.length===0){
      html += '<div class="card-body"><div class="empty-state">No request queues</div></div>';
    } else {
      html += '<div class="table-wrap"><table><thead><tr><th>Name</th><th>Slug</th><th>Items</th><th>Created</th><th></th></tr></thead><tbody>';
      for(const q of qlist){
        html += '<tr><td><a href="#" data-nav="requestqueue" data-nav-id="'+q.id+'"><strong>'+esc(q.name)+'</strong></a></td>';
        html += '<td>'+esc(q.slug)+'</td>';
        html += '<td>'+(q._count?q._count.items:'?')+'</td>';
        html += '<td>'+dateStr(q.createdAt)+'</td>';
        html += '<td style="text-align:right"><button class="btn btn-sm btn-outline" data-nav="requestqueue" data-nav-id="'+q.id+'">View</button></td></tr>';
      }
      html += '</tbody></table></div>';
    }
    html += '</div>';
  } catch(e){
    html += '<div class="card"><div class="card-body" style="color:var(--danger)">Request Queues: '+(e.error||e.message||'error')+'</div></div>';
  }

  return html;
}

// â”€â”€â”€ Dataset Detail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function renderDataset(){
  const d = await api('/workspaces/'+WS.get()+'/datasets/'+state.storageId);
  let html = '<div class="flex gap-1" style="margin-bottom:1rem">';
  html += '<button class="btn btn-outline" data-nav="storage">&larr; Back</button></div>';

  html += '<div class="card"><div class="card-header"><h2>'+esc(d.name)+'</h2></div><div class="card-body">';
  html += '<div class="detail-label">ID</div><div class="detail-value mono">'+esc(d.id)+'</div>';
  html += '<div class="detail-label">Slug</div><div class="detail-value">'+esc(d.slug)+'</div>';
  html += '<div class="detail-label">Items</div><div class="detail-value">'+(d._count?d._count.items:'?')+'</div>';
  html += '<div class="detail-label">Created</div><div class="detail-value">'+dateStr(d.createdAt)+'</div>';
  html += '</div></div>';

  // Items
  try {
    const idata = await api('/workspaces/'+WS.get()+'/datasets/'+state.storageId+'/items?limit=20');
    const itemsList = idata.items||[];
    html += '<div class="card"><div class="card-header"><h2>Items ('+itemsList.length+')</h2></div>';
    if(itemsList.length===0){
      html += '<div class="card-body"><div class="empty-state">No items</div></div>';
    } else {
      html += '<div class="table-wrap"><table><thead><tr><th>Seq</th><th>ID</th><th>Payload</th><th>Created</th></tr></thead><tbody>';
      for(const item of itemsList){
        html += '<tr><td>'+item.sequence+'</td>';
        html += '<td class="mono" style="font-family:monospace;font-size:0.8rem">'+esc(item.id.substring(0,12))+'</td>';
        html += '<td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:monospace;font-size:0.8rem">'+esc(JSON.stringify(item.payload))+'</td>';
        html += '<td>'+dateStr(item.createdAt)+'</td></tr>';
      }
      html += '</tbody></table></div>';
    }
    html += '</div>';
  } catch(e){
    html += '<div class="card"><div class="card-body" style="color:var(--danger)">Items: '+(e.error||e.message||'error')+'</div></div>';
  }

  return html;
}

// â”€â”€â”€ KV Store Detail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function renderKvStore(){
  const k = await api('/workspaces/'+WS.get()+'/kv-stores/'+state.storageId);
  let html = '<div class="flex gap-1" style="margin-bottom:1rem">';
  html += '<button class="btn btn-outline" data-nav="storage">&larr; Back</button></div>';

  html += '<div class="card"><div class="card-header"><h2>'+esc(k.name)+'</h2></div><div class="card-body">';
  html += '<div class="detail-label">ID</div><div class="detail-value mono">'+esc(k.id)+'</div>';
  html += '<div class="detail-label">Slug</div><div class="detail-value">'+esc(k.slug)+'</div>';
  html += '<div class="detail-label">Records</div><div class="detail-value">'+(k._count?k._count.records:'?')+'</div>';
  html += '<div class="detail-label">Created</div><div class="detail-value">'+dateStr(k.createdAt)+'</div>';
  html += '</div></div>';

  // Records
  try {
    const rdata = await api('/workspaces/'+WS.get()+'/kv-stores/'+state.storageId+'/records?limit=20');
    const recs = rdata.records||[];
    html += '<div class="card"><div class="card-header"><h2>Records ('+recs.length+')</h2></div>';
    if(recs.length===0){
      html += '<div class="card-body"><div class="empty-state">No records</div></div>';
    } else {
      html += '<div class="table-wrap"><table><thead><tr><th>Key</th><th>Value</th><th>Content Type</th><th>Created</th></tr></thead><tbody>';
      for(const rec of recs){
        html += '<tr><td style="font-family:monospace;font-size:0.8rem"><strong>'+esc(rec.key)+'</strong></td>';
        html += '<td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:monospace;font-size:0.8rem">'+esc(typeof rec.value==='string'?rec.value:JSON.stringify(rec.value))+'</td>';
        html += '<td>'+esc(rec.contentType||'-')+'</td>';
        html += '<td>'+dateStr(rec.createdAt)+'</td></tr>';
      }
      html += '</tbody></table></div>';
    }
    html += '</div>';
  } catch(e){
    html += '<div class="card"><div class="card-body" style="color:var(--danger)">Records: '+(e.error||e.message||'error')+'</div></div>';
  }

  return html;
}

// â”€â”€â”€ Request Queue Detail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function renderRequestQueue(){
  const q = await api('/workspaces/'+WS.get()+'/request-queues/'+state.storageId);
  let html = '<div class="flex gap-1" style="margin-bottom:1rem">';
  html += '<button class="btn btn-outline" data-nav="storage">&larr; Back</button></div>';

  html += '<div class="card"><div class="card-header"><h2>'+esc(q.name)+'</h2></div><div class="card-body">';
  html += '<div class="detail-label">ID</div><div class="detail-value mono">'+esc(q.id)+'</div>';
  html += '<div class="detail-label">Slug</div><div class="detail-value">'+esc(q.slug)+'</div>';
  html += '<div class="detail-label">Items</div><div class="detail-value">'+(q._count?q._count.items:'?')+'</div>';
  html += '<div class="detail-label">Created</div><div class="detail-value">'+dateStr(q.createdAt)+'</div>';
  html += '</div></div>';

  // Items
  try {
    const idata = await api('/workspaces/'+WS.get()+'/request-queues/'+state.storageId+'/items?limit=20');
    const itemsList = idata.items||[];
    html += '<div class="card"><div class="card-header"><h2>Items ('+itemsList.length+')</h2></div>';
    if(itemsList.length===0){
      html += '<div class="card-body"><div class="empty-state">No items</div></div>';
    } else {
      html += '<div class="table-wrap"><table><thead><tr><th>Status</th><th>Unique Key</th><th>URL</th><th>Retries</th><th>Created</th></tr></thead><tbody>';
      for(const item of itemsList){
        html += '<tr><td>'+statusBadge(item.status)+'</td>';
        html += '<td style="font-family:monospace;font-size:0.8rem">'+esc(item.uniqueKey.substring(0,24))+'</td>';
        html += '<td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.8rem">'+esc(item.url||'-')+'</td>';
        html += '<td>'+item.retryCount+'</td>';
        html += '<td>'+dateStr(item.createdAt)+'</td></tr>';
      }
      html += '</tbody></table></div>';
    }
    html += '</div>';
  } catch(e){
    html += '<div class="card"><div class="card-body" style="color:var(--danger)">Items: '+(e.error||e.message||'error')+'</div></div>';
  }

  return html;
}

// â”€â”€â”€ Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function doTransition(actorId, action){
  setStatus('Transitioning '+action+'...');
  try {
    await api('/workspaces/'+WS.get()+'/actors/'+actorId+'/transition', {
      method: 'POST',
      body: JSON.stringify({ action })
    });
    setStatus(action+' successful');
    render();
  } catch(e) {
    setStatus(action+' failed: '+(e.error||e.message));
    alert('Transition failed: '+(e.error||e.message));
  }
}

async function deleteActor(actorId){
  if(!confirm('Delete this actor?')) return;
  setStatus('Deleting...');
  try {
    await api('/workspaces/'+WS.get()+'/actors/'+actorId, { method: 'DELETE' });
    setStatus('Deleted');
    render();
  } catch(e) {
    setStatus('Delete failed: '+(e.error||e.message));
    alert('Delete failed: '+(e.error||e.message));
  }
}

async function cancelRun(runId){
  if(!confirm('Cancel this run?')) return;
  setStatus('Cancelling...');
  try {
    await api('/runs/'+runId+'/cancel', { method: 'POST' });
    setStatus('Cancelled');
    render();
  } catch(e) {
    setStatus('Cancel failed: '+(e.error||e.message));
    alert('Cancel failed: '+(e.error||e.message));
  }
}

// â”€â”€â”€ Marketplace Approve / Reject â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function approveListing(id){
  if(!confirm('Approve this marketplace listing?')) return;
  setStatus('Approving...');
  try {
    await api('/marketplace/'+id+'/approve', { method: 'POST' });
    setStatus('Listing approved');
    render();
  } catch(e) {
    setStatus('Approve failed: '+(e.error||e.message));
    alert('Approve failed: '+(e.error||e.message));
  }
}

async function rejectListing(id){
  if(!confirm('Reject this marketplace listing?')) return;
  setStatus('Rejecting...');
  try {
    await api('/marketplace/'+id+'/reject', { method: 'POST' });
    setStatus('Listing rejected');
    render();
  } catch(e) {
    setStatus('Reject failed: '+(e.error||e.message));
    alert('Reject failed: '+(e.error||e.message));
  }
}

async function subscribeToPlan(planId){
  if(!confirm('Subscribe to this plan?')) return;
  setStatus('Subscribing...');
  try {
    await api('/workspaces/'+WS.get()+'/billing/subscription', {
      method: 'POST',
      body: JSON.stringify({ planId })
    });
    setStatus('Subscribed');
    render();
  } catch(e) {
    setStatus('Subscribe failed: '+(e.error||e.message));
    alert('Subscribe failed: '+(e.error||e.message));
  }
}

// â”€â”€â”€ Create Actor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showCreateActor(){
  showModal(\`
    <div class="modal-header"><h3>New Actor</h3><button class="btn btn-sm btn-outline" onclick="closeModal()">X</button></div>
    <div class="modal-body">
      <div class="form-group"><label>Name *</label><input id="ca-name" placeholder="My Actor"></div>
      <div class="form-group"><label>Slug *</label><input id="ca-slug" placeholder="my-actor"></div>
      <div class="form-group"><label>Description</label><textarea id="ca-desc" rows="2"></textarea></div>
      <div class="form-group"><label>Tags (comma separated)</label><input id="ca-tags" placeholder="tag1, tag2"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="createActor()">Create</button>
    </div>
  \`);
}

async function createActor(){
  const name = document.getElementById('ca-name').value.trim();
  const slug = document.getElementById('ca-slug').value.trim();
  if(!name||!slug){ alert('Name and slug are required'); return; }
  const tags = document.getElementById('ca-tags').value.split(',').map(t=>t.trim()).filter(Boolean);
  try {
    await api('/workspaces/'+WS.get()+'/actors', {
      method: 'POST',
      body: JSON.stringify({name,slug,description:document.getElementById('ca-desc').value.trim(),tags})
    });
    closeModal();
    setStatus('Actor created');
    render();
  } catch(e) {
    alert('Create failed: '+(e.error||e.message));
  }
}

// â”€â”€â”€ Edit Actor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showEditActor(actorId){
  api('/workspaces/'+WS.get()+'/actors/'+actorId).then(actor=>{
    showModal(\`
      <div class="modal-header"><h3>Edit Actor</h3><button class="btn btn-sm btn-outline" onclick="closeModal()">X</button></div>
      <div class="modal-body">
        <div class="form-group"><label>Name</label><input id="ea-name" value="\${esc(actor.name)}"></div>
        <div class="form-group"><label>Slug</label><input id="ea-slug" value="\${esc(actor.slug)}"></div>
        <div class="form-group"><label>Description</label><textarea id="ea-desc" rows="2">\${esc(actor.description||'')}</textarea></div>
        <div class="form-group"><label>Tags (comma separated)</label><input id="ea-tags" value="\${(actor.tags||[]).join(', ')}"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="editActor('\${actor.id}')">Save</button>
      </div>
    \`);
  });
}

async function editActor(actorId){
  const name = document.getElementById('ea-name').value.trim();
  const slug = document.getElementById('ea-slug').value.trim();
  const tags = document.getElementById('ea-tags').value.split(',').map(t=>t.trim()).filter(Boolean);
  const body = {name,slug,description:document.getElementById('ea-desc').value.trim(),tags};
  if(!name||!slug){ alert('Name and slug are required'); return; }
  try {
    await api('/workspaces/'+WS.get()+'/actors/'+actorId, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
    closeModal();
    setStatus('Actor updated');
    render();
  } catch(e) {
    alert('Update failed: '+(e.error||e.message));
  }
}

// â”€â”€â”€ Create Schedule â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showCreateSchedule(){
  showModal(\`
    <div class="modal-header"><h3>New Schedule</h3><button class="btn btn-sm btn-outline" onclick="closeModal()">X</button></div>
    <div class="modal-body">
      <div class="form-group"><label>Actor ID *</label><input id="cs-actor" placeholder="actor-1"></div>
      <div class="form-group"><label>Cron Expression *</label><input id="cs-cron" placeholder="0 * * * *"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="createSchedule()">Create</button>
    </div>
  \`);
}

async function createSchedule(){
  const actorId = document.getElementById('cs-actor').value.trim();
  const cron = document.getElementById('cs-cron').value.trim();
  if(!actorId||!cron){ alert('Actor ID and cron expression are required'); return; }
  try {
    await api('/schedules', {
      method: 'POST',
      body: JSON.stringify({actorId,workspaceId:WS.get(),cronExpression:cron})
    });
    closeModal();
    setStatus('Schedule created');
    navigate('schedules');
  } catch(e) {
    alert('Create failed: '+(e.error||e.message));
  }
}

// â”€â”€â”€ Create Run â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showCreateRun(actorId){
  showModal(\`
    <div class="modal-header"><h3>New Run</h3><button class="btn btn-sm btn-outline" onclick="closeModal()">X</button></div>
    <div class="modal-body">
      <div class="form-group"><label>Actor ID</label><input id="cr-actor" value="\${esc(actorId)}" readonly></div>
      <div class="form-group"><label>Input (JSON)</label><textarea id="cr-input" rows="6">{\n  "data": "value"\n}</textarea></div>
      <div class="form-group"><label>Version ID (optional)</label><input id="cr-version" placeholder="Leave empty for latest"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="createRun()">Start Run</button>
    </div>
  \`);
}

async function createRun(){
  const actorId = document.getElementById('cr-actor').value.trim();
  const inputRaw = document.getElementById('cr-input').value.trim();
  const versionId = document.getElementById('cr-version').value.trim();
  let input = {};
  if(inputRaw){
    try { input = JSON.parse(inputRaw); }
    catch(e){ alert('Invalid JSON input'); return; }
  }
  const body = {actorId,workspaceId:WS.get(),input};
  if(versionId) body.actorVersionId = versionId;
  try {
    await api('/runs', { method: 'POST', body: JSON.stringify(body) });
    closeModal();
    setStatus('Run created');
    navigate('runs');
  } catch(e) {
    alert('Create failed: '+(e.error||e.message));
  }
}

// â”€â”€â”€ Init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

document.addEventListener('click', function(e) {
  var el = e.target;
  while (el && !el.getAttribute('data-nav')) el = el.parentNode;
  if (el) {
    var view = el.getAttribute('data-nav');
    var id = el.getAttribute('data-nav-id');
    navigate(view, id);
    e.preventDefault();
  }
});

function init(){
  if(isAuthed()){
    document.getElementById('login-overlay').classList.add('hidden');
    const token = getToken();
    const info = document.getElementById('token-info');
    info.textContent = token.substring(0,16)+'...';
    info.classList.remove('hidden');
    document.getElementById('logout-btn').classList.remove('hidden');
  }
  render();
}
init();
</script>
</body>
</html>`;
  return c.html(html);
});

export { consoleRoute };



