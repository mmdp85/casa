/* ==========================================================================
   Depto nuevo — modelo de datos, guardado local y sincronización con GitHub
   Todo vive en un único JSON: { items, rooms, settings }.
   Los tres tableros (gastos, pendientes, ambientes) son vistas de esa base.
   ========================================================================== */
(function () {
  const LS_DATA = 'casa.data.v1';
  const LS_CFG = 'casa.cfg.v1';
  const LS_TC = 'casa.tc.v1';

  /* ---------- Catálogos ---------- */
  const STAGES = {
    compra: [
      { id: 'idea', label: 'Idea' },
      { id: 'cotizando', label: 'Cotizando' },
      { id: 'decidido', label: 'Decidido' },
      { id: 'comprado', label: 'Comprado' },
      { id: 'entregado', label: 'Entregado' },
      { id: 'instalado', label: 'Instalado' }
    ],
    tarea: [
      { id: 'pendiente', label: 'Pendiente' },
      { id: 'agendado', label: 'Agendado' },
      { id: 'hecho', label: 'Hecho' }
    ]
  };
  const COLUMNS = [
    { id: 'definir', label: 'Por decidir', stages: ['idea', 'cotizando', 'pendiente'] },
    { id: 'decidido', label: 'Decidido', stages: ['decidido', 'agendado'] },
    { id: 'camino', label: 'Comprado, falta recibir', stages: ['comprado'] },
    { id: 'listo', label: 'Listo', stages: ['entregado', 'instalado', 'hecho'] }
  ];
  const URGENCIAS = [
    { id: 'mudanza', label: 'Antes de la mudanza' },
    { id: 'mes1', label: 'Primer mes' },
    { id: 'espera', label: 'Puede esperar' }
  ];
  const CATEGORIAS = [
    { id: 'climatizacion', label: 'Climatización' },
    { id: 'electro', label: 'Electrodomésticos' },
    { id: 'muebles', label: 'Muebles' },
    { id: 'iluminacion', label: 'Iluminación' },
    { id: 'cocina', label: 'Vajilla y cocina' },
    { id: 'textil', label: 'Blanco y textil' },
    { id: 'deco', label: 'Deco' },
    { id: 'tecnologia', label: 'Tecnología' },
    { id: 'limpieza', label: 'Limpieza y orden' },
    { id: 'obra', label: 'Obra e instalación' },
    { id: 'servicios', label: 'Servicios y trámites' },
    { id: 'otros', label: 'Otros' }
  ];

  // [id, nombre, [columnas, filas] en el plano de 6 columnas]
  const DEFAULT_ROOMS = [
    ['living', 'Living', [3, 2]],
    ['suite', 'Cuarto suite', [3, 2]],
    ['cocina', 'Cocina', [2, 1]],
    ['bano', 'Baño', [1, 1]],
    ['santino', 'Cuarto Santino', [2, 1]],
    ['general', 'General', [1, 1]],
    ['playroom', 'Playroom', [2, 1]],
    ['terraza', 'Terraza', [4, 1]]
  ];

  /* Listas sugeridas. Formato "Nombre|categoría|flags"
     flags: m = antes de la mudanza, e = puede esperar, t = tarea (no compra) */
  const TEMPLATES = {
    living: ['Sillón|muebles|m', 'Mesa ratona|muebles', 'Rack o mueble de TV|muebles', 'TV|tecnologia', 'Alfombra|textil|e', 'Lámpara de pie|iluminacion', 'Cortinas|textil|m', 'Aire acondicionado|climatizacion|m', 'Cuadros y deco|deco|e'],
    comedor: ['Mesa de comedor|muebles|m', 'Sillas|muebles|m', 'Lámpara colgante|iluminacion', 'Aparador|muebles|e'],
    cocina: ['Heladera|electro|m', 'Microondas|electro', 'Lavavajillas|electro|e', 'Cafetera|electro', 'Pava eléctrica|electro|m', 'Tostadora|electro', 'Minipimer o batidora|electro|e', 'Platos playos, hondos y de postre|cocina|m', 'Vasos y copas|cocina|m', 'Tazas y mugs|cocina', 'Cubiertos|cocina|m', 'Ollas y sartenes|cocina|m', 'Utensilios de cocina|cocina', 'Cuchillos y tablas|cocina', 'Fuentes para horno|cocina', 'Tuppers y frascos|cocina', 'Repasadores y manteles|textil', 'Tacho de basura y reciclaje|limpieza|m', 'Organizadores de alacena|limpieza|e'],
    lavadero: ['Lavarropas|electro|m', 'Secarropas|electro|e', 'Tender|limpieza', 'Plancha y tabla|electro|e', 'Aspiradora|electro', 'Balde, escoba y trapos|limpieza|m', 'Escalera|limpieza'],
    bano: ['Toallas y toallones|textil|m', 'Alfombra de baño|textil', 'Cortina o mampara|obra|m', 'Accesorios: jabonera, vaso, portarrollos|deco|m', 'Botiquín|muebles', 'Espejo|deco', 'Cesto de basura|limpieza'],
    toilette: ['Toallas de mano|textil', 'Accesorios|deco', 'Espejo|deco'],
    suite: ['Sommier y colchón|muebles|m', 'Mesas de luz|muebles', 'Lámparas de mesa de luz|iluminacion', 'Sábanas y acolchado|textil|m', 'Almohadas|textil|m', 'Cortinas blackout|textil|m', 'Organizadores de placard|muebles|e', 'Aire acondicionado|climatizacion|m', 'TV|tecnologia|e'],
    santino: ['Cuna o cama|muebles|m', 'Colchón|muebles|m', 'Cambiador|muebles', 'Cómoda|muebles', 'Ropa de cama|textil|m', 'Cortinas blackout|textil|m', 'Luz de noche|iluminacion', 'Monitor|tecnologia|m', 'Aire acondicionado|climatizacion|m', 'Organizador de juguetes|muebles|e'],
    playroom: ['Piso de goma encastrable|textil', 'Estantería o cubos|muebles', 'Mesa y sillitas|muebles', 'Baúl de juguetes|muebles', 'Puff|muebles|e', 'Protectores de enchufe|obra|m'],
    terraza: ['Mesa exterior|muebles|e', 'Sillas o reposeras|muebles|e', 'Macetas y plantas|deco|e', 'Iluminación exterior|iluminacion|e', 'Toldo o sombrilla|deco|e', 'Manguera o riego|limpieza|e'],
    general: ['Router o mesh wifi|tecnologia|m', 'Lamparitas|iluminacion|m', 'Zapatillas y alargues|tecnologia|m', 'Detectores de humo|obra', 'Caja de herramientas|limpieza', 'Cambio de combinación de cerradura|obra|mt', 'Mudanza o flete|servicios|mt', 'Instalación de aires|servicios|mt', 'Alta de internet|servicios|mt', 'Cambio de titularidad de luz, gas y agua|servicios|mt', 'Seguro del hogar|servicios|t', 'Medición de cortinas|servicios|t']
  };
  const TPL_KEYS = [['living', 'living'], ['comedor', 'comedor'], ['cocina', 'cocina'], ['lavadero', 'lavadero'], ['toilette', 'toilette'], ['bano', 'bano'], ['suite', 'suite'], ['santino', 'santino'], ['playroom', 'playroom'], ['terraza', 'terraza'], ['balcon', 'terraza'], ['general', 'general']];

  /* ---------- Utilidades ---------- */
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const now = () => Date.now();
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const pad = (n) => String(n).padStart(2, '0');
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const ymOf = (x) => { const d = x ? new Date(x) : new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
  const ymNow = () => ymOf();
  const addMonths = (ym, k) => { const [y, m] = ym.split('-').map(Number); const t = y * 12 + (m - 1) + k; return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`; };
  const monthsBetween = (a, b) => { const [ay, am] = a.split('-').map(Number); const [by, bm] = b.split('-').map(Number); return (by - ay) * 12 + (bm - am); };
  const num = (v) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v));

  /* ---------- Estado ---------- */
  function blank() {
    return {
      version: 1,
      items: [],
      rooms: DEFAULT_ROOMS.map(([id, nombre, span], i) => ({ id, nombre, span, orden: i, m2: null, altura: 2.6, orientacion: '', techo: false, notas: '', updatedAt: 0 })),
      settings: { mudanza: '2026-12-15', responsables: ['Mariano', 'Pareja'], updatedAt: 0 }
    };
  }
  function loadLocal() {
    try { const s = JSON.parse(localStorage.getItem(LS_DATA) || 'null'); if (s && s.items && s.rooms) return s; } catch (e) { /* dato corrupto: arranca vacío */ }
    return blank();
  }
  let state = loadLocal();
  function persistLocal() { try { localStorage.setItem(LS_DATA, JSON.stringify(state)); } catch (e) { console.warn('No se pudo guardar localmente', e); } }

  const listeners = new Set();
  const statusListeners = new Set();
  function emit() { listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } }); }

  function commit() { persistLocal(); emit(); scheduleSync(); }

  window.addEventListener('storage', (e) => { if (e.key === LS_DATA) { state = loadLocal(); emit(); } });

  /* ---------- Lectura ---------- */
  const items = () => state.items.filter((i) => !i.deleted);
  const item = (id) => state.items.find((i) => i.id === id && !i.deleted) || null;
  const rooms = () => state.rooms.filter((r) => !r.deleted).sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));
  const room = (id) => state.rooms.find((r) => r.id === id && !r.deleted) || null;
  const settings = () => state.settings;

  const stagesFor = (tipo) => STAGES[tipo] || STAGES.compra;
  const stageLabel = (it) => (stagesFor(it.tipo).find((s) => s.id === it.stage) || {}).label || it.stage;
  const stageIndex = (it) => stagesFor(it.tipo).findIndex((s) => s.id === it.stage);
  const isDone = (it) => (it.tipo === 'tarea' ? it.stage === 'hecho' : stageIndex(it) >= 3);
  const isFinal = (it) => ['entregado', 'instalado', 'hecho'].includes(it.stage);
  const column = (it) => (COLUMNS.find((c) => c.stages.includes(it.stage)) || COLUMNS[0]).id;
  const catLabel = (id) => (CATEGORIAS.find((c) => c.id === id) || {}).label || 'Otros';
  const urgLabel = (id) => (URGENCIAS.find((u) => u.id === id) || {}).label || '';
  const roomName = (id) => (room(id) || {}).nombre || 'General';

  /* ---------- Plata ---------- */
  // Precio real convertido a USD (ARS / TC del día de carga)
  function usd(it) {
    const p = num(it.precio);
    if (p == null) return null;
    if (it.moneda === 'ARS') { const tc = num(it.tc); return tc && tc > 0 ? p / tc : null; }
    return p;
  }
  // Lo que se espera gastar: precio real si existe, si no el presupuesto
  const estimado = (it) => { const u = usd(it); return u != null ? u : num(it.presupuesto) || 0; };
  // Si no se cargó, la primera cuota cae el mes siguiente a la compra (resumen de tarjeta)
  function firstInstallment(it) { return it.primeraCuota || addMonths(ymOf(it.fechaCompra ? it.fechaCompra + 'T12:00:00' : (it.updatedAt || Date.now())), 1); }
  function paid(it) {
    const total = usd(it);
    if (!isDone(it) || total == null) return 0;
    const n = Math.max(1, parseInt(it.cuotas, 10) || 1);
    if (n === 1) return total;
    // Pagadas: las de meses anteriores. La del mes en curso todavía cuenta como por pagar.
    const k = Math.min(n, Math.max(0, monthsBetween(firstInstallment(it), ymNow())));
    return (total / n) * k;
  }
  function summary(list) {
    const s = { n: 0, done: 0, pres: 0, est: 0, comprado: 0, pagado: 0, porPagar: 0, presCubierto: 0, estCubierto: 0 };
    for (const it of list) {
      s.n++;
      const pres = num(it.presupuesto);
      const est = estimado(it);
      if (isDone(it)) { s.done++; s.comprado += usd(it) || 0; }
      s.pres += pres || 0;
      s.est += est;
      s.pagado += paid(it);
      if (pres) { s.presCubierto += pres; s.estCubierto += est; }
    }
    s.porPagar = Math.max(0, s.comprado - s.pagado);
    // Ahorro vs presupuesto, solo sobre ítems que tienen presupuesto cargado
    s.ahorro = s.presCubierto ? (s.presCubierto - s.estCubierto) / s.presCubierto : null;
    return s;
  }
  // Flujo de cuotas pendientes (USD) para los próximos `months` meses
  function cuotasFlow(months = 12) {
    const start = ymNow();
    const out = [];
    for (let i = 0; i < months; i++) out.push({ ym: addMonths(start, i), v: 0 });
    for (const it of items()) {
      const total = usd(it);
      const n = Math.max(1, parseInt(it.cuotas, 10) || 1);
      if (!isDone(it) || total == null || n === 1) continue;
      const first = firstInstallment(it);
      for (let c = 0; c < n; c++) {
        const idx = monthsBetween(start, addMonths(first, c));
        if (idx >= 0 && idx < months) out[idx].v += total / n;
      }
    }
    return out;
  }

  /* ---------- Escritura ---------- */
  function upsertItem(data) {
    const ex = data.id ? state.items.find((i) => i.id === data.id) : null;
    const it = Object.assign(ex ? clone(ex) : { id: uid(), createdAt: now(), cotizaciones: [] }, data);
    if (!stagesFor(it.tipo).some((s) => s.id === it.stage)) it.stage = stagesFor(it.tipo)[0].id;
    if (isDone(it) && !it.fechaCompra) it.fechaCompra = todayISO();
    it.updatedAt = now();
    if (ex) state.items[state.items.indexOf(ex)] = it; else state.items.push(it);
    commit();
    return it;
  }
  function deleteItem(id) {
    const ex = state.items.find((i) => i.id === id);
    if (!ex) return;
    Object.assign(ex, { deleted: true, updatedAt: now() });
    commit();
  }
  function moveStage(id, dir) {
    const it = item(id); if (!it) return;
    const st = stagesFor(it.tipo);
    const i = Math.min(st.length - 1, Math.max(0, stageIndex(it) + dir));
    upsertItem({ id, stage: st[i].id });
  }
  function upsertRoom(data) {
    const ex = data.id ? state.rooms.find((r) => r.id === data.id) : null;
    const r = Object.assign(ex ? clone(ex) : { id: uid(), span: [2, 1], orden: rooms().length, altura: 2.6, m2: null, orientacion: '', techo: false, notas: '' }, data);
    r.updatedAt = now();
    delete r.deleted;
    if (ex) state.rooms[state.rooms.indexOf(ex)] = r; else state.rooms.push(r);
    commit();
    return r;
  }
  function deleteRoom(id) {
    const ex = state.rooms.find((r) => r.id === id);
    if (!ex) return;
    const t = now();
    state.items.forEach((it) => { if (it.ambiente === id && !it.deleted) { it.ambiente = 'general'; it.updatedAt = t; } });
    Object.assign(ex, { deleted: true, updatedAt: t });
    commit();
  }
  function moveRoom(id, dir) {
    const list = rooms();
    const i = list.findIndex((r) => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const t = now();
    list.forEach((r, k) => { const s = state.rooms.find((x) => x.id === r.id); s.orden = k; s.updatedAt = t; });
    commit();
  }
  function setSettings(patch) { state.settings = Object.assign({}, state.settings, patch, { updatedAt: now() }); commit(); }

  function templateKey(r) {
    const n = norm(r.nombre + ' ' + r.id);
    const hit = TPL_KEYS.find(([k]) => n.includes(k));
    return hit ? hit[1] : null;
  }
  function templateFor(r) {
    const k = templateKey(r); if (!k) return [];
    return TEMPLATES[k].map((line) => {
      const [nombre, categoria, flags = ''] = line.split('|');
      return { nombre, categoria, tipo: flags.includes('t') ? 'tarea' : 'compra', urgencia: flags.includes('m') ? 'mudanza' : flags.includes('e') ? 'espera' : 'mes1' };
    });
  }
  // Agrega de una sola vez los ítems sugeridos que todavía no están en el ambiente
  function applyTemplate(roomId) {
    const r = room(roomId); if (!r) return 0;
    const have = new Set(items().filter((i) => i.ambiente === roomId).map((i) => norm(i.nombre)));
    const t = now();
    let n = 0;
    for (const s of templateFor(r)) {
      if (have.has(norm(s.nombre))) continue;
      state.items.push(Object.assign({ id: uid(), createdAt: t, updatedAt: t, ambiente: roomId, stage: s.tipo === 'tarea' ? 'pendiente' : 'idea', responsable: '', presupuesto: null, precio: null, moneda: 'USD', tc: null, cuotas: 1, primeraCuota: '', proveedor: '', link: '', entrega: '', notas: '', cotizaciones: [] }, s));
      n++;
    }
    if (n) commit();
    return n;
  }
  function pendingTemplate(roomId) {
    const r = room(roomId); if (!r) return 0;
    const have = new Set(items().filter((i) => i.ambiente === roomId).map((i) => norm(i.nombre)));
    return templateFor(r).filter((s) => !have.has(norm(s.nombre))).length;
  }

  /* ---------- Aire acondicionado: estimación de frigorías ---------- */
  const SPLITS = [2250, 3000, 4500, 5500, 6000, 9000];
  function frigorias(r) {
    const m2 = num(r.m2); if (!m2) return null;
    const h = num(r.altura) || 2.6;
    let f = m2 * h * 50;                 // 50 frigorías por m³
    if (['N', 'O', 'NO'].includes(r.orientacion)) f *= 1.15; // sol de tarde / norte
    if (r.techo) f *= 1.15;                                  // último piso o techo al sol
    const split = SPLITS.find((s) => s >= f) || null;
    return { calc: Math.round(f / 10) * 10, split };
  }

  /* ---------- Tipo de cambio MEP (dolarapi.com), cacheado 1 hora ---------- */
  async function getMEP() {
    try {
      const c = JSON.parse(localStorage.getItem(LS_TC) || 'null');
      if (c && Date.now() - c.at < 3600e3) return c.v;
      const r = await fetch('https://dolarapi.com/v1/dolares/bolsa');
      const j = await r.json();
      const v = Number(j.venta);
      if (v > 0) { localStorage.setItem(LS_TC, JSON.stringify({ v, at: Date.now() })); return v; }
    } catch (e) { /* sin conexión: el usuario carga el TC a mano */ }
    return null;
  }

  /* ---------- Sincronización con GitHub (Contents API) ---------- */
  const defaultCfg = { owner: '', repo: '', branch: 'main', path: 'casa.json', token: '' };
  const getCfg = () => { try { return Object.assign({}, defaultCfg, JSON.parse(localStorage.getItem(LS_CFG) || '{}')); } catch (e) { return clone(defaultCfg); } };
  const setCfg = (c) => localStorage.setItem(LS_CFG, JSON.stringify(Object.assign(getCfg(), c)));
  const hasRemote = () => { const c = getCfg(); return !!(c.owner && c.repo && c.token && c.path); };

  let status = { state: hasRemote() ? 'idle' : 'local', at: null, msg: '' };
  function setStatus(st, msg = '') { status = { state: st, at: st === 'ok' ? Date.now() : status.at, msg }; statusListeners.forEach((fn) => fn(status)); }

  function b64enc(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64dec(s) {
    const bin = atob(String(s).replace(/\s/g, ''));
    return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
  }
  function ghUrl(c) {
    const p = c.path.split('/').map(encodeURIComponent).join('/');
    return `https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/${p}`;
  }
  function ghHeaders(c) { return { Authorization: `Bearer ${c.token}`, Accept: 'application/vnd.github+json' }; }
  function ghError(res) {
    if (res.status === 401) return 'El token no es válido o venció.';
    if (res.status === 403) return 'El token no tiene permiso de escritura sobre el repo.';
    if (res.status === 404) return 'No se encontró el repo. Revisá usuario, nombre y permisos del token.';
    return `GitHub respondió ${res.status}.`;
  }
  async function ghGet() {
    const c = getCfg();
    const res = await fetch(`${ghUrl(c)}?ref=${encodeURIComponent(c.branch)}`, { headers: ghHeaders(c), cache: 'no-store' });
    if (res.status === 404) {
      // Puede ser "el archivo no existe todavía" o "el repo no existe": lo distingue el GET al repo
      const rr = await fetch(`https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}`, { headers: ghHeaders(c), cache: 'no-store' });
      if (!rr.ok) throw new Error(ghError(rr));
      return null;
    }
    if (!res.ok) throw new Error(ghError(res));
    const j = await res.json();
    return { sha: j.sha, text: b64dec(j.content) };
  }
  async function ghPut(text, sha) {
    const c = getCfg();
    const body = { message: `casa: actualización ${new Date().toLocaleString('es-AR')}`, content: b64enc(text), branch: c.branch };
    if (sha) body.sha = sha;
    const res = await fetch(ghUrl(c), { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders(c)), body: JSON.stringify(body) });
    if (res.status === 409 || res.status === 422) return 'conflict';
    if (!res.ok) throw new Error(ghError(res));
    return 'ok';
  }

  function mergeList(a = [], b = []) {
    const m = new Map();
    for (const x of a) m.set(x.id, x);
    for (const y of b) { const x = m.get(y.id); if (!x || (y.updatedAt || 0) > (x.updatedAt || 0)) m.set(y.id, y); }
    return [...m.values()].sort((p, q) => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0));
  }
  function merge(local, remote) {
    if (!remote) return Object.assign({}, local, { items: mergeList(local.items), rooms: mergeList(local.rooms) });
    return {
      version: 1,
      items: mergeList(local.items, remote.items),
      rooms: mergeList(local.rooms, remote.rooms),
      settings: (remote.settings && (remote.settings.updatedAt || 0) > (local.settings.updatedAt || 0)) ? remote.settings : local.settings
    };
  }

  let syncing = null;
  let again = false;
  let timer = null;
  function scheduleSync() { if (!hasRemote()) return; clearTimeout(timer); timer = setTimeout(sync, 1500); }
  async function sync() {
    if (!hasRemote()) { setStatus('local'); return; }
    if (syncing) { again = true; return syncing; }
    syncing = (async () => {
      setStatus('syncing');
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          const r = await ghGet();
          let remote = null;
          if (r) { try { remote = JSON.parse(r.text); } catch (e) { throw new Error('El casa.json del repo no es un JSON válido.'); } }
          const merged = merge(state, remote);
          const out = JSON.stringify(merged, null, 1);
          state = merged;
          persistLocal();
          if (r && r.text === out) break;
          if ((await ghPut(out, r && r.sha)) === 'ok') break;
        }
        setStatus('ok');
        emit();
      } catch (e) {
        setStatus('error', e.message || String(e));
      } finally {
        syncing = null;
        if (again) { again = false; scheduleSync(); }
      }
    })();
    return syncing;
  }
  async function testRemote() { await ghGet(); return true; }

  /* ---------- Importar / exportar ---------- */
  function exportJSON() { return JSON.stringify(state, null, 1); }
  function importJSON(text) {
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.items) || !Array.isArray(data.rooms)) throw new Error('El archivo no tiene el formato de Depto nuevo.');
    const t = now();
    data.items.forEach((i) => { i.updatedAt = Math.max(i.updatedAt || 0, t); });
    data.rooms.forEach((r) => { r.updatedAt = Math.max(r.updatedAt || 0, t); });
    state = merge(state, data);
    commit();
  }
  function wipeItems() { const t = now(); state.items.forEach((i) => { i.deleted = true; i.updatedAt = t; }); commit(); }

  /* ---------- Plano: tamaño de cada ambiente ---------- */
  function span(r) {
    const cols = window.matchMedia('(max-width: 640px)').matches ? 2 : 6;
    const [c, rr] = r.span || [2, 1];
    return cols === 2 ? [Math.min(c, 2), 1] : [c, rr];
  }
  function daysTo(dateStr) {
    if (!dateStr) return null;
    const t = new Date(dateStr + 'T00:00:00');
    const d = new Date(); d.setHours(0, 0, 0, 0);
    return Math.round((t - d) / 864e5);
  }

  window.CASA = {
    STAGES, COLUMNS, URGENCIAS, CATEGORIAS,
    items, item, rooms, room, settings, roomName,
    stagesFor, stageLabel, stageIndex, isDone, isFinal, column, catLabel, urgLabel,
    usd, estimado, paid, summary, cuotasFlow,
    upsertItem, deleteItem, moveStage, upsertRoom, deleteRoom, moveRoom, setSettings,
    templateFor, applyTemplate, pendingTemplate, frigorias, getMEP,
    getCfg, setCfg, hasRemote, sync, testRemote, status: () => status,
    onChange: (fn) => listeners.add(fn), onStatus: (fn) => statusListeners.add(fn),
    exportJSON, importJSON, wipeItems, span, daysTo, todayISO, ymNow, addMonths, num
  };

  // Al abrir cualquier página: trae lo último de GitHub
  if (hasRemote()) setTimeout(sync, 50);
})();
