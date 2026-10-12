'use strict';

/* ============================================================
   Biyada Estate — single-page app (no build step, no libraries)
   ============================================================ */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const S = { user: null, projects: [], pid: null, project: null, lists: {}, nav: 0 };
// On-device version: the backend runs inside this page and data is stored on this device.
const LOCAL = !!window.LocalBackend;
const ROLE = { viewer: 1, accountant: 2, admin: 3 };

const VOUCHER_TYPES = { JV: 'Journal Voucher', PV: 'Payment Voucher', RV: 'Receipt Voucher', CC: 'Capital Contribution' };
const TYPE_LABEL = { asset: 'Assets', liability: 'Liabilities', equity: 'Equity (Owners)', revenue: 'Income', expense: 'Expenses' };
const ENUMS = {
  contactKind: ['supplier', 'contractor', 'consultant', 'buyer', 'bank', 'government', 'other'],
  buildingKind: ['residential', 'villa', 'commercial', 'mixed', 'amenity', 'infrastructure', 'other'],
  buildingStatus: ['planned', 'design', 'permits', 'excavation', 'structure', 'finishing', 'completed', 'on_hold'],
  unitKind: ['apartment', 'villa', 'townhouse', 'shop', 'office', 'parking', 'storage', 'other'],
  unitStatus: ['available', 'reserved', 'sold', 'owner_retained', 'not_for_sale'],
  milestoneStatus: ['pending', 'in_progress', 'done', 'delayed'],
  projectStatus: ['planning', 'design', 'permits', 'construction', 'sales', 'completed', 'on_hold'],
  accountType: ['asset', 'liability', 'equity', 'revenue', 'expense'],
  docCategory: ['receipt', 'invoice', 'contract', 'permit', 'deed', 'drawing', 'photo', 'bank_statement', 'other'],
  role: ['viewer', 'accountant', 'admin'],
};

/* ---------------- utilities ---------------- */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const human = (s) => String(s ?? '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const enumOpts = (key) => ENUMS[key].map((v) => [v, human(v)]);
const vno = (v) => `${v.type}-${String(v.number).padStart(4, '0')}`;
const can = (role) => S.user && ROLE[S.user.role] >= ROLE[role];
const P = (path) => `/api/projects/${S.pid}${path}`;
function today() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function money(c) {
  if (c === null || c === undefined) return '';
  const cur = S.project?.currency || 'USD';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(c / 100);
  } catch {
    return `${(c / 100).toFixed(2)} ${cur}`;
  }
}
const amt = (c) => (c ? (c / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
function toCents(v) {
  if (v === null || v === undefined || String(v).trim() === '') return 0;
  const n = Number(String(v).replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}
const centsInput = (c) => (c ? (c / 100).toFixed(2) : '');
const pct = (n) => `${(Math.round(n * 100) / 100).toLocaleString()}%`;
const fmtDate = (d) => (d ? new Date(d + (d.length === 10 ? 'T00:00:00' : 'Z')).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '');
const fmtTime = (d) => (d ? new Date(d.replace(' ', 'T') + (d.includes('Z') || d.includes('+') ? '' : 'Z')).toLocaleString() : '');
const initials = (n) => String(n || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } },
};

class ApiError extends Error {}
async function api(method, url, body, { quiet } = {}) {
  const opts = { method, credentials: 'same-origin', headers: {} };
  if (method !== 'GET') {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body || {});
  }
  const res = LOCAL ? await window.LocalBackend.handle(new Request(new URL(url, location.href), opts)) : await fetch(url, opts);
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (res.status === 401 && !quiet && !/\/api\/(login|setup|access)/.test(url)) {
    // Signed out mid-session: start over, which reuses the remembered share link if there is one.
    S.user = null;
    boot().catch(() => showAuth());
    throw new ApiError('Please sign in.');
  }
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status})`);
  return data;
}

function toast(msg, bad) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast' + (bad ? ' bad' : '');
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, bad ? 5000 : 2800);
}

function go(hash) {
  if (location.hash === hash) router();
  else location.hash = hash;
}

/* ---------------- modal & forms ---------------- */
function openModal({ title, body, submit = 'Save', onSubmit, danger, onOpen, onDelete }) {
  const dlg = $('#modal');
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = body;
  $('#modalError').hidden = true;
  $('#modalFoot').innerHTML = `<button type="button" class="btn secondary" data-close>${onSubmit ? 'Cancel' : 'Close'}</button>` +
    (onSubmit ? `<button type="submit" class="btn ${danger ? 'danger' : ''}" id="modalSubmit">${esc(submit)}</button>` : '');
  if (onDelete) {
    $('#modalFoot').insertAdjacentHTML('afterbegin', '<button type="button" class="btn danger" id="modalDelete" style="margin-right:auto">Delete</button>');
    $('#modalDelete').addEventListener('click', async () => {
      if (!window.confirm('Delete this record? This cannot be undone.')) return;
      try {
        await onDelete();
        dlg.close();
      } catch (err) {
        $('#modalError').textContent = err.message;
        $('#modalError').hidden = false;
      }
    });
  }
  $('#modalForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!onSubmit) return dlg.close();
    const btn = $('#modalSubmit');
    btn.disabled = true;
    try {
      await onSubmit($('#modalBody'));
      dlg.close();
    } catch (err) {
      $('#modalError').textContent = err.message;
      $('#modalError').hidden = false;
    } finally {
      btn.disabled = false;
    }
  };
  dlg.showModal();
  if (onOpen) onOpen($('#modalBody'));
  const first = $('#modalBody input:not([type=hidden]):not([type=checkbox]), #modalBody select, #modalBody textarea');
  if (first) first.focus();
}
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) $('#modal').close();
});

function confirmModal(title, message, onYes, label = 'Confirm', danger = true) {
  openModal({ title, body: `<p>${message}</p>`, submit: label, danger, onSubmit: onYes });
}

// Field spec: { k, l, t: text|number|date|email|money|textarea|select|check, opts, req, wide, hint, def, step }
function fieldHtml(f, val) {
  const label = esc(f.l || human(f.k));
  const v = val === undefined || val === null ? f.def : val;
  const cls = `field${f.wide || f.t === 'textarea' ? ' wide' : ''}`;
  const hint = f.hint ? `<div class="hint">${esc(f.hint)}</div>` : '';
  const req = f.req ? ' required' : '';
  const star = f.req ? ' *' : '';
  if (f.t === 'check') {
    return `<label class="check ${cls}"><input type="checkbox" name="${f.k}"${v ? ' checked' : ''}> ${label}</label>`;
  }
  let input;
  if (f.t === 'textarea') input = `<textarea name="${f.k}"${req}>${esc(v)}</textarea>`;
  else if (f.t === 'select') {
    const opts = typeof f.opts === 'function' ? f.opts() : f.opts;
    input = `<select name="${f.k}"${req}>${f.req && v ? '' : '<option value="">—</option>'}${opts
      .map(([o, l]) => `<option value="${esc(o)}"${String(o) === String(v ?? '') ? ' selected' : ''}>${esc(l)}</option>`)
      .join('')}</select>`;
  } else if (f.t === 'money') {
    input = `<input name="${f.k}" inputmode="decimal" placeholder="0.00" value="${esc(centsInput(v))}"${req}>`;
  } else {
    input = `<input type="${f.t || 'text'}" name="${f.k}" value="${esc(v ?? '')}"${f.step ? ` step="${f.step}"` : ''}${req}>`;
  }
  return `<label class="${cls}"><span>${label}${star}</span>${input}${hint}</label>`;
}
const formHtml = (fields, values = {}) => `<div class="form-grid">${fields.map((f) => fieldHtml(f, values[f.k])).join('')}</div>`;

function readForm(root, fields) {
  const out = {};
  for (const f of fields) {
    const el = root.querySelector(`[name="${f.k}"]`);
    if (!el) continue;
    let v;
    if (f.t === 'check') v = el.checked;
    else if (f.t === 'money') {
      v = toCents(el.value);
      if (Number.isNaN(v)) throw new Error(`${f.l || human(f.k)}: enter a valid amount.`);
    } else if (f.t === 'number') v = el.value === '' ? null : Number(el.value);
    else v = el.value.trim();
    if (f.req && (v === '' || v === null)) throw new Error(`${f.l || human(f.k)} is required.`);
    out[f.k] = v;
  }
  return out;
}

/* ---------------- shared lists ---------------- */
async function loadLists() {
  const [accounts, owners, buildings, contacts] = await Promise.all([
    api('GET', P('/accounts')), api('GET', P('/owners')), api('GET', P('/buildings')), api('GET', P('/contacts')),
  ]);
  S.lists = { accounts, owners, buildings, contacts };
}
const accountName = (a) => `${a.code} · ${a.name}`;
const listOpts = (name, label = (r) => r.name, filter = () => true) => () =>
  (S.lists[name] || []).filter(filter).map((r) => [r.id, label(r)]);

function accountSelect(name, filter, selected, { blank = 'Choose account…', required = true } = {}) {
  const accounts = S.lists.accounts.filter((a) => (a.active || a.id === Number(selected)) && filter(a));
  const groups = Object.keys(TYPE_LABEL)
    .map((t) => {
      const items = accounts.filter((a) => a.type === t);
      if (!items.length) return '';
      return `<optgroup label="${TYPE_LABEL[t]}">${items
        .map((a) => `<option value="${a.id}"${a.id === Number(selected) ? ' selected' : ''}>${esc(accountName(a))}</option>`)
        .join('')}</optgroup>`;
    })
    .join('');
  return `<select name="${name}"${required ? ' required' : ''}><option value="">${esc(blank)}</option>${groups}</select>`;
}

/* ---------------- tables & csv ---------------- */
// cols: { h, v: row => html, cls, csv: row => value }
function table(cols, rows, { empty = 'Nothing here yet.', foot, clickable } = {}) {
  if (!rows.length) return `<div class="empty">${empty}</div>`;
  return `<div class="table-wrap"><table><thead><tr>${cols.map((c) => `<th class="${c.cls || ''}">${c.h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r, i) => `<tr data-i="${i}"${clickable ? ' class="clickable"' : ''}>${cols.map((c) => `<td class="${c.cls || ''}">${c.v(r) ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>
    ${foot ? `<tfoot><tr>${foot.map((f, i) => `<td class="${cols[i]?.cls || ''}">${f ?? ''}</td>`).join('')}</tr></tfoot>` : ''}</table></div>`;
}
function onRows(root, rows, fn) {
  $$('tbody tr[data-i]', root).forEach((tr) =>
    tr.addEventListener('click', (e) => {
      if (e.target.closest('a,button,input')) return;
      fn(rows[Number(tr.dataset.i)]);
    })
  );
}
function exportCsv(filename, cols, rows) {
  const strip = (h) => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent; };
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [cols.map((c) => cell(strip(c.h))).join(',')];
  for (const r of rows) lines.push(cols.map((c) => cell(c.csv ? c.csv(r) : strip(String(c.v(r) ?? '')))).join(','));
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}-${today()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const badge = (s, label) => `<span class="badge ${esc(s)}">${esc(label || human(s))}</span>`;
const progress = (val, max) => {
  const p = max ? Math.min(100, (val / max) * 100) : 0;
  return `<div class="progress${max && val > max ? ' over' : ''}" title="${max ? pct((val / max) * 100) : ''}"><div style="width:${p}%"></div></div>`;
};
const signed = (c) => `<span class="${c > 0 ? 'pos' : c < 0 ? 'neg' : ''}">${money(c)}</span>`;

/* ---------------- file uploads ---------------- */
function dropzoneHtml(label = 'Click to add receipts, invoices or photos (or drop files here)') {
  return `<div class="dropzone" data-drop>${esc(label)}<input type="file" multiple hidden accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"></div><div class="files" data-files></div>`;
}
function setupDropzone(root, files) {
  const zone = $('[data-drop]', root);
  if (!zone) return;
  const input = $('input[type=file]', zone);
  const list = $('[data-files]', root);
  const draw = () => {
    list.innerHTML = files.map((f, i) => `<span class="file-chip">📄 ${esc(f.name)} <span class="muted small">${Math.ceil(f.size / 1024)} KB</span> <button type="button" class="btn ghost small" data-rm="${i}">✕</button></span>`).join('');
    $$('[data-rm]', list).forEach((b) => b.addEventListener('click', () => { files.splice(Number(b.dataset.rm), 1); draw(); }));
  };
  const add = (fl) => {
    for (const f of fl) {
      if (f.size > 20 * 1024 * 1024) toast(`${f.name} is larger than 20 MB`, true);
      else files.push(f);
    }
    draw();
  };
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => { add(input.files); input.value = ''; });
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('drag'); add(e.dataTransfer.files); });
}
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(new Error(`Could not read ${file.name}`));
    r.readAsDataURL(file);
  });
}
async function uploadFiles(files, { voucherId = null, category = 'receipt', note = null } = {}) {
  for (const f of files) {
    await api('POST', P('/attachments'), {
      filename: f.name, mime: f.type || 'application/octet-stream', data: await fileToBase64(f),
      voucher_id: voucherId, category, note,
    });
  }
}
const fileUrl = (a, download) => P(`/attachments/${a.id}/file${download ? '?download=1' : ''}`);
const isImage = (a) => /^image\/(png|jpeg|gif|webp)$/.test(a.mime);

/* ---------------- auth ---------------- */
async function showAuth(problem) {
  $('#shell').hidden = true;
  const box = $('#auth');
  box.hidden = false;
  const join = /^#\/join\/([a-f0-9]+)/.exec(location.hash);
  if (join) return showJoin(join[1]);
  const { needsSetup, guestEnabled } = await api('GET', '/api/setup');
  const fields = needsSetup
    ? `<p class="muted">Welcome! Create the first admin account. You can invite your partners afterwards.</p>
       ${fieldHtml({ k: 'name', l: 'Your full name', req: 1 })}
       ${fieldHtml({ k: 'username', l: 'Username', req: 1 })}
       ${fieldHtml({ k: 'password', l: 'Password (min 8 characters)', t: 'password', req: 1 })}`
    : `${fieldHtml({ k: 'username', l: 'Username', req: 1 })}
       ${fieldHtml({ k: 'password', l: 'Password', t: 'password', req: 1 })}`;
  const form = `<form id="authForm">${fields}<div id="authErr" class="error" hidden></div>
    <button class="btn" type="submit">${needsSetup ? 'Create admin account' : 'Sign in'}</button></form>`;
  // Day to day everyone gets in with their private share link; the password form is only an admin fallback.
  box.innerHTML = `<div class="card"><div class="brand"><img src="icon.svg" alt="" width="32" height="32"> Biyada Estate</div>
    ${problem ? `<div class="error">${esc(problem)}</div>` : ''}
    ${needsSetup ? form : `<p><b>This is a private workspace.</b></p>
      <p class="muted">Open it with the private link you were given. After that, this device remembers you, so you can just come back to this website.</p>
      <details class="small"><summary class="muted">Admin sign-in</summary>${form}</details>`}
    ${guestEnabled ? `<div class="divider">or</div><button class="btn secondary" id="guestBtn" type="button">Try as guest</button>
      <p class="muted small" style="text-align:center;margin-bottom:0">Explore a sample compound. No account needed.</p>` : ''}</div>`;
  $('#authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    try {
      await api('POST', needsSetup ? '/api/setup' : '/api/login', f);
      await boot();
    } catch (err) {
      $('#authErr').textContent = err.message;
      $('#authErr').hidden = false;
    }
  });
  $('#guestBtn')?.addEventListener('click', async () => {
    try {
      await api('POST', '/api/guest');
      await boot();
    } catch (err) {
      $('#authErr').textContent = err.message;
      $('#authErr').hidden = false;
    }
  });
  $('#authForm input').focus();
}

