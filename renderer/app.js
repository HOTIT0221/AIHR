'use strict';

/* Edit this list to change the available states (key must stay stable once used). */
const STATES = [
  { key: 'new',        label: 'New',            color: '#94a3b8' },
  { key: 'preparing',  label: 'Preparing',      color: '#60a5fa' },
  { key: 'inprogress', label: 'In Progress',    color: '#a78bfa' },
  { key: 'waiting',    label: 'Waiting Result', color: '#fbbf24' },
  { key: 'approved',   label: 'Approved',       color: '#34d399' },
  { key: 'rejected',   label: 'Rejected',       color: '#f87171' },
  { key: 'onhold',     label: 'On Hold',        color: '#fb923c' },
  { key: 'inactive',   label: 'Inactive',       color: '#64748b' },
];
const STATE_MAP = Object.fromEntries(STATES.map((s) => [s.key, s]));
const stateOf = (key) => STATE_MAP[key] || STATES[0];

/* ───────────── Icons (lucide-style) ───────────── */
const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="m3 3 18 18"/><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
  linkedin: '<rect x="2" y="2" width="20" height="20" rx="4"/><path d="M7 10v7M7 7v.01M11 17v-4a2 2 0 0 1 4 0v4M11 10v7"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  sheet: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8M10 9H8"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  searchX: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8.5 8.5l5 5M13.5 8.5l-5 5"/>',
};
const icon = (name) =>
  `<span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg></span>`;
function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    el.outerHTML = icon(el.dataset.icon);
  });
}

