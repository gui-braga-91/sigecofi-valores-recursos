let modo = 'visualizar';
let parentRecursoAtivoId = null;
let acaoPendente = null;
let inativosExpandido = false;

// ÍCONES SVG
const iconTrash = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
const iconPencil = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
const iconCheck = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
const iconChevronDown = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
const iconChevronUp = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
const iconChevronRight = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
const iconCopy = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
const iconEye = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const iconRefresh = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>`;

// SISTEMA DE TOAST
function mostrarToast(mensagem) {
  const toast = document.getElementById('toastBox');
  if(!toast) return;
  document.getElementById('toastMsg').textContent = mensagem;
  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); }, 2000);
}

// FUNÇÕES DE MÁSCARA AUTOMÁTICA E CÁLCULO REATIVO
function formatarMoedaBR(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseCurrency(str) {
  if(typeof str === 'number') return str;
  let num = str.replace(/[R$\s\.]/g, '').replace(',', '.');
  return parseFloat(num) || 0;
}

function applyCurrencyMask(el) {
  let value = el.value.replace(/\D/g, '');
  if(value === '') { el.value = ''; return; }
  value = (parseInt(value, 10) / 100).toFixed(2);
  el.value = 'R$ ' + value.replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
}

function applyDateMask(el) {
  let v = el.value.replace(/\D/g, '').slice(0, 8);
  if (v.length >= 5) el.value = v.replace(/(\d{2})(\d{2})(\d{1,4})/, '$1/$2/$3');
  else if (v.length >= 3) el.value = v.replace(/(\d{2})(\d{1,2})/, '$1/$2');
  else el.value = v;
}

function applyPeriodMask(el) {
  let v = el.value.replace(/\D/g, '').slice(0, 16);
  let part1 = v.slice(0, 8);
  let part2 = v.slice(8, 16);

  function formatD(d) {
    if (d.length >= 5) return d.replace(/(\d{2})(\d{2})(\d{1,4})/, '$1/$2/$3');
    if (d.length >= 3) return d.replace(/(\d{2})(\d{1,2})/, '$1/$2');
    return d;
  }
  let out = formatD(part1);
  if (v.length > 8) out += ' a ' + formatD(part2);
  else if (el.value.includes(' a ')) out += ' a ';
  el.value = out;
}

function applyNADMask(el) {
  let v = el.value.replace(/\D/g, '').slice(0, 10);
  if(v.length > 6) el.value = v.replace(/^(\d{1})(\d{1})(\d{2})(\d{2})(\d{1,4})/, '$1.$2.$3.$4.$5');
  else if(v.length > 4) el.value = v.replace(/^(\d{1})(\d{1})(\d{2})(\d{1,2})/, '$1.$2.$3.$4');
  else if(v.length > 2) el.value = v.replace(/^(\d{1})(\d{1})(\d{1,2})/, '$1.$2.$3');
  else if(v.length > 1) el.value = v.replace(/^(\d{1})(\d{1})/, '$1.$2');
  else el.value = v;
}

function copyToClipboard(val, btnElement) {
  navigator.clipboard.writeText(val).then(() => {
    mostrarToast("Copiado com sucesso!");
    const originalHTML = btnElement.innerHTML;
    btnElement.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    btnElement.style.color = "#16a34a";
    setTimeout(() => { 
      btnElement.innerHTML = originalHTML; 
      btnElement.style.color = "";
    }, 1500);
  });
}

const copyBtnView = (val) => `<button type="button" class="btn-copy-view" onclick="copyToClipboard('${val.replace(/'/g, "\\'")}', this)" title="Copiar">${iconCopy}</button>`;

function copyGroupInput(id, val, oninputFunc, placeholder = "") {
  return `
    <div class="copy-group">
      <input type="text" id="${id}" value="${val}" oninput="${oninputFunc}" placeholder="${placeholder}" class="input-inline">
      <button type="button" class="btn-copy-addon" onclick="copyToClipboard(this.previousElementSibling.value, this)" title="Copiar">${iconCopy}</button>
    </div>`;
}

function syncFractionFromPct(pId, fId, pCode, el) {
  const p = recursosAtivos.find(x => x.id === pId);
  const f = p.fracoes.find(x => x.id === fId);
  let pctStr = el.value.replace(',', '.');
  let pct = parseFloat(pctStr) || 0;
  f.pct = pct;
  f.val = (pct / 100) * p.valorProporcional;
  const inputVal = document.getElementById('f_val_' + fId);
  if(inputVal) inputVal.value = formatarMoedaBR(f.val);
  atualizarTotaisProjetoDOM(pId, pCode);
}

function syncFractionFromVal(pId, fId, pCode, el) {
  const p = recursosAtivos.find(x => x.id === pId);
  const f = p.fracoes.find(x => x.id === fId);
  let val = parseCurrency(el.value);
  f.val = val;
  f.pct = p.valorProporcional ? (val / p.valorProporcional) * 100 : 0;
  let pctFormatado = f.pct % 1 === 0 ? f.pct : parseFloat(f.pct.toFixed(2));
  const inputPct = document.getElementById('f_pct_' + fId);
  if(inputPct) inputPct.value = pctFormatado.toString().replace('.', ',');
  atualizarTotaisProjetoDOM(pId, pCode);
}