// Colleague opened an invite link: let them create their own account.
async function showJoin(token) {
  const box = $('#auth');
  let info;
  try {
    info = await api('GET', `/api/invites/${token}`);
  } catch (err) {
    box.innerHTML = `<div class="card"><div class="brand"><img src="icon.svg" alt="" width="32" height="32"> Biyada Estate</div>
      <div class="error">${esc(err.message)}</div><p><a href="#/dashboard" id="toLogin">Go to sign in</a></p></div>`;
    $('#toLogin').addEventListener('click', (e) => { e.preventDefault(); history.replaceState(null, '', '#/dashboard'); showAuth(); });
    return;
  }
  box.innerHTML = `<div class="card"><div class="brand"><img src="icon.svg" alt="" width="32" height="32"> Biyada Estate</div>
    <form id="joinForm"><p>${info.invited_by ? `<b>${esc(info.invited_by)}</b> invited you` : 'You were invited'} to join as <b>${esc(human(info.role))}</b>. Create your account:</p>
    ${fieldHtml({ k: 'name', l: 'Your full name', req: 1 })}
    ${fieldHtml({ k: 'username', l: 'Choose a username', req: 1 })}
    ${fieldHtml({ k: 'email', l: 'Email (optional)', t: 'email' })}
    ${fieldHtml({ k: 'password', l: 'Choose a password (min 8 characters)', t: 'password', req: 1 })}
    <div id="authErr" class="error" hidden></div><button class="btn" type="submit">Create my account</button></form></div>`;
  $('#joinForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('POST', `/api/invites/${token}/accept`, Object.fromEntries(new FormData(e.target)));
      history.replaceState(null, '', '#/dashboard');
      await boot();
    } catch (err) {
      $('#authErr').textContent = err.message;
      $('#authErr').hidden = false;
    }
  });
  $('#joinForm input').focus();
}

function showSetPassword() {
  $('#shell').hidden = true;
  const box = $('#auth');
  box.hidden = false;
  box.innerHTML = `<div class="card"><div class="brand"><img src="icon.svg" alt="" width="32" height="32"> Biyada Estate</div>
    <form id="pwForm"><p>Welcome, <b>${esc(S.user.name)}</b>! Please replace the temporary password you were given with your own.</p>
    ${fieldHtml({ k: 'current', l: 'Temporary password', t: 'password', req: 1 })}
    ${fieldHtml({ k: 'password', l: 'New password (min 8 characters)', t: 'password', req: 1 })}
    ${fieldHtml({ k: 'confirm', l: 'Repeat new password', t: 'password', req: 1 })}
    <div id="authErr" class="error" hidden></div><button class="btn" type="submit">Save password</button></form></div>`;
  $('#pwForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    try {
      if (f.password !== f.confirm) throw new Error('The two new passwords do not match.');
      await api('POST', '/api/me/password', { current: f.current, password: f.password });
      await boot();
    } catch (err) {
      $('#authErr').textContent = err.message;
      $('#authErr').hidden = false;
    }
  });
  $('#pwForm input').focus();
}

/* ---------------- shell ---------------- */
const NAV = [
  ['Overview'],
  ['dashboard', '◎', 'Dashboard'],
  ['Money'],
  ['entry', '＋', 'New Entry', 'accountant'],
  ['vouchers', '☰', 'Journal Vouchers'],
  ['accounts', '#', 'Chart of Accounts'],
  ['reports', '▤', 'Financial Reports'],
  ['budget', '◔', 'Budget'],
  ['Compound'],
  ['owners', '◉', 'Owners & Shares'],
  ['buildings', '▦', 'Buildings'],
  ['units', '▢', 'Units & Sales'],
  ['timeline', '◷', 'Timeline'],
  ['contacts', '☏', 'Suppliers & Contacts'],
  ['documents', '⎘', 'Documents'],
  ['Control'],
  ['audit', '✎', 'Activity Log'],
  ['export', '⤓', 'Export & Backup'],
  ['settings', '⚙', 'Settings'],
];
function renderNav() {
  $('#nav').innerHTML = NAV.map((n) => {
    if (n.length === 1) return `<div class="nav-group">${n[0]}</div>`;
    if (n[3] && !can(n[3])) return '';
    return `<a href="#/${n[0]}" data-page="${n[0]}"><span class="ico">${n[1]}</span>${n[2]}</a>`;
  }).join('');
}
function renderProjectSelect() {
  const sel = $('#projectSelect');
  sel.innerHTML = S.projects.length
    ? S.projects.map((p) => `<option value="${p.id}"${p.id === S.pid ? ' selected' : ''}>${esc(p.name)}${p.archived ? ' (archived)' : ''}</option>`).join('')
    : '<option value="">No projects yet</option>';
  if (can('admin')) sel.insertAdjacentHTML('beforeend', '<option value="new">＋ New project…</option>');
}
async function selectProject(id) {
  S.pid = id;
  S.project = S.projects.find((p) => p.id === id) || null;
  if (id) {
    store.set('pid', String(id));
    await loadLists();
  }
  renderProjectSelect();
}
async function reloadProjects() {
  S.projects = await api('GET', '/api/projects');
  S.project = S.projects.find((p) => p.id === S.pid) || null;
  renderProjectSelect();
}

// Signs in with a share link key. The key is remembered on this device, so reopening the site
// (even without the full link) gets straight back in.
async function useAccessKey(key) {
  try {
    await api('POST', `/api/access/${key}`);
    store.set('accessKey', key);
    return true;
  } catch (err) {
    store.del('accessKey');
    $('#shell').hidden = true;
    $('#auth').hidden = false;
    $('#auth').innerHTML = `<div class="card"><div class="brand"><img src="icon.svg" alt="" width="32" height="32"> Biyada Estate</div><div class="error">${esc(err.message)}</div></div>`;
    return false;
  }
}

async function boot() {
  // Opened a private access link: sign in with it, then hide the key from the address bar.
  const access = /^#\/k\/([a-f0-9]+)/.exec(location.hash);
  if (access) {
    history.replaceState(null, '', '#/dashboard');
    if (!(await useAccessKey(access[1]))) return;
  }
  try {
    S.user = await api('GET', '/api/me', undefined, { quiet: true });
  } catch {
    // Session cookie gone (cleared, expired, new browser tab rules): reuse the remembered link.
    const saved = store.get('accessKey');
    if (!saved || !(await useAccessKey(saved))) return showAuth();
    try {
      S.user = await api('GET', '/api/me', undefined, { quiet: true });
    } catch {
      return showAuth('This browser is blocking cookies for this site, so it cannot stay signed in. Allow cookies and reopen your link.');
    }
  }
  if (S.user.must_change_password) return showSetPassword();
  $('#auth').hidden = true;
  $('#shell').hidden = false;
  $('#whoami').innerHTML = `<b>${esc(S.user.name)}</b><br><span class="muted">${S.user.is_guest ? 'Guest (demo only)' : human(S.user.role)}</span>`;
  $('#guestBanner').hidden = !S.user.is_guest;
  $('#logoutBtn').hidden = LOCAL;
  if (LOCAL) excelAutoSave.init().catch(() => {});
  if (LOCAL) $('#whoami').innerHTML = `<b>${esc(S.user.name)}</b><br><span class="muted">Saved on this device</span>`;
  renderNav();
  S.projects = await api('GET', '/api/projects');
  const saved = Number(store.get('pid'));
  const first = S.projects.find((p) => p.id === saved) || S.projects.find((p) => !p.archived && !p.is_demo) || S.projects[0];
  await selectProject(first ? first.id : null);
  router();
}

$('#projectSelect').addEventListener('change', async (e) => {
  if (e.target.value === 'new') {
    e.target.value = S.pid || '';
    return projectForm();
  }
  await selectProject(Number(e.target.value));
  go('#/dashboard');
});
$('#logoutBtn').addEventListener('click', async () => {
  await api('POST', '/api/logout').catch(() => {});
  store.del('accessKey');
  S.user = null;
  history.replaceState(null, '', '#/dashboard');
  showAuth();
});
$('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
window.addEventListener('hashchange', router);

/* ---------------- router ---------------- */
const ROUTES = {};
function view(t, title, actions, html) {
  if (t !== S.nav) return false;
  $('#pageTitle').textContent = title;
  $('#pageActions').innerHTML = actions || '';
  $('#main').innerHTML = html;
  document.title = `${title} · Biyada Estate`;
  hydrateFiles($('#main'));
  return true;
}

// On-device: receipts live inside the local database, so turn their /api/ links into in-page file links.
const blobCache = new Map();
async function localFileUrl(path) {
  if (!blobCache.has(path)) {
    blobCache.set(path, (async () => {
      const res = await window.LocalBackend.handle(new Request(new URL(path, location.href)));
      if (!res.ok) throw new Error('File not found.');
      const m = /filename\*=UTF-8''([^;]+)/.exec(res.headers.get('content-disposition') || '');
      return { url: URL.createObjectURL(await res.blob()), name: m ? decodeURIComponent(m[1]) : 'file' };
    })());
  }
  return blobCache.get(path);
}
function hydrateFiles(root) {
  if (!LOCAL) return;
  $$('img[src^="/api/"], a[href^="/api/"]', root).forEach(async (el) => {
    const attr = el.tagName === 'IMG' ? 'src' : 'href';
    const path = el.getAttribute(attr);
    el.removeAttribute(attr);
    try {
      const file = await localFileUrl(path);
      el.setAttribute(attr, file.url);
      if (el.tagName === 'A' && path.includes('download=1')) el.download = file.name;
    } catch { /* missing file: leave the link inert */ }
  });
}
function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function router() {
  if (!S.user) return;
  const [page = 'dashboard', arg] = location.hash.replace(/^#\/?/, '').split('/');
  const t = ++S.nav;
  $('#sidebar').classList.remove('open');
  $$('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.page === page || (page === 'voucher' || page === 'voucher-edit') && a.dataset.page === 'vouchers' || page === 'ledger' && a.dataset.page === 'accounts'));
  if (!S.pid && page !== 'settings' && page !== 'export') return welcome(t);
  $('#main').innerHTML = '<div class="empty">Loading…</div>';
  try {
    await (ROUTES[page] || ROUTES.dashboard)(t, arg ? decodeURIComponent(arg) : undefined);
  } catch (err) {
    // The current project may have been removed or replaced (e.g. demo reset): reload and retry once.
    if (/Project not found|demo project/.test(err.message) && !S.retried) {
      S.retried = true;
      await reloadProjects();
      await selectProject((S.projects.find((x) => !x.archived) || S.projects[0])?.id || null);
      return router();
    }
    if (t === S.nav) view(t, 'Error', '', `<div class="error">${esc(err.message)}</div>`);
  } finally {
    if (t === S.nav) S.retried = false;
  }
}

function welcome(t) {
  view(t, 'Welcome', '', `<div class="card" style="max-width:640px">
    <h2>Let's set up your first compound</h2>
    <p class="muted">A project holds everything about one compound: its owners and their shares, buildings, units, budget, suppliers, every voucher and receipt.</p>
    ${can('admin') ? '<button class="btn" id="newProj">Create a project</button>' : '<p>Ask an admin to create a project and give you access.</p>'}
    ${LOCAL ? '<p class="muted small" style="margin-top:16px">Moving from another computer? <a href="#/export">Restore from a backup file</a>.</p>' : ''}
  </div>`);
  $('#newProj')?.addEventListener('click', projectForm);
}

const PROJECT_FIELDS = [
  { k: 'name', l: 'Project name', req: 1 },
  { k: 'code', l: 'Short code', hint: 'e.g. BYD' },
  { k: 'location', l: 'Location / address', wide: 1 },
  { k: 'plot_number', l: 'Plot / land registry no.' },
  { k: 'land_area_sqm', l: 'Land area (m²)', t: 'number', step: 'any' },
  { k: 'currency', l: 'Currency', def: 'USD', hint: '3-letter code: USD, EUR, LBP, AED…' },
  { k: 'status', t: 'select', opts: enumOpts('projectStatus'), def: 'planning', req: 1 },
  { k: 'total_budget', l: 'Total budget', t: 'money' },
  { k: 'start_date', l: 'Start date', t: 'date' },
  { k: 'target_completion', l: 'Target completion', t: 'date' },
  { k: 'description', t: 'textarea' },
];
function projectForm() {
  openModal({
    title: 'New project',
    body: `<p class="muted">A standard real-estate chart of accounts is created automatically. Add the owners next.</p>${formHtml(PROJECT_FIELDS)}`,
    submit: 'Create project',
    onSubmit: async (root) => {
      const { id } = await api('POST', '/api/projects', readForm(root, PROJECT_FIELDS));
      await reloadProjects();
      await selectProject(id);
      toast('Project created. Now add the owners.');
      go('#/owners');
    },
  });
}

/* ---------------- dashboard ---------------- */
ROUTES.dashboard = async (t) => {
  const d = await api('GET', P('/reports/dashboard'));
  const budgetPct = d.budget ? (d.totalCost / d.budget) * 100 : null;
  const unitTotal = d.units.reduce((s, u) => s + u.n, 0);
  const sold = d.units.find((u) => u.status === 'sold');
  const totalCap = d.owners.reduce((s, o) => s + o.contributed, 0);
  const shareSum = d.owners.filter((o) => o.active).reduce((s, o) => s + o.share_pct, 0);
  const fairShare = (o) => (o.active && shareSum ? Math.round((totalCap * o.share_pct) / shareSum) : 0);

  // last 12 months, including empty ones
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
    months.push({ key, label: m.toLocaleDateString(undefined, { month: 'short' }), amount: d.monthly.find((x) => x.month === key)?.amount || 0 });
  }
  const maxM = Math.max(1, ...months.map((m) => m.amount));
  const cats = d.costByCategory.slice(0, 10);
  const maxC = Math.max(1, ...cats.map((c) => c.amount));

  const html = `
    ${d.drafts ? `<div class="notice">${d.drafts} draft voucher${d.drafts > 1 ? 's are' : ' is'} waiting to be posted. <a href="#/vouchers" id="draftsLink">Review drafts →</a></div>` : ''}
    <div class="kpis">
      <div class="kpi"><div class="label">Total spent on the project</div><div class="value">${money(d.totalCost)}</div>
        <div class="sub">${d.budget ? `${pct(budgetPct)} of ${money(d.budget)} budget` : 'No budget set'}</div>${d.budget ? progress(d.totalCost, d.budget) : ''}</div>
      <div class="kpi"><div class="label">Cash available (bank + cash)</div><div class="value">${money(d.cash)}</div></div>
      <div class="kpi"><div class="label">Capital paid in by owners</div><div class="value">${money(totalCap)}</div><div class="sub">${d.owners.length} owner${d.owners.length === 1 ? '' : 's'}</div></div>
      <div class="kpi"><div class="label">Owed (suppliers, loans, deposits)</div><div class="value">${money(d.payables)}</div></div>
      <div class="kpi"><div class="label">Units sold</div><div class="value">${sold?.n || 0} / ${unitTotal}</div><div class="sub">Sales value ${money(sold?.sale_total || 0)}</div></div>
      <div class="kpi"><div class="label">Income received</div><div class="value">${money(d.revenue)}</div></div>
    </div>

    <div class="card">
      <div class="card-head"><h3>Owners</h3><a href="#/owners">Full statement →</a></div>
      ${d.owners.length ? `<div class="grid grid-3">${d.owners.map((o) => `
        <div class="owner-card">
          <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px"><span class="avatar">${esc(initials(o.name))}</span>
            <div><b>${esc(o.name)}</b><div class="muted small">${pct(o.share_pct)} ownership${o.active ? '' : ' · inactive'}</div></div></div>
          <div class="row"><span>Paid in</span><b>${money(o.contributed)}</b></div>
          <div class="row"><span>Fair share of capital</span><span>${money(fairShare(o))}</span></div>
          <div class="row"><span>Over / under</span>${signed(o.contributed - fairShare(o))}</div>
          ${o.committed_capital ? `<div class="row"><span>Committed</span><span>${money(o.committed_capital)}</span></div>${progress(o.contributed, o.committed_capital)}` : ''}
        </div>`).join('')}</div>` : `<div class="empty">No owners yet. <a href="#/owners">Add the owners</a> and their shares.</div>`}
    </div>

    <div class="grid grid-2" style="margin-top:16px">
      <div class="card">
        <div class="card-head"><h3>Monthly spending (last 12 months)</h3></div>
        <div class="vbars" role="img" aria-label="Monthly project spending">${months.map((m) => `
          <div class="vbar"><span class="tip">${esc(m.label)}: ${money(m.amount)}</span><div class="fill" style="height:${Math.max(0, (m.amount / maxM) * 100)}%"></div></div>`).join('')}</div>
        <div class="vlabels">${months.map((m) => `<span>${esc(m.label)}</span>`).join('')}</div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Where the money went</h3><a href="#/reports/cost">Details →</a></div>
        ${cats.length ? `<div class="hbars">${cats.map((c) => `
          <div class="hbar" title="${esc(c.name)}: ${esc(money(c.amount))}"><span class="name">${esc(c.name)}</span>
            <div class="track"><div class="fill" style="width:${(c.amount / maxC) * 100}%"></div></div><span class="num">${money(c.amount)}</span></div>`).join('')}</div>`
          : '<div class="empty">No spending recorded yet.</div>'}
      </div>
    </div>

    <div class="grid grid-2" style="margin-top:16px">
      <div class="card">
        <div class="card-head"><h3>Buildings</h3><a href="#/buildings">All buildings →</a></div>
        ${d.costByBuilding.length ? d.costByBuilding.map((b) => `
          <div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(b.name)}</b>${badge(b.status)}</div>
          <div class="small muted">Construction ${pct(b.progress_pct || 0)} complete</div>${progress(b.progress_pct || 0, 100)}
          <div class="small muted" style="margin-top:4px">Spent ${money(b.spent)}${b.budget ? ` of ${money(b.budget)}` : ''}</div></div>`).join('')
          : '<div class="empty">No buildings added yet.</div>'}
      </div>
      <div class="card">
        <div class="card-head"><h3>Upcoming milestones</h3><a href="#/timeline">Timeline →</a></div>
        ${d.upcoming.length ? d.upcoming.map((m) => `<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
          <span>${esc(m.title)}${m.building_name ? ` <span class="muted small">· ${esc(m.building_name)}</span>` : ''}</span>
          <span class="nowrap">${m.due_date && m.due_date < today() ? badge('delayed', 'Overdue') : ''} ${esc(fmtDate(m.due_date))}</span></div>`).join('')
          : '<div class="empty">Nothing scheduled.</div>'}
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card-head"><h3>Latest vouchers</h3><a href="#/vouchers">All vouchers →</a></div>
      ${table([
        { h: 'No.', v: (r) => `<span class="mono">${vno(r)}</span>` },
        { h: 'Date', v: (r) => esc(fmtDate(r.date)) },
        { h: 'Description', v: (r) => esc(r.description) },
        { h: 'Amount', cls: 'num', v: (r) => money(r.total) },
        { h: 'Status', v: (r) => badge(r.status) },
      ], d.recent, { clickable: true, empty: 'No vouchers yet. Use “New Entry” to record the first payment or contribution.' })}
    </div>`;
  const actions = can('accountant') ? '<a class="btn" href="#/entry">＋ New entry</a>' : '';
  if (!view(t, d.project.name, actions, html)) return;
  onRows($('#main'), d.recent, (r) => go(`#/voucher/${r.id}`));
  $('#draftsLink')?.addEventListener('click', (e) => { e.preventDefault(); S.voucherFilter = { status: 'draft' }; go('#/vouchers'); });
};

/* ---------------- new entry (simple forms) ---------------- */
ROUTES.entry = async (t, kind) => {
  if (kind === 'receive') S.lists.units = await api('GET', P('/units'));
  const choices = [
    ['pay', '💸', 'Pay for something', 'Materials, labor, land, permits, fees… Money going out.'],
    ['contribution', '🤝', 'Owner puts money in', 'Capital contribution from one of the owners.'],
    ['receive', '💰', 'Receive money', 'Buyer deposit, unit sale, loan, rent or other income.'],
    ['journal', '⚖', 'Journal voucher', 'Advanced: free debit/credit entry with many lines.'],
  ];
  const html = `<div class="choice-grid no-print">${choices.map(([k, ico, title, desc]) =>
    `<button class="choice${kind === k ? ' active' : ''}" data-kind="${k}"><span class="big">${ico}</span><b>${title}</b><span class="muted small">${desc}</span></button>`).join('')}</div>
    <div id="entryForm" style="margin-top:16px"></div>`;
  if (!view(t, 'New entry', '', html)) return;
  $$('.choice').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.kind === 'journal') return go('#/voucher-edit/new');
    go(`#/entry/${b.dataset.kind}`);
  }));
  if (kind && kind !== 'journal') entryForm(kind);
};