/* ───────────── Helpers ───────────── */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const dayDiff = (s) => Math.round((parseISO(s) - parseISO(todayISO())) / 86400000);
const fmtDate = (s) => parseISO(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

function relDate(s) {
  const d = dayDiff(s);
  if (d === 0) return { text: 'Today', cls: 'today' };
  if (d === 1) return { text: 'Tomorrow', cls: 'future' };
  if (d > 1) return { text: `In ${d} days`, cls: 'future' };
  const a = -d;
  if (a === 1) return { text: 'Yesterday', cls: '' };
  if (a < 30) return { text: `${a} days ago`, cls: '' };
  if (a < 365) { const m = Math.round(a / 30.4); return { text: `${m} month${m > 1 ? 's' : ''} ago`, cls: '' }; }
  const y = Math.floor(a / 365);
  return { text: `${y} year${y > 1 ? 's' : ''} ago`, cls: '' };
}

function relTime(ts) {
  if (!ts) return '';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24); if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const initials = (name) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
const hue = (str) => { let h = 0; for (const ch of str || '') h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };

function normalizeUrl(u) {
  u = (u || '').trim();
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/+/, '')}`;
}
function linkedinHandle(u) {
  const m = u.match(/linkedin\.com\/(?:in|pub)\/([^/?#]+)/i);
  if (m) { try { return decodeURIComponent(m[1]); } catch { return m[1]; } }
  return u.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
}
const formatAnydesk = (id) => {
  const digits = String(id || '').replace(/\s+/g, '');
  return /^\d{7,}$/.test(digits) ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : String(id || '');
};
const isTaken = (date) => !!date && dayDiff(date) <= 0;
const isScheduled = (date) => !!date && dayDiff(date) > 0;

/* ───────────── State ───────────── */
let data = { collaborators: [] };
const ui = {
  search: '',
  filter: 'all',
  sortKey: 'updatedAt',
  sortDir: 'desc',
  revealed: new Set(),
  editingId: null,
  formState: 'new',
  firstRender: true,
};

/* Every change is written to SQLite immediately, one row at a time.
   The UI updates first; if the database rejects a change we reload from it so the screen never lies. */
async function reloadFromDb() {
  const res = await window.api.list();
  if (res?.ok) data.collaborators = res.collaborators;
  render();
}
async function saveOne(c) {
  const res = await window.api.upsert(c);
  if (!res?.ok) {
    toast(`Could not save: ${res?.error || 'unknown error'}`, { type: 'error' });
    await reloadFromDb();
    return false;
  }
  Object.assign(c, res.collaborator);
  return true;
}
async function removeOne(id) {
  const res = await window.api.remove(id);
  if (!res?.ok) {
    toast(`Could not delete: ${res?.error || 'unknown error'}`, { type: 'error' });
    await reloadFromDb();
    return false;
  }
  return true;
}
const findById = (id) => data.collaborators.find((c) => c.id === id);

/* ───────────── Rendering ───────────── */
function render() {
  renderStats();
  renderFilters();
  renderTable();
}

function renderStats() {
  const list = data.collaborators;
  const total = list.length;
  const daTaken = list.filter((c) => isTaken(c.daDate)).length;
  const hsTaken = list.filter((c) => isTaken(c.hsDate)).length;
  const daSched = list.filter((c) => isScheduled(c.daDate)).length;
  const hsSched = list.filter((c) => isScheduled(c.hsDate)).length;
  const both = list.filter((c) => isTaken(c.daDate) && isTaken(c.hsDate)).length;
  const approved = list.filter((c) => c.state === 'approved').length;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

  const card = (label, ico, color, value, foot, percent) => `
    <div class="stat" style="--c:${color}">
      <div class="stat-top"><span>${label}</span><span class="stat-icon">${icon(ico)}</span></div>
      <div class="stat-value">${value}${total && percent !== null ? `<small>/ ${total}</small>` : ''}</div>
      <div class="stat-bar"><i data-w="${percent ?? 100}"></i></div>
      <div class="stat-foot">${foot}</div>
    </div>`;

  $('#stats').innerHTML =
    card('Total collaborators', 'users', '#7c6cff', total,
      `<b>${list.filter((c) => !['inactive', 'rejected'].includes(c.state)).length}</b> active`, null) +
    card('DA assessment taken', 'clipboard', '#a78bfa', daTaken,
      `<b>${pct(daTaken)}%</b> complete${daSched ? ` · <b>${daSched}</b> scheduled` : ''}`, pct(daTaken)) +
    card('HS assessment taken', 'briefcase', '#22d3ee', hsTaken,
      `<b>${pct(hsTaken)}%</b> complete${hsSched ? ` · <b>${hsSched}</b> scheduled` : ''}`, pct(hsTaken)) +
    card('Both assessments done', 'award', '#34d399', both,
      `<b>${approved}</b> marked Approved`, pct(both));

  requestAnimationFrame(() => $$('#stats .stat-bar > i').forEach((el) => { el.style.width = `${el.dataset.w}%`; }));
}

function renderFilters() {
  const counts = {};
  for (const c of data.collaborators) counts[c.state] = (counts[c.state] || 0) + 1;
  const chip = (key, label, color, count) => `
    <button class="chip ${ui.filter === key ? 'active' : ''}" data-filter="${key}" ${color ? `style="--c:${color}"` : ''}>
      ${color ? '<span class="dot"></span>' : ''}${label}<span class="count">${count}</span>
    </button>`;
  $('#filters').innerHTML =
    chip('all', 'All', null, data.collaborators.length) +
    STATES.filter((s) => counts[s.key] || ui.filter === s.key)
      .map((s) => chip(s.key, s.label, s.color, counts[s.key] || 0)).join('');
}

function visibleRows() {
  const q = ui.search.trim().toLowerCase();
  let list = data.collaborators.filter((c) => ui.filter === 'all' || c.state === ui.filter);
  if (q) {
    list = list.filter((c) =>
      [c.name, c.contact, c.linkedin, c.anydeskId, c.notes, stateOf(c.state).label]
        .some((v) => String(v || '').toLowerCase().includes(q) ||
          (v === c.anydeskId && String(v || '').replace(/\s/g, '').includes(q.replace(/\s/g, '')))));
  }
  const dir = ui.sortDir === 'asc' ? 1 : -1;
  const key = ui.sortKey;
  const stateIdx = (k) => STATES.findIndex((s) => s.key === k);
  return list.sort((a, b) => {
    if (key === 'daDate' || key === 'hsDate') {
      // Empty dates always sink to the bottom.
      if (!a[key] && !b[key]) return a.name.localeCompare(b.name);
      if (!a[key]) return 1;
      if (!b[key]) return -1;
      return a[key].localeCompare(b[key]) * dir;
    }
    if (key === 'name') return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) * dir;
    if (key === 'state') return (stateIdx(a.state) - stateIdx(b.state)) * dir || a.name.localeCompare(b.name);
    return ((a.updatedAt || 0) - (b.updatedAt || 0)) * dir;
  });
}

function dateCell(s) {
  if (!s) return '<span class="not-taken">Not taken</span>';
  const r = relDate(s);
  return `<div class="date ${r.cls}"><span class="date-main">${fmtDate(s)}</span><span class="date-rel">${r.text}</span></div>`;
}

function rowHtml(c) {
  const st = stateOf(c.state);
  const li = c.linkedin
    ? `<button class="li-link" data-act="linkedin" title="Click to copy: ${esc(c.linkedin)}">${icon('linkedin')}<span>${esc(linkedinHandle(c.linkedin))}</span></button>`
    : '<span class="empty">—</span>';
  const contact = c.contact
    ? `<div class="cell-copy"><span class="val" title="${esc(c.contact)}">${esc(c.contact)}</span>
         <button class="icon-btn sm" data-act="copy" data-field="contact" title="Copy contact">${icon('copy')}</button></div>`
    : '<span class="empty">—</span>';
  const adId = c.anydeskId
    ? `<div class="cell-copy"><span class="val mono">${esc(formatAnydesk(c.anydeskId))}</span>
         <button class="icon-btn sm" data-act="copy" data-field="anydeskId" title="Copy AnyDesk ID">${icon('copy')}</button></div>`
    : '<span class="empty">—</span>';
  const shown = ui.revealed.has(c.id);
  const pw = c.anydeskPassword
    ? `<div class="cell-copy">
         <span class="val mono ${shown ? '' : 'pw-mask'}">${shown ? esc(c.anydeskPassword) : '••••••'}</span>
         <button class="icon-btn sm ${shown ? 'keep' : ''}" data-act="reveal" title="${shown ? 'Hide' : 'Show'} password">${icon(shown ? 'eyeOff' : 'eye')}</button>
         <button class="icon-btn sm" data-act="copy" data-field="anydeskPassword" title="Copy password">${icon('copy')}</button>
       </div>`
    : '<span class="empty">—</span>';
  const notes = c.notes
    ? `<span class="truncate" title="${esc(c.notes)}">${esc(c.notes)}</span>`
    : '<span class="empty">—</span>';

  return `<tr data-id="${esc(c.id)}">
    <td><div class="person">
      <div class="avatar" style="--h:${hue(c.name)}">${esc(initials(c.name))}</div>
      <div class="person-text"><div class="name" title="${esc(c.name)}">${esc(c.name)}</div>
      <div class="sub">Updated ${relTime(c.updatedAt)}</div></div>
    </div></td>
    <td>${li}</td>
    <td>${contact}</td>
    <td>${dateCell(c.daDate)}</td>
    <td>${dateCell(c.hsDate)}</td>
    <td>${adId}</td>
    <td>${pw}</td>
    <td><button class="pill" data-act="state" style="--c:${st.color}"><span class="dot"></span>${esc(st.label)}${icon('chevron')}</button></td>
    <td class="notes-cell">${notes}</td>
    <td><div class="row-actions">
      <button class="icon-btn sm" data-act="edit" title="Edit">${icon('edit')}</button>
      <button class="icon-btn sm danger" data-act="delete" title="Delete">${icon('trash')}</button>
    </div></td>
  </tr>`;
}

function renderTable(flashId) {
  const rows = visibleRows();
  const tbody = $('#rows');
  tbody.classList.toggle('animate', ui.firstRender);
  tbody.innerHTML = rows.map(rowHtml).join('');
  if (ui.firstRender) {
    $$('tr', tbody).forEach((tr, i) => { tr.style.animationDelay = `${Math.min(i * 25, 400)}ms`; });
    ui.firstRender = false;
  }
  if (flashId) {
    const tr = tbody.querySelector(`tr[data-id="${CSS.escape(flashId)}"]`);
    if (tr) { tr.classList.add('flash'); tr.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }

  const empty = $('#empty');
  if (!data.collaborators.length) {
    empty.hidden = false;
    empty.innerHTML = `<div class="big">${icon('users')}</div><h3>No collaborators yet</h3>
      <p>Add the people you're helping with DataAnnotation and Handshake assessments.</p>
      <button class="btn btn-primary" data-act="add-first">${icon('plus')}Add your first collaborator</button>`;
  } else if (!rows.length) {
    empty.hidden = false;
    empty.innerHTML = `<div class="big">${icon('searchX')}</div><h3>No matches</h3>
      <p>Nothing matches the current search or filter.</p>
      <button class="btn btn-ghost" data-act="clear-filters">Clear filters</button>`;
  } else {
    empty.hidden = true;
  }

  $$('.grid th[data-sort]').forEach((th) => {
    const active = th.dataset.sort === ui.sortKey;
    th.classList.toggle('sorted', active);
    th.classList.toggle('asc', active && ui.sortDir === 'asc');
  });

  const total = data.collaborators.length;
  $('#foot').innerHTML = `<span>Showing <b>${rows.length}</b> of <b>${total}</b> collaborator${total === 1 ? '' : 's'}</span>
    <span>Double-click a row to edit · <kbd>Ctrl N</kbd> new</span>`;
}

/* ───────────── Drawer (add / edit) ───────────── */
function renderStatePicker() {
  $('#f-state').innerHTML = STATES.map((s) => `
    <button type="button" class="state-opt ${ui.formState === s.key ? 'selected' : ''}" data-state="${s.key}" style="--c:${s.color}">
      <span class="dot"></span>${s.label}
    </button>`).join('');
}

function openDrawer(id = null) {
  closePopover();
  const c = id ? findById(id) : null;
  ui.editingId = c ? c.id : null;
  ui.formState = c ? c.state : 'new';
  const f = $('#form');
  f.reset();
  f.name.value = c?.name || '';
  f.linkedin.value = c?.linkedin || '';
  f.contact.value = c?.contact || '';
  f.daDate.value = c?.daDate || '';
  f.hsDate.value = c?.hsDate || '';
  f.anydeskId.value = c?.anydeskId || '';
  f.anydeskPassword.value = c?.anydeskPassword || '';
  f.anydeskPassword.type = 'password';
  f.notes.value = c?.notes || '';
  f.name.classList.remove('invalid');
  $('#drawer-title').textContent = c ? 'Edit collaborator' : 'Add collaborator';
  $('#drawer-sub').textContent = c
    ? `Added ${new Date(c.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}`
    : 'Fill in what you know — everything except the name is optional.';
  $('#btn-save-label').textContent = c ? 'Save changes' : 'Add collaborator';
  $('#btn-delete-in-drawer').hidden = !c;
  renderStatePicker();
  $('#drawer').classList.add('open');
  $('#drawer').setAttribute('aria-hidden', 'false');
  $('#backdrop').classList.add('open');
  setTimeout(() => f.name.focus(), 120);
}

function closeDrawer() {
  $('#drawer').classList.remove('open');
  $('#drawer').setAttribute('aria-hidden', 'true');
  $('#backdrop').classList.remove('open');
  ui.editingId = null;
}
const drawerOpen = () => $('#drawer').classList.contains('open');

async function submitForm(e) {
  e.preventDefault();
  const f = e.target;
  const name = f.name.value.trim();
  if (!name) {
    f.name.classList.add('invalid');
    f.name.focus();
    return;
  }
  const values = {
    name,
    linkedin: f.linkedin.value.trim() ? normalizeUrl(f.linkedin.value) : '',
    contact: f.contact.value.trim(),
    daDate: f.daDate.value,
    hsDate: f.hsDate.value,
    anydeskId: f.anydeskId.value.trim(),
    anydeskPassword: f.anydeskPassword.value,
    state: ui.formState,
    notes: f.notes.value.trim(),
    updatedAt: Date.now(),
  };
  const isEdit = !!ui.editingId;
  let record = isEdit && findById(ui.editingId);
  if (record) {
    Object.assign(record, values);
  } else {
    record = { id: crypto.randomUUID(), createdAt: Date.now(), ...values };
    data.collaborators.push(record);
  }
  closeDrawer();
  renderStats(); renderFilters(); renderTable(record.id);
  if (await saveOne(record)) toast(isEdit ? `Saved ${name}` : `Added ${name}`);
}

async function deleteCollaborator(id) {
  const idx = data.collaborators.findIndex((c) => c.id === id);
  if (idx < 0) return;
  const [removed] = data.collaborators.splice(idx, 1);
  ui.revealed.delete(id);
  if (drawerOpen()) closeDrawer();
  render();
  if (!(await removeOne(id))) return;
  toast(`Deleted ${removed.name}`, {
    action: {
      label: 'Undo',
      fn: async () => {
        data.collaborators.splice(Math.min(idx, data.collaborators.length), 0, removed);
        render(); renderTable(removed.id);
        await saveOne(removed);
      },
    },
  });
}

/* ───────────── Inline state popover ───────────── */
let popoverFor = null;
function openStatePopover(btn, id) {
  const pop = $('#popover');
  if (popoverFor === id && !pop.hidden) return closePopover();
  const c = findById(id);
  popoverFor = id;
  pop.innerHTML = STATES.map((s) => `
    <button class="pop-item" data-state="${s.key}" style="--c:${s.color}">
      <span class="dot"></span>${s.label}${c.state === s.key ? icon('check') : ''}
    </button>`).join('');
  pop.hidden = false;
  const r = btn.getBoundingClientRect();
  const ph = pop.offsetHeight;
  const top = r.bottom + 6 + ph > window.innerHeight ? r.top - ph - 6 : r.bottom + 6;
  pop.style.top = `${Math.max(8, top)}px`;
  pop.style.left = `${Math.min(r.left, window.innerWidth - pop.offsetWidth - 8)}px`;
}
function closePopover() {
  $('#popover').hidden = true;
  popoverFor = null;
}

/* ───────────── Toasts ───────────── */
function toast(msg, { type = 'ok', action = null } = {}) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(type === 'error' ? 'alert' : 'check')}<span>${esc(msg)}</span>`;
  if (action) {
    const b = document.createElement('button');
    b.textContent = action.label;
    b.onclick = () => { action.fn(); dismiss(); };
    el.appendChild(b);
  }
  const box = $('#toasts');
  box.appendChild(el);
  while (box.children.length > 3) box.firstElementChild.remove();
  const t = setTimeout(dismiss, action ? 6000 : 2600);
  function dismiss() {
    clearTimeout(t);
    el.classList.add('out');
    setTimeout(() => el.remove(), 220);
  }
}