function atualizarTotaisProjetoDOM(pId, pCode) {
  const p = recursosAtivos.find(x => x.id === pId);
  const fracoesDoProjeto = p.fracoes.filter(x => x.projeto === pCode);
  let sumVal = fracoesDoProjeto.reduce((acc, curr) => acc + curr.val, 0);
  let sumPct = fracoesDoProjeto.reduce((acc, curr) => acc + curr.pct, 0);
  sumPct = parseFloat(sumPct.toFixed(2));
  
  const elVal = document.getElementById(`proj_tot_val_${pId}_${pCode}`);
  const elPct = document.getElementById(`proj_tot_pct_${pId}_${pCode}`);
  if(elVal) elVal.textContent = 'Total: ' + formatarMoedaBR(sumVal);
  if(elPct) elPct.textContent = sumPct + '%';

  let totalVal = p.fracoes.reduce((acc, curr) => acc + curr.val, 0);
  let totalPct = p.fracoes.reduce((acc, curr) => acc + curr.pct, 0);
  totalPct = parseFloat(totalPct.toFixed(2));
  
  const elTotalBar = document.getElementById(`card_tot_${pId}`);
  if(elTotalBar) {
    const span1 = elTotalBar.querySelector('span:first-child');
    const span2 = elTotalBar.querySelector('span:last-child');
    if(span1) span1.textContent = `TOTAL FRACIONADO: ${formatarMoedaBR(totalVal)} (${totalPct}%)`;
    if(span2) span2.textContent = totalPct === 100 ? '✓ Completo' : '⚠️ Pendente de Ajuste';
    
    if(totalPct === 100) {
       elTotalBar.style.background = '#f0fdf4';
       elTotalBar.style.borderColor = '#86efac';
       elTotalBar.style.color = '#166534';
    } else {
       elTotalBar.style.background = '#fffbeb';
       elTotalBar.style.borderColor = '#fcd34d';
       elTotalBar.style.color = '#92400e';
    }
  }
}

function getOptionsPeriodicidade(selected) {
  const opts = ["Selecione...", "Mensal", "Trimestral", "Semestral", "Anual", "Unitário", "Escopo", "SEM CUSTOS"];
  return opts.map(o => `<option value="${o}" ${selected === o ? 'selected' : ''}>${o}</option>`).join('');
}

function getOptionsInstrumento(selected) {
  const opts = ["Selecione...", "Apostila", "Aditivo (Alteração Quantitativo)", "Aditivo (Alteração Valor)", "Aditivo (Alterações Diversas)", "Aditivo (Prorrogação)", "Aditivo (Repactuação)", "Aditivo", "Contrato Original"];
  return opts.map(o => `<option value="${o}" ${selected === o ? 'selected' : ''}>${o}</option>`).join('');
}

let recursosAtivos = [
  {
    id: 'r1',
    valorAtualizado: 3773692.51,
    periodicidade: 'Anual',
    inicio: '09/09/2025',
    fim: '08/09/2026',
    valorProporcional: 2000.00,
    instrumento: 'Aditivo',
    numero: '1',
    origem: 'Automático',
    expandido: true,
    editando: false,
    projetosExpandidos: { '3920': true, '3921': false, '3922': false, '3923': false },
    fracoes: [
      { id: 'f1', projeto: '3920', uo: '1490', recurso: '1169', nad: '3.3.90.40.0000', periodo: '01/02/2024 a 01/02/2025', pct: 25, val: 500, obs: 'Fração referente ao serviço prestado no datacenter principal.', editando: false },
      { id: 'f2', projeto: '3921', uo: '1490', recurso: '1169', nad: '3.3.90.40.0000', periodo: '01/02/2024 a 01/02/2025', pct: 25, val: 500, obs: '', editando: false },
      { id: 'f3', projeto: '3922', uo: '1490', recurso: '1169', nad: '3.3.90.40.0000', periodo: '01/02/2024 a 01/02/2025', pct: 12.5, val: 250, obs: '', editando: false },
      { id: 'f4', projeto: '3923', uo: '1490', recurso: '1169', nad: '3.3.90.40.0000', periodo: '01/02/2024 a 01/02/2025', pct: 12.5, val: 250, obs: '', editando: false },
      { id: 'f5', projeto: '3923', uo: '1490', recurso: '4169', nad: '4.4.90.52.0000', periodo: '01/02/2024 a 01/02/2025', pct: 12.5, val: 250, obs: '', editando: false }
    ]
  },
  {
    id: 'r2',
    valorAtualizado: 3509875.20,
    periodicidade: 'Não informado',
    inicio: '09/09/2024',
    fim: '09/09/2026',
    valorProporcional: 3509875.20,
    instrumento: 'Contrato Original',
    numero: '24/04/058',
    origem: 'Automático',
    expandido: false,
    editando: false,
    projetosExpandidos: {},
    fracoes: []
  }
];