function entryForm(kind) {
  const L = S.lists;
  const cash = (a) => a.is_cash;
  const ownerCap = new Map(L.owners.filter((o) => o.capital_account_id).map((o) => [o.capital_account_id, o]));
  const contactSel = (label) => `<label class="field"><span>${label}</span><div style="display:flex;gap:6px">
      <select name="contact_id"><option value="">—</option>${L.contacts.filter((c) => c.active).map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
      <button type="button" class="btn secondary small" data-newcontact title="Add a new contact">＋</button></div></label>`;
  const buildingSel = `<label class="field"><span>Building (optional)</span><select name="building_id"><option value="">Whole compound / general</option>${L.buildings.map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select></label>`;
  const common = `<label class="field"><span>Date *</span><input type="date" name="date" value="${today()}" required></label>
    <label class="field"><span>Amount *</span><input name="amount" inputmode="decimal" placeholder="0.00" required></label>`;

  let body;
  if (kind === 'pay') {
    const fromOpts = `<option value="">Choose…</option>
      <optgroup label="Paid from">${L.accounts.filter((a) => a.active && cash(a)).map((a) => `<option value="${a.id}:">${esc(a.name)}</option>`).join('')}</optgroup>
      <optgroup label="Not paid yet (we owe it)">${L.accounts.filter((a) => a.active && a.type === 'liability').map((a) => `<option value="${a.id}:">${esc(a.name)}</option>`).join('')}</optgroup>
      <optgroup label="Paid personally by an owner (counts as their contribution)">${L.owners.filter((o) => o.active && o.capital_account_id).map((o) => `<option value="${o.capital_account_id}:${o.id}">${esc(o.name)}</option>`).join('')}</optgroup>`;
    body = `<h3>💸 Pay for something</h3><div class="form-grid">${common}
      <label class="field"><span>What was it for? *</span>${accountSelect('debit', (a) => !a.is_cash && (a.type === 'asset' || a.type === 'expense' || a.type === 'liability'), null, { blank: 'Choose a category…' })}<div class="hint">Pick a liability (e.g. Accounts Payable) when paying off something you owed.</div></label>
      <label class="field"><span>How was it paid? *</span><select name="credit" required>${fromOpts}</select></label>
      ${contactSel('Paid to (supplier / contractor)')}${buildingSel}
      <label class="field wide"><span>Description *</span><input name="description" required placeholder="e.g. 40 tons of steel rebar for Building A"></label>
      <label class="field"><span>Invoice / receipt no.</span><input name="reference"></label></div>`;
  } else if (kind === 'contribution') {
    body = `<h3>🤝 Owner puts money in</h3><div class="form-grid">${common}
      <label class="field"><span>Owner *</span><select name="owner" required><option value="">Choose owner…</option>${L.owners.filter((o) => o.active).map((o) => `<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Deposited into *</span>${accountSelect('debit', cash, L.accounts.find((a) => a.code === '1020')?.id)}</label>
      <label class="field wide"><span>Description</span><input name="description" placeholder="Capital contribution"></label>
      <label class="field"><span>Bank transfer / cheque no.</span><input name="reference"></label></div>
      ${L.owners.length ? '' : '<div class="notice" style="margin-top:12px">Add owners first on the <a href="#/owners">Owners</a> page.</div>'}`;
  } else {
    body = `<h3>💰 Receive money</h3><div class="form-grid">${common}
      <label class="field"><span>What is it? *</span>${accountSelect('credit', (a) => !a.is_cash && !ownerCap.has(a.id) && a.type !== 'expense', L.accounts.find((a) => a.code === '2200')?.id, { blank: 'Choose…' })}<div class="hint">Buyer deposit, unit sale, loan received, rent…</div></label>
      <label class="field"><span>Received into *</span>${accountSelect('debit', cash, L.accounts.find((a) => a.code === '1020')?.id)}</label>
      ${contactSel('Received from')}${buildingSel}
      <label class="field"><span>For unit (optional)</span><select name="unit_id"><option value="">—</option>${(S.lists.units || []).map((u) => `<option value="${u.id}">${esc(u.unit_no)}${u.sale_price ? ` · due ${esc(money(u.sale_price - u.collected))}` : ''}</option>`).join('')}</select><div class="hint">Tracks how much each buyer has paid.</div></label>
      <label class="field wide"><span>Description *</span><input name="description" required placeholder="e.g. Down payment for Apartment A-301"></label>
      <label class="field"><span>Receipt / cheque no.</span><input name="reference"></label></div>`;
  }
  const files = [];
  const box = $('#entryForm');
  box.innerHTML = `<form class="card" id="quickForm" novalidate>${body}
    <h3 style="margin-top:18px">Receipts & attachments</h3>${dropzoneHtml()}
    <div id="qErr" class="error" hidden></div>
    <div style="display:flex;gap:10px;align-items:center;justify-content:flex-end;margin-top:16px;flex-wrap:wrap">
      <label class="check"><input type="checkbox" name="draft"> Save as draft (post later)</label>
      <button class="btn" type="submit">Save entry</button></div></form>`;
  setupDropzone(box, files);
  $('[data-newcontact]', box)?.addEventListener('click', () => contactForm(null, async (id) => {
    await loadLists();
    const sel = $('select[name=contact_id]', box);
    const c = S.lists.contacts.find((x) => x.id === id);
    sel.insertAdjacentHTML('beforeend', `<option value="${id}">${esc(c?.name || 'New contact')}</option>`);
    sel.value = String(id);
  }));

  $('#quickForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const err = $('#qErr');
    err.hidden = true;
    const btn = $('button[type=submit]', e.target);
    try {
      const amount = toCents(f.amount);
      if (!amount || amount < 0 || Number.isNaN(amount)) throw new Error('Enter an amount greater than zero.');
      const building = f.building_id ? Number(f.building_id) : null;
      let type;
      let lines;
      let description = (f.description || '').trim();
      if (kind === 'pay') {
        if (!f.debit || !f.credit) throw new Error('Choose what it was for and how it was paid.');
        const [creditAcc, ownerId] = f.credit.split(':');
        type = 'PV';
        lines = [
          { account_id: Number(f.debit), debit: amount, building_id: building },
          { account_id: Number(creditAcc), credit: amount, owner_id: ownerId ? Number(ownerId) : null },
        ];
      } else if (kind === 'contribution') {
        const owner = L.owners.find((o) => o.id === Number(f.owner));
        if (!owner) throw new Error('Choose the owner.');
        if (!f.debit) throw new Error('Choose where the money was deposited.');
        type = 'CC';
        description = description || `Capital contribution - ${owner.name}`;
        lines = [
          { account_id: Number(f.debit), debit: amount },
          { account_id: owner.capital_account_id, credit: amount, owner_id: owner.id },
        ];
      } else {
        if (!f.debit || !f.credit) throw new Error('Choose what it is and where it was received.');
        type = 'RV';
        lines = [
          { account_id: Number(f.debit), debit: amount },
          { account_id: Number(f.credit), credit: amount, building_id: building },
        ];
      }
      if (!description) throw new Error('Add a short description.');
      btn.disabled = true;
      const { id } = await api('POST', P('/vouchers'), {
        type, date: f.date, description, reference: f.reference, contact_id: f.contact_id || null, unit_id: f.unit_id || null, lines, post: !f.draft,
      });
      if (files.length) await uploadFiles(files, { voucherId: id });
      toast(f.draft ? 'Saved as draft.' : 'Entry saved and posted.');
      go(`#/voucher/${id}`);
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
}

/* ---------------- vouchers ---------------- */
ROUTES.vouchers = async (t) => {
  const f = S.voucherFilter || {};
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
  const rows = await api('GET', P(`/vouchers${qs ? `?${qs}` : ''}`));
  const cols = [
    { h: 'No.', v: (r) => `<span class="mono">${vno(r)}</span>`, csv: vno },
    { h: 'Date', v: (r) => esc(r.date) },
    { h: 'Type', v: (r) => esc(VOUCHER_TYPES[r.type]) },
    { h: 'Description', v: (r) => esc(r.description) + (r.reference ? ` <span class="muted small">· Ref ${esc(r.reference)}</span>` : '') + (r.attachment_count ? ` <span title="${r.attachment_count} attachment(s)">📎${r.attachment_count}</span>` : ''), csv: (r) => r.description },
    { h: 'Contact', v: (r) => esc(r.contact_name) },
    { h: 'Amount', cls: 'num', v: (r) => money(r.total), csv: (r) => (r.total / 100).toFixed(2) },
    { h: 'Status', v: (r) => badge(r.status), csv: (r) => r.status },
  ];
  const total = rows.filter((r) => r.status !== 'draft').reduce((s, r) => s + (r.total || 0), 0);
  const html = `<div class="filters no-print">
      <input type="search" id="fq" placeholder="Search description, reference, contact, number…" value="${esc(f.q || '')}">
      <select id="ftype"><option value="">All types</option>${Object.entries(VOUCHER_TYPES).map(([k, l]) => `<option value="${k}"${f.type === k ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <select id="fstatus"><option value="">All statuses</option>${['draft', 'posted', 'reversed'].map((s) => `<option value="${s}"${f.status === s ? ' selected' : ''}>${human(s)}</option>`).join('')}</select>
      <label class="small muted">From <input type="date" id="ffrom" value="${esc(f.from || '')}"></label>
      <label class="small muted">To <input type="date" id="fto" value="${esc(f.to || '')}"></label>
      <button class="btn secondary" id="fclear">Clear</button>
    </div>
    <div class="card">${table(cols, rows, { clickable: true, empty: 'No vouchers match.' })}
      <div class="muted small" style="margin-top:10px">${rows.length} voucher${rows.length === 1 ? '' : 's'} · posted total ${money(total)}</div></div>`;
  const actions = `<button class="btn secondary" id="csv">Export CSV</button>${can('accountant') ? '<a class="btn secondary" href="#/voucher-edit/new">＋ Journal voucher</a><a class="btn" href="#/entry">＋ New entry</a>' : ''}`;
  if (!view(t, 'Journal vouchers', actions, html)) return;
  onRows($('#main'), rows, (r) => go(`#/voucher/${r.id}`));
  $('#csv').addEventListener('click', () => exportCsv('vouchers', cols, rows));
  const apply = () => {
    S.voucherFilter = { q: $('#fq').value.trim(), type: $('#ftype').value, status: $('#fstatus').value, from: $('#ffrom').value, to: $('#fto').value };
    router();
  };
  let timer;
  $('#fq').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(apply, 350); });
  ['#ftype', '#fstatus', '#ffrom', '#fto'].forEach((s) => $(s).addEventListener('change', apply));
  $('#fclear').addEventListener('click', () => { S.voucherFilter = {}; router(); });
  if (f.q) { const q = $('#fq'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
};

ROUTES.voucher = async (t, id) => {
  const v = await api('GET', P(`/vouchers/${id}`));
  const totalD = v.lines.reduce((s, l) => s + l.debit, 0);
  const totalC = v.lines.reduce((s, l) => s + l.credit, 0);
  const lineCols = [
    { h: 'Account', v: (l) => `<a href="#/ledger/${l.account_id}">${esc(l.account_code)} · ${esc(l.account_name)}</a>` },
    { h: 'Details', v: (l) => [l.memo, l.owner_name && `Owner: ${l.owner_name}`, l.building_name && `Building: ${l.building_name}`].filter(Boolean).map(esc).join('<br>') },
    { h: 'Debit', cls: 'num', v: (l) => amt(l.debit) },
    { h: 'Credit', cls: 'num', v: (l) => amt(l.credit) },
  ];
  const actions = [
    '<button class="btn secondary" id="printBtn">Print</button>',
    can('accountant') && v.status === 'draft' ? `<a class="btn secondary" href="#/voucher-edit/${v.id}">Edit</a><button class="btn danger" id="delBtn">Delete</button><button class="btn" id="postBtn">Post</button>` : '',
    can('accountant') && v.status === 'posted' && !v.reversal_of ? '<button class="btn danger" id="revBtn">Reverse</button>' : '',
  ].join('');
  const attHtml = v.attachments.length
    ? `<div class="files">${v.attachments.map((a) => `<span class="file-chip">${isImage(a) ? `<a href="${fileUrl(a)}" target="_blank" rel="noopener"><img class="thumb" src="${fileUrl(a)}" alt=""></a>` : '📄'}
        <span><a href="${fileUrl(a)}" target="_blank" rel="noopener">${esc(a.filename)}</a><br><span class="muted small">${esc(human(a.category))} · ${Math.ceil(a.size / 1024)} KB</span></span>
        <a class="btn ghost small" href="${fileUrl(a, true)}" title="Download">⬇</a>
        ${can('accountant') && (v.status === 'draft' || can('admin')) ? `<button class="btn ghost small" data-delatt="${a.id}" title="Remove">✕</button>` : ''}</span>`).join('')}</div>`
    : '<div class="muted">No receipts attached.</div>';
  const html = `<div class="card voucher-doc">
      <div class="print-only" style="margin-bottom:16px"><h2>${esc(S.project.name)}</h2></div>
      <div class="card-head"><div><h2>${esc(VOUCHER_TYPES[v.type])} <span class="mono">${vno(v)}</span></h2></div>${badge(v.status)}</div>
      ${v.status === 'reversed' ? `<div class="notice">This voucher was reversed by <a href="#/voucher/${v.reversed_by}">a reversal entry</a>. Both remain in the books for the record.</div>` : ''}
      ${v.reversal_of ? `<div class="info">This entry reverses <a href="#/voucher/${v.reversal_of}">${esc(v.reference)}</a>.</div>` : ''}
      <div class="voucher-meta">
        <div><span>Date</span>${esc(fmtDate(v.date))}</div>
        <div><span>Reference</span>${esc(v.reference) || '—'}</div>
        <div><span>Contact</span>${esc(v.contact_name) || '—'}</div>
        ${v.unit_no ? `<div><span>Unit</span>${esc(v.unit_no)}</div>` : ''}
        <div><span>Amount</span><b>${money(totalD)}</b></div>
        <div style="grid-column:1/-1"><span>Description</span>${esc(v.description)}</div>
        <div><span>Prepared by</span>${esc(v.created_by_name) || '—'}<div class="muted small">${esc(fmtTime(v.created_at))}</div></div>
        <div><span>Posted by</span>${esc(v.posted_by_name) || '—'}<div class="muted small">${esc(fmtTime(v.posted_at))}</div></div>
      </div>
      ${table(lineCols, v.lines, { foot: ['Total', '', amt(totalD), amt(totalC)] })}
      <div class="signatures"><div>Prepared by</div><div>Approved by</div><div>Received by</div></div>
    </div>
    <div class="card no-print voucher-doc">
      <div class="card-head"><h3>Receipts & attachments</h3>${can('accountant') ? '<button class="btn secondary small" id="addAtt">＋ Add files</button>' : ''}</div>
      ${attHtml}
    </div>
    <div class="card no-print voucher-doc"><h3>History</h3>
      ${v.history.map((h) => `<div class="small" style="padding:4px 0"><b>${esc(human(h.action))}</b> by ${esc(h.user_name || 'system')} <span class="muted">· ${esc(fmtTime(h.at))}</span></div>`).join('') || '<div class="muted">No history.</div>'}
    </div>`;
  if (!view(t, `${vno(v)}`, actions, html)) return;
  $('#printBtn').addEventListener('click', () => window.print());
  $('#postBtn')?.addEventListener('click', () => confirmModal('Post voucher', 'Once posted, this voucher becomes part of the books and can no longer be edited (only reversed). Continue?', async () => {
    await api('POST', P(`/vouchers/${v.id}/post`));
    toast('Posted.');
    router();
  }, 'Post', false));
  $('#delBtn')?.addEventListener('click', () => confirmModal('Delete draft', 'Delete this draft voucher? Attached files will be kept in Documents.', async () => {
    await api('DELETE', P(`/vouchers/${v.id}`));
    toast('Draft deleted.');
    go('#/vouchers');
  }, 'Delete'));
  $('#revBtn')?.addEventListener('click', () => {
    const fields = [{ k: 'date', t: 'date', def: today(), req: 1, l: 'Reversal date' }, { k: 'reason', l: 'Reason', req: 1, wide: 1 }];
    openModal({
      title: `Reverse ${vno(v)}`,
      body: `<p class="muted">A new journal voucher with opposite debits and credits will be posted. The original stays in the books, so the history is never lost.</p>${formHtml(fields)}`,
      submit: 'Reverse', danger: true,
      onSubmit: async (root) => {
        const { id: rid } = await api('POST', P(`/vouchers/${v.id}/reverse`), readForm(root, fields));
        toast('Reversed.');
        go(`#/voucher/${rid}`);
      },
    });
  });
  $('#addAtt')?.addEventListener('click', () => {
    const files = [];
    openModal({
      title: 'Add receipts & files',
      body: `<div class="form-grid">${fieldHtml({ k: 'category', t: 'select', opts: enumOpts('docCategory'), def: 'receipt', req: 1 })}</div><div style="margin-top:12px">${dropzoneHtml()}</div>`,
      submit: 'Upload',
      onOpen: (root) => setupDropzone(root, files),
      onSubmit: async (root) => {
        if (!files.length) throw new Error('Choose at least one file.');
        await uploadFiles(files, { voucherId: v.id, category: $('[name=category]', root).value });
        toast('Uploaded.');
        router();
      },
    });
  });
  $$('[data-delatt]').forEach((b) => b.addEventListener('click', () => confirmModal('Remove file', 'Remove this file from the voucher? The removal is recorded in the activity log.', async () => {
    await api('DELETE', P(`/attachments/${b.dataset.delatt}`));
    router();
  }, 'Remove')));
};

ROUTES['voucher-edit'] = async (t, id) => {
  const isNew = !id || id === 'new';
  const v = isNew ? { type: 'JV', date: today(), description: '', reference: '', contact_id: null, lines: [{}, {}] } : await api('GET', P(`/vouchers/${id}`));
  if (!isNew && v.status !== 'draft') return go(`#/voucher/${id}`);
  const lines = v.lines.map((l) => ({ ...l }));
  const files = [];
  const L = S.lists;
  const ownerOpts = (sel) => `<option value="">—</option>${L.owners.map((o) => `<option value="${o.id}"${o.id === Number(sel) ? ' selected' : ''}>${esc(o.name)}</option>`).join('')}`;
  const bldOpts = (sel) => `<option value="">—</option>${L.buildings.map((b) => `<option value="${b.id}"${b.id === Number(sel) ? ' selected' : ''}>${esc(b.name)}</option>`).join('')}`;
  const html = `<form class="card" id="jvForm" novalidate>
    <div class="form-grid">
      <label class="field"><span>Voucher type</span><select name="type"${isNew ? '' : ' disabled'}>${Object.entries(VOUCHER_TYPES).map(([k, l]) => `<option value="${k}"${v.type === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Date *</span><input type="date" name="date" value="${esc(v.date)}" required></label>
      <label class="field"><span>Reference</span><input name="reference" value="${esc(v.reference || '')}" placeholder="Invoice, cheque, contract no."></label>
      <label class="field"><span>Contact</span><select name="contact_id"><option value="">—</option>${L.contacts.map((c) => `<option value="${c.id}"${c.id === v.contact_id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
      <label class="field wide"><span>Description *</span><input name="description" value="${esc(v.description)}" required></label>
    </div>
    <h3 style="margin-top:18px">Lines</h3>
    <div class="table-wrap"><table class="lines-table"><thead><tr><th>Account</th><th class="num">Debit</th><th class="num">Credit</th><th>Memo</th><th>Owner</th><th>Building</th><th></th></tr></thead>
      <tbody id="lineRows"></tbody>
      <tfoot><tr><td><button type="button" class="btn secondary small" id="addLine">＋ Add line</button></td><td class="num" id="totD"></td><td class="num" id="totC"></td><td colspan="4" id="diff"></td></tr></tfoot></table></div>
    <h3 style="margin-top:18px">Receipts & attachments</h3>${dropzoneHtml()}
    <div id="jvErr" class="error" hidden></div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
      <a class="btn secondary" href="${isNew ? '#/vouchers' : `#/voucher/${v.id}`}">Cancel</a>
      <button type="submit" class="btn secondary" data-post="0">Save draft</button>
      <button type="submit" class="btn" data-post="1">Save & post</button></div></form>`;
  if (!view(t, isNew ? 'New journal voucher' : `Edit ${vno(v)}`, '', html)) return;
  setupDropzone($('#jvForm'), files);

  const drawLines = () => {
    $('#lineRows').innerHTML = lines.map((l, i) => `<tr data-i="${i}">
      <td style="min-width:220px">${accountSelect('account_id', () => true, l.account_id, { required: false })}</td>
      <td><input class="amt num" name="debit" inputmode="decimal" value="${centsInput(l.debit)}"></td>
      <td><input class="amt num" name="credit" inputmode="decimal" value="${centsInput(l.credit)}"></td>
      <td><input name="memo" value="${esc(l.memo || '')}"></td>
      <td><select name="owner_id">${ownerOpts(l.owner_id)}</select></td>
      <td><select name="building_id">${bldOpts(l.building_id)}</select></td>
      <td><button type="button" class="btn ghost small" data-rmline title="Remove line">✕</button></td></tr>`).join('');
    totals();
  };
  const totals = () => {
    const d = lines.reduce((s, l) => s + (l.debit || 0), 0);
    const c = lines.reduce((s, l) => s + (l.credit || 0), 0);
    $('#totD').textContent = amt(d) || '0.00';
    $('#totC').textContent = amt(c) || '0.00';
    $('#diff').innerHTML = d === c ? (d ? badge('good', 'Balanced ✓') : '') : badge('bad', `Out of balance by ${amt(Math.abs(d - c))}`);
  };
  $('#lineRows').addEventListener('input', (e) => {
    if (e.target.tagName !== 'INPUT') return;
    const tr = e.target.closest('tr');
    const l = lines[Number(tr.dataset.i)];
    const { name, value } = e.target;
    if (name === 'debit' || name === 'credit') {
      const c = toCents(value);
      l[name] = Number.isNaN(c) ? 0 : c;
      totals();
    } else l[name] = value;
  });
  $('#lineRows').addEventListener('change', (e) => {
    if (e.target.tagName !== 'SELECT') return;
    const tr = e.target.closest('tr');
    lines[Number(tr.dataset.i)][e.target.name] = e.target.value ? Number(e.target.value) : null;
    if (e.target.name === 'account_id') {
      const owner = L.owners.find((o) => o.capital_account_id === Number(e.target.value));
      if (owner) { lines[Number(tr.dataset.i)].owner_id = owner.id; $('select[name=owner_id]', tr).value = String(owner.id); }
    }
  });
  $('#lineRows').addEventListener('click', (e) => {
    if (!e.target.closest('[data-rmline]')) return;
    if (lines.length <= 2) return toast('A voucher needs at least two lines.', true);
    lines.splice(Number(e.target.closest('tr').dataset.i), 1);
    drawLines();
  });
  $('#addLine').addEventListener('click', () => {
    const d = lines.reduce((s, l) => s + (l.debit || 0), 0);
    const c = lines.reduce((s, l) => s + (l.credit || 0), 0);
    lines.push(d > c ? { credit: d - c } : c > d ? { debit: c - d } : {});
    drawLines();
  });
  drawLines();

  $('#jvForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const post = e.submitter?.dataset.post === '1';
    const f = Object.fromEntries(new FormData(e.target));
    const err = $('#jvErr');
    err.hidden = true;
    try {
      const body = {
        type: isNew ? f.type : v.type, date: f.date, description: f.description, reference: f.reference,
        contact_id: f.contact_id || null,
        lines: lines.filter((l) => l.account_id || l.debit || l.credit).map((l) => ({
          account_id: l.account_id, debit: l.debit || 0, credit: l.credit || 0, memo: l.memo, owner_id: l.owner_id, building_id: l.building_id,
        })),
      };
      let vid = v.id;
      if (isNew) vid = (await api('POST', P('/vouchers'), { ...body, post })).id;
      else {
        await api('PUT', P(`/vouchers/${v.id}`), body);
        if (post) await api('POST', P(`/vouchers/${v.id}/post`));
      }
      if (files.length) await uploadFiles(files, { voucherId: vid });
      toast(post ? 'Saved and posted.' : 'Draft saved.');
      go(`#/voucher/${vid}`);
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  });
};

/* ---------------- chart of accounts & ledger ---------------- */
const ACCOUNT_FIELDS = [
  { k: 'code', l: 'Account number', req: 1, hint: '1xxx assets, 2xxx liabilities, 3xxx equity, 4xxx income, 5-6xxx expenses' },
  { k: 'name', l: 'Account name', req: 1 },
  { k: 'type', t: 'select', opts: Object.entries(TYPE_LABEL), req: 1, def: 'asset' },
  { k: 'description', t: 'textarea' },
  { k: 'is_cash', l: 'This is a cash / bank account', t: 'check' },
  { k: 'is_cost', l: 'Counts toward total project cost', t: 'check' },
  { k: 'active', l: 'Active', t: 'check', def: 1 },
];
ROUTES.accounts = async (t) => {
  const rows = await api('GET', P('/reports/balances'));
  const cols = [
    { h: 'No.', v: (r) => `<span class="mono">${esc(r.code)}</span>` },
    { h: 'Account', v: (r) => `${esc(r.name)}${r.is_cash ? ' <span class="badge">cash</span>' : ''}${r.is_cost ? ' <span class="badge">project cost</span>' : ''}${r.active ? '' : ' <span class="badge">inactive</span>'}` , csv: (r) => r.name },
    { h: 'Type', v: (r) => esc(human(r.type)) },
    { h: 'Total debit', cls: 'num', v: (r) => amt(r.debit), csv: (r) => (r.debit / 100).toFixed(2) },
    { h: 'Total credit', cls: 'num', v: (r) => amt(r.credit), csv: (r) => (r.credit / 100).toFixed(2) },
    { h: 'Balance', cls: 'num', v: (r) => (r.debit || r.credit ? money(r.balance) : '<span class="muted">—</span>'), csv: (r) => (r.balance / 100).toFixed(2) },
    { h: '', v: () => (can('accountant') ? '<button class="btn ghost small" data-edit>Edit</button>' : '') },
  ];
  const html = `<div class="info no-print">Every voucher line posts to one of these accounts. Click an account to see its full ledger (every debit and credit, with running balance).</div>
    ${Object.keys(TYPE_LABEL).map((type) => {
      const list = rows.filter((r) => r.type === type);
      return `<div class="card" data-type="${type}"><h3>${TYPE_LABEL[type]}</h3>${table(cols, list, { clickable: true })}</div>`;
    }).join('')}`;
  const actions = `<button class="btn secondary" id="csv">Export CSV</button>${can('accountant') ? '<button class="btn" id="newAcc">＋ Add account</button>' : ''}`;
  if (!view(t, 'Chart of accounts', actions, html)) return;
  $$('[data-type]').forEach((card) => {
    const list = rows.filter((r) => r.type === card.dataset.type);
    onRows(card, list, (r) => go(`#/ledger/${r.id}`));
    $$('[data-edit]', card).forEach((b) => b.addEventListener('click', () => accountForm(list[Number(b.closest('tr').dataset.i)])));
  });
  $('#csv').addEventListener('click', () => exportCsv('chart-of-accounts', cols.slice(0, 6), rows));
  $('#newAcc')?.addEventListener('click', () => accountForm(null));
};
function accountForm(a) {
  openModal({
    title: a ? `Edit account ${a.code}` : 'New account',
    body: formHtml(ACCOUNT_FIELDS, a || {}),
    onSubmit: async (root) => {
      const data = readForm(root, ACCOUNT_FIELDS);
      if (a) await api('PUT', P(`/accounts/${a.id}`), data);
      else await api('POST', P('/accounts'), data);
      await loadLists();
      toast('Saved.');
      router();
    },
  });
}

ROUTES.ledger = async (t, id) => {
  const f = S.ledgerFilter || {};
  const qs = new URLSearchParams({ account_id: id, ...(f.from ? { from: f.from } : {}), ...(f.to ? { to: f.to } : {}) });
  const l = await api('GET', P(`/reports/ledger?${qs}`));
  const cols = [
    { h: 'Date', v: (r) => esc(r.date) },
    { h: 'Voucher', v: (r) => `<a href="#/voucher/${r.voucher_id}" class="mono">${vno(r)}</a>`, csv: vno },
    { h: 'Description', v: (r) => esc(r.memo || r.description) + [r.contact_name, r.owner_name, r.building_name].filter(Boolean).map((x) => ` <span class="muted small">· ${esc(x)}</span>`).join(''), csv: (r) => r.memo || r.description },
    { h: 'Debit', cls: 'num', v: (r) => amt(r.debit), csv: (r) => (r.debit / 100).toFixed(2) },
    { h: 'Credit', cls: 'num', v: (r) => amt(r.credit), csv: (r) => (r.credit / 100).toFixed(2) },
    { h: 'Balance', cls: 'num', v: (r) => money(r.running), csv: (r) => (r.running / 100).toFixed(2) },
  ];
  const html = `<div class="filters no-print">
      <label class="small muted">From <input type="date" id="lfrom" value="${esc(f.from || '')}"></label>
      <label class="small muted">To <input type="date" id="lto" value="${esc(f.to || '')}"></label>
      <a href="#/accounts" class="btn ghost">← All accounts</a></div>
    <div class="card"><div class="card-head"><h3><span class="mono">${esc(l.account.code)}</span> · ${esc(l.account.name)}</h3><span class="muted">${esc(human(l.account.type))}</span></div>
    <div class="muted small" style="margin-bottom:8px">Opening balance: <b>${money(l.opening)}</b></div>
    ${table(cols, l.rows, { empty: 'No posted entries for this account in this period.', foot: ['', '', 'Closing balance', amt(l.rows.reduce((s, r) => s + r.debit, 0)), amt(l.rows.reduce((s, r) => s + r.credit, 0)), money(l.closing)] })}</div>`;
  const actions = '<button class="btn secondary" id="csv">Export CSV</button><button class="btn secondary" id="printBtn">Print</button>';
  if (!view(t, `Ledger: ${l.account.name}`, actions, html)) return;
  $('#csv').addEventListener('click', () => exportCsv(`ledger-${l.account.code}`, cols, l.rows));
  $('#printBtn').addEventListener('click', () => window.print());
  const apply = () => { S.ledgerFilter = { from: $('#lfrom').value, to: $('#lto').value }; router(); };
  $('#lfrom').addEventListener('change', apply);
  $('#lto').addEventListener('change', apply);
};

/* ---------------- owners ---------------- */
const OWNER_FIELDS = [
  { k: 'name', l: 'Full name', req: 1 },
  { k: 'share_pct', l: 'Ownership share (%)', t: 'number', step: 'any', hint: 'Three equal partners = 33.3333 each' },
  { k: 'committed_capital', l: 'Committed capital', t: 'money', hint: 'How much this owner agreed to put in' },
  { k: 'joined_date', l: 'Joined on', t: 'date' },
  { k: 'phone' }, { k: 'email', t: 'email' },
  { k: 'national_id', l: 'ID / passport no.' },
  { k: 'address', wide: 1 },
  { k: 'notes', t: 'textarea' },
  { k: 'active', t: 'check', def: 1 },
];
ROUTES.owners = async (t) => {
  const st = await api('GET', P('/reports/owners'));
  const totalCap = st.totalContributed;
  const shareWarn = st.owners.length && Math.abs(st.totalShare - 100) > 0.01;
  const html = `
    ${shareWarn ? `<div class="notice">Active ownership shares add up to ${pct(st.totalShare)}, not 100%. Edit the owners so the shares total 100%.</div>` : ''}
    <div class="kpis">
      <div class="kpi"><div class="label">Total capital paid in</div><div class="value">${money(totalCap)}</div></div>
      <div class="kpi"><div class="label">Total project cost so far</div><div class="value">${money(st.totalCost)}</div></div>
      <div class="kpi"><div class="label">Owners</div><div class="value">${st.owners.filter((o) => o.active).length}</div><div class="sub">Shares total ${pct(st.totalShare)}</div></div>
    </div>
    ${st.owners.length ? `<div class="grid grid-3">${st.owners.map((o, i) => {
      const fair = o.active && st.totalShare ? Math.round((totalCap * o.share_pct) / st.totalShare) : 0;
      return `<div class="owner-card">
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px"><span class="avatar">${esc(initials(o.name))}</span>
          <div style="flex:1"><b>${esc(o.name)}</b><div class="muted small">${pct(o.share_pct)} ownership${o.active ? '' : ' · inactive'}</div></div>
          ${can('accountant') ? `<button class="btn ghost small" data-edit="${i}">Edit</button>` : ''}</div>
        <div class="row"><span>Capital paid in</span><b>${money(o.contributed)}</b></div>
        <div class="row"><span>Fair share of total capital (${pct(o.share_pct)})</span><span>${money(fair)}</span></div>
        <div class="row"><span>${o.contributed - fair >= 0 ? 'Paid more than share by' : 'Needs to pay to catch up'}</span>${signed(o.contributed - fair)}</div>
        <div class="row"><span>Share of project cost to date</span><span>${money(o.share_of_cost)}</span></div>
        <div class="row"><span>Committed capital</span><span>${money(o.committed_capital)}</span></div>
        <div class="row"><span>Remaining commitment</span><span>${money(o.remaining_commitment)}</span></div>
        ${o.committed_capital ? progress(o.contributed, o.committed_capital) : ''}
        ${o.phone || o.email ? `<div class="muted small" style="margin-top:8px">${esc([o.phone, o.email].filter(Boolean).join(' · '))}</div>` : ''}
        <details style="margin-top:8px"><summary class="small">Contribution history (${o.history.length})</summary>
          ${o.history.length ? o.history.map((h) => `<div class="row small"><span><a href="#/voucher/${h.voucher_id}">${vno(h)}</a> · ${esc(h.date)}</span>${signed(h.credit - h.debit)}</div>`).join('') : '<div class="muted small">None yet.</div>'}
        </details>
      </div>`;
    }).join('')}</div>` : '<div class="card empty">No owners yet. Add each owner with their ownership share. Each owner automatically gets their own capital account, so every dollar they put in is tracked.</div>'}
    <div class="card" style="margin-top:16px"><h3>How this works</h3>
      <p class="muted small" style="margin:0">Every owner has a personal capital account in the chart of accounts. Use <b>New Entry → Owner puts money in</b> when an owner transfers money, or choose the owner under “How was it paid?” when they pay a supplier personally. “Fair share” compares what each owner has paid against their ownership percentage, so you always know who needs to top up and by how much.</p></div>`;
  const actions = `<button class="btn secondary" id="printBtn">Print</button>${can('accountant') ? '<a class="btn secondary" href="#/entry/contribution">Record contribution</a><button class="btn" id="newOwner">＋ Add owner</button>' : ''}`;
  if (!view(t, 'Owners & shares', actions, html)) return;
  $('#newOwner')?.addEventListener('click', () => ownerForm(null));
  $('#printBtn').addEventListener('click', () => { $$('details').forEach((d) => { d.open = true; }); window.print(); });
  $$('[data-edit]').forEach((b) => b.addEventListener('click', () => ownerForm(st.owners[Number(b.dataset.edit)])));
};
function ownerForm(o) {
  openModal({
    title: o ? `Edit ${o.name}` : 'Add owner',
    body: formHtml(OWNER_FIELDS, o || {}),
    onSubmit: async (root) => {
      const data = readForm(root, OWNER_FIELDS);
      if (o) await api('PUT', P(`/owners/${o.id}`), data);
      else await api('POST', P('/owners'), data);
      await loadLists();
      toast('Saved.');
      router();
    },
  });
}

/* ---------------- generic list pages ---------------- */
// Opens the add/edit dialog for a project-scoped record; edit mode also offers Delete.
function recordForm(entity, fields, r, newLabel) {
  const done = async (msg) => { await loadLists(); toast(msg); router(); };
  openModal({
    title: r ? 'Edit' : newLabel,
    body: formHtml(fields, r || {}),
    onSubmit: async (root) => {
      const data = readForm(root, fields);
      if (r) await api('PUT', P(`/${entity}/${r.id}`), data);
      else await api('POST', P(`/${entity}`), data);
      await done('Saved.');
    },
    onDelete: r && can('accountant') ? async () => { await api('DELETE', P(`/${entity}/${r.id}`)); await done('Deleted.'); } : null,
  });
}

function simplePage({ entity, title, fields, cols, newLabel, intro, summary, filter }) {
  return async (t) => {
    const rows = await api('GET', P(`/${entity}`));
    const f = (S.filters ||= {})[entity] || '';
    const shown = filter && f ? rows.filter((r) => r[filter.key] === f) : rows;
    const html = `${intro ? `<div class="info">${intro}</div>` : ''}${summary ? summary(rows) : ''}
      ${filter ? `<div class="filters"><select id="sfilter"><option value="">All ${filter.label}</option>${filter.opts.map(([v, l]) => `<option value="${v}"${f === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>` : ''}
      <div class="card">${table(cols, shown, { clickable: can('accountant'), empty: 'Nothing here yet.' })}</div>`;
    const actions = `<button class="btn secondary" id="csv">Export CSV</button>${can('accountant') ? `<button class="btn" id="newRow">＋ ${newLabel}</button>` : ''}`;
    if (!view(t, title, actions, html)) return;
    if (can('accountant')) onRows($('#main'), shown, (r) => recordForm(entity, fields, r, newLabel));
    $('#newRow')?.addEventListener('click', () => recordForm(entity, fields, null, newLabel));
    $('#csv').addEventListener('click', () => exportCsv(entity, cols, shown));
    $('#sfilter')?.addEventListener('change', (e) => { S.filters[entity] = e.target.value; router(); });
  };
}

function contactForm(c, after) {
  openModal({
    title: c ? 'Edit contact' : 'New contact',
    body: formHtml(CONTACT_FIELDS, c || {}),
    onSubmit: async (root) => {
      const data = readForm(root, CONTACT_FIELDS);
      const res = c ? await api('PUT', P(`/contacts/${c.id}`), data) : await api('POST', P('/contacts'), data);
      if (after) await after(res.id || c.id);
      toast('Saved.');
    },
  });
}

const CONTACT_FIELDS = [
  { k: 'name', req: 1 }, { k: 'kind', l: 'Type', t: 'select', opts: enumOpts('contactKind'), def: 'supplier', req: 1 },
  { k: 'phone' }, { k: 'email', t: 'email' }, { k: 'tax_id', l: 'Tax / registration no.' },
  { k: 'address', wide: 1 }, { k: 'notes', t: 'textarea' }, { k: 'active', t: 'check', def: 1 },
];
ROUTES.contacts = simplePage({
  entity: 'contacts', title: 'Suppliers & contacts', newLabel: 'Add contact', fields: CONTACT_FIELDS,
  filter: { key: 'kind', label: 'types', opts: enumOpts('contactKind') },
  cols: [
    { h: 'Name', v: (r) => `<b>${esc(r.name)}</b>${r.active ? '' : ' <span class="badge">inactive</span>'}`, csv: (r) => r.name },
    { h: 'Type', v: (r) => esc(human(r.kind)) },
    { h: 'Phone', v: (r) => esc(r.phone) },
    { h: 'Email', v: (r) => esc(r.email) },
    { h: 'Tax no.', v: (r) => esc(r.tax_id) },
    { h: 'Paid to them', cls: 'num', v: (r) => (r.net_paid > 0 ? money(r.net_paid) : ''), csv: (r) => (Math.max(0, r.net_paid) / 100).toFixed(2) },
    { h: 'Received from them', cls: 'num', v: (r) => (r.net_paid < 0 ? money(-r.net_paid) : ''), csv: (r) => (Math.max(0, -r.net_paid) / 100).toFixed(2) },
    { h: 'We owe / hold', cls: 'num', v: (r) => (r.owed ? money(r.owed) : ''), csv: (r) => (r.owed / 100).toFixed(2) },
  ],
});

const BUILDING_FIELDS = [
  { k: 'name', req: 1, hint: 'e.g. Building A, Villa 3, Clubhouse, Main road' },
  { k: 'kind', l: 'Type', t: 'select', opts: enumOpts('buildingKind'), def: 'residential', req: 1 },
  { k: 'status', t: 'select', opts: enumOpts('buildingStatus'), def: 'planned', req: 1 },
  { k: 'progress_pct', l: 'Construction progress (%)', t: 'number', step: 'any' },
  { k: 'floors', t: 'number' }, { k: 'area_sqm', l: 'Built-up area (m²)', t: 'number', step: 'any' },
  { k: 'budget', t: 'money' }, { k: 'start_date', t: 'date' }, { k: 'end_date', l: 'Completion date', t: 'date' },
  { k: 'notes', t: 'textarea' },
];
ROUTES.buildings = async (t) => {
  const [rows, d] = await Promise.all([api('GET', P('/buildings')), api('GET', P('/reports/dashboard'))]);
  const spent = new Map(d.costByBuilding.map((b) => [b.id, b.spent]));
  const cols = [
    { h: 'Building', v: (r) => `<b>${esc(r.name)}</b><div class="muted small">${esc(human(r.kind))}${r.floors ? ` · ${r.floors} floors` : ''}${r.area_sqm ? ` · ${r.area_sqm} m²` : ''}</div>`, csv: (r) => r.name },
    { h: 'Status', v: (r) => badge(r.status), csv: (r) => r.status },
    { h: 'Progress', v: (r) => `<div style="min-width:120px">${progress(r.progress_pct || 0, 100)}<span class="small muted">${pct(r.progress_pct || 0)}</span></div>`, csv: (r) => r.progress_pct },
    { h: 'Budget', cls: 'num', v: (r) => money(r.budget), csv: (r) => (r.budget / 100).toFixed(2) },
    { h: 'Spent', cls: 'num', v: (r) => money(spent.get(r.id) || 0), csv: (r) => ((spent.get(r.id) || 0) / 100).toFixed(2) },
    { h: 'Remaining', cls: 'num', v: (r) => (r.budget ? signed(r.budget - (spent.get(r.id) || 0)) : ''), csv: (r) => ((r.budget - (spent.get(r.id) || 0)) / 100).toFixed(2) },
    { h: 'Dates', v: (r) => esc([fmtDate(r.start_date), fmtDate(r.end_date)].filter(Boolean).join(' → ')) },
  ];
  const html = `<div class="info">Add every building, villa and infrastructure work (roads, water, power) here. When you record a payment, choose the building to track the real cost of each one.</div>
    <div class="card">${table(cols, rows, { clickable: can('accountant'), empty: 'No buildings yet.' })}</div>`;
  const actions = `<button class="btn secondary" id="csv">Export CSV</button>${can('accountant') ? '<button class="btn" id="newRow">＋ Add building</button>' : ''}`;
  if (!view(t, 'Buildings & infrastructure', actions, html)) return;
  const edit = (r) => recordForm('buildings', BUILDING_FIELDS, r, 'Add building');
  if (can('accountant')) onRows($('#main'), rows, edit);
  $('#newRow')?.addEventListener('click', () => edit(null));
  $('#csv').addEventListener('click', () => exportCsv('buildings', cols, rows));
};

const UNIT_FIELDS = [
  { k: 'unit_no', l: 'Unit number', req: 1 },
  { k: 'building_id', l: 'Building', t: 'select', opts: listOpts('buildings') },
  { k: 'kind', l: 'Type', t: 'select', opts: enumOpts('unitKind'), def: 'apartment', req: 1 },
  { k: 'status', t: 'select', opts: enumOpts('unitStatus'), def: 'available', req: 1 },
  { k: 'floor' }, { k: 'area_sqm', l: 'Area (m²)', t: 'number', step: 'any' }, { k: 'bedrooms', t: 'number' },
  { k: 'list_price', l: 'Asking price', t: 'money' }, { k: 'sale_price', l: 'Final sale price', t: 'money' },
  { k: 'buyer_contact_id', l: 'Buyer', t: 'select', opts: listOpts('contacts') },
  { k: 'sale_date', t: 'date' }, { k: 'notes', t: 'textarea' },
];
ROUTES.units = simplePage({
  entity: 'units', title: 'Units & sales', newLabel: 'Add unit', fields: UNIT_FIELDS,
  filter: { key: 'status', label: 'statuses', opts: enumOpts('unitStatus') },
  summary: (rows) => {
    const by = (s) => rows.filter((r) => r.status === s);
    const sold = by('sold');
    return `<div class="kpis">
      <div class="kpi"><div class="label">Total units</div><div class="value">${rows.length}</div></div>
      <div class="kpi"><div class="label">Available</div><div class="value">${by('available').length}</div><div class="sub">Asking ${money(by('available').reduce((s, r) => s + r.list_price, 0))}</div></div>
      <div class="kpi"><div class="label">Reserved</div><div class="value">${by('reserved').length}</div></div>
      <div class="kpi"><div class="label">Sold</div><div class="value">${sold.length}</div><div class="sub">Sales ${money(sold.reduce((s, r) => s + r.sale_price, 0))}</div></div>
      <div class="kpi"><div class="label">Still to collect from buyers</div><div class="value">${money(rows.filter((r) => r.sale_price).reduce((s, r) => s + Math.max(0, r.sale_price - r.collected), 0))}</div><div class="sub">Record buyer payments with New Entry → Receive money</div></div>
    </div>`;
  },
  cols: [
    { h: 'Unit', v: (r) => `<b>${esc(r.unit_no)}</b>`, csv: (r) => r.unit_no },
    { h: 'Building', v: (r) => esc(S.lists.buildings.find((b) => b.id === r.building_id)?.name) },
    { h: 'Type', v: (r) => esc(human(r.kind)) },
    { h: 'Floor', v: (r) => esc(r.floor) },
    { h: 'Area', cls: 'num', v: (r) => (r.area_sqm ? `${r.area_sqm} m²` : '') },
    { h: 'Beds', cls: 'num', v: (r) => esc(r.bedrooms ?? '') },
    { h: 'Asking', cls: 'num', v: (r) => money(r.list_price), csv: (r) => (r.list_price / 100).toFixed(2) },
    { h: 'Sold for', cls: 'num', v: (r) => (r.sale_price ? money(r.sale_price) : ''), csv: (r) => (r.sale_price / 100).toFixed(2) },
    { h: 'Collected', cls: 'num', v: (r) => (r.collected ? money(r.collected) : ''), csv: (r) => (r.collected / 100).toFixed(2) },
    { h: 'Balance due', cls: 'num', v: (r) => (r.sale_price ? money(r.sale_price - r.collected) : ''), csv: (r) => ((r.sale_price - r.collected) / 100).toFixed(2) },
    { h: 'Buyer', v: (r) => esc(S.lists.contacts.find((c) => c.id === r.buyer_contact_id)?.name) },
    { h: 'Status', v: (r) => badge(r.status), csv: (r) => r.status },
  ],
});

const MILESTONE_FIELDS = [
  { k: 'title', req: 1, wide: 1, hint: 'e.g. Building permit approved, Foundation poured, Roof slab done' },
  { k: 'building_id', l: 'Building', t: 'select', opts: listOpts('buildings') },
  { k: 'status', t: 'select', opts: enumOpts('milestoneStatus'), def: 'pending', req: 1 },
  { k: 'due_date', t: 'date' }, { k: 'done_date', l: 'Completed on', t: 'date' },
  { k: 'notes', t: 'textarea' },
];
ROUTES.timeline = simplePage({
  entity: 'milestones', title: 'Timeline & milestones', newLabel: 'Add milestone', fields: MILESTONE_FIELDS,
  filter: { key: 'status', label: 'statuses', opts: enumOpts('milestoneStatus') },
  cols: [
    { h: 'Due', v: (r) => esc(fmtDate(r.due_date)) + (r.status !== 'done' && r.due_date && r.due_date < today() ? ` ${badge('delayed', 'Overdue')}` : ''), csv: (r) => r.due_date },
    { h: 'Milestone', v: (r) => `<b>${esc(r.title)}</b>${r.notes ? `<div class="muted small">${esc(r.notes)}</div>` : ''}`, csv: (r) => r.title },
    { h: 'Building', v: (r) => esc(S.lists.buildings.find((b) => b.id === r.building_id)?.name || 'Whole compound') },
    { h: 'Status', v: (r) => badge(r.status), csv: (r) => r.status },
    { h: 'Completed', v: (r) => esc(fmtDate(r.done_date)), csv: (r) => r.done_date },
  ],
});

/* ---------------- budget ---------------- */
const BUDGET_FIELDS = [
  { k: 'account_id', l: 'Cost category (account)', t: 'select', req: 1, opts: () => S.lists.accounts.filter((a) => a.is_cost && a.active).map((a) => [a.id, accountName(a)]) },
  { k: 'building_id', l: 'Building (optional)', t: 'select', opts: listOpts('buildings') },
  { k: 'amount', l: 'Budgeted amount', t: 'money', req: 1 },
  { k: 'notes', t: 'textarea' },
];
ROUTES.budget = async (t) => {
  const b = await api('GET', P('/reports/budget'));
  const cols = [
    { h: 'Category', v: (r) => `<span class="mono">${esc(r.code)}</span> ${esc(r.account_name)}${r.notes ? `<div class="muted small">${esc(r.notes)}</div>` : ''}`, csv: (r) => `${r.code} ${r.account_name}` },
    { h: 'Building', v: (r) => esc(r.building_name || 'All') },
    { h: 'Budget', cls: 'num', v: (r) => money(r.amount), csv: (r) => (r.amount / 100).toFixed(2) },
    { h: 'Actual', cls: 'num', v: (r) => money(r.actual), csv: (r) => (r.actual / 100).toFixed(2) },
    { h: 'Remaining', cls: 'num', v: (r) => signed(r.variance), csv: (r) => (r.variance / 100).toFixed(2) },
    { h: 'Used', v: (r) => `<div style="min-width:110px">${progress(r.actual, r.amount)}<span class="small muted">${r.used_pct === null ? '' : pct(r.used_pct)}</span></div>`, csv: (r) => r.used_pct },
  ];
  const projBudget = S.project.total_budget;
  const html = `<div class="kpis">
      <div class="kpi"><div class="label">Overall project budget</div><div class="value">${money(projBudget)}</div><div class="sub">Set in Settings</div></div>
      <div class="kpi"><div class="label">Sum of budget lines</div><div class="value">${money(b.totalBudget)}</div></div>
      <div class="kpi"><div class="label">Actual on budgeted lines</div><div class="value">${money(b.totalActual)}</div>${progress(b.totalActual, b.totalBudget)}</div>
      <div class="kpi"><div class="label">Remaining</div><div class="value">${signed(b.variance)}</div></div>
    </div>
    <div class="card">${table(cols, b.rows, { clickable: can('accountant'), empty: 'No budget lines yet. Add a budget for each cost category (land, materials, labor, infrastructure…) to see budget vs actual.', foot: ['Total', '', money(b.totalBudget), money(b.totalActual), signed(b.variance), ''] })}</div>`;
  const actions = `<button class="btn secondary" id="csv">Export CSV</button>${can('accountant') ? '<button class="btn" id="newRow">＋ Add budget line</button>' : ''}`;
  if (!view(t, 'Budget vs actual', actions, html)) return;
  const edit = (r) => recordForm('budgets', BUDGET_FIELDS, r, 'Add budget line');
  if (can('accountant')) onRows($('#main'), b.rows, edit);
  $('#newRow')?.addEventListener('click', () => edit(null));
  $('#csv').addEventListener('click', () => exportCsv('budget', cols, b.rows));
};

/* ---------------- documents ---------------- */
ROUTES.documents = async (t) => {
  const rows = await api('GET', P('/attachments'));
  const cat = S.docCat || '';
  const shown = cat ? rows.filter((r) => r.category === cat) : rows;
  const cols = [
    { h: '', v: (r) => (isImage(r) ? `<img class="thumb" src="${fileUrl(r)}" alt="" loading="lazy">` : '<span style="font-size:24px">📄</span>') },
    { h: 'File', v: (r) => `<a href="${fileUrl(r)}" target="_blank" rel="noopener">${esc(r.filename)}</a>${r.note ? `<div class="muted small">${esc(r.note)}</div>` : ''}`, csv: (r) => r.filename },
    { h: 'Category', v: (r) => esc(human(r.category)) },
    { h: 'Voucher', v: (r) => (r.voucher_id ? `<a class="mono" href="#/voucher/${r.voucher_id}">${vno({ type: r.voucher_type, number: r.voucher_number })}</a>` : '<span class="muted">—</span>'), csv: (r) => (r.voucher_id ? vno({ type: r.voucher_type, number: r.voucher_number }) : '') },
    { h: 'Uploaded', v: (r) => `${esc(fmtTime(r.uploaded_at))}<div class="muted small">${esc(r.uploaded_by_name || '')}</div>`, csv: (r) => r.uploaded_at },
    { h: 'Size', cls: 'num', v: (r) => `${Math.ceil(r.size / 1024)} KB` },
    { h: '', v: (r) => `<a class="btn ghost small" href="${fileUrl(r, true)}">⬇</a>` },
  ];
  const html = `<div class="filters"><select id="dcat"><option value="">All categories</option>${enumOpts('docCategory').map(([v, l]) => `<option value="${v}"${cat === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="card">${table(cols, shown, { empty: 'No documents yet. Upload contracts, permits, deeds, drawings and photos here; receipts attached to vouchers also appear here.' })}</div>`;
  const actions = `<button class="btn secondary" id="csv">Export list</button>${can('accountant') ? '<button class="btn" id="upload">＋ Upload documents</button>' : ''}`;
  if (!view(t, 'Documents', actions, html)) return;
  $('#dcat').addEventListener('change', (e) => { S.docCat = e.target.value; router(); });
  $('#csv').addEventListener('click', () => exportCsv('documents', cols.slice(1, 6), shown));
  $('#upload')?.addEventListener('click', () => {
    const files = [];
    const fields = [{ k: 'category', t: 'select', opts: enumOpts('docCategory'), def: 'contract', req: 1 }, { k: 'note', l: 'Note', wide: 1 }];
    openModal({
      title: 'Upload documents', body: `${formHtml(fields)}<div style="margin-top:12px">${dropzoneHtml('Click to choose files (or drop them here)')}</div>`, submit: 'Upload',
      onOpen: (root) => setupDropzone(root, files),
      onSubmit: async (root) => {
        if (!files.length) throw new Error('Choose at least one file.');
        const f = readForm(root, fields);
        await uploadFiles(files, { category: f.category, note: f.note || null });
        toast('Uploaded.');
        router();
      },
    });
  });
};

/* ---------------- reports ---------------- */
ROUTES.reports = async (t, tab = 'trial') => {
  const f = S.reportFilter || {};
  const tabs = [['trial', 'Trial balance'], ['balance', 'Balance sheet'], ['income', 'Income & expenses'], ['cost', 'Project cost']];
  const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v)).toString();
  let body = '';
  let csv = null;
  const acctLink = (r) => `<a href="#/ledger/${r.id}"><span class="mono">${esc(r.code)}</span> ${esc(r.name)}</a>`;
  if (tab === 'trial') {
    const tb = await api('GET', P(`/reports/trial-balance?${qs({ from: f.from, to: f.to })}`));
    const cols = [
      { h: 'Account', v: acctLink, csv: (r) => `${r.code} ${r.name}` },
      { h: 'Type', v: (r) => esc(human(r.type)) },
      { h: 'Debit', cls: 'num', v: (r) => amt(r.tb_debit), csv: (r) => (r.tb_debit / 100).toFixed(2) },
      { h: 'Credit', cls: 'num', v: (r) => amt(r.tb_credit), csv: (r) => (r.tb_credit / 100).toFixed(2) },
    ];
    body = `<div class="card-head"><h3>Trial balance</h3>${tb.balanced ? badge('good', 'Balanced ✓') : badge('bad', 'Not balanced')}</div>
      ${table(cols, tb.rows, { empty: 'No posted entries yet.', foot: ['Total', '', amt(tb.debit), amt(tb.credit)] })}`;
    csv = () => exportCsv('trial-balance', cols, tb.rows);
  } else if (tab === 'balance') {
    const bs = await api('GET', P(`/reports/balance-sheet?${qs({ to: f.to })}`));
    const section = (title, rows, total, extra = '') => `<tr class="section"><td colspan="2">${title}</td></tr>
      ${rows.map((r) => `<tr><td>${acctLink(r)}</td><td class="num">${money(r.balance)}</td></tr>`).join('')}${extra}
      <tr><td><b>Total ${title.toLowerCase()}</b></td><td class="num"><b>${money(total)}</b></td></tr>`;
    body = `<div class="card-head"><h3>Balance sheet ${f.to ? `as of ${esc(fmtDate(f.to))}` : '(today)'}</h3>${bs.balanced ? badge('good', 'Assets = Liabilities + Equity ✓') : badge('bad', 'Out of balance')}</div>
      <div class="table-wrap"><table>${section('Assets', bs.assets, bs.totalAssets)}${section('Liabilities', bs.liabilities, bs.totalLiabilities)}
      ${section('Equity', bs.equity, bs.totalEquity, `<tr><td class="muted">Current earnings (income − expenses)</td><td class="num">${money(bs.earnings)}</td></tr>`)}
      <tr class="section"><td>Liabilities + equity</td><td class="num">${money(bs.totalLiabilities + bs.totalEquity)}</td></tr></table></div>`;
  } else if (tab === 'income') {
    const is = await api('GET', P(`/reports/income-statement?${qs({ from: f.from, to: f.to })}`));
    const rowsH = (rows) => rows.map((r) => `<tr><td>${acctLink(r)}</td><td class="num">${money(r.balance)}</td></tr>`).join('') || '<tr><td colspan="2" class="muted">None</td></tr>';
    body = `<h3>Income & expenses</h3><p class="muted small">Construction costs are capitalized into the project (assets), so they appear in the balance sheet and Project cost — not here.</p>
      <div class="table-wrap"><table><tr class="section"><td colspan="2">Income</td></tr>${rowsH(is.revenue)}<tr><td><b>Total income</b></td><td class="num"><b>${money(is.totalRevenue)}</b></td></tr>
      <tr class="section"><td colspan="2">Expenses</td></tr>${rowsH(is.expenses)}<tr><td><b>Total expenses</b></td><td class="num"><b>${money(is.totalExpenses)}</b></td></tr>
      <tr class="section"><td>Net result</td><td class="num">${signed(is.net)}</td></tr></table></div>`;
  } else {
    const rows = (await api('GET', P(`/reports/balances?${qs({ from: f.from, to: f.to, building_id: f.building })}`))).filter((r) => r.is_cost && r.balance);
    const total = rows.reduce((s, r) => s + r.balance, 0);
    const cols = [
      { h: 'Cost category', v: acctLink, csv: (r) => `${r.code} ${r.name}` },
      { h: 'Amount', cls: 'num', v: (r) => money(r.balance), csv: (r) => (r.balance / 100).toFixed(2) },
      { h: 'Share', cls: 'num', v: (r) => pct(total ? (r.balance / total) * 100 : 0) },
      { h: '', v: (r) => `<div style="min-width:120px">${progress(r.balance, total)}</div>` },
    ];
    body = `<div class="card-head"><h3>Project cost by category</h3><select id="rbld" style="width:auto"><option value="">Whole compound</option>${S.lists.buildings.map((b) => `<option value="${b.id}"${String(b.id) === String(f.building || '') ? ' selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div>
      ${table(cols, rows, { empty: 'No costs recorded for this selection.', foot: ['Total', money(total), '100%', ''] })}`;
    csv = () => exportCsv('project-cost', cols.slice(0, 3), rows);
  }
  const html = `<div class="tabs no-print">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'active' : ''}">${l}</button>`).join('')}</div>
    <div class="filters no-print">${tab !== 'balance' ? `<label class="small muted">From <input type="date" id="rfrom" value="${esc(f.from || '')}"></label>` : ''}
      <label class="small muted">${tab === 'balance' ? 'As of' : 'To'} <input type="date" id="rto" value="${esc(f.to || '')}"></label></div>
    <div class="print-only"><h2>${esc(S.project.name)}</h2><p>${esc(f.from ? `From ${f.from} ` : '')}${esc(f.to ? `to ${f.to}` : '')}</p></div>
    <div class="card">${body}</div>`;
  const actions = `${csv ? '<button class="btn secondary" id="csv">Export CSV</button>' : ''}<button class="btn secondary" id="printBtn">Print / PDF</button>`;
  if (!view(t, 'Financial reports', actions, html)) return;
  $$('[data-tab]').forEach((b) => b.addEventListener('click', () => go(`#/reports/${b.dataset.tab}`)));
  const apply = () => { S.reportFilter = { ...f, from: $('#rfrom') ? $('#rfrom').value : f.from, to: $('#rto').value, building: $('#rbld')?.value ?? f.building }; router(); };
  $('#rfrom')?.addEventListener('change', apply);
  $('#rto').addEventListener('change', apply);
  $('#rbld')?.addEventListener('change', apply);
  $('#csv')?.addEventListener('click', csv);
  $('#printBtn').addEventListener('click', () => window.print());
};

/* ---------------- activity log ---------------- */
function detailsText(d) {
  if (!d) return '';
  try {
    const o = JSON.parse(d);
    return Object.entries(o).slice(0, 8).map(([k, v]) => {
      const val = Array.isArray(v) ? `${v[0] ?? '—'} → ${v[1] ?? '—'}` : typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
      return `${human(k)}: ${String(val).slice(0, 80)}`;
    }).join(' · ');
  } catch {
    return d;
  }
}
ROUTES.audit = async (t) => {
  const rows = await api('GET', P('/audit'));
  const cols = [
    { h: 'When', v: (r) => `<span class="nowrap">${esc(fmtTime(r.at))}</span>`, csv: (r) => r.at },
    { h: 'Who', v: (r) => esc(r.user_name || 'system') },
    { h: 'Action', v: (r) => `<b>${esc(human(r.action))}</b> ${esc(r.entity)}${r.entity === 'voucher' && r.entity_id ? ` <a href="#/voucher/${r.entity_id}">open</a>` : ''}`, csv: (r) => `${r.action} ${r.entity} #${r.entity_id || ''}` },
    { h: 'Details', v: (r) => `<span class="small muted">${esc(detailsText(r.details))}</span>`, csv: (r) => r.details },
  ];
  const html = `<div class="info">Every change anyone makes — creating, editing, posting, reversing, uploading or deleting — is recorded here permanently. Nobody can edit this log.</div>
    <div class="card">${table(cols, rows, { empty: 'No activity yet.' })}</div>`;
  if (!view(t, 'Activity log', '<button class="btn secondary" id="csv">Export CSV</button>', html)) return;
  $('#csv').addEventListener('click', () => exportCsv('activity-log', cols, rows));
};

/* ---------------- export & backup ---------------- */
const EXCEL_SHEETS = ['Summary', 'Projects', 'Owners', 'Chart of Accounts', 'Journal Vouchers', 'Debit & Credit Lines', 'Trial Balance',
  'Buildings', 'Units & Sales', 'Suppliers & Contacts', 'Budget vs Actual', 'Timeline', 'Documents & Receipts', 'Activity Log'];

async function buildWorkbook(quiet) {
  const { sheets } = await api('GET', `/api/export${quiet ? '?quiet=1' : ''}`);
  return window.XlsxLite.build(sheets);
}

// Keeps an Excel copy on this computer up to date after every change (Chrome/Edge on a computer).
const excelAutoSave = {
  supported: typeof window.showSaveFilePicker === 'function',
  handle: null,
  state: 'off', // off | on | needs-permission | error
  lastSaved: null,
  timer: null,
  async init() {
    if (!LOCAL || !this.supported) return;
    this.handle = (await window.LocalBackend.getSetting('excelFile')) || null;
    if (this.handle) this.state = (await this.handle.queryPermission({ mode: 'readwrite' })) === 'granted' ? 'on' : 'needs-permission';
    this.renderBadge();
  },
  async choose() {
    const handle = await window.showSaveFilePicker({
      suggestedName: 'Biyada Estate.xlsx',
      types: [{ description: 'Excel workbook', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
    });
    this.handle = handle;
    await window.LocalBackend.setSetting('excelFile', handle);
    this.state = 'on';
    await this.write();
  },
  async reconnect() {
    if (!this.handle) return;
    this.state = (await this.handle.requestPermission({ mode: 'readwrite' })) === 'granted' ? 'on' : 'needs-permission';
    if (this.state === 'on') await this.write();
    this.renderBadge();
  },
  async stop() {
    this.handle = null;
    this.state = 'off';
    await window.LocalBackend.setSetting('excelFile', null);
    this.renderBadge();
  },
  schedule() {
    if (this.state !== 'on') return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.write(), 1500);
  },
  async write() {
    try {
      const blob = await buildWorkbook(true);
      const w = await this.handle.createWritable();
      await w.write(blob);
      await w.close();
      this.lastSaved = new Date();
      this.state = 'on';
    } catch (err) {
      this.state = 'error';
      this.error = err.message;
    }
    this.renderBadge();
  },
  renderBadge() {
    let el = $('#excelBadge');
    if (!el) {
      el = document.createElement('button');
      el.id = 'excelBadge';
      el.className = 'btn ghost small';
      el.style.cssText = 'margin:0 10px 8px;justify-content:flex-start';
      el.addEventListener('click', () => (this.state === 'needs-permission' ? this.reconnect() : go('#/export')));
      $('.sidebar-foot').before(el);
    }
    el.hidden = this.state === 'off';
    el.textContent = {
      on: `✓ Excel copy up to date${this.lastSaved ? ` (${this.lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}`,
      'needs-permission': '⚠ Click to resume Excel auto-save',
      error: '⚠ Excel copy could not be saved',
      off: '',
    }[this.state];
  },
};

ROUTES.export = async (t) => {
  const info = LOCAL ? await window.LocalBackend.storageInfo() : null;
  const mb = (n) => (n == null ? '—' : `${(n / 1024 / 1024).toFixed(1)} MB`);
  const html = `
    <div class="card"><h3>Export everything to Excel</h3>
      <p class="muted small">One workbook with a separate sheet for every category, ready to open in Excel, Google Sheets or Numbers, or to import into another system later.</p>
      <p class="small">${EXCEL_SHEETS.map((n) => `<span class="badge" style="margin:0 4px 4px 0">${esc(n)}</span>`).join('')}</p>
      <button class="btn" id="excelNow">⤓ Download Excel workbook</button></div>
    ${LOCAL ? `
    <div class="card"><h3>Automatic Excel copy on this computer</h3>
      ${excelAutoSave.supported ? `
        <p class="muted small">Choose where to keep an Excel file (for example in Documents or a OneDrive / Google Drive folder). It is rewritten automatically after every change, so you always have an up-to-date spreadsheet of everything.</p>
        <p>Status: <b>${{ off: 'Off', on: `On${excelAutoSave.handle ? ` — saving to “${esc(excelAutoSave.handle.name)}”` : ''}`, 'needs-permission': 'Paused — click Resume (the browser asks once per visit)', error: `Problem: ${esc(excelAutoSave.error || '')}` }[excelAutoSave.state]}</b>
          ${excelAutoSave.lastSaved ? `<span class="muted small"> · last saved ${esc(excelAutoSave.lastSaved.toLocaleTimeString())}</span>` : ''}</p>
        <div class="filters">
          <button class="btn secondary" id="excelChoose">${excelAutoSave.handle ? 'Choose a different file' : 'Choose Excel file location'}</button>
          ${excelAutoSave.state === 'needs-permission' ? '<button class="btn" id="excelResume">Resume auto-save</button>' : ''}
          ${excelAutoSave.handle ? '<button class="btn danger" id="excelStop">Stop auto-save</button>' : ''}
        </div>`
        : '<p class="muted small">Automatic saving to a file works in Chrome or Edge on a computer. On this browser, use “Download Excel workbook” above whenever you want a copy.</p>'}
    </div>
    <div class="card"><h3>Full backup</h3>
      <p class="muted small">A single file with absolutely everything, including receipts and documents. Keep it somewhere safe (email it to yourself, or save it to a USB drive or cloud folder). Use it to move to a new computer, or to recover if this browser's data is ever cleared.</p>
      <div class="filters"><button class="btn" id="backupNow">⤓ Download backup file</button>
        <button class="btn secondary" id="restoreBtn">Restore from backup…</button><input type="file" id="restoreFile" accept=".biyada,.sqlite,.db" hidden></div>
    </div>
    <div class="card"><h3>Where your data is saved</h3>
      <p class="muted small">Everything you enter is saved automatically on <b>this device, in this browser</b>. Nothing is sent to the internet. Closing the app or restarting the computer keeps everything.</p>
      <div class="voucher-meta">
        <div><span>Space used</span>${mb(info.usage)}</div>
        <div><span>Space available</span>${mb(info.quota)}</div>
        <div><span>Protected from automatic clean-up</span>${info.persisted ? badge('good', 'Yes') : badge('warn', 'Not confirmed')}</div>
      </div>
      <p class="muted small">Important: clearing this browser's “site data / cookies” erases it. Keep a recent backup or the automatic Excel copy, just in case.</p>
    </div>` : can('admin') ? `
    <div class="card"><h3>Backup</h3><p class="muted small">Download a complete copy of all records (JSON).</p><a class="btn secondary" href="/api/backup">Download backup</a></div>` : ''}`;
  if (!view(t, 'Export & Backup', '', html)) return;
  $('#excelNow').addEventListener('click', async (e) => {
    e.target.disabled = true;
    try {
      downloadBlob(await buildWorkbook(false), `Biyada Estate ${today()}.xlsx`);
      toast('Excel workbook downloaded.');
    } catch (err) { toast(err.message, true); } finally { e.target.disabled = false; }
  });
  $('#excelChoose')?.addEventListener('click', async () => {
    try { await excelAutoSave.choose(); toast('Excel auto-save is on.'); router(); } catch (err) { if (err.name !== 'AbortError') toast(err.message, true); }
  });
  $('#excelResume')?.addEventListener('click', async () => { await excelAutoSave.reconnect(); router(); });
  $('#excelStop')?.addEventListener('click', async () => { await excelAutoSave.stop(); toast('Excel auto-save stopped.'); router(); });
  $('#backupNow')?.addEventListener('click', async () => {
    await window.LocalBackend.flush();
    downloadBlob(new Blob([window.LocalBackend.backupBytes()], { type: 'application/octet-stream' }), `Biyada Estate backup ${today()}.biyada`);
    toast('Backup downloaded.');
  });
  $('#restoreBtn')?.addEventListener('click', () => $('#restoreFile').click());
  $('#restoreFile')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    confirmModal('Restore from backup', `Replace <b>everything</b> on this device with the contents of “${esc(file.name)}”? Anything entered after that backup was made will be lost.`, async () => {
      await window.LocalBackend.restore(new Uint8Array(await file.arrayBuffer()));
      toast('Backup restored.');
      setTimeout(() => location.reload(), 600);
    }, 'Restore');
  });
};

/* ---------------- settings ---------------- */
ROUTES.settings = async (t) => {
  // Team features (users, share links, guests) only exist in the online version.
  const team = can('admin') && !LOCAL;
  const users = team ? await api('GET', '/api/users') : [];
  if (team) S.guestEnabled = (await api('GET', '/api/setup')).guestEnabled;
  const links = team ? await api('GET', '/api/access-links') : [];
  const p = S.project;
  const html = `
    ${p ? `<div class="card"><div class="card-head"><h3>Project details</h3>${can('admin') ? '<button class="btn secondary small" id="editProj">Edit</button>' : ''}</div>
      <div class="voucher-meta">${PROJECT_FIELDS.map((f) => `<div><span>${esc(f.l || human(f.k))}</span>${f.t === 'money' ? money(p[f.k]) : esc(f.t === 'select' ? human(p[f.k]) : p[f.k]) || '—'}</div>`).join('')}</div></div>
    <div class="card"><h3>Lock the books</h3>
      <p class="muted small">After a period is closed and checked (for example, at month end), lock it so nobody can post or reverse entries dated on or before the lock date.</p>
      ${can('admin') ? `<div class="filters"><input type="date" id="lockDate" value="${esc(p.lock_date || '')}"><button class="btn secondary" id="saveLock">Save lock date</button></div>` : `<p>Current lock date: <b>${esc(p.lock_date || 'none')}</b></p>`}
    </div>` : ''}
    ${team ? `<div class="card"><div class="card-head"><h3>Users & access</h3><div style="display:flex;gap:6px"><button class="btn small" id="inviteLink">＋ Invite link</button><button class="btn secondary small" id="newUser">＋ Create user</button></div></div>
      <p class="muted small">Viewer: can see everything, cannot change anything. Accountant: records vouchers, receipts, owners, buildings. Admin: everything, including users, projects and backups.</p>
      ${table([
        { h: 'Name', v: (u) => `<b>${esc(u.name)}</b><div class="muted small">${esc(u.username)}${u.email ? ` · ${esc(u.email)}` : ''}</div>` },
        { h: 'Role', v: (u) => esc(human(u.role)) },
        { h: 'Status', v: (u) => (u.active ? badge('good', 'Active') : badge('bad', 'Disabled')) },
      ], users, { clickable: true })}</div>
    <div class="card"><div class="card-head"><h3>Share links (no sign-in)</h3><button class="btn small" id="newAccess">＋ New share link</button></div>
      <p class="muted small">Whoever opens a share link goes straight into the app, with no account or password. Make one per person so the activity log shows who did what. Turn a link off any time.</p>
      ${table([
        { h: 'For', v: (l) => `<b>${esc(l.name)}</b>` },
        { h: 'Access', v: (l) => esc(human(l.role)) },
        { h: 'Created', v: (l) => esc(fmtTime(l.created_at)) },
        { h: 'Status', v: (l) => (l.revoked_at ? badge('bad', 'Turned off') : badge('good', 'Active')) },
        { h: '', v: (l) => (l.revoked_at ? '' : `<button class="btn danger small" data-revoke="${l.id}">Turn off</button>`) },
      ], links, { empty: 'No share links yet.' })}</div>
    <div class="card"><h3>Guest access</h3>
      <p class="muted small">Lets anyone with the link click “Try as guest” and explore the sample Demo Compound. Guests can never see your real projects.</p>
      <label class="check"><input type="checkbox" id="guestToggle"${S.guestEnabled ? ' checked' : ''}> Allow “Try as guest”</label>
      <button class="btn secondary small" id="resetDemo" style="margin-top:10px">Reset demo data</button></div>
    <div class="card"><h3>Backup</h3><p class="muted small">Download a complete copy of the database (all projects, vouchers and records). Keep a copy somewhere safe regularly. Receipts and documents are stored safely inside the app; download them from Documents.</p>
      <a class="btn secondary" href="/api/backup">Download backup</a></div>` : ''}
    ${can('admin') ? `<div class="card"><h3>Projects</h3><p class="muted small">Each new compound gets its own owners, accounts, vouchers and documents.</p>
      <button class="btn secondary" id="newProject">＋ New project</button></div>` : ''}
    ${LOCAL ? `<div class="card"><h3>Your name</h3><p class="muted small">Shown on vouchers you prepare and in the activity log.</p>
      <div class="filters"><input id="myName" value="${esc(S.user.name)}" style="max-width:260px"><button class="btn secondary" id="saveName">Save</button></div></div>
    <div class="card"><h3>Your data</h3><p class="muted small">Everything is saved on this device only. Export it to Excel or make a backup on the <a href="#/export">Export & Backup</a> page.</p></div>` : ''}
    ${S.user.is_guest || LOCAL ? '' : `<div class="card"><h3>My account</h3><p class="muted small">Signed in as <b>${esc(S.user.name)}</b> (${esc(S.user.username)}, ${esc(human(S.user.role))}).</p>
      <button class="btn secondary" id="changePw">Change password</button></div>`}`;
  if (!view(t, 'Settings', '', html)) return;
  $('#editProj')?.addEventListener('click', () => openModal({
    title: 'Edit project', body: formHtml([...PROJECT_FIELDS, { k: 'archived', l: 'Archived (finished project)', t: 'check' }], p),
    onSubmit: async (root) => {
      await api('PUT', `/api/projects/${p.id}`, readForm(root, [...PROJECT_FIELDS, { k: 'archived', t: 'check' }]));
      await reloadProjects(); toast('Saved.'); router();
    },
  }));
  $('#saveLock')?.addEventListener('click', async () => {
    try {
      await api('PUT', `/api/projects/${p.id}`, { lock_date: $('#lockDate').value || null });
      await reloadProjects(); toast('Lock date saved.');
    } catch (e) { toast(e.message, true); }
  });
  $('#newProject')?.addEventListener('click', projectForm);
  const userFields = (u) => [
    { k: 'name', l: 'Full name', req: 1 },
    ...(u ? [] : [{ k: 'username', req: 1 }]),
    { k: 'email', t: 'email' },
    { k: 'role', t: 'select', opts: enumOpts('role'), def: 'viewer', req: 1 },
    { k: 'password', l: u ? 'New password (leave blank to keep)' : 'Temporary password (min 8)', t: 'text', req: !u },
    ...(u ? [{ k: 'active', t: 'check', def: 1 }] : []),
  ];
  const userForm = (u) => openModal({
    title: u ? `Edit ${u.name}` : 'Invite user',
    body: `${u ? '' : '<p class="muted small">Create the account, then share the web address, username and temporary password with them.</p>'}${formHtml(userFields(u), u || {})}`,
    onSubmit: async (root) => {
      const data = readForm(root, userFields(u));
      if (u && !data.password) delete data.password;
      if (u) await api('PUT', `/api/users/${u.id}`, data); else await api('POST', '/api/users', data);
      toast('Saved.'); router();
    },
  });
  $('#newUser')?.addEventListener('click', () => userForm(null));
  const showLink = (title, link, note) => setTimeout(() => openModal({
    title,
    body: `<p>${note}</p><input id="shareUrl" readonly value="${esc(link)}" style="font-family:monospace;font-size:12px">
      <button type="button" class="btn" id="copyShare" style="margin-top:10px">Copy link</button>`,
    onOpen: (r) => $('#copyShare', r).addEventListener('click', async () => {
      const inp = $('#shareUrl', r); inp.select();
      try { await navigator.clipboard.writeText(inp.value); } catch { document.execCommand('copy'); }
      toast('Link copied.');
    }),
  }), 0);
  $('#newAccess')?.addEventListener('click', () => {
    const fields = [
      { k: 'name', l: 'Who is this link for?', req: 1, hint: 'e.g. Manal' },
      { k: 'role', t: 'select', opts: enumOpts('role'), def: 'accountant', req: 1, hint: 'Accountant can record entries; Viewer can only look; Admin can do everything.' },
    ];
    openModal({
      title: 'New share link', body: formHtml(fields), submit: 'Create link',
      onSubmit: async (root) => {
        const f = readForm(root, fields);
        const { token } = await api('POST', '/api/access-links', f);
        router();
        showLink(`Share link for ${f.name}`, `${location.origin}/#/k/${token}`, 'Send this link. Opening it goes straight into the app — keep it private, like a key. This is the only time it is shown.');
      },
    });
  });
  $$('[data-revoke]').forEach((b) => b.addEventListener('click', () => confirmModal('Turn off link', 'Whoever has this link will be signed out and it will stop working. Continue?', async () => {
    await api('DELETE', `/api/access-links/${b.dataset.revoke}`);
    toast('Link turned off.');
    router();
  }, 'Turn off')));
  $('#inviteLink')?.addEventListener('click', () => {
    const fields = [{ k: 'role', t: 'select', opts: enumOpts('role'), def: 'accountant', req: 1, hint: 'Accountant can record entries; Viewer can only look; Admin can do everything.' }];
    openModal({
      title: 'Invite a colleague',
      body: `<p class="muted small">Create a link and send it to your colleague (WhatsApp, email…). They open it and create their own account. Each link works once and expires in 14 days.</p>${formHtml(fields)}`,
      submit: 'Create link',
      onSubmit: async (root) => {
        const { token } = await api('POST', '/api/invites', readForm(root, fields));
        const link = `${location.origin}/#/join/${token}`;
        setTimeout(() => openModal({
          title: 'Invite link ready',
          body: `<p>Send this link to your colleague:</p><input id="inviteUrl" readonly value="${esc(link)}" style="font-family:monospace;font-size:12px">
            <button type="button" class="btn" id="copyInvite" style="margin-top:10px">Copy link</button>`,
          onOpen: (r) => {
            $('#copyInvite', r).addEventListener('click', async () => {
              const inp = $('#inviteUrl', r); inp.select();
              try { await navigator.clipboard.writeText(inp.value); } catch { document.execCommand('copy'); }
              toast('Link copied.');
            });
          },
        }), 0);
      },
    });
  });
  if (can('admin')) onRows($('#main'), users, userForm);
  $('#resetDemo')?.addEventListener('click', () => confirmModal('Reset demo data', 'Erase everything guests did in the Demo Compound and rebuild the sample data? Your real projects are not affected.', async () => {
    await api('POST', '/api/demo/reset');
    await reloadProjects();
    if (!S.projects.find((x) => x.id === S.pid)) await selectProject(S.projects.find((x) => !x.is_demo)?.id || S.projects[0]?.id || null);
    toast('Demo data reset.');
    router();
  }, 'Reset'));
  $('#guestToggle')?.addEventListener('change', async (e) => {
    try {
      await api('PUT', '/api/settings', { guest_enabled: e.target.checked });
      toast(e.target.checked ? 'Guest access on.' : 'Guest access off.');
    } catch (err) { toast(err.message, true); e.target.checked = !e.target.checked; }
  });
  $('#saveName')?.addEventListener('click', async () => {
    try {
      await api('PUT', '/api/me', { name: $('#myName').value });
      S.user = await api('GET', '/api/me');
      $('#whoami').innerHTML = `<b>${esc(S.user.name)}</b><br><span class="muted">Saved on this device</span>`;
      toast('Saved.');
    } catch (err) { toast(err.message, true); }
  });
  $('#changePw')?.addEventListener('click', () => {
    const fields = [{ k: 'current', l: 'Current password', t: 'password', req: 1 }, { k: 'password', l: 'New password (min 8)', t: 'password', req: 1 }];
    openModal({
      title: 'Change password', body: formHtml(fields),
      onSubmit: async (root) => { await api('POST', '/api/me/password', readForm(root, fields)); toast('Password changed.'); },
    });
  });
};

if (LOCAL) {
  window.LocalBackend.ready.then(boot).catch((err) => {
    $('#auth').hidden = false;
    $('#auth').innerHTML = `<div class="card"><div class="brand"><img src="icon.svg" alt="" width="32" height="32"> Biyada Estate</div>
      <div class="error">The app could not open its storage on this device: ${esc(err.message)}</div>
      <p class="muted small">Use Chrome, Edge or Safari, and make sure the browser is not in private/incognito mode.</p></div>`;
  });
  window.LocalBackend.onChange((e) => {
    if (e.type === 'save-error') toast('Could not save on this device. Free some space and try again.', true);
    else excelAutoSave.schedule();
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
} else {
  boot().catch(() => showAuth());
}