/* ───────────── Theme ───────────── */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('theme', theme);
  $('#btn-theme').innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
  window.api.setTheme(theme);
}

/* ───────────── Import / export ───────────── */
function toCsv() {
  const cols = [
    ['Name', 'name'], ['LinkedIn', 'linkedin'], ['Contact', 'contact'],
    ['DA Assessment Date', 'daDate'], ['HS Assessment Date', 'hsDate'],
    ['AnyDesk ID', 'anydeskId'], ['AnyDesk Password', 'anydeskPassword'],
    ['State', (c) => stateOf(c.state).label], ['Notes', 'notes'],
  ];
  const cell = (v) => {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.map(([h]) => cell(h)).join(',')];
  for (const c of visibleRows()) {
    lines.push(cols.map(([, k]) => cell(typeof k === 'function' ? k(c) : c[k])).join(','));
  }
  return '﻿' + lines.join('\r\n');
}

async function exportCsv() {
  const res = await window.api.saveFile({
    defaultName: `collaborators-${todayISO()}.csv`,
    content: toCsv(),
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (res.ok) toast('Exported CSV');
}

async function backup() {
  const res = await window.api.backup(todayISO());
  if (res.canceled) return;
  if (!res.ok) return toast(`Backup failed: ${res.error}`, { type: 'error' });
  toast('Backup saved');
}

async function restore() {
  const res = await window.api.restore();
  if (res.canceled) return;
  if (!res.ok) return toast(`Import failed: ${res.error}`, { type: 'error' });
  data.collaborators = res.collaborators;
  render();
  toast(`Imported: ${res.added} added, ${res.updated} updated${res.skipped ? `, ${res.skipped} skipped` : ''}`);
}

/* ───────────── Events ───────────── */
function bindEvents() {
  $('#btn-add').addEventListener('click', () => openDrawer());
  $('#backdrop').addEventListener('click', closeDrawer);
  $$('[data-close]').forEach((b) => b.addEventListener('click', closeDrawer));
  $('#form').addEventListener('submit', submitForm);
  $('#f-name').addEventListener('input', (e) => e.target.classList.remove('invalid'));
  $('#btn-delete-in-drawer').addEventListener('click', () => ui.editingId && deleteCollaborator(ui.editingId));

  $('#f-state').addEventListener('click', (e) => {
    const b = e.target.closest('[data-state]');
    if (!b) return;
    ui.formState = b.dataset.state;
    renderStatePicker();
  });
  $('#form').addEventListener('click', (e) => {
    const t = e.target.closest('[data-today],[data-clear]');
    if (!t) return;
    const input = document.getElementById(t.dataset.today || t.dataset.clear);
    input.value = t.dataset.today ? todayISO() : '';
  });
  $('#f-adpw-toggle').addEventListener('click', (e) => {
    const input = $('#f-adpw');
    input.type = input.type === 'password' ? 'text' : 'password';
    e.currentTarget.innerHTML = icon(input.type === 'password' ? 'eye' : 'eyeOff');
  });

  let searchTimer;
  $('#search').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { ui.search = e.target.value; renderTable(); }, 80);
  });

  $('#filters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    ui.filter = ui.filter === b.dataset.filter ? 'all' : b.dataset.filter;
    renderFilters(); renderTable();
  });

  $('.grid thead').addEventListener('click', (e) => {
    const th = e.target.closest('th[data-sort]');
    if (!th) return;
    const key = th.dataset.sort;
    if (ui.sortKey === key) ui.sortDir = ui.sortDir === 'asc' ? 'desc' : 'asc';
    else { ui.sortKey = key; ui.sortDir = key === 'name' || key === 'state' ? 'asc' : 'desc'; }
    renderTable();
  });
  $$('.grid th[data-sort]').forEach((th) => th.insertAdjacentHTML('beforeend', `<span class="sort-ind">${icon('arrowDown')}</span>`));
  $$('.grid th .sort-ind .ico').forEach((i) => { i.style.width = '12px'; i.style.height = '12px'; i.style.verticalAlign = '-2px'; });

  $('#rows').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.closest('tr')?.dataset.id;
    const c = findById(id);
    if (!c) return;
    switch (btn.dataset.act) {
      case 'copy': {
        await window.api.copy(c[btn.dataset.field]);
        const labels = { contact: 'contact', anydeskId: 'AnyDesk ID', anydeskPassword: 'AnyDesk password' };
        toast(`Copied ${labels[btn.dataset.field]}`);
        break;
      }
      case 'reveal':
        ui.revealed.has(id) ? ui.revealed.delete(id) : ui.revealed.add(id);
        renderTable();
        break;
      case 'linkedin':
        await window.api.copy(normalizeUrl(c.linkedin));
        toast('Copied LinkedIn URL');
        break;
      case 'state':
        e.stopPropagation();
        openStatePopover(btn, id);
        break;
      case 'edit':
        openDrawer(id);
        break;
      case 'delete':
        deleteCollaborator(id);
        break;
    }
  });
  $('#rows').addEventListener('dblclick', (e) => {
    if (e.target.closest('button')) return;
    const id = e.target.closest('tr')?.dataset.id;
    if (id) openDrawer(id);
  });

  $('#empty').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'add-first') openDrawer();
    if (b.dataset.act === 'clear-filters') {
      ui.search = ''; ui.filter = 'all'; $('#search').value = '';
      renderFilters(); renderTable();
    }
  });

  $('#popover').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-state]');
    if (!b || !popoverFor) return;
    const c = findById(popoverFor);
    closePopover();
    if (!c || c.state === b.dataset.state) return;
    c.state = b.dataset.state;
    c.updatedAt = Date.now();
    renderStats(); renderFilters(); renderTable(c.id);
    if (await saveOne(c)) toast(`${c.name} → ${stateOf(c.state).label}`);
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#popover') && !e.target.closest('[data-act="state"]')) closePopover();
  });
  $('.table-scroll').addEventListener('scroll', closePopover, { passive: true });
  window.addEventListener('resize', closePopover);

  $('#btn-theme').addEventListener('click', () =>
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  $('#btn-export-csv').addEventListener('click', exportCsv);
  $('#btn-backup').addEventListener('click', backup);
  $('#btn-restore').addEventListener('click', restore);

  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (e.key === 'Escape') {
      if (!$('#popover').hidden) return closePopover();
      if (drawerOpen()) return closeDrawer();
      if (document.activeElement === $('#search') && ui.search) {
        $('#search').value = ''; ui.search = ''; renderTable();
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && k === 'n') { e.preventDefault(); openDrawer(); }
    if ((e.ctrlKey || e.metaKey) && k === 'f' && !drawerOpen()) { e.preventDefault(); $('#search').focus(); $('#search').select(); }
    if ((e.ctrlKey || e.metaKey) && k === 's' && drawerOpen()) { e.preventDefault(); $('#form').requestSubmit(); }
  });

  // Keep relative dates ("2 days ago", "Today") fresh if the app stays open.
  setInterval(() => { if (!drawerOpen()) { renderStats(); renderTable(); } }, 5 * 60 * 1000);
}

/* ───────────── Boot ───────────── */
(async function init() {
  hydrateIcons();
  applyTheme(localStorage.getItem('theme') || 'dark');
  const loaded = await window.api.list();
  data = { collaborators: loaded?.ok ? loaded.collaborators : [] };
  bindEvents();
  render();
  if (!loaded?.ok) toast(`Could not load data: ${loaded?.error || 'unknown error'}`, { type: 'error' });
  else if (loaded.notice) toast(loaded.notice);
})();