let recursosInativos = [
  {
    id: 'i1',
    valorAtualizado: 0.00,
    periodicidade: 'SEM CUSTOS',
    inicio: '01/01/2025',
    fim: '31/12/2026',
    valorProporcional: 0.00,
    instrumento: 'Apostila',
    numero: '1',
    origem: 'Manual',
    motivoAuditoria: 'Término de vigência contratual.',
    dataAcao: '25/07/2026 14:30',
    operador: 'Guilherme Alves Braga'
  }
];

// CONTROLE DE HISTÓRICO INATIVO
function toggleInativos() {
  inativosExpandido = !inativosExpandido;
  renderizarInativos();
}

function alternarModo(novoModo) {
  modo = novoModo;
  const isEdit = modo === 'editar';

  const hVis = document.getElementById('headerVis');
  const hEdit = document.getElementById('headerEdit');
  const bNovo = document.getElementById('btnNovoRec');
  const btnTop = document.getElementById('btnTopAction');

  if(hVis) hVis.classList.toggle('hidden', isEdit);
  if(hEdit) hEdit.classList.toggle('hidden', !isEdit);
  if(bNovo) bNovo.classList.toggle('hidden', !isEdit);

  if (btnTop) {
    if (isEdit) {
      btnTop.className = 'btn-sigecofi-vis';
      btnTop.innerHTML = '👁️ Visualizar';
    } else {
      btnTop.className = 'btn-sigecofi-edit';
      btnTop.innerHTML = '✏️ Editar';
      recursosAtivos.forEach(r => {
        r.editando = false;
        r.fracoes.forEach(f => f.editando = false);
      });
    }
  }

  renderizar();
}

function cliqueBotaoTopo() {
  alternarModo(modo === 'editar' ? 'visualizar' : 'editar');
}

function renderizar() {
  renderizarAtivos();
  renderizarInativos();
  initResizableColumns();
}

