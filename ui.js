/* ==========================================================================
   Depto nuevo — piezas de interfaz compartidas
   ========================================================================== */
(function () {
  const C = window.CASA;
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const nf0 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const usd = (n) => (n == null || !isFinite(n) ? '—' : 'US$ ' + nf0.format(Math.round(n)));
  const money = (v, m) => (v == null || v === '' ? '—' : (m === 'ARS' ? '$ ' : 'US$ ') + nf0.format(Number(v)));
  const int = (n) => nf0.format(n);
  // Porcentaje coloreado por signo: positivo verde, negativo rojo
  function pct(x, dec = 0) {
    if (x == null || !isFinite(x)) return '<span class="muted">—</span>';
    const v = (x * 100).toFixed(dec).replace('.', ',');
    const cls = x > 0.00049 ? 'pos' : x < -0.00049 ? 'neg' : '';
    return `<span class="${cls}">${x > 0.00049 ? '+' : ''}${v}%</span>`;
  }
  function fmtDate(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return `${d} ${MESES[m - 1]}${y !== new Date().getFullYear() ? ' ' + String(y).slice(2) : ''}`; }
  function monthLabel(ym) { const [y, m] = ym.split('-').map(Number); return `${MESES[m - 1]} ${String(y).slice(2)}`; }
  const hhmm = (t) => new Date(t).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

  /* ---------- Header ---------- */
  const NAV = [['inicio', 'index.html', 'Inicio'], ['ambientes', 'ambientes.html', 'Ambientes'], ['pendientes', 'pendientes.html', 'Pendientes'], ['gastos', 'gastos.html', 'Gastos'], ['ajustes', 'config.html', 'Ajustes']];
  function header(active) {
    const h = document.getElementById('hdr');
    h.innerHTML = `<header class="top">
      <a class="brand" href="index.html">Depto nuevo</a>
      <nav aria-label="Secciones">${NAV.map(([id, href, l]) => `<a href="${href}"${id === active ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
      <a class="sync" id="sync" href="config.html"></a>
      <button class="btn sm" id="add" type="button">Agregar</button>
    </header>`;
    h.querySelector('#add').addEventListener('click', () => openItem(null, UI.defaults || {}));
    C.onStatus(renderStatus);
    renderStatus(C.status());
  }
  function renderStatus(s) {
    const el = document.getElementById('sync'); if (!el) return;
    const txt = { local: 'Solo en este dispositivo', idle: 'Conectando…', syncing: 'Sincronizando…', ok: 'Guardado' + (s.at ? ' ' + hhmm(s.at) : ''), error: 'No se pudo sincronizar' }[s.state] || '';
    el.textContent = txt;
    el.className = 'sync s-' + s.state;
    el.title = s.msg || txt;
  }

  /* ---------- Toast ---------- */
  function toast(msg) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2200);
  }

  /* ---------- Tile de ambiente para el plano ---------- */
  function roomTile(r, list) {
    const its = list.filter((i) => i.ambiente === r.id);
    const n = its.length;
    const d = its.filter(C.isDone).length;
    const p = n ? Math.round((d / n) * 100) : 0;
    const pend = n - d;
    const [c, rr] = C.span(r);
    const meta = n ? `${p}% resuelto${pend ? `, ${pend} pendiente${pend > 1 ? 's' : ''}` : ''}` : 'Sin cargar';
    return `<a class="room" href="ambiente.html?id=${encodeURIComponent(r.id)}" style="grid-column:span ${c};grid-row:span ${rr}">
      <span class="fill" style="--p:${p}%"></span>
      <span class="name">${esc(r.nombre)}</span>
      <span class="meta">${meta}</span></a>`;
  }

  /* ---------- Modal de ítem (alta / edición) ---------- */
  const opts = (list, sel) => list.map((o) => `<option value="${esc(o.id)}"${o.id === sel ? ' selected' : ''}>${esc(o.label)}</option>`).join('');

  function openItem(id, defaults = {}) {
    const ex = id ? C.item(id) : null;
    const it = ex ? JSON.parse(JSON.stringify(ex)) : Object.assign({
      tipo: 'compra', nombre: '', ambiente: 'general', categoria: 'otros', stage: 'idea', urgencia: 'mes1', responsable: '',
      presupuesto: null, precio: null, moneda: 'USD', tc: null, cuotas: 1, primeraCuota: '', proveedor: '', link: '', entrega: '', notas: '', cotizaciones: []
    }, defaults);
    if (!C.room(it.ambiente)) it.ambiente = C.rooms()[0] ? C.rooms()[0].id : 'general';
    const resp = C.settings().responsables || [];
    const roomOpts = C.rooms().map((r) => ({ id: r.id, label: r.nombre }));
    const respOpts = [{ id: '', label: 'Sin asignar' }].concat(resp.map((n) => ({ id: n, label: n })), [{ id: 'Ambos', label: 'Ambos' }]);

    document.querySelectorAll('dialog.item-dlg').forEach((d) => d.remove());
    const dlg = document.createElement('dialog');
    dlg.className = 'item-dlg';
    dlg.innerHTML = `<form class="dlg" novalidate>
      <div class="dlg-head"><h2>${ex ? 'Editar' : 'Agregar'}</h2><button type="button" class="x" data-close aria-label="Cerrar">✕</button></div>
      <div class="dlg-body">
        <div class="seg" role="radiogroup" aria-label="Tipo">
          <label><input type="radio" name="tipo" value="compra"> Compra</label>
          <label><input type="radio" name="tipo" value="tarea"> Tarea</label>
        </div>
        <label class="f">Qué es<input name="nombre" autocomplete="off" placeholder="Ej. Heladera no frost, instalar split del living"></label>
        <p class="err" id="e-nombre" hidden>Poné un nombre para poder guardarlo.</p>
        <div class="grid2">
          <label class="f">Ambiente<select name="ambiente">${opts(roomOpts, it.ambiente)}</select></label>
          <label class="f">Categoría<select name="categoria">${opts(C.CATEGORIAS, it.categoria)}</select></label>
          <label class="f">Etapa<select name="stage"></select></label>
          <label class="f">Cuándo lo necesitás<select name="urgencia">${opts(C.URGENCIAS, it.urgencia)}</select></label>
          <label class="f">Quién se ocupa<select name="responsable">${opts(respOpts, it.responsable)}</select></label>
          <label class="f"><span id="l-entrega">Fecha de entrega</span><input type="date" name="entrega"></label>
        </div>
        <fieldset class="box">
          <legend>Plata</legend>
          <div class="grid3">
            <label class="f">Presupuesto (US$)<input type="number" inputmode="decimal" step="any" min="0" name="presupuesto"></label>
            <label class="f">Precio real<input type="number" inputmode="decimal" step="any" min="0" name="precio"></label>
            <label class="f">Moneda<select name="moneda"><option value="USD">US$</option><option value="ARS">Pesos</option></select></label>
            <label class="f" id="w-tc">TC (ARS por US$)<input type="number" inputmode="decimal" step="any" min="0" name="tc"></label>
            <label class="f">Cuotas<input type="number" inputmode="numeric" step="1" min="1" name="cuotas"></label>
            <label class="f">Primera cuota<input type="month" name="primeraCuota"></label>
          </div>
          <p class="hint" id="conv"></p>
        </fieldset>
        <div class="grid2">
          <label class="f">Proveedor o tienda<input name="proveedor" autocomplete="off"></label>
          <label class="f">Link<input type="url" name="link" placeholder="https://"></label>
        </div>
        <label class="f">Notas y medidas<textarea name="notas" rows="2"></textarea></label>
        <fieldset class="box">
          <legend>Cotizaciones</legend>
          <div id="quotes"></div>
          <button type="button" class="btn ghost sm" id="add-q">Agregar cotización</button>
        </fieldset>
      </div>
      <div class="dlg-foot">
        ${ex ? '<button type="button" class="btn danger" data-del>Eliminar</button>' : ''}
        <span class="sp"></span>
        <button type="button" class="btn ghost" data-close>Cancelar</button>
        <button type="submit" class="btn">Guardar</button>
      </div></form>`;
    document.body.appendChild(dlg);
    const f = dlg.querySelector('form');
    const $ = (s) => dlg.querySelector(s);

    // Valores iniciales (por JS para no pelear con el escapado)
    f.tipo.value = it.tipo;
    ['nombre', 'entrega', 'proveedor', 'link', 'notas', 'primeraCuota'].forEach((k) => { f[k].value = it[k] || ''; });
    ['presupuesto', 'precio', 'tc'].forEach((k) => { f[k].value = it[k] ?? ''; });
    f.cuotas.value = it.cuotas || 1;
    f.moneda.value = it.moneda || 'USD';

    function fillStages() {
      const tipo = f.tipo.value;
      const st = C.stagesFor(tipo);
      const cur = st.some((s) => s.id === it.stage) ? it.stage : st[0].id;
      f.stage.innerHTML = opts(st, cur);
      $('#l-entrega').textContent = tipo === 'tarea' ? 'Fecha o turno' : 'Fecha de entrega';
    }
    function updateMoney() {
      const ars = f.moneda.value === 'ARS';
      $('#w-tc').hidden = !ars;
      const p = C.num(f.precio.value), tc = C.num(f.tc.value);
      const n = Math.max(1, parseInt(f.cuotas.value, 10) || 1);
      let t = '';
      if (p != null) {
        const u = ars ? (tc ? p / tc : null) : p;
        if (ars) t = u != null ? `Equivale a ${usd(u)} al TC ${int(tc)}.` : 'Cargá el TC para convertir a dólares.';
        if (n > 1) t += ` ${n} cuotas de ${money(Math.round(p / n), f.moneda.value)}.${f.primeraCuota.value ? '' : ' Sin fecha de primera cuota, cuenta desde el mes siguiente a la compra.'}`;
      }
      $('#conv').textContent = t.trim();
    }
    async function ensureTC() {
      if (f.moneda.value === 'ARS' && !f.tc.value) {
        $('#conv').textContent = 'Buscando el dólar MEP…';
        const v = await C.getMEP();
        if (v && !f.tc.value) f.tc.value = Math.round(v);
        updateMoney();
      }
    }

    // Cotizaciones
    const quotes = (it.cotizaciones || []).map((q) => Object.assign({}, q));
    function renderQuotes() {
      $('#quotes').innerHTML = quotes.length ? quotes.map((q, i) => `<div class="quote" data-i="${i}">
        <input aria-label="Proveedor" placeholder="Proveedor" data-k="proveedor" value="${esc(q.proveedor)}">
        <input aria-label="Precio" type="number" step="any" min="0" placeholder="Precio" data-k="precio" value="${esc(q.precio ?? '')}">
        <select aria-label="Moneda" data-k="moneda"><option value="USD"${q.moneda !== 'ARS' ? ' selected' : ''}>US$</option><option value="ARS"${q.moneda === 'ARS' ? ' selected' : ''}>Pesos</option></select>
        <input aria-label="Link" type="url" placeholder="Link" data-k="link" value="${esc(q.link)}">
        <button type="button" class="btn ghost sm" data-use>Elegir</button>
        <button type="button" class="x" data-rm aria-label="Quitar cotización">✕</button></div>`).join('') : '<p class="hint">Cargá hasta 3 opciones para comparar. Con Elegir pasa a precio real.</p>';
      $('#add-q').hidden = quotes.length >= 3;
    }
    dlg.querySelector('#quotes').addEventListener('input', (e) => {
      const row = e.target.closest('.quote'); if (!row) return;
      quotes[row.dataset.i][e.target.dataset.k] = e.target.value;
    });
    dlg.querySelector('#quotes').addEventListener('click', (e) => {
      const row = e.target.closest('.quote'); if (!row) return;
      const q = quotes[row.dataset.i];
      if (e.target.closest('[data-rm]')) { quotes.splice(row.dataset.i, 1); renderQuotes(); }
      if (e.target.closest('[data-use]')) {
        f.precio.value = q.precio || ''; f.moneda.value = q.moneda || 'USD';
        if (q.proveedor) f.proveedor.value = q.proveedor;
        if (q.link) f.link.value = q.link;
        if (f.tipo.value === 'compra' && ['idea', 'cotizando'].includes(f.stage.value)) f.stage.value = 'decidido';
        updateMoney(); ensureTC(); toast('Cotización elegida');
      }
    });
    $('#add-q').addEventListener('click', () => { quotes.push({ proveedor: '', precio: '', moneda: f.moneda.value, link: '' }); renderQuotes(); });

    f.tipo.forEach((r) => r.addEventListener('change', () => { it.stage = f.stage.value; fillStages(); }));
    f.moneda.addEventListener('change', () => { updateMoney(); ensureTC(); });
    ['precio', 'tc', 'cuotas', 'primeraCuota'].forEach((k) => f[k].addEventListener('input', updateMoney));
    dlg.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dlg.close()));
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => dlg.remove());
    const del = dlg.querySelector('[data-del]');
    if (del) del.addEventListener('click', () => { if (confirm(`¿Eliminar "${it.nombre}"?`)) { C.deleteItem(it.id); dlg.close(); toast('Eliminado'); } });

    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const nombre = f.nombre.value.trim();
      if (!nombre) { $('#e-nombre').hidden = false; f.nombre.focus(); return; }
      const data = {
        tipo: f.tipo.value, nombre, ambiente: f.ambiente.value, categoria: f.categoria.value, stage: f.stage.value,
        urgencia: f.urgencia.value, responsable: f.responsable.value, entrega: f.entrega.value,
        presupuesto: C.num(f.presupuesto.value), precio: C.num(f.precio.value), moneda: f.moneda.value,
        tc: f.moneda.value === 'ARS' ? C.num(f.tc.value) : null, cuotas: Math.max(1, parseInt(f.cuotas.value, 10) || 1),
        primeraCuota: f.primeraCuota.value, proveedor: f.proveedor.value.trim(), link: f.link.value.trim(), notas: f.notas.value.trim(),
        cotizaciones: quotes.filter((q) => q.proveedor || q.precio).map((q) => ({ proveedor: q.proveedor || '', precio: C.num(q.precio), moneda: q.moneda || 'USD', link: q.link || '' }))
      };
      if (ex) data.id = ex.id;
      C.upsertItem(data);
      dlg.close();
      toast('Guardado');
    });

    fillStages(); updateMoney(); renderQuotes();
    dlg.showModal();
    if (!ex) f.nombre.focus();
  }

  window.UI = { esc, usd, money, int, pct, fmtDate, monthLabel, header, toast, roomTile, openItem, defaults: null };
})();