function renderizarAtivos() {
  const container = document.getElementById('containerValores');
  if(!container) return;
  container.innerHTML = '';
  const isEditGlobal = modo === 'editar';
  
  const searchInput = document.getElementById('inputSearch');
  const termoBusca = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const listaFiltrada = recursosAtivos.filter(r => 
    r.instrumento.toLowerCase().includes(termoBusca) ||
    r.numero.toLowerCase().includes(termoBusca) ||
    r.valorAtualizado.toString().includes(termoBusca)
  );

  let totalAcumulado = 0;

  listaFiltrada.forEach(item => {
    totalAcumulado += item.valorAtualizado;
    const card = document.createElement('div');
    card.className = 'card-recurso';

    const projs = {};
    item.fracoes.forEach(f => {
      if (!projs[f.projeto]) projs[f.projeto] = [];
      projs[f.projeto].push(f);
    });

    const lEditP = isEditGlobal && item.editando;
    if (!item.projetosExpandidos) item.projetosExpandidos = {};

    let htmlSub = '';
    if (item.expandido) {
      let htmlGrupos = '';

      Object.entries(projs).forEach(([pCode, lista]) => {
        const sumVal = lista.reduce((s, x) => s + x.val, 0);
        const sumPct = lista.reduce((s, x) => s + x.pct, 0);
        const sumPctFmt = parseFloat(sumPct.toFixed(2));

        if (!(pCode in item.projetosExpandidos)) item.projetosExpandidos[pCode] = true;
        const isProjExpanded = item.projetosExpandidos[pCode];
        const chevronIcon = isProjExpanded ? iconChevronDown : iconChevronRight;

        htmlGrupos += `
          <div class="proj-block">
            <div class="proj-bar" onclick="toggleProjExpand('${item.id}', '${pCode}')">
              <div style="display:flex; align-items:center; gap:6px;">
                ${chevronIcon}
                <span>PROJETO: ${pCode} <span style="font-size:10px; font-weight:normal; color:#64748b;">(${lista.length} fração/ões)</span></span>
              </div>
              <div>
                <span id="proj_tot_val_${item.id}_${pCode}" style="margin-right:12px;">Total: ${formatarMoedaBR(sumVal)}</span>
                <span id="proj_tot_pct_${item.id}_${pCode}" style="background:#005F73; color:white; padding:2px 6px; border-radius:3px; font-size:10px;">${sumPctFmt}%</span>
              </div>
            </div>
            ${isProjExpanded ? `
            <div class="table-responsive">
              <table class="resizable-table" style="min-width: 950px; border-top: 1px solid #c0dde5;">
                <thead>
                  <tr style="background:#f8fafc; color:#334155;">
                    <th style="width:6%;">UO</th>
                    <th style="width:8%;">Recurso</th>
                    <th style="width:14%;">NAD</th>
                    <th style="width:26%;">Período</th>
                    <th style="width:8%;">%</th>
                    <th style="width:14%;">Valor Fracionado</th>
                    <th style="width:12%;">OBSERVAÇÃO</th>
                    ${isEditGlobal ? '<th style="text-align:center; width:12%;">Ações</th>' : ''}
                  </tr>
                </thead>
                <tbody>
                  ${lista.map(f => {
                    const lEditF = isEditGlobal && f.editando;
                    const pctStr = (f.pct % 1 === 0 ? f.pct : parseFloat(f.pct.toFixed(2))).toString().replace('.', ',');
                    return `
                      <tr>
                        <td>${lEditF ? copyGroupInput(`f_uo_${f.id}`, f.uo, '') : (f.uo + copyBtnView(f.uo))}</td>
                        <td>${lEditF ? copyGroupInput(`f_rec_${f.id}`, f.recurso, '') : (f.recurso + copyBtnView(f.recurso))}</td>
                        <td>${lEditF ? copyGroupInput(`f_nad_${f.id}`, f.nad, 'applyNADMask(this)', 'X.X.XX.XX.XXXX') : (f.nad + copyBtnView(f.nad))}</td>
                        <td>${lEditF ? `<input type="text" id="f_per_${f.id}" value="${f.periodo}" oninput="applyPeriodMask(this)" class="input-plain">` : f.periodo}</td>
                        <td>${lEditF ? `<div style="display:flex; align-items:center; gap:4px;"><input type="text" id="f_pct_${f.id}" value="${pctStr}" oninput="syncFractionFromPct('${item.id}', '${f.id}', '${pCode}', this)" class="input-plain" style="width:50px;">%</div>` : `<strong>${pctStr}%</strong>`}</td>
                        <td>${lEditF ? `<input type="text" id="f_val_${f.id}" value="${formatarMoedaBR(f.val)}" oninput="applyCurrencyMask(this); syncFractionFromVal('${item.id}', '${f.id}', '${pCode}', this)" class="input-plain">` : `<strong>${formatarMoedaBR(f.val)}</strong>`}</td>
                        
                        <td style="${!lEditF ? 'max-width:120px;' : ''}">
                          ${lEditF 
                            ? `<input type="text" id="f_obs_${f.id}" value="${f.obs}" placeholder="Observação livre..." class="input-plain">` 
                            : `<div style="display:flex; align-items:center; justify-content: space-between;">
                                 <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;" title="${f.obs}">${f.obs || '-'}</span>
                                 ${f.obs ? `
                                 <div style="display:inline-flex; flex-shrink:0;">
                                   ${copyBtnView(f.obs)}
                                   <button type="button" class="btn-copy-view" onclick="abrirModalObservacao('${item.id}', '${f.id}')" title="Visualizar Completo">${iconEye}</button>
                                 </div>` : ''}
                               </div>`
                          }
                        </td>

                        ${isEditGlobal ? `
                          <td style="text-align:center; white-space:nowrap;">
                            <div style="display:inline-flex; gap:6px; align-items:center; justify-content:center; width: 100%;">
                              <button onclick="abrirConfirmacao('excluir_fracao', '${item.id}', '${f.id}')" class="btn-square-orange" title="Excluir Fração">${iconTrash}</button>
                              ${f.editando 
                                ? `<button onclick="abrirConfirmacao('salvar_fracao', '${item.id}', '${f.id}')" class="btn-square-green" title="Confirmar Salvar">${iconCheck}</button>`
                                : `<button onclick="ativarEdicaoFracao('${item.id}', '${f.id}')" class="btn-square-teal" title="Editar Fração">${iconPencil}</button>`}
                            </div>
                          </td>
                        ` : ''}
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}
          </div>
        `;
      });

      const totPct = item.fracoes.reduce((s, x) => s + x.pct, 0);
      const totVal = item.fracoes.reduce((s, x) => s + x.val, 0);
      const totPctFmt = parseFloat(totPct.toFixed(2));

      htmlSub = `
        <div class="sub-container">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
            <span style="font-weight:bold; color:#005F73;">DETALHAMENTO DE FRACIONAMENTO DOS RECURSOS</span>
            ${isEditGlobal ? `<button onclick="abrirModalProjeto('${item.id}')" class="btn-sigecofi-edit" style="font-size:11px; padding:4px 10px;">+ Adicionar Nova Fração</button>` : ''}
          </div>
          ${htmlGrupos || '<div style="color:#94a3b8; font-style:italic; text-align:center; padding:8px; background:#fff; border:1px solid #c0dde5; border-radius:4px;">Nenhuma fração cadastrada.</div>'}
          <div id="card_tot_${item.id}" class="total-bar" style="background:${totPctFmt === 100 ? '#f0fdf4' : '#fffbeb'}; border-color:${totPctFmt === 100 ? '#86efac' : '#fcd34d'}; color:${totPctFmt === 100 ? '#166534' : '#92400e'}; margin-bottom:0;">
            <span>TOTAL FRACIONADO: ${formatarMoedaBR(totVal)} (${totPctFmt}%)</span>
            <span>${totPctFmt === 100 ? '✓ Completo' : '⚠️ Pendente de Ajuste'}</span>
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="table-responsive">
        <table class="resizable-table">
          <thead>
            <tr>
              <th style="width:13%;">Valor Atualizado ↕</th>
              <th style="width:10%;">Periodicidade ↕</th>
              <th style="width:9%;">Início ↕</th>
              <th style="width:9%;">Fim ↕</th>
              <th style="width:13%;">Valor Proporcional (R$) ↕</th>
              <th style="width:13%;">Instrumento ↕</th>
              <th style="width:9%;">Número ↕</th>
              <th style="width:8%;">Origem ↕</th>
              <th style="text-align:center; width:16%;">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${formatarMoedaBR(item.valorAtualizado)}</strong></td>
              
              <td>${lEditP ? `<select id="p_per_${item.id}" class="input-plain">${getOptionsPeriodicidade(item.periodicidade)}</select>` : item.periodicidade}</td>
              
              <td>${lEditP ? `<input type="text" id="p_ini_${item.id}" value="${item.inicio}" oninput="applyDateMask(this)" class="input-plain">` : item.inicio}</td>
              <td>${lEditP ? `<input type="text" id="p_fim_${item.id}" value="${item.fim}" oninput="applyDateMask(this)" class="input-plain">` : item.fim}</td>
              
              <td>${lEditP ? `<input type="text" id="p_val_${item.id}" value="${formatarMoedaBR(item.valorProporcional)}" oninput="applyCurrencyMask(this)" class="input-plain">` : `<strong style="color:#005F73;">${formatarMoedaBR(item.valorProporcional)}</strong>`}</td>
              
              <td>${lEditP ? `<select id="p_inst_${item.id}" class="input-plain">${getOptionsInstrumento(item.instrumento)}</select>` : item.instrumento}</td>
              
              <td>${lEditP ? copyGroupInput(`p_num_${item.id}`, item.numero, '') : (item.numero + copyBtnView(item.numero))}</td>
              
              <td><span style="background:#e2e8f0; padding:2px 6px; border-radius:3px; font-weight:bold; font-size:10px;">${item.origem}</span></td>
              
              <td style="text-align:center; white-space:nowrap;">
                <div style="display:inline-flex; gap:6px; align-items:center; justify-content:center; width: 100%;">
                  ${isEditGlobal ? `<button onclick="abrirConfirmacao('inativar_pai', '${item.id}')" class="btn-text-inativar" title="Inativar Recurso">Inativar</button>` : ''}
                  ${isEditGlobal ? `<button onclick="abrirConfirmacao('excluir_pai', '${item.id}')" class="btn-square-orange" title="Excluir Definitivamente">${iconTrash}</button>` : ''}
                  ${isEditGlobal ? `
                    ${item.editando
                      ? `<button onclick="abrirConfirmacao('salvar_pai', '${item.id}')" class="btn-square-green" title="Confirmar e Salvar">${iconCheck}</button>`
                      : `<button onclick="ativarEdicaoPai('${item.id}')" class="btn-square-teal" title="Editar Recurso">${iconPencil}</button>`
                    }
                  ` : ''}
                  <button onclick="toggleE('${item.id}')" class="btn-square-teal" title="Expandir/Recolher">${item.expandido ? iconChevronUp : iconChevronDown}</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      ${htmlSub}
    `;

    container.appendChild(card);
  });

  const txtTot = document.getElementById('txtTotalAcumulado');
  if(txtTot) txtTot.textContent = formatarMoedaBR(totalAcumulado);
}

function renderizarInativos() {
  const container = document.getElementById('containerInativos');
  const badge = document.getElementById('qtdInativosText');
  const wrapper = document.getElementById('wrapperInativos');
  const icon = document.getElementById('iconeInativos');

  if(!container || !badge || !wrapper || !icon) return;

  badge.textContent = `${recursosInativos.length} registro(s)`;
  const isEdit = modo === 'editar';

  if (inativosExpandido) {
    wrapper.classList.remove('hidden');
    icon.innerHTML = iconChevronDown;
  } else {
    wrapper.classList.add('hidden');
    icon.innerHTML = iconChevronRight;
  }

  if (recursosInativos.length === 0) {
    container.innerHTML = '<div style="padding:12px; text-align:center; color:#94a3b8; font-style:italic;">Nenhum histórico inativo de valores de recursos.</div>';
    return;
  }

  container.innerHTML = `
    <table class="resizable-table" style="min-width: 850px;">
      <thead>
        <tr style="background:#f1f5f9; color:#475569;">
          <th style="width:14%">Valor Atualizado</th>
          <th style="width:11%">Periodicidade</th>
          <th style="width:9%">Início</th>
          <th style="width:9%">Fim</th>
          <th style="width:13%">Valor Proporcional</th>
          <th style="width:14%">Instrumento</th>
          <th style="width:10%">Número</th>
          <th style="width:8%">Origem</th>
          <th style="text-align:center; width:12%">Ações</th>
        </tr>
      </thead>
      <tbody>
        ${recursosInativos.map(i => `
          <tr style="color:#64748b;">
            <td><strong>${formatarMoedaBR(i.valorAtualizado)}</strong></td>
            <td>${i.periodicidade}</td>
            <td>${i.inicio}</td>
            <td>${i.fim}</td>
            <td>${formatarMoedaBR(i.valorProporcional)}</td>
            <td>${i.instrumento}</td>
            <td>${i.numero}</td>
            <td><span style="background:#e2e8f0; padding:2px 6px; border-radius:3px; font-weight:bold; font-size:10px;">${i.origem}</span></td>
            <td style="text-align:center; white-space:nowrap;">
              <div style="display:inline-flex; gap:6px; align-items:center; justify-content:center; width: 100%;">
                <button onclick="abrirModalMotivo('${i.id}')" class="btn-square-gray" title="Ver Motivo da Inativação">${iconEye}</button>
                ${isEdit ? `<button onclick="reativar('${i.id}')" class="btn-reativar" title="Reativar Recurso">${iconRefresh} Reativar</button>` : ''}
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// REDIMENSIONAMENTO DE COLUNAS DA TABELA
function initResizableColumns() {
  const tables = document.querySelectorAll('.resizable-table');
  tables.forEach(table => {
    const ths = table.querySelectorAll('th');
    ths.forEach(th => {
      if(th.querySelector('.resizer')) return;
      const resizer = document.createElement('div');
      resizer.classList.add('resizer');
      th.appendChild(resizer);
      
      let startX, startW;
      
      resizer.addEventListener('mousedown', function(e) {
        startX = e.clientX;
        startW = th.offsetWidth;
        resizer.classList.add('resizing');
        
        const mouseMoveHandler = function(evt) {
          const newWidth = startW + (evt.clientX - startX);
          th.style.width = `${newWidth}px`;
          th.style.minWidth = `${newWidth}px`;
        };
        
        const mouseUpHandler = function() {
          resizer.classList.remove('resizing');
          document.removeEventListener('mousemove', mouseMoveHandler);
          document.removeEventListener('mouseup', mouseUpHandler);
        };
        
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
      });
    });
  });
}

// MODAL GLOBAL DE CONFIRMAÇÃO
function abrirConfirmacao(tipo, pId, fId = null) {
  acaoPendente = { tipo, pId, fId };
  const titulo = document.getElementById('modalConfirmTitle');
  const desc = document.getElementById('modalConfirmDesc');
  const auditSection = document.getElementById('modalAuditSection');
  const btnConfirmar = document.getElementById('btnConfirmarAcao');

  const inputMotivo = document.getElementById('inputMotivo');
  if(inputMotivo) inputMotivo.value = '';
  
  const now = new Date();
  const inputAuditData = document.getElementById('inputAuditData');
  if(inputAuditData) inputAuditData.value = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});

  if (tipo === 'excluir_pai' || tipo === 'excluir_fracao') {
    if(titulo) titulo.innerHTML = '🗑️ Confirmar Exclusão';
    if(desc) desc.innerHTML = 'Você deseja realmente excluir esta informação? Esta ação ficará registrada.';
    if(auditSection) auditSection.classList.remove('hidden');
    if(btnConfirmar) {
      btnConfirmar.className = 'btn-modal-danger';
      btnConfirmar.innerHTML = 'Excluir';
    }
  } else if (tipo === 'inativar_pai') {
    if(titulo) titulo.innerHTML = '⚠️ Confirmar Inativação';
    if(desc) desc.innerHTML = 'Você deseja inativar este recurso? Ele será movido para o histórico de inativos.';
    if(auditSection) auditSection.classList.remove('hidden');
    if(btnConfirmar) {
      btnConfirmar.className = 'btn-modal-danger';
      btnConfirmar.innerHTML = 'Inativar';
    }
  } else if (tipo === 'salvar_pai' || tipo === 'salvar_fracao') {
    if(titulo) titulo.innerHTML = '💾 Salvar Alterações';
    if(desc) desc.innerHTML = 'Você deseja finalizar a edição e salvar essas alterações?';
    if(auditSection) auditSection.classList.add('hidden');
    if(btnConfirmar) {
      btnConfirmar.className = 'btn-modal-pri';
      btnConfirmar.innerHTML = 'Sim, Salvar';
    }
  }

  const modalConf = document.getElementById('modalConfirmacao');
  if(modalConf) modalConf.classList.remove('hidden');
}

function fecharModalConfirmacao() {
  const modalConf = document.getElementById('modalConfirmacao');
  if(modalConf) modalConf.classList.add('hidden');
  acaoPendente = null;
}

function executarAcaoConfirmada() {
  if (!acaoPendente) return;
  const { tipo, pId, fId } = acaoPendente;
  const auditSection = document.getElementById('modalAuditSection');
  const inputMotivo = document.getElementById('inputMotivo');

  if (auditSection && !auditSection.classList.contains('hidden') && inputMotivo && inputMotivo.value.trim() === '') {
    alert('Por favor, preencha o motivo para prosseguir (obrigatório para auditoria).');
    return;
  }

  if (tipo === 'excluir_pai') {
    recursosAtivos = recursosAtivos.filter(x => x.id !== pId);
    mostrarToast("Recurso excluído com sucesso.");
  } 
  else if (tipo === 'excluir_fracao') {
    const p = recursosAtivos.find(x => x.id === pId);
    if (p) p.fracoes = p.fracoes.filter(x => x.id !== fId);
    mostrarToast("Fração excluída com sucesso.");
  } 
  else if (tipo === 'inativar_pai') {
    const idx = recursosAtivos.findIndex(x => x.id === pId);
    if (idx !== -1) {
      const item = recursosAtivos.splice(idx, 1)[0];
      item.editando = false;
      item.motivoAuditoria = inputMotivo ? inputMotivo.value.trim() || 'Não informado' : 'Não informado';
      const inputAuditData = document.getElementById('inputAuditData');
      item.dataAcao = inputAuditData ? inputAuditData.value : '';
      item.operador = 'Guilherme Alves Braga'; 
      
      recursosInativos.push(item);
      mostrarToast("Recurso inativado com sucesso.");
    }
  } 
  else if (tipo === 'salvar_pai') {
    salvarEdicaoPai(pId);
  } 
  else if (tipo === 'salvar_fracao') {
    salvarEdicaoFracao(pId, fId);
  }

  fecharModalConfirmacao();
  renderizar();
}

// MODAL DE VISUALIZAR MOTIVO (INATIVOS)
function abrirModalMotivo(id) {
  const item = recursosInativos.find(x => x.id === id);
  if(!item) return;

  const vData = document.getElementById('viewMotivoData');
  const vOp = document.getElementById('viewMotivoOperador');
  const vTxt = document.getElementById('viewMotivoTexto');

  if(vData) vData.value = item.dataAcao || 'Não registrada';
  if(vOp) vOp.value = item.operador || 'Sistema';
  if(vTxt) vTxt.value = item.motivoAuditoria || 'Motivo não informado.';

  const modalM = document.getElementById('modalVerMotivo');
  if(modalM) modalM.classList.remove('hidden');
}

function fecharModalMotivo() {
  const modalM = document.getElementById('modalVerMotivo');
  if(modalM) modalM.classList.add('hidden');
}

// MODAL DE OBSERVAÇÃO
function abrirModalObservacao(pId, fId) {
  const p = recursosAtivos.find(x => x.id === pId);
  const f = p?.fracoes.find(x => x.id === fId);
  if (!f) return;
  const obsTexto = f.obs || 'Nenhuma observação registrada.';
  const txtObs = document.getElementById('textoModalObservacao');
  if(txtObs) txtObs.value = obsTexto;
  
  const modalObs = document.getElementById('modalLerObservacao');
  if(modalObs) modalObs.classList.remove('hidden');
}

function fecharModalObservacao() {
  const modalObs = document.getElementById('modalLerObservacao');
  if(modalObs) modalObs.classList.add('hidden');
}

function copiarDoModalObservacao() {
  const texto = document.getElementById('textoModalObservacao').value;
  navigator.clipboard.writeText(texto).then(() => {
    mostrarToast("Observação copiada com sucesso!");
  });
}

// FUNÇÕES DE EDIÇÃO
function ativarEdicaoPai(id) {
  const r = recursosAtivos.find(x => x.id === id);
  if (r) r.editando = true;
  renderizar();
}

function salvarEdicaoPai(id) {
  const r = recursosAtivos.find(x => x.id === id);
  if (r) {
    const elPer = document.getElementById(`p_per_${id}`);
    const elIni = document.getElementById(`p_ini_${id}`);
    const elFim = document.getElementById(`p_fim_${id}`);
    const elVal = document.getElementById(`p_val_${id}`);
    const elInst = document.getElementById(`p_inst_${id}`);
    const elNum = document.getElementById(`p_num_${id}`);

    if(elPer) r.periodicidade = elPer.value;
    if(elIni) r.inicio = elIni.value;
    if(elFim) r.fim = elFim.value;
    if(elVal) r.valorProporcional = parseCurrency(elVal.value);
    if(elInst) r.instrumento = elInst.value;
    if(elNum) r.numero = elNum.value;
    
    r.origem = 'Manual';
    r.editando = false;
    mostrarToast("Recurso salvo com sucesso!");
  }
}

function ativarEdicaoFracao(pId, fId) {
  const p = recursosAtivos.find(x => x.id === pId);
  const f = p?.fracoes.find(x => x.id === fId);
  if (f) f.editando = true;
  renderizar();
}

function salvarEdicaoFracao(pId, fId) {
  const p = recursosAtivos.find(x => x.id === pId);
  const f = p?.fracoes.find(x => x.id === fId);
  if (f) {
    const elUo = document.getElementById(`f_uo_${fId}`);
    const elRec = document.getElementById(`f_rec_${fId}`);
    const elNad = document.getElementById(`f_nad_${fId}`);
    const elPer = document.getElementById(`f_per_${fId}`);
    const elPct = document.getElementById(`f_pct_${fId}`);
    const elVal = document.getElementById(`f_val_${fId}`);
    const elObs = document.getElementById(`f_obs_${fId}`);

    if(elUo) f.uo = elUo.value;
    if(elRec) f.recurso = elRec.value;
    if(elNad) f.nad = elNad.value;
    if(elPer) f.periodo = elPer.value;
    if(elPct) f.pct = parseFloat(elPct.value.replace(',', '.')) || 0;
    if(elVal) f.val = parseCurrency(elVal.value);
    if(elObs) f.obs = elObs.value;

    p.origem = 'Manual';
    f.editando = false;
    mostrarToast("Fração salva com sucesso!");
  }
}

function toggleProjExpand(rId, pCode) {
  const r = recursosAtivos.find(x => x.id === rId);
  if(r) {
    if (!r.projetosExpandidos) r.projetosExpandidos = {};
    r.projetosExpandidos[pCode] = !r.projetosExpandidos[pCode];
    renderizar();
  }
}

// MODAL DE PROJETO
function abrirModalProjeto(parentId) {
  parentRecursoAtivoId = parentId;
  const parent = recursosAtivos.find(x => x.id === parentId);
  if (!parent) return;

  const select = document.getElementById('selectProjetoExistente');
  if(!select) return;
  select.innerHTML = '';
  
  const projsExistentes = [...new Set(parent.fracoes.map(f => f.projeto))];
  projsExistentes.forEach(p => {
    select.innerHTML += `<option value="${p}">Pertence ao PROJETO: ${p}</option>`;
  });

  select.innerHTML += `<option value="NOVO_PROJETO">➕ Criar Novo Projeto</option>`;

  toggleNovoProjInput(select.value);
  const modalSel = document.getElementById('modalSelectProjeto');
  if(modalSel) modalSel.classList.remove('hidden');
}

function toggleNovoProjInput(val) {
  const gNovo = document.getElementById('groupNovoProjCode');
  if(gNovo) gNovo.classList.toggle('hidden', val !== 'NOVO_PROJETO');
}

function fecharModalProjeto() {
  const modalSel = document.getElementById('modalSelectProjeto');
  if(modalSel) modalSel.classList.add('hidden');
  const inputCode = document.getElementById('inputNovoProjCode');
  if(inputCode) inputCode.value = '';
}

function confirmarAdicionarFracao() {
  const parent = recursosAtivos.find(x => x.id === parentRecursoAtivoId);
  if (!parent) return;

  const selectEl = document.getElementById('selectProjetoExistente');
  if(!selectEl) return;
  const selVal = selectEl.value;
  let codigoProj = selVal;

  if (selVal === 'NOVO_PROJETO') {
    const inputCode = document.getElementById('inputNovoProjCode');
    codigoProj = (inputCode && inputCode.value.trim()) ? inputCode.value.trim() : '3924';
  }

  if (!parent.projetosExpandidos) parent.projetosExpandidos = {};
  parent.projetosExpandidos[codigoProj] = true;

  parent.origem = 'Manual';
  parent.fracoes.push({
    id: 'f_' + Date.now(),
    projeto: codigoProj,
    uo: '1490',
    recurso: '1169',
    nad: '',
    periodo: '',
    pct: 0,
    val: 0,
    obs: '',
    editando: true
  });

  fecharModalProjeto();
  renderizar();
}

// MODAL NOVO RECURSO PAI
function abrirModalNovoRecurso() {
  const mNovo = document.getElementById('modalNovoRecurso');
  if(mNovo) mNovo.classList.remove('hidden');
}

function fecharModalNovoRecurso() {
  const mNovo = document.getElementById('modalNovoRecurso');
  if(mNovo) mNovo.classList.add('hidden');
  
  const el1 = document.getElementById('inputNewValorAtu');
  const el2 = document.getElementById('inputNewValorProp');
  const el3 = document.getElementById('inputNewInicio');
  const el4 = document.getElementById('inputNewFim');
  const el5 = document.getElementById('inputNewNumero');
  
  if(el1) el1.value = '';
  if(el2) el2.value = '';
  if(el3) el3.value = '';
  if(el4) el4.value = '';
  if(el5) el5.value = '';
}

function confirmarNovoRecurso() {
  const elValAtu = document.getElementById('inputNewValorAtu');
  const elValProp = document.getElementById('inputNewValorProp');
  const elPer = document.getElementById('selectNewPeriodicidade');
  const elInst = document.getElementById('selectNewInstrumento');
  const elIni = document.getElementById('inputNewInicio');
  const elFim = document.getElementById('inputNewFim');
  const elNum = document.getElementById('inputNewNumero');

  const valorAtu = parseCurrency(elValAtu ? elValAtu.value : 0);
  const valorProp = parseCurrency(elValProp ? elValProp.value : 0);
  const periodicidade = elPer ? elPer.value : 'Mensal';
  const instrumento = elInst ? elInst.value : 'Aditivo';
  const inicio = elIni ? elIni.value.trim() : '';
  const fim = elFim ? elFim.value.trim() : '';
  const num = (elNum && elNum.value.trim()) ? elNum.value.trim() : '1';

  recursosAtivos.push({
    id: 'r_' + Date.now(),
    valorAtualizado: valorAtu,
    periodicidade: periodicidade !== 'Selecione...' ? periodicidade : 'Anual',
    inicio: inicio,
    fim: fim,
    valorProporcional: valorProp,
    instrumento: instrumento !== 'Selecione...' ? instrumento : 'Aditivo',
    numero: num,
    origem: 'Manual',
    expandido: true,
    editando: false,
    projetosExpandidos: {},
    fracoes: []
  });

  fecharModalNovoRecurso();
  renderizar();
  mostrarToast("Novo recurso criado com sucesso!");
}

function reativar(id) {
  const idx = recursosInativos.findIndex(x => x.id === id);
  if (idx !== -1) {
    const item = recursosInativos.splice(idx, 1)[0];
    item.expandido = true;
    item.editando = true;
    if (!item.fracoes) item.fracoes = [];
    if (!item.projetosExpandidos) item.projetosExpandidos = {};
    recursosAtivos.push(item);
    renderizar();
  }
}

function toggleE(id) {
  const v = recursosAtivos.find(x => x.id === id);
  if (v) v.expandido = !v.expandido;
  renderizar();
}

window.onload = function() {
  alternarModo('visualizar');
};