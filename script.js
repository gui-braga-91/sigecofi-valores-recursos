// ====================================================
// VARIÁVEIS DE ESTADO GLOBAL
// ====================================================
let modo = 'visualizar';
let abaAtiva = 'valores';
let parentRecursoAtivoId = null;
let acaoPendente = null;
let inativosExpandido = false;
// Ajuste B1 (Guilherme, 06/08/2026): tratamento visual das frações — A tabela | B barras | C lista plana
let tratamentoAtivo = 'A';
// Passo 15 (Sabrina + Ana Paula, 02/09/2026): log central de acoes destrutivas (exclusao/inativacao).
// Cada entrada guarda tipo, alvo, motivo obrigatorio, operador e carimbo imutavel de data/hora.
let logAcoes = [];
function registrarLogAcao(tipo, alvo, motivo) {
  const now = new Date();
  logAcoes.push({
    id: 'log_' + now.getTime(),
    tipo: tipo,
    alvo: alvo,
    motivo: motivo || 'Nao informado',
    operador: 'Guilherme Alves Braga',
    quando: now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})
  });
}
// Ajuste A2 (Guilherme, 06/08/2026): cards editáveis SEMPRE (não só no Modo Editar).
// null = usa cálculo automático; número = override manual (perfil DICAF).
let valorAExecutarManual = null;
let saldoNaoExecutavelManual = null;
let saldoAcrescimoManual = null;

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

// UTILITÁRIOS GERAIS
function mostrarToast(mensagem) {
  const toast = document.getElementById('toastBox');
  if(!toast) return;
  document.getElementById('toastMsg').textContent = mensagem;
  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); }, 2000);
}

function formatarMoedaBR(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseCurrency(str) {
  if(typeof str === 'number') return str;
  let num = str.replace(/[R$\s\.]/g, '').replace(',', '.');
  return parseFloat(num) || 0;
}

// Ajuste (Guilherme, 06/08/2026): portado do standalone — dropdowns de Periodicidade e Instrumento.
// Opções padronizadas para bater com o cadastro do SIGECOFI/DICAF.
// Passo 15 (Sabrina + Ana Paula, 02/09/2026): "Horas" agora e periodicidade valida.
// Quando o instrumento e "Horas", o sistema exibe colunas Qtd Horas / Valor da Hora / Horas Totais
// e passa a calcular o Valor Proporcional pela soma dos valores fracionados (Horas x Valor/hora).
const OPCOES_PERIODICIDADE = ['Mensal', 'Trimestral', 'Semestral', 'Anual', 'Horas', 'Unitário', 'Escopo', 'SEM CUSTOS', 'Não informado'];
function ehInstrumentoPorHoras(item) {
  if(!item) return false;
  if(item.modalidade === 'horas') return true;
  return String(item.periodicidade || '').trim().toLowerCase() === 'horas';
}
const OPCOES_INSTRUMENTO = ['Apostila', 'Aditivo (Alteração Quantitativo)', 'Aditivo (Alteração Valor)', 'Aditivo (Alterações Diversas)', 'Aditivo (Prorrogação)', 'Aditivo (Repactuação)', 'Aditivo', 'Contrato Original'];
function _escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function getOptionsPeriodicidade(atual) {
  const listaFinal = OPCOES_PERIODICIDADE.slice();
  if(atual && !listaFinal.includes(atual)) listaFinal.unshift(atual); // preserva valor custom (ex.: 'Parcial')
  return listaFinal.map(op => `<option value="${_escHtml(op)}"${op === atual ? ' selected' : ''}>${_escHtml(op)}</option>`).join('');
}
function getOptionsInstrumento(atual) {
  const listaFinal = OPCOES_INSTRUMENTO.slice();
  if(atual && !listaFinal.includes(atual)) listaFinal.unshift(atual);
  return listaFinal.map(op => `<option value="${_escHtml(op)}"${op === atual ? ' selected' : ''}>${_escHtml(op)}</option>`).join('');
}

// RN-01 · Vigência Proporcional
// Ajuste A3 (Guilherme, 06/08/2026): fórmula alterada após feedback de colega.
// Proporcional = ValorTotal × (meses_reais_de_vigencia / meses_previstos_do_instrumento).
// - "Meses reais" = meses completos entre inicio e fim + fração (dias restantes / 30).
// - "Meses previstos" = duração planejada original do instrumento (necessário quando há corte
//   temporal por apostila — ajuste 1.6 futuro). Sem corte, meses_reais = meses_previstos e
//   o Proporcional = Total do instrumento (valorAtualizado).
// - ValorAtualizado é interpretado como TOTAL do instrumento (não anual).
function parseDataBR(str) {
  if(!str || typeof str !== 'string') return null;
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if(!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}
function calcularDiasEntre(inicioStr, fimStr) {
  const ini = parseDataBR(inicioStr);
  const fim = parseDataBR(fimStr);
  if(!ini || !fim) return 0;
  const MS = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.round((fim - ini) / MS) + 1);
}
function calcularMesesEntre(inicioStr, fimStr) {
  const ini = parseDataBR(inicioStr);
  const fim = parseDataBR(fimStr);
  if(!ini || !fim) return 0;
  let meses = (fim.getFullYear() - ini.getFullYear()) * 12 + (fim.getMonth() - ini.getMonth());
  const diasRestantes = fim.getDate() - ini.getDate();
  meses += diasRestantes / 30;
  return Math.max(0, meses);
}
function calcularProporcionalPorMeses(valorTotal, inicioStr, fimStr, mesesPrevistos) {
  const mesesReais = calcularMesesEntre(inicioStr, fimStr);
  const previstos = (mesesPrevistos && mesesPrevistos > 0) ? mesesPrevistos : mesesReais;
  if(previstos === 0) return valorTotal;
  return valorTotal * (mesesReais / previstos);
}
// Ajuste C1: modalidade 'horas' — Proporcional = horasContratadas × valorHora.
function calcularProporcionalPorHoras(horasContratadas, valorHora) {
  return (Number(horasContratadas) || 0) * (Number(valorHora) || 0);
}
// Passo 14 (Guilherme, 01/09/2026 — reunião Ana Paula): ordenação padrão
// Ordem: Contrato Original → Aditivos (número asc) → Apostilas / Termo de Apostila (número asc)
function _ordemInstrumento(nome) {
  const n = (nome || '').toLowerCase();
  if(n.includes('contrato original')) return 0;
  if(n.includes('aditivo')) return 1;
  if(n.includes('apostila')) return 2;
  return 3;
}
function _ordenaInstrumento(a, b) {
  const oa = _ordemInstrumento(a.instrumento);
  const ob = _ordemInstrumento(b.instrumento);
  if(oa !== ob) return oa - ob;
  // Dentro do mesmo tipo, ordena por número (ex: Aditivo 1 < Aditivo 2 < Aditivo 10)
  const na = parseInt(String(a.numero || '').match(/\d+/)?.[0] || '0', 10);
  const nb = parseInt(String(b.numero || '').match(/\d+/)?.[0] || '0', 10);
  if(na !== nb) return na - nb;
  // Empate: usa data de início
  const da = parseDataBR(a.inicio); const db = parseDataBR(b.inicio);
  if(da && db) return da - db;
  return 0;
}

function recalcularProporcionaisAtivos() {
  if(!Array.isArray(recursosAtivos)) return;
  recursosAtivos.forEach(item => {
    // Passo 15 (Sabrina + Ana Paula, 02/09/2026): quando periodicidade = "Horas",
    // o Valor Proporcional passa a ser a SOMA dos valores fracionados (Qtd x Valor/hora).
    if(ehInstrumentoPorHoras(item)) {
      const somaFracs = (item.fracoes || []).reduce((s, f) => {
        const v = (Number(f.qtdHoras)||0) * (Number(f.valorHora)||0);
        return s + (v > 0 ? v : (Number(f.val)||0));
      }, 0);
      if(somaFracs > 0) {
        item.valorProporcional = somaFracs;
      } else if(item.horasContratadas && item.valorHora) {
        item.valorProporcional = calcularProporcionalPorHoras(item.horasContratadas, item.valorHora);
      }
    } else {
      item.valorProporcional = calcularProporcionalPorMeses(
        item.valorAtualizado, item.inicio, item.fim, item.mesesPrevistos
      );
    }
  });
  // Valor Acumulado do Contrato = soma dos Valores Proporcionais ativos
  const tot = recursosAtivos.reduce((s, r) => s + (Number(r.valorProporcional) || 0), 0);
  const elTot = document.getElementById('txtTotalAcumulado');
  if(elTot) elTot.textContent = formatarMoedaBR(tot);
}

// Passo 14 (Guilherme, 02/09/2026): catálogo institucional de Recursos (fontes contábeis)
const RECURSOS_CATALOG = {
  '001':  'Tesouro Livre',
  '0377': 'Profisco',
  '1169': 'Funsefaz'
};
function nomeRecursoFromCode(cod) {
  if(!cod) return '';
  const key = String(cod).trim();
  return RECURSOS_CATALOG[key] || RECURSOS_CATALOG[key.replace(/^0+/, '')] || '';
}
// Ajuste 1.5 (Ana Paula, 05/08/2026): campo Recurso exibido como "[Número] - [Nome]".
// Passo 14 (Guilherme, 02/09/2026): se o código bater no catálogo, o nome vem de lá.
function formatarRecursoLabel(f) {
  const cod = f && f.recurso ? String(f.recurso).trim() : '';
  const catalogo = nomeRecursoFromCode(cod);
  const nome = catalogo || (f && f.nomeRecurso) || 'RECURSO A DEFINIR';
  return (cod ? cod : '') + ' - ' + nome;
}

// Ajuste B1 (Guilherme, 06/08/2026): cor determinística por projeto (usada em barras/modos B e C)
function corProjeto(pCode) {
  const paleta = ['#005F73', '#0ea5e9', '#14b8a6', '#64748b', '#f97316', '#8b5cf6'];
  let h = 0;
  const s = String(pCode || '');
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i)) & 0xff;
  return paleta[h % paleta.length];
}
function agruparFracoesPorProjeto(fracoes) {
  const g = {};
  const ordem = [];
  fracoes.forEach(f => {
    if(!g[f.projeto]) { g[f.projeto] = []; ordem.push(f.projeto); }
    g[f.projeto].push(f);
  });
  return ordem.map(pCode => ({ pCode, itens: g[pCode] }));
}

// Tratamento B · Barras de cota — grid de cards por projeto, com barra de progresso da %.
function renderFracoesModoB(item) {
  const grupos = agruparFracoesPorProjeto(item.fracoes || []);
  if(grupos.length === 0) {
    return `<div style="padding:16px; text-align:center; color:#94a3b8; font-style:italic;">Sem frações cadastradas neste instrumento.</div>`;
  }
  return `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
      <span style="font-weight:bold; color:#005F73; font-size:12px;">DETALHAMENTO DE FRACIONAMENTO — Barras de cota</span>
    </div>
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(230px, 1fr)); gap:12px;">
      ${grupos.map(g => {
        const cor = corProjeto(g.pCode);
        const somaVal = g.itens.reduce((s,f) => s + (f.val || 0), 0);
        const somaPct = g.itens.reduce((s,f) => s + (f.pct || 0), 0);
        const somaPctFmt = (somaPct % 1 === 0 ? somaPct : parseFloat(somaPct.toFixed(2))).toString().replace('.', ',');
        const barW = Math.min(100, somaPct);
        return `
          <div style="background:#fff; border:1px solid #cbd5e1; border-radius:6px; padding:12px; display:flex; flex-direction:column; gap:8px;">
            <div style="font-size:9px; color:#94a3b8; letter-spacing:1px;">PROJETO</div>
            <div style="font-size:22px; font-weight:bold; color:${cor}; line-height:1;">${g.pCode}</div>
            <div style="font-size:13px; font-weight:bold; color:#005F73;">${formatarMoedaBR(somaVal)}</div>
            <div style="font-size:11px; color:#64748b;">${somaPctFmt}% · ${g.itens.length} fração(ões)</div>
            <div style="height:8px; background:#e2e8f0; border-radius:4px; overflow:hidden;">
              <div style="width:${barW}%; background:${cor}; height:100%;"></div>
            </div>
            <ul style="margin:8px 0 0; padding:0; list-style:none; font-size:11px; color:#334155;">
              ${g.itens.map(f => {
                const pctStr = (f.pct % 1 === 0 ? f.pct : parseFloat(f.pct.toFixed(2))).toString().replace('.', ',');
                return `
                  <li style="padding:6px 0; border-top:1px solid #f1f5f9;">
                    <div style="display:flex; align-items:center; gap:6px;">
                      <span style="display:inline-block; width:8px; height:8px; background:${cor}; border-radius:2px;"></span>
                      <span><strong>UO ${f.uo}</strong> · Rec ${f.recurso}</span>
                    </div>
                    <div style="color:#64748b; margin-left:14px; font-size:10px;">${f.area || '—'} · ${f.nad} · ${f.periodo}</div>
                    <div style="margin-left:14px; margin-top:2px;"><strong>${pctStr}%</strong> · ${formatarMoedaBR(f.val)}</div>
                  </li>
                `;
              }).join('')}
            </ul>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Tratamento C · Lista plana — chips no topo + tabela plana com barra de cota em cada linha.
function renderFracoesModoC(item) {
  const grupos = agruparFracoesPorProjeto(item.fracoes || []);
  if(grupos.length === 0) {
    return `<div style="padding:16px; text-align:center; color:#94a3b8; font-style:italic;">Sem frações cadastradas neste instrumento.</div>`;
  }
  const chips = grupos.map(g => {
    const cor = corProjeto(g.pCode);
    const somaPct = g.itens.reduce((s,f) => s + (f.pct || 0), 0);
    const somaPctFmt = (somaPct % 1 === 0 ? somaPct : parseFloat(somaPct.toFixed(2))).toString().replace('.', ',');
    return `<span style="padding:3px 10px; background:#fff; border:1px solid ${cor}; color:${cor}; border-radius:12px; font-weight:bold; font-size:11px;">${g.pCode} · ${somaPctFmt}%</span>`;
  }).join('');
  const linhas = (item.fracoes || []).map(f => {
    const cor = corProjeto(f.projeto);
    const pctStr = (f.pct % 1 === 0 ? f.pct : parseFloat(f.pct.toFixed(2))).toString().replace('.', ',');
    const barW = Math.min(100, f.pct);
    return `
      <tr>
        <td style="font-weight:bold; color:${cor};">${f.projeto}</td>
        <td>${f.uo}</td>
        <td>${f.area || '—'}</td>
        <td>${formatarRecursoLabel(f)}</td>
        <td style="color:#64748b; font-size:11px;">${f.nad}</td>
        <td style="min-width:140px;">
          <div style="height:8px; background:#e2e8f0; border-radius:4px; overflow:hidden;">
            <div style="width:${barW}%; background:${cor}; height:100%;"></div>
          </div>
        </td>
        <td style="text-align:right; font-weight:bold;">${pctStr}%</td>
        <td style="text-align:right; font-weight:bold; color:#005F73;">${formatarMoedaBR(f.val)}</td>
      </tr>
    `;
  }).join('');
  return `
    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
      <span style="font-weight:bold; color:#64748b; font-size:11px; letter-spacing:1px;">COTAS</span>
      ${chips}
    </div>
    <div class="table-responsive">
      <table class="resizable-table" style="min-width:800px; background:#fff; border:1px solid #c0dde5;">
        <thead>
          <tr style="background:#f8fafc; color:#334155; font-size:11px;">
            <th style="width:8%;">Projeto</th>
            <th style="width:8%;">UO</th>
            <th style="width:10%;">Área</th>
            <th style="width:22%;">Recurso</th>
            <th style="width:14%;">NAD</th>
            <th style="width:18%;">Cota</th>
            <th style="width:8%; text-align:right;">%</th>
            <th style="width:12%; text-align:right;">Valor Fracionado</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
  `;
}

// Ajuste 1.3 (Ana Paula, 05/08/2026): frações incidem sobre o Valor Proporcional.
// As dinâmicas (syncFractionFromPct/FromVal) já usam p.valorProporcional; esta
// função só recalcula os valores hardcoded iniciais para bater com o novo proporcional.
function recalcularFracoesAtivas() {
  if(!Array.isArray(recursosAtivos)) return;
  recursosAtivos.forEach(item => {
    if(!Array.isArray(item.fracoes)) return;
    item.fracoes.forEach(f => {
      f.val = (f.pct / 100) * item.valorProporcional;
    });
  });
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

// ====================================================
// NAVEGAÇÃO DE ABAS E MODOS
// ====================================================
// Ajuste B1: alterna entre os 3 tratamentos visuais da aba Valores e Recursos
function setTratamento(t) {
  // Passo 15 (Sabrina + Ana Paula, 02/09/2026): opção B removida; se solicitada, cai para A
  if(t === 'B') t = 'A';
  if(t !== 'A' && t !== 'C') return;
  tratamentoAtivo = t;
  ['A','C'].forEach(x => {
    const btn = document.getElementById('btnTrat' + x);
    if(btn) btn.classList.toggle('tratamento-ativo', x === t);
  });
  renderizarValoresAtivos();
}

// Passo 1 (Guilherme, 19/08/2026): 9 abas, mapa unificado tab-id ↔ content-id
const MAPA_ABAS = {
  'dados':               { tab: 'tab-dados',       content: 'content-dados' },
  'contratados':         { tab: 'tab-contratados', content: 'content-contratados' },
  'evolucao_contratual': { tab: 'tab-evolucao',    content: 'content-evolucao_contratual' },
  'processos':           { tab: 'tab-processos',   content: 'content-processos' },
  'atores':              { tab: 'tab-atores',      content: 'content-atores' },
  'garantias':           { tab: 'tab-garantias',   content: 'content-garantias' },
  'valores':             { tab: 'tab-valores',     content: 'content-valores' },
  'diario':              { tab: 'tab-diario',      content: 'content-diario' },
  'execucao':            { tab: 'tab-execucao',    content: 'content-execucao' }
};
function mudarAba(aba) {
  if(!MAPA_ABAS[aba]) return;
  abaAtiva = aba;
  Object.values(MAPA_ABAS).forEach(m => {
    const tab = document.getElementById(m.tab);
    const content = document.getElementById(m.content);
    if(tab) tab.classList.remove('tab-active');
    if(content) content.classList.add('hidden');
  });
  const alvo = MAPA_ABAS[aba];
  document.getElementById(alvo.tab)?.classList.add('tab-active');
  document.getElementById(alvo.content)?.classList.remove('hidden');
  renderizar();
}

function alternarModoGeral(modoAtual) {
  modo = modoAtual;
  const isEdit = modo === 'editar';
  // Passo 2b (Guilherme, 20/08/2026): estado global no body para CSS bloquear/liberar campos
  document.body.classList.toggle('modo-app-visualizar', !isEdit);
  document.body.classList.toggle('modo-app-editar', isEdit);

  // Passo 3b (Guilherme, 20/08/2026): botão único no cabeçalho alterna e mostra o AVISO do outro modo:
  //   - Em Visualizar → botão mostra "✏️ Editar" (o que ele fará ao ser clicado)
  //   - Em Editar → botão mostra "👁️ Visualizar"
  // Passo 13 (Guilherme, 28/08/2026): botão do cabeçalho com SVG limpo (sem emoji)
  const btnTop = document.getElementById('btnTopAction');
  if(btnTop) {
    if(isEdit) {
      btnTop.innerHTML = iconEye + '<span>Visualizar</span>';
      btnTop.className = 'btn-sigecofi-toggle btn-sigecofi-vis-outline';
    } else {
      btnTop.innerHTML = iconPencil + '<span>Editar</span>';
      btnTop.className = 'btn-sigecofi-toggle btn-sigecofi-edit-outline';
    }
  }
  // Passo 5 (Guilherme, 20/08/2026): trava dupla via JS — readonly em text/select/textarea, disabled em checkbox/radio
  const escopos = ['#content-dados', '.top-header-v2'];
  escopos.forEach(sel => {
    document.querySelectorAll(sel + ' input, ' + sel + ' select, ' + sel + ' textarea').forEach(el => {
      const tp = (el.type || '').toLowerCase();
      if(tp === 'checkbox' || tp === 'radio') {
        el.disabled = !isEdit;
      } else {
        el.readOnly = !isEdit;
        if(el.tagName === 'SELECT') el.disabled = !isEdit;
      }
    });
  });

  const hVis = document.getElementById('headerVis');
  const hEdit = document.getElementById('headerEdit');
  const bNovo = document.getElementById('btnNovoRec');
  const bEmp = document.getElementById('btnNovoEmpenho');

  if(hVis) hVis.classList.toggle('hidden', isEdit);
  if(hEdit) hEdit.classList.toggle('hidden', !isEdit);
  if(bNovo) bNovo.classList.toggle('hidden', !isEdit);
  if(bEmp) bEmp.classList.toggle('hidden', !isEdit);

  // Passo 15 (Sabrina + Ana Paula, 02/09/2026): switch de tratamento so em Modo Visualizar
  document.querySelectorAll('.tratamento-switch.modo-visualizar').forEach(el => el.classList.toggle('hidden', isEdit));
  // Ao entrar em Modo Editar, força tratamento A (Tabela) para não trazer o modo C dentro do editor
  if(isEdit && typeof setTratamento === 'function' && tratamentoAtivo !== 'A') setTratamento('A');

  if (!isEdit) {
    recursosAtivos.forEach(r => {
      r.editando = false;
      r.fracoes.forEach(f => f.editando = false);
    });
    empenhosAtivos.forEach(e => {
      e.editando = false;
      e.parcelas.forEach(p => p.editando = false);
    });
  }

  renderizar();
}

function cliqueBotaoTopo() {
  alternarModoGeral(modo === 'editar' ? 'visualizar' : 'editar');
}

function renderizar() {
  if(abaAtiva === 'valores') {
    renderizarValoresAtivos();
    renderizarInativos();
  } else if(abaAtiva === 'execucao') {
    renderizarExecucaoFinanceira();
  } else if(abaAtiva === 'dados') {
    renderDadosGerais();
  } else if(abaAtiva === 'contratados') {
    renderContratados();
  } else if(abaAtiva === 'evolucao_contratual') {
    renderEvolucao();
  } else if(abaAtiva === 'processos') {
    renderProcessos();
  } else if(abaAtiva === 'atores') {
    renderAtores();
  } else if(abaAtiva === 'garantias') {
    renderGarantias();
  } else if(abaAtiva === 'diario') {
    renderDiario();
  }
  initResizableColumns();
}

// ====================================================
// LÓGICA DA ABA 1: VALORES E RECURSOS
// ====================================================
// Ajuste C1+D2 (Guilherme, 06/08/2026): dados reais do contrato SUPERINTEROP (2024/021969) e modalidade horas.
// Modalidade "horas": contrato de TI/consultoria — Proporcional = horasContratadas × valorHora (bate com valorAtualizado).
// Cotização típica: 3920=46,07%, 3921=15,73%, 3922=15,73%, 3923=22,47%. Apostila adiciona 3919=9% e redistribui.
let recursosAtivos = [
  {
    id: 'r1',
    valorAtualizado: 3509875.20,
    periodicidade: 'Anual',
    inicio: '09/09/2024',
    fim: '09/09/2025',
    valorProporcional: 3509875.20,
    instrumento: 'Contrato Original',
    numero: '2024/021969',
    origem: 'Automático',
    modalidade: 'horas',
    horasContratadas: 34176,
    valorHora: 102.70,
    expandido: true,
    editando: false,
    projetosExpandidos: { '3920': true, '3921': false, '3922': false, '3923': false },
    fracoes: [
      { id: 'r1f1', projeto: '3920', uo: '1490', area: 'DETIC',   recurso: '1169', nomeRecurso: 'RECURSO A DEFINIR', nad: '3.3.90.40.0000', periodo: '09/09/2024 a 09/09/2025', qtdHoras: 15744.88, valorHora: 102.70, pct: 46.07, val: 1616999.50, obs: 'SUPERINTEROP · 15.744,88 horas', editando: false },
      { id: 'r1f2', projeto: '3921', uo: '1490', area: 'TESOURO', recurso: '1169', nomeRecurso: 'RECURSO A DEFINIR', nad: '3.3.90.40.0000', periodo: '09/09/2024 a 09/09/2025', qtdHoras: 5375.88,  valorHora: 102.70, pct: 15.73, val: 552100.37,  obs: 'SUPERINTEROP · 5.375,88 horas',  editando: false },
      { id: 'r1f3', projeto: '3922', uo: '1490', area: 'DETIC',   recurso: '1169', nomeRecurso: 'RECURSO A DEFINIR', nad: '3.3.90.40.0000', periodo: '09/09/2024 a 09/09/2025', qtdHoras: 5375.88,  valorHora: 102.70, pct: 15.73, val: 552100.37,  obs: 'SUPERINTEROP · 5.375,88 horas',  editando: false },
      { id: 'r1f4', projeto: '3923', uo: '1490', area: 'TESOURO', recurso: '1169', nomeRecurso: 'RECURSO A DEFINIR', nad: '3.3.90.40.0000', periodo: '09/09/2024 a 09/09/2025', qtdHoras: 7679.35,  valorHora: 102.70, pct: 22.47, val: 788668.96,  obs: 'SUPERINTEROP · 7.679,35 horas',  editando: false }
    ]
  },
  {
    id: 'r2',
    valorAtualizado: 3773692.51,
    periodicidade: 'Anual',
    inicio: '09/09/2025',
    fim: '09/09/2026',
    valorProporcional: 3773692.51,
    instrumento: 'Aditivo',
    numero: '1',
    origem: 'Automático',
    modalidade: 'horas',
    horasContratadas: 34176,
    valorHora: 110.42,
    expandido: false,
    editando: false,
    projetosExpandidos: {},
    fracoes: [
      { id: 'r2f1', projeto: '3920', uo: '1490', area: 'DETIC',   recurso: '1169', nomeRecurso: 'RECURSO A DEFINIR', nad: '3.3.90.40.0000', periodo: '09/09/2025 a 09/09/2026', qtdHoras: 15744.88, valorHora: 110.42, pct: 46.07, val: 1738679.75, obs: '', editando: false },
      { id: 'r2f2', projeto: '3921', uo: '1490', area: 'TESOURO', recurso: '1169', nomeRecurso: 'RECURSO A DEFINIR', nad: '3.3.90.40.0000', periodo: '09/09/2025 a 09/09/2026', qtdHoras: 5375.88,  valorHora: 110.42, pct: 15.73, val: 593501.83,  obs: '', editando: false },
      { id: 'r2f3', projeto: '3922', uo: '1490', area: 'DETIC',   recurso: '1169', nomeRecurso: 'RECURSO A DEFINIR', nad: '3.3.90.40.0000', periodo: '09/09/2025 a 09/09/2026', qtdHoras: 5375.88,  valorHora: 110.42, pct: 15.73, val: 593501.83,  obs: '', editando: false },
      { id: 'r2f4', projeto: '3923', uo: '1490', area: 'TESOURO', recurso: '1169', nomeRecurso: 'RECURSO A DEFINIR', nad: '3.3.90.40.0000', periodo: '09/09/2025 a 09/09/2026', qtdHoras: 7679.35,  valorHora: 110.42, pct: 22.47, val: 848009.10,  obs: '', editando: false }
    ]
  },
  {
    id: 'r3',
    valorAtualizado: 1240660.03,
    periodicidade: 'Parcial',
    inicio: '12/05/2026',
    fim: '09/09/2026',
    valorProporcional: 1240660.03,
    instrumento: 'Termo de Apostila',
    numero: '1',
    origem: 'Automático',
    modalidade: 'horas',
    horasContratadas: 11235.95,
    valorHora: 110.42,
    expandido: false,
    editando: false,
    projetosExpandidos: {},
    // Apostila adiciona projeto 3919 (9%) e redistribui as demais cotas
    fracoes: [
      { id: 'r3f1', projeto: '3920', uo: '1490', area: 'DETIC',   recurso: '1169', nomeRecurso: 'RECURSO A DEFINIR', nad: '3.3.90.40.0000', periodo: '12/05/2026 a 09/09/2026', qtdHoras: 4494.38, valorHora: 110.42, pct: 40, val: 496264.01, obs: '', editando: false },
      { id: 'r3f2', projeto: '3921', uo: '1490', area: 'TESOURO', recurso: '1169', nomeRecurso: 'RECURSO A DEFINIR', nad: '3.3.90.40.0000', periodo: '12/05/2026 a 09/09/2026', qtdHoras: 2022.47, valorHora: 110.42, pct: 18, val: 223318.81, obs: '', editando: false },
      { id: 'r3f3', projeto: '3922', uo: '1490', area: 'DETIC',   recurso: '1169', nomeRecurso: 'RECURSO A DEFINIR', nad: '3.3.90.40.0000', periodo: '12/05/2026 a 09/09/2026', qtdHoras: 1011.24, valorHora: 110.42, pct: 9,  val: 111659.40, obs: '', editando: false },
      { id: 'r3f4', projeto: '3923', uo: '1490', area: 'TESOURO', recurso: '1169', nomeRecurso: 'RECURSO A DEFINIR', nad: '3.3.90.40.0000', periodo: '12/05/2026 a 09/09/2026', qtdHoras: 2696.63, valorHora: 110.42, pct: 24, val: 297758.41, obs: '', editando: false },
      { id: 'r3f5', projeto: '3919', uo: '1490', area: 'DETIC',   recurso: '1169', nomeRecurso: 'RECURSO A DEFINIR', nad: '3.3.90.40.0000', periodo: '12/05/2026 a 09/09/2026', qtdHoras: 1011.24, valorHora: 110.42, pct: 9,  val: 111659.40, obs: 'Novo projeto entrando via apostila', editando: false }
    ]
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

// Passo 16 (Sabrina + Ana Paula, 02/09/2026): Cálculo Reativo Triangular
// Base: Valor Fracionado = Qtd. Horas × Valor da Hora
// Cenário A: Horas + ValorHora  → calcula Val (e %)
// Cenário B: Val   + ValorHora  → calcula Horas (e %)
// Cenário C: Val   + Horas      → calcula ValorHora (e %)
// Toda alteração cascatea: subtotal do projeto, horas totais do instrumento,
// valor proporcional do instrumento (se por horas) e valor acumulado do contrato.
function _fmtPct(pct) { return (pct % 1 === 0 ? pct : parseFloat(pct.toFixed(2))).toString().replace('.', ','); }
function _fmtHoras(h) { return (Number(h)||0).toLocaleString('pt-BR', {maximumFractionDigits: 2}); }
function _writeInput(id, valor) { const el = document.getElementById(id); if(el && document.activeElement !== el) el.value = valor; }
function _cascataReativa(pId, pCode) {
  atualizarTotaisProjetoDOM(pId, pCode);
  _recalcHorasTotaisInstrumento(pId);
  // Se instrumento é por horas, reconsolida Valor Proporcional e Valor Acumulado
  const item = recursosAtivos.find(r => r.id === pId);
  if(item && ehInstrumentoPorHoras(item)) {
    const soma = (item.fracoes || []).reduce((s, x) => s + (Number(x.val) || 0), 0);
    if(soma > 0) item.valorProporcional = soma;
  }
  const tot = recursosAtivos.reduce((s, r) => s + (Number(r.valorProporcional) || 0), 0);
  const elTot = document.getElementById('txtTotalAcumulado');
  if(elTot) elTot.textContent = formatarMoedaBR(tot);
}
function _syncFracaoTriangulo(f, campoEditado, p) {
  // Regra: preserva o campo recém editado; recalcula os outros a partir dele + do outro campo com valor.
  const horas = Number(f.qtdHoras) || 0;
  const vHora = Number(f.valorHora) || 0;
  const val   = Number(f.val) || 0;
  if(campoEditado === 'horas') {
    if(vHora > 0) f.val = horas * vHora;
    else if(val > 0 && horas > 0) f.valorHora = val / horas;
  } else if(campoEditado === 'valorHora') {
    if(horas > 0) f.val = horas * vHora;
    else if(val > 0 && vHora > 0) f.qtdHoras = val / vHora;
  } else if(campoEditado === 'val') {
    if(vHora > 0) f.qtdHoras = f.val / vHora;
    else if(horas > 0) f.valorHora = f.val / horas;
  }
  // % sempre a partir do Val vs Valor Proporcional
  f.pct = p.valorProporcional ? (f.val / p.valorProporcional) * 100 : 0;
}
function syncFractionFromPct(pId, fId, pCode, el) {
  const p = recursosAtivos.find(x => x.id === pId);
  const f = p.fracoes.find(x => x.id === fId);
  const pct = parseFloat((el.value || '').replace(',', '.')) || 0;
  f.pct = pct;
  f.val = (pct / 100) * (p.valorProporcional || 0);
  // Se tem valor/hora, ajusta horas para manter triangulo consistente
  if(f.valorHora && f.valorHora > 0) f.qtdHoras = f.val / f.valorHora;
  _writeInput('f_val_' + fId, formatarMoedaBR(f.val));
  _writeInput('f_qtdh_' + fId, _fmtHoras(f.qtdHoras));
  _cascataReativa(pId, pCode);
}
function syncFractionFromVal(pId, fId, pCode, el) {
  const p = recursosAtivos.find(x => x.id === pId);
  const f = p.fracoes.find(x => x.id === fId);
  f.val = parseCurrency(el.value);
  _syncFracaoTriangulo(f, 'val', p);
  _writeInput('f_qtdh_' + fId, _fmtHoras(f.qtdHoras));
  _writeInput('f_valh_' + fId, f.valorHora ? formatarMoedaBR(f.valorHora) : '');
  _writeInput('f_pct_'  + fId, _fmtPct(f.pct));
  _cascataReativa(pId, pCode);
}

// Passo 14 (Guilherme, 01/09/2026): handlers dos novos campos Qtd Horas / Valor Hora / Área
function _recalcHorasTotaisInstrumento(pId) {
  const p = recursosAtivos.find(x => x.id === pId); if(!p) return;
  const total = (p.fracoes || []).reduce((s, f) => s + (Number(f.qtdHoras) || 0), 0);
  const el = document.getElementById('p_horas_' + pId);
  if(el) el.textContent = total > 0 ? total.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' h' : '—';
}
function syncFractionFromHoras(pId, fId, pCode, el) {
  const p = recursosAtivos.find(x => x.id === pId);
  const f = p.fracoes.find(x => x.id === fId);
  f.qtdHoras = parseFloat((el.value || '').replace(',', '.')) || 0;
  _syncFracaoTriangulo(f, 'horas', p);
  _writeInput('f_val_'  + fId, formatarMoedaBR(f.val));
  _writeInput('f_valh_' + fId, f.valorHora ? formatarMoedaBR(f.valorHora) : '');
  _writeInput('f_pct_'  + fId, _fmtPct(f.pct));
  _cascataReativa(pId, pCode);
}
function syncFractionFromValorHora(pId, fId, pCode, el) {
  const p = recursosAtivos.find(x => x.id === pId);
  const f = p.fracoes.find(x => x.id === fId);
  f.valorHora = parseCurrency(el.value);
  _syncFracaoTriangulo(f, 'valorHora', p);
  _writeInput('f_val_'  + fId, formatarMoedaBR(f.val));
  _writeInput('f_qtdh_' + fId, _fmtHoras(f.qtdHoras));
  _writeInput('f_pct_'  + fId, _fmtPct(f.pct));
  _cascataReativa(pId, pCode);
}
function atualizarFracaoCampo(pId, fId, campo, valor) {
  const p = recursosAtivos.find(x => x.id === pId);
  const f = p?.fracoes.find(x => x.id === fId);
  if(f) { f[campo] = valor; }
}

// Passo 14 (Guilherme, 02/09/2026) — RN-05: Redistribuição Automática
// Ajusta proporcionalmente as % existentes para que a soma feche em 100% do Valor Proporcional.
function redistribuir100(pId) {
  const p = recursosAtivos.find(x => x.id === pId);
  if(!p || !p.fracoes || p.fracoes.length === 0) return;
  const somaPct = p.fracoes.reduce((s, f) => s + (Number(f.pct) || 0), 0);
  if(somaPct <= 0) {
    // sem % informadas: distribui igualmente
    const eq = 100 / p.fracoes.length;
    p.fracoes.forEach(f => {
      f.pct = parseFloat(eq.toFixed(2));
      f.val = (p.valorProporcional || 0) * (f.pct / 100);
    });
  } else {
    const fator = 100 / somaPct;
    p.fracoes.forEach(f => {
      f.pct = parseFloat(((Number(f.pct) || 0) * fator).toFixed(2));
      f.val = (p.valorProporcional || 0) * (f.pct / 100);
    });
  }
  mostrarToast('Frações redistribuídas para 100%.');
  renderizarValoresAtivos();
}

function atualizarTotaisProjetoDOM(pId, pCode) {
  const p = recursosAtivos.find(x => x.id === pId);
  const fracoesDoProjeto = p.fracoes.filter(x => x.projeto === pCode);
  let sumVal = fracoesDoProjeto.reduce((acc, curr) => acc + curr.val, 0);
  let sumPct = fracoesDoProjeto.reduce((acc, curr) => acc + curr.pct, 0);
  sumPct = parseFloat(sumPct.toFixed(2));
  
  const elVal = document.getElementById(`proj_tot_val_${pId}_${pCode}`);
  const elPct = document.getElementById(`proj_tot_pct_${pId}_${pCode}`);
  const elHoras = document.getElementById(`proj_tot_horas_${pId}_${pCode}`);
  if(elVal) elVal.textContent = 'Total: ' + formatarMoedaBR(sumVal);
  if(elPct) elPct.textContent = sumPct + '%';
  if(elHoras) {
    const sumHoras = fracoesDoProjeto.reduce((s, x) => s + (Number(x.qtdHoras) || 0), 0);
    elHoras.textContent = sumHoras > 0 ? sumHoras.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' h' : '';
  }

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

function renderizarValoresAtivos() {
  const container = document.getElementById('containerValores');
  if(!container) return;
  container.innerHTML = '';

  // Passo 15: reconsolida Valor Proporcional + Valor Acumulado antes de pintar a tela
  recalcularProporcionaisAtivos();

  // Ajuste B1 (Guilherme, 06/08/2026): renderiza tratamentos B (barras) e C (lista plana)
  if(tratamentoAtivo === 'B' || tratamentoAtivo === 'C') {
    let tot = 0;
    recursosAtivos.forEach(item => {
      tot += (item.valorProporcional || 0);
      const card = document.createElement('div');
      card.className = 'card-recurso';
      card.style.marginBottom = '16px';
      // Cabeçalho compacto do instrumento
      card.innerHTML = `
        <div style="padding:10px 14px; background:#f0f9ff; color:#005F73; font-weight:bold; border-bottom:1px solid #c0dde5; display:flex; justify-content:space-between; align-items:center;">
          <span>${item.instrumento} nº ${item.numero} · ${item.inicio} a ${item.fim}</span>
          <span>Proporcional: <strong>${formatarMoedaBR(item.valorProporcional)}</strong></span>
        </div>
        <div class="sub-container">
          ${tratamentoAtivo === 'B' ? renderFracoesModoB(item) : renderFracoesModoC(item)}
        </div>
      `;
      container.appendChild(card);
    });
    const txtTot = document.getElementById('txtTotalAcumulado');
    if(txtTot) txtTot.textContent = formatarMoedaBR(tot);
    return;
  }

  const isEditGlobal = modo === 'editar';
  
  const searchInput = document.getElementById('inputSearch');
  const termoBusca = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const listaFiltrada = recursosAtivos.filter(r =>
    r.instrumento.toLowerCase().includes(termoBusca) ||
    r.numero.toLowerCase().includes(termoBusca) ||
    r.valorAtualizado.toString().includes(termoBusca)
  ).slice().sort(_ordenaInstrumento);

  // Ajuste 1.2 (Ana Paula, 05/08/2026): Acumulado = Σ Valor Proporcional
  let totalAcumulado = 0;

  listaFiltrada.forEach(item => {
    totalAcumulado += item.valorProporcional;
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

      // Passo 15 (Sabrina + Ana Paula, 02/09/2026): variavel unica para a exibicao condicional das colunas de horas
      const _porHoras = ehInstrumentoPorHoras(item);

      Object.entries(projs).forEach(([pCode, lista]) => {
        const sumVal = lista.reduce((s, x) => s + x.val, 0);
        const sumPct = lista.reduce((s, x) => s + x.pct, 0);
        const sumPctFmt = parseFloat(sumPct.toFixed(2));
        // Passo 14: subtotal de horas por projeto (aparece só se houver hora preenchida)
        const sumHoras = lista.reduce((s, x) => s + (Number(x.qtdHoras) || 0), 0);
        const sumHorasFmt = (_porHoras && sumHoras > 0) ? sumHoras.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' h' : '';

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
                ${sumHorasFmt ? `<span id="proj_tot_horas_${item.id}_${pCode}" style="margin-right:12px; color:#005F73; font-weight:600;">${sumHorasFmt}</span>` : `<span id="proj_tot_horas_${item.id}_${pCode}" style="margin-right:12px; color:#005F73; font-weight:600;"></span>`}
                <span id="proj_tot_val_${item.id}_${pCode}" style="margin-right:12px;">Total: ${formatarMoedaBR(sumVal)}</span>
                <span id="proj_tot_pct_${item.id}_${pCode}" style="background:#005F73; color:white; padding:2px 6px; border-radius:3px; font-size:10px;">${sumPctFmt}%</span>
              </div>
            </div>
            ${isProjExpanded ? `
            <div class="table-responsive">
              <table class="resizable-table" style="min-width: 1150px; border-top: 1px solid #c0dde5;">
                <thead>
                  <tr style="background:#f8fafc; color:#334155;">
                    <th style="width:8%;">Área</th>
                    <th style="width:5%;">UO</th>
                    <th style="width:8%;">Recurso</th>
                    <th style="width:12%;">NAD</th>
                    <th style="width:18%;">Período</th>
                    ${_porHoras ? '<th style="width:8%;">Qtd. Horas</th>' : ''}
                    ${_porHoras ? '<th style="width:10%;">Valor da Hora</th>' : ''}
                    <th style="width:6%;">%</th>
                    <th style="width:12%;">Valor Fracionado</th>
                    <th style="width:11%;">OBSERVAÇÃO</th>
                    <th style="text-align:center; width:${isEditGlobal ? '12%' : '7%'};">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${lista.map(f => {
                    const lEditF = isEditGlobal && f.editando;
                    const pctStr = (f.pct % 1 === 0 ? f.pct : parseFloat(f.pct.toFixed(2))).toString().replace('.', ',');
                    const qtdHorasStr = (f.qtdHoras || 0).toLocaleString('pt-BR', {maximumFractionDigits: 2});
                    return `
                      <tr>
                        <td>${lEditF ? (() => {
                          const usadas = Array.isArray(headerAreas) ? headerAreas : [];
                          const outras = OPCOES_AREAS.filter(a => !usadas.includes(a));
                          const grupoUsadas = usadas.length > 0
                            ? `<optgroup label="Áreas atendidas">${usadas.map(a=>`<option value="${_htmlEsc(a)}" ${f.area===a?'selected':''}>${_htmlEsc(a)}</option>`).join('')}</optgroup>` : '';
                          const grupoOutras = `<optgroup label="Demais áreas">${outras.map(a=>`<option value="${_htmlEsc(a)}" ${f.area===a?'selected':''}>${_htmlEsc(a)}</option>`).join('')}</optgroup>`;
                          const extra = (f.area && !OPCOES_AREAS.includes(f.area)) ? `<option value="${_htmlEsc(f.area)}" selected>${_htmlEsc(f.area)} (personalizada)</option>` : '';
                          return `<select id="f_area_${f.id}" onchange="atualizarFracaoCampo('${item.id}','${f.id}','area',this.value)" class="input-plain"><option value="">—</option>${extra}${grupoUsadas}${grupoOutras}</select>`;
                        })() : (f.area || '—')}</td>
                        <td>${lEditF ? copyGroupInput(`f_uo_${f.id}`, f.uo, '') : (f.uo + copyBtnView(f.uo))}</td>
                        <td>${lEditF ? `<select id="f_rec_${f.id}" onchange="atualizarFracaoCampo('${item.id}','${f.id}','recurso',this.value)" class="input-plain">${Object.entries(RECURSOS_CATALOG).map(([c,n])=>`<option value="${c}" ${String(f.recurso).trim()===c?'selected':''}>${c} - ${n}</option>`).join('')}</select>` : (formatarRecursoLabel(f) + copyBtnView(f.recurso))}</td>
                        <td>${lEditF ? copyGroupInput(`f_nad_${f.id}`, f.nad, 'applyNADMask(this)', 'X.X.XX.XX.XXXX') : (f.nad + copyBtnView(f.nad))}</td>
                        <td>${lEditF ? `<input type="text" id="f_per_${f.id}" value="${f.periodo}" oninput="applyPeriodMask(this)" class="input-plain">` : f.periodo}</td>
                        ${_porHoras ? `<td>${lEditF ? `<input type="text" id="f_qtdh_${f.id}" value="${f.qtdHoras || ''}" oninput="syncFractionFromHoras('${item.id}','${f.id}','${pCode}',this)" class="input-plain" style="text-align:right;" placeholder="0">` : (f.qtdHoras ? qtdHorasStr + ' h' : '—')}</td>` : ''}
                        ${_porHoras ? `<td>${lEditF ? `<input type="text" id="f_valh_${f.id}" value="${f.valorHora ? formatarMoedaBR(f.valorHora) : ''}" oninput="applyCurrencyMask(this); syncFractionFromValorHora('${item.id}','${f.id}','${pCode}',this)" class="input-plain" placeholder="R$ 0,00">` : (f.valorHora ? formatarMoedaBR(f.valorHora) : '—')}</td>` : ''}
                        <td>${lEditF ? `<div style="display:flex; align-items:center; gap:4px;"><input type="text" id="f_pct_${f.id}" value="${pctStr}" oninput="syncFractionFromPct('${item.id}', '${f.id}', '${pCode}', this)" class="input-plain" style="width:50px;">%</div>` : `<strong>${pctStr}%</strong>`}</td>
                        <td>${lEditF ? `<input type="text" id="f_val_${f.id}" value="${formatarMoedaBR(f.val)}" oninput="applyCurrencyMask(this); syncFractionFromVal('${item.id}', '${f.id}', '${pCode}', this)" class="input-plain">` : `<strong>${formatarMoedaBR(f.val)}</strong>`}</td>
                        
                        <td style="${!lEditF ? 'max-width:120px;' : ''}">
                          ${lEditF
                            ? `<input type="text" id="f_obs_${f.id}" value="${f.obs}" placeholder="Observação livre..." class="input-plain">`
                            : `<div style="display:flex; align-items:center; justify-content: space-between; gap:6px;">
                                 <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;" title="${f.obs || ''}">${f.obs || '—'}</span>
                                 ${f.obs ? copyBtnView(f.obs) : ''}
                               </div>`
                          }
                        </td>

                        <td style="text-align:center; white-space:nowrap;">
                          <div style="display:inline-flex; gap:6px; align-items:center; justify-content:center; width: 100%;">
                            <button onclick="abrirModalObservacao('${item.id}', '${f.id}')" class="btn-square-gray" title="Visualizar Observação Completa">${iconEye}</button>
                            ${isEditGlobal ? `
                              <button onclick="abrirConfirmacao('excluir_fracao', '${item.id}', '${f.id}')" class="btn-square-orange" title="Excluir Fração">${iconTrash}</button>
                              ${f.editando
                                ? `<button onclick="abrirConfirmacao('salvar_fracao', '${item.id}', '${f.id}')" class="btn-square-green" title="Confirmar Salvar">${iconCheck}</button>`
                                : `<button onclick="ativarEdicaoFracao('${item.id}', '${f.id}')" class="btn-square-teal" title="Editar Fração">${iconPencil}</button>`}
                            ` : ''}
                          </div>
                        </td>
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
            <span style="display:inline-flex; align-items:center; gap:8px;">
              ${isEditGlobal && totPctFmt !== 100 && (item.fracoes||[]).length > 0 ? `<button onclick="redistribuir100('${item.id}')" class="btn-sigecofi-edit" style="font-size:10px; padding:3px 8px; background:#f97316; border-color:#f97316; color:#fff;" title="RN-05: recalcula proporcionalmente as frações para totalizarem 100%">↻ Redistribuir 100%</button>` : ''}
              ${totPctFmt === 100 ? '✓ Completo' : '⚠️ Pendente de Ajuste'}
            </span>
          </div>
        </div>
      `;
    }

    // Passo 14 (Guilherme, 01/09/2026 — reunião Ana Paula): Horas Totais = soma das horas das frações filhas
    // Passo 15 (Sabrina + Ana Paula, 02/09/2026): coluna Horas Totais só aparece quando o instrumento é "Horas"
    const horasTotais = (item.fracoes || []).reduce((s, f) => s + (Number(f.qtdHoras) || 0), 0);
    const porHoras = ehInstrumentoPorHoras(item);
    card.innerHTML = `
      <div class="table-responsive">
        <table class="resizable-table">
          <thead>
            <tr>
              <th style="width:12%;">Valor Atualizado ↕</th>
              <th style="width:10%;">Periodicidade ↕</th>
              <th style="width:9%;">Início ↕</th>
              <th style="width:9%;">Fim ↕</th>
              ${porHoras ? '<th style="width:10%;">Horas Totais ↕</th>' : ''}
              <th style="width:13%;">Valor Proporcional (R$) ↕</th>
              <th style="width:13%;">Instrumento ↕</th>
              <th style="width:9%;">Número ↕</th>
              <th style="text-align:center; width:15%;">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${formatarMoedaBR(item.valorAtualizado)}</strong></td>

              <td>${lEditP ? `<select id="p_per_${item.id}" class="input-plain">${getOptionsPeriodicidade(item.periodicidade)}</select>` : item.periodicidade}</td>

              <td>${lEditP ? inputData(`p_ini_${item.id}`, item.inicio) : item.inicio}</td>
              <td>${lEditP ? inputData(`p_fim_${item.id}`, item.fim) : item.fim}</td>

              ${porHoras ? `<td><strong id="p_horas_${item.id}" style="color:#005F73;">${horasTotais > 0 ? horasTotais.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' h' : '—'}</strong></td>` : ''}

              <td><strong style="color:#005F73;">${formatarMoedaBR(item.valorProporcional)}</strong></td>

              <td>${lEditP ? `<select id="p_inst_${item.id}" class="input-plain">${getOptionsInstrumento(item.instrumento)}</select>` : item.instrumento}</td>

              <td>${lEditP ? copyGroupInput(`p_num_${item.id}`, item.numero, '') : (item.numero + copyBtnView(item.numero))}</td>

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

function toggleInativos() {
  inativosExpandido = !inativosExpandido;
  renderizarInativos();
}

function toggleE(id) {
  const v = recursosAtivos.find(x => x.id === id);
  if (v) v.expandido = !v.expandido;
  renderizarValoresAtivos();
}

function toggleProjExpand(rId, pCode) {
  const r = recursosAtivos.find(x => x.id === rId);
  if(r) {
    if (!r.projetosExpandidos) r.projetosExpandidos = {};
    r.projetosExpandidos[pCode] = !r.projetosExpandidos[pCode];
    renderizarValoresAtivos();
  }
}

// EDIÇÃO DE RECURSOS ABA 1
function ativarEdicaoPai(id) {
  const r = recursosAtivos.find(x => x.id === id);
  if (r) r.editando = true;
  renderizarValoresAtivos();
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
  renderizarValoresAtivos();
}

function salvarEdicaoFracao(pId, fId) {
  const p = recursosAtivos.find(x => x.id === pId);
  const f = p?.fracoes.find(x => x.id === fId);
  if (f) {
    const elArea = document.getElementById(`f_area_${fId}`);
    const elUo = document.getElementById(`f_uo_${fId}`);
    const elRec = document.getElementById(`f_rec_${fId}`);
    const elNad = document.getElementById(`f_nad_${fId}`);
    const elPer = document.getElementById(`f_per_${fId}`);
    const elHoras = document.getElementById(`f_qtdh_${fId}`);
    const elVHora = document.getElementById(`f_valh_${fId}`);
    const elPct = document.getElementById(`f_pct_${fId}`);
    const elVal = document.getElementById(`f_val_${fId}`);
    const elObs = document.getElementById(`f_obs_${fId}`);

    if(elArea) f.area = elArea.value.trim();
    if(elUo) f.uo = elUo.value;
    if(elRec) f.recurso = elRec.value;
    if(elNad) f.nad = elNad.value;
    if(elPer) f.periodo = elPer.value;
    if(elHoras) f.qtdHoras = Number(elHoras.value) || 0;
    if(elVHora) f.valorHora = parseCurrency(elVHora.value);
    if(elPct) f.pct = parseFloat(elPct.value.replace(',', '.')) || 0;
    // Passo 14 (RN-01-b): quando há horas × valor da hora, esse valor manda no fracionado
    if (f.qtdHoras > 0 && f.valorHora > 0) {
      f.val = f.qtdHoras * f.valorHora;
    } else if (elVal) {
      f.val = parseCurrency(elVal.value);
    }
    if(elObs) f.obs = elObs.value;

    f.editando = false;
    _recalcHorasTotaisInstrumento(pId);
    mostrarToast("Fração salva com sucesso!");
    renderizarValoresAtivos();
  }
}

// ====================================================
// LÓGICA DA ABA 2: EXECUÇÃO FINANCEIRA E LIQUIDAÇÕES
// ====================================================
let valorOriginalContratoDadosGerais = 1000.00;

let empenhosAtivos = [
  {
    id: 'emp1',
    projeto: '3920',
    area: 'DETIC',
    numeroEmpenho: '25000100',
    nad: '3.3.90.40.0000',
    valorEmpenhado: 200.00,
    saldoDisponivel: 10.00,
    expandido: true,
    editando: false,
    competenciasExpandidas: { '05/2026': false },
    parcelas: [
      { id: 'par1', valorParcela: 180.00, comp: '05/2026', processo: '26/1400-9002627-3', valorLiquidado: 170.00, saldoNaoExecutavel: 10.00, checked: true, instrumento: 'Contrato Original', editando: false },
      { id: 'par1b', valorParcela: 15.00, comp: '05/2026', processo: '26/1400-9002711-5', valorLiquidado: 11.00, saldoNaoExecutavel: 4.00, checked: true, instrumento: 'Contrato Original', editando: false },
      { id: 'par2', valorParcela: 10.00, comp: '06/2026', processo: '26/1400-9001482-8', valorLiquidado: 9.00, saldoNaoExecutavel: 1.00, checked: false, instrumento: 'Aditivo 1', editando: false }
    ]
  },
  {
    id: 'emp2',
    projeto: '3921',
    area: 'Tesouro',
    numeroEmpenho: '25000200',
    nad: '3.3.90.40.0000',
    valorEmpenhado: 400.00,
    saldoDisponivel: 400.00,
    expandido: false,
    editando: false,
    parcelas: []
  }
];

function recalcularCardsExecucao() {
  // Ajuste 2.1 (Ana Paula, 05/08/2026): Acumulado da aba Execução = Σ Valor Proporcional dos recursos ativos
  let valAcumulado = Array.isArray(recursosAtivos)
    ? recursosAtivos.reduce((s, r) => s + (r.valorProporcional || 0), 0)
    : 0;
  let totalEmpenhado = empenhosAtivos.reduce((s, e) => s + e.valorEmpenhado, 0);
  let valAEmpenhar = valAcumulado - totalEmpenhado; if(valAEmpenhar < 0) valAEmpenhar = 0;
  
  let totalLiquidado = 0;
  let totalSaldoNaoExecutavel = 0;
  // Ajuste 2.2 (Ana Paula, 05/08/2026): duas submétricas do Saldo Não Executável.
  // Interpretação PENDENTE VALIDAÇÃO: Histórico = todas as parcelas com saldo>0;
  // Reaproveitamento = parcelas confirmadas (checked) — assumidas como reaproveitáveis.
  let saldoNaoExecHistorico = 0;
  let saldoNaoExecReaproveita = 0;

  empenhosAtivos.forEach(e => {
    e.parcelas.forEach(p => {
      totalLiquidado += p.valorLiquidado;
      if(p.checked) {
        totalSaldoNaoExecutavel += p.saldoNaoExecutavel;
        saldoNaoExecReaproveita += p.saldoNaoExecutavel;
      }
      saldoNaoExecHistorico += (p.saldoNaoExecutavel || 0);
    });
  });

  let valAExecutar = valAcumulado - totalLiquidado; if(valAExecutar < 0) valAExecutar = 0;
  let saldoAcrescimo = valorOriginalContratoDadosGerais * 0.25;

  const c1 = document.getElementById('cardValAcumulado');
  const c2 = document.getElementById('cardValEmpenhado');
  const c3 = document.getElementById('cardValAEmpenhar');
  const c4 = document.getElementById('cardValAExecutar');
  const c5 = document.getElementById('cardSaldoNaoExecutavel');
  const c6 = document.getElementById('cardSaldoAcrescimo');
  const c7 = document.getElementById('cardValLiquidado');

  if(c1) c1.textContent = formatarMoedaBR(valAcumulado);
  if(c2) c2.textContent = formatarMoedaBR(totalEmpenhado);
  if(c3) c3.textContent = formatarMoedaBR(valAEmpenhar);
  // Ajuste A2 (Guilherme, 06/08/2026): 3 cards editáveis sempre, sinalizados por 🔒 DICAF.
  renderCardEditavel(c4, valAExecutar,             valorAExecutarManual,       'setValorAExecutar',       'resetValorAExecutar');
  renderCardEditavel(c5, totalSaldoNaoExecutavel,  saldoNaoExecutavelManual,   'setSaldoNaoExecutavel',   'resetSaldoNaoExecutavel');
  renderCardEditavel(c6, saldoAcrescimo,           saldoAcrescimoManual,       'setSaldoAcrescimo',       'resetSaldoAcrescimo');
  if(c7) c7.textContent = formatarMoedaBR(totalLiquidado);
  const cH = document.getElementById('cardSaldoNaoExecHistorico');
  const cR = document.getElementById('cardSaldoNaoExecReaproveita');
  if(cH) cH.textContent = formatarMoedaBR(saldoNaoExecHistorico);
  if(cR) cR.textContent = formatarMoedaBR(saldoNaoExecReaproveita);
}

// Ajuste X3 (Guilherme, 06/08/2026 - correção pós-review): cards são editáveis APENAS no Modo Editar.
// No Modo Visualizar: texto bloqueado (com badge MANUAL se houver override). No Modo Editar: input + botão ↺ auto.
function renderCardEditavel(el, valorAutomatico, valorManual, nomeSetter, nomeResetter) {
  if(!el) return;
  const efetivo = (valorManual !== null && valorManual !== undefined) ? valorManual : valorAutomatico;
  const temOverride = (valorManual !== null && valorManual !== undefined);
  if(modo === 'editar') {
    const btnReset = temOverride
      ? ` <button type="button" onclick="${nomeResetter}()" title="Voltar ao cálculo automático" style="margin-left:4px; padding:2px 6px; font-size:11px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:3px; cursor:pointer;">↺ auto</button>`
      : '';
    el.innerHTML = `<input type="text" value="${formatarMoedaBR(efetivo)}" oninput="applyCurrencyMask(this); ${nomeSetter}(this)" class="input-plain" style="width:100%; font-size:15px; font-weight:bold;">` + btnReset;
  } else {
    // Modo Visualizar: texto bloqueado, com badge MANUAL quando há override
    const badge = temOverride
      ? ` <span title="Valor sobrescrito manualmente por perfil DICAF" style="margin-left:4px; padding:1px 5px; font-size:9px; background:#fef3c7; color:#92400e; border-radius:3px; font-weight:bold; vertical-align:middle;">MANUAL</span>`
      : '';
    el.innerHTML = formatarMoedaBR(efetivo) + badge;
  }
}

function setValorAExecutar(input) {
  const v = parseCurrency(input.value);
  valorAExecutarManual = isFinite(v) ? v : null;
}
function resetValorAExecutar() {
  valorAExecutarManual = null;
  recalcularCardsExecucao();
  mostrarToast('Valor a Executar voltou ao cálculo automático.');
}
function setSaldoNaoExecutavel(input) {
  const v = parseCurrency(input.value);
  saldoNaoExecutavelManual = isFinite(v) ? v : null;
}
function resetSaldoNaoExecutavel() {
  saldoNaoExecutavelManual = null;
  recalcularCardsExecucao();
  mostrarToast('Saldo não Executável voltou ao cálculo automático.');
}
function setSaldoAcrescimo(input) {
  const v = parseCurrency(input.value);
  saldoAcrescimoManual = isFinite(v) ? v : null;
}
function resetSaldoAcrescimo() {
  saldoAcrescimoManual = null;
  recalcularCardsExecucao();
  mostrarToast('Saldo p/ Acréscimo voltou ao cálculo automático.');
}

function toggleParcelaCheck(empId, parcelaId) {
  const emp = empenhosAtivos.find(e => e.id === empId);
  if(!emp) return;
  const par = emp.parcelas.find(p => p.id === parcelaId);
  if(!par) return;

  par.checked = !par.checked;
  renderizarExecucaoFinanceira(); 
  mostrarToast("Saldo não executável atualizado!");
}

function toggleEmpenhoExpand(empId) {
  const emp = empenhosAtivos.find(e => e.id === empId);
  if(emp) {
    emp.expandido = !emp.expandido;
    renderizarExecucaoFinanceira();
  }
}

// Ajuste B2 (Guilherme, 06/08/2026): agrupamento de parcelas por competência.
// Quando >1 processo na mesma competência: linha agrupada (soma valores, "N processos");
// clique expande para mostrar cada processo individualmente.
function toggleCompetenciaExpand(empId, comp) {
  const emp = empenhosAtivos.find(e => e.id === empId);
  if(!emp) return;
  if(!emp.competenciasExpandidas) emp.competenciasExpandidas = {};
  emp.competenciasExpandidas[comp] = !emp.competenciasExpandidas[comp];
  renderizarExecucaoFinanceira();
}
function agruparParcelasPorCompetencia(parcelas) {
  const g = {};
  const ordem = [];
  parcelas.forEach(p => {
    if(!g[p.comp]) { g[p.comp] = []; ordem.push(p.comp); }
    g[p.comp].push(p);
  });
  return ordem.map(comp => ({ comp, itens: g[comp] }));
}
function renderLinhaParcela(emp, p, isEditGlobal, isChildDeAgrupado) {
  const lEditF = isEditGlobal && p.editando;
  const isEditar = modo === 'editar';
  const compTexto = isChildDeAgrupado
    ? `<span style="color:#94a3b8; font-size:11px;">↳ ${p.comp}</span>`
    : p.comp;
  return `
    <tr>
      <td>${lEditF ? `<input type="text" id="p_valPar_${p.id}" value="${formatarMoedaBR(p.valorParcela)}" oninput="applyCurrencyMask(this)" class="input-plain">` : `<strong>${formatarMoedaBR(p.valorParcela)}</strong>`}</td>
      <td>${lEditF ? `<input type="text" id="p_comp_${p.id}" value="${p.comp}" oninput="applyDateMask(this)" class="input-plain">` : compTexto}</td>
      <td>${lEditF ? copyGroupInput(`p_proc_${p.id}`, p.processo, '') : `${p.processo} ${copyBtnView(p.processo)}`}</td>
      <td>${lEditF ? `<input type="text" id="p_valLiq_${p.id}" value="${formatarMoedaBR(p.valorLiquidado)}" oninput="applyCurrencyMask(this)" class="input-plain">` : `<strong>${formatarMoedaBR(p.valorLiquidado)}</strong>`}</td>
      <td>
        <div style="display:flex; align-items:center; gap:6px;">
          <input type="checkbox" class="chk-executavel" ${p.checked ? 'checked' : ''} onchange="toggleParcelaCheck('${emp.id}', '${p.id}')" ${lEditF ? 'disabled' : ''} />
          ${lEditF ? `<input type="text" id="p_saldoNe_${p.id}" value="${formatarMoedaBR(p.saldoNaoExecutavel)}" oninput="applyCurrencyMask(this)" class="input-plain" style="width:80px;">` : `<span>${formatarMoedaBR(p.saldoNaoExecutavel)}</span>`}
        </div>
      </td>
      <td>${lEditF ? `<input type="text" id="p_inst_${p.id}" value="${p.instrumento}" class="input-plain">` : p.instrumento}</td>
      ${isEditGlobal ? `
        <td style="text-align:center; white-space:nowrap;">
          <button onclick="abrirConfirmacao('excluir_parcela', '${emp.id}', '${p.id}')" class="btn-square-orange" title="Excluir Parcela">${iconTrash}</button>
          ${p.editando
            ? `<button onclick="abrirConfirmacao('salvar_parcela', '${emp.id}', '${p.id}')" class="btn-square-green" title="Confirmar Salvar">${iconCheck}</button>`
            : `<button onclick="ativarEdicaoParcela('${emp.id}', '${p.id}')" class="btn-square-teal" title="Editar Parcela">${iconPencil}</button>`}
        </td>
      ` : ''}
    </tr>
  `;
}

function renderizarExecucaoFinanceira() {
  recalcularCardsExecucao();
  const container = document.getElementById('containerExecucao');
  if(!container) return;
  container.innerHTML = '';

  const isEditGlobal = modo === 'editar';
  const searchInput = document.getElementById('inputSearchExec');
  const termoBusca = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const listaFiltrada = empenhosAtivos.filter(e => 
    e.projeto.toLowerCase().includes(termoBusca) ||
    e.numeroEmpenho.toLowerCase().includes(termoBusca) ||
    e.nad.toLowerCase().includes(termoBusca)
  );

  if(listaFiltrada.length === 0) {
    container.innerHTML = `<div style="padding:16px; text-align:center; color:#94a3b8; font-style:italic; background:#fff; border:1px solid #cbd5e1; border-radius:6px;">Nenhum empenho cadastrado.</div>`;
    return;
  }

  listaFiltrada.forEach(emp => {
    const card = document.createElement('div');
    card.className = 'card-recurso';
    const lEditE = isEditGlobal && emp.editando;
    const chevronIcon = emp.expandido ? iconChevronDown : iconChevronRight;

    let htmlSub = '';
    if(emp.expandido) {
      htmlSub = `
        <div class="sub-container">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-weight:bold; color:#005F73;">DETALHAMENTO DE PARCELAS / LIQUIDAÇÕES</span>
            ${isEditGlobal ? `<button onclick="adicionarParcela('${emp.id}')" class="btn-sigecofi-edit" style="font-size:11px; padding:4px 10px;">+ Adicionar Parcela</button>` : ''}
          </div>
          <div class="table-responsive">
            <table class="resizable-table" style="min-width: 900px; background:#fff; border: 1px solid #c0dde5;">
              <thead>
                <tr style="background:#f8fafc; color:#334155;">
                  <th style="width:12%;">Valor Parcela</th>
                  <th style="width:12%;">Competência</th>
                  <th style="width:16%;">Processo</th>
                  <th style="width:18%;">Valor Liquidado / Faturado</th>
                  <th style="width:18%;">Saldo não Executável</th>
                  <th style="width:14%;">Instrumento</th>
                  ${isEditGlobal ? '<th style="text-align:center; width:10%;">Ações</th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${agruparParcelasPorCompetencia(emp.parcelas).map(grupo => {
                  // Se só um processo naquela competência, renderiza direto (sem cabeçalho agrupado)
                  if(grupo.itens.length === 1) {
                    return renderLinhaParcela(emp, grupo.itens[0], isEditGlobal, false);
                  }
                  // Múltiplos processos: cabeçalho agrupado + (opcionalmente) linhas expandidas
                  const expandida = !!(emp.competenciasExpandidas && emp.competenciasExpandidas[grupo.comp]);
                  const somaVal = grupo.itens.reduce((s,p) => s + p.valorParcela, 0);
                  const somaLiq = grupo.itens.reduce((s,p) => s + p.valorLiquidado, 0);
                  const somaSaldo = grupo.itens.filter(p => p.checked).reduce((s,p) => s + p.saldoNaoExecutavel, 0);
                  const chev = expandida ? iconChevronDown : iconChevronRight;
                  const header = `
                    <tr class="parc-comp-header" onclick="toggleCompetenciaExpand('${emp.id}', '${grupo.comp}')" style="cursor:pointer; background:#e0f2fe; color:#005F73;">
                      <td><strong>${formatarMoedaBR(somaVal)}</strong></td>
                      <td><span style="display:inline-flex; align-items:center; gap:4px; font-weight:bold;">${chev}${grupo.comp}</span></td>
                      <td style="color:#64748b; font-style:italic;">${grupo.itens.length} processos</td>
                      <td><strong>${formatarMoedaBR(somaLiq)}</strong></td>
                      <td><strong>${formatarMoedaBR(somaSaldo)}</strong></td>
                      <td style="color:#64748b; font-style:italic;">agrupado</td>
                      ${isEditGlobal ? '<td></td>' : ''}
                    </tr>
                  `;
                  if(!expandida) return header;
                  return header + grupo.itens.map(p => renderLinhaParcela(emp, p, isEditGlobal, true)).join('');
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="table-responsive">
        <table class="resizable-table" style="border-bottom: ${emp.expandido ? '1px solid #e2e8f0' : 'none'};">
          <thead>
            <tr>
              <th style="width:10%;">Área</th>
              <th style="width:10%;">Projeto</th>
              <th style="width:16%;">Nº Empenho</th>
              <th style="width:14%;">NAD</th>
              <th style="width:16%;">Valor Empenhado</th>
              <th style="width:16%;">Saldo Disponível</th>
              <th style="text-align:center; width:18%;">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background:#fff;">
              <td>${lEditE ? (() => {
                const usadas = Array.isArray(headerAreas) ? headerAreas : [];
                const outras = OPCOES_AREAS.filter(a => !usadas.includes(a));
                const grupoUsadas = usadas.length > 0
                  ? `<optgroup label="Áreas atendidas">${usadas.map(a=>`<option value="${_htmlEsc(a)}" ${emp.area===a?'selected':''}>${_htmlEsc(a)}</option>`).join('')}</optgroup>` : '';
                const grupoOutras = `<optgroup label="Demais áreas">${outras.map(a=>`<option value="${_htmlEsc(a)}" ${emp.area===a?'selected':''}>${_htmlEsc(a)}</option>`).join('')}</optgroup>`;
                const extra = (emp.area && !OPCOES_AREAS.includes(emp.area)) ? `<option value="${_htmlEsc(emp.area)}" selected>${_htmlEsc(emp.area)} (personalizada)</option>` : '';
                return `<select id="e_area_${emp.id}" class="input-plain"><option value="">—</option>${extra}${grupoUsadas}${grupoOutras}</select>`;
              })() : emp.area}</td>
              <td>${lEditE ? `<input type="text" id="e_proj_${emp.id}" value="${emp.projeto}" class="input-plain">` : `<strong>${emp.projeto}</strong>`}</td>
              <td>${lEditE ? copyGroupInput(`e_num_${emp.id}`, emp.numeroEmpenho, '') : `${emp.numeroEmpenho} ${copyBtnView(emp.numeroEmpenho)}`}</td>
              <td>${lEditE ? copyGroupInput(`e_nad_${emp.id}`, emp.nad, 'applyNADMask(this)') : emp.nad}</td>
              <td>${lEditE ? `<input type="text" id="e_val_${emp.id}" value="${formatarMoedaBR(emp.valorEmpenhado)}" oninput="applyCurrencyMask(this)" class="input-plain">` : `<strong>${formatarMoedaBR(emp.valorEmpenhado)}</strong>`}</td>
              <td><strong style="color:#166534;">${formatarMoedaBR(emp.saldoDisponivel)}</strong></td>
              <td style="text-align:center; white-space:nowrap;">
                <div style="display:inline-flex; gap:6px; align-items:center; justify-content:center; width:100%;">
                  ${isEditGlobal ? `<button onclick="abrirConfirmacao('excluir_empenho', '${emp.id}')" class="btn-square-orange" title="Excluir Empenho">${iconTrash}</button>` : ''}
                  ${isEditGlobal ? `
                    ${emp.editando
                      ? `<button onclick="abrirConfirmacao('salvar_empenho', '${emp.id}')" class="btn-square-green" title="Confirmar e Salvar">${iconCheck}</button>`
                      : `<button onclick="ativarEdicaoEmpenho('${emp.id}')" class="btn-square-teal" title="Editar Empenho">${iconPencil}</button>`
                    }
                  ` : ''}
                  <button onclick="toggleEmpenhoExpand('${emp.id}')" class="btn-square-teal" title="Expandir/Recolher Detalhes">${chevronIcon}</button>
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
}

function ativarEdicaoEmpenho(empId) {
  const e = empenhosAtivos.find(x => x.id === empId);
  if (e) e.editando = true;
  renderizarExecucaoFinanceira();
}

function salvarEdicaoEmpenho(empId) {
  const e = empenhosAtivos.find(x => x.id === empId);
  if (e) {
    const elProj = document.getElementById(`e_proj_${empId}`);
    const elArea = document.getElementById(`e_area_${empId}`);
    const elNum = document.getElementById(`e_num_${empId}`);
    const elNad = document.getElementById(`e_nad_${empId}`);
    const elVal = document.getElementById(`e_val_${empId}`);

    if(elProj) e.projeto = elProj.value;
    if(elArea) e.area = elArea.value;
    if(elNum) e.numeroEmpenho = elNum.value;
    if(elNad) e.nad = elNad.value;
    if(elVal) e.valorEmpenhado = parseCurrency(elVal.value);
    
    let totLiq = e.parcelas.reduce((s,p) => s + p.valorLiquidado, 0);
    e.saldoDisponivel = e.valorEmpenhado - totLiq;
    
    e.editando = false;
    mostrarToast("Empenho salvo com sucesso!");
  }
}

function ativarEdicaoParcela(empId, parId) {
  const e = empenhosAtivos.find(x => x.id === empId);
  const p = e?.parcelas.find(x => x.id === parId);
  if (p) p.editando = true;
  renderizarExecucaoFinanceira();
}

function salvarEdicaoParcela(empId, parId) {
  const e = empenhosAtivos.find(x => x.id === empId);
  const p = e?.parcelas.find(x => x.id === parId);
  if (p) {
    const elValPar = document.getElementById(`p_valPar_${parId}`);
    const elComp = document.getElementById(`p_comp_${parId}`);
    const elProc = document.getElementById(`p_proc_${parId}`);
    const elValLiq = document.getElementById(`p_valLiq_${parId}`);
    const elSaldoNe = document.getElementById(`p_saldoNe_${parId}`);
    const elInst = document.getElementById(`p_inst_${parId}`);

    if(elValPar) p.valorParcela = parseCurrency(elValPar.value);
    if(elComp) p.comp = elComp.value;
    if(elProc) p.processo = elProc.value;
    if(elValLiq) p.valorLiquidado = parseCurrency(elValLiq.value);
    if(elSaldoNe) p.saldoNaoExecutavel = parseCurrency(elSaldoNe.value);
    if(elInst) p.instrumento = elInst.value;

    p.editando = false;
    mostrarToast("Parcela salva com sucesso!");
  }
}

function abrirModalNovoEmpenho() {
  const m = document.getElementById('modalNovoEmpenho');
  if(m) m.classList.remove('hidden');
  // Passo 14 (revisão 02/09/2026): popular dropdown de Área institucional
  const sel = document.getElementById('inputEmpArea');
  if(sel && sel.tagName === 'SELECT') {
    const usadas = Array.isArray(headerAreas) ? headerAreas : [];
    const outras = OPCOES_AREAS.filter(a => !usadas.includes(a));
    const grupoUsadas = usadas.length > 0
      ? `<optgroup label="Áreas atendidas deste contrato">${usadas.map(a=>`<option value="${_htmlEsc(a)}">${_htmlEsc(a)}</option>`).join('')}</optgroup>` : '';
    const grupoOutras = `<optgroup label="Demais áreas institucionais">${outras.map(a=>`<option value="${_htmlEsc(a)}">${_htmlEsc(a)}</option>`).join('')}</optgroup>`;
    sel.innerHTML = '<option value="">Selecione a área...</option>' + grupoUsadas + grupoOutras;
  }
}

function fecharModalNovoEmpenho() {
  const m = document.getElementById('modalNovoEmpenho');
  if(m) m.classList.add('hidden');
}

function confirmarNovoEmpenho() {
  const proj = document.getElementById('inputEmpProjeto').value.trim() || '3920';
  const area = document.getElementById('inputEmpArea').value.trim() || 'DETIC';
  const num = document.getElementById('inputEmpNumero').value.trim() || '25000300';
  const nad = document.getElementById('inputEmpNAD').value.trim() || '3.3.90.40.0000';
  const val = parseCurrency(document.getElementById('inputEmpValor').value) || 0;

  empenhosAtivos.push({
    id: 'emp_' + Date.now(),
    projeto: proj,
    area: area,
    numeroEmpenho: num,
    nad: nad,
    valorEmpenhado: val,
    saldoDisponivel: val,
    expandido: true,
    editando: false,
    parcelas: []
  });

  fecharModalNovoEmpenho();
  renderizarExecucaoFinanceira();
  mostrarToast("Novo empenho adicionado com sucesso!");
}

function adicionarParcela(empId) {
  const emp = empenhosAtivos.find(e => e.id === empId);
  if(!emp) return;

  emp.parcelas.push({
    id: 'par_' + Date.now(),
    valorParcela: 100.00,
    comp: '07/2026',
    processo: '26/1400-' + Math.floor(100000 + Math.random() * 900000) + '-0',
    valorLiquidado: 90.00,
    saldoNaoExecutavel: 10.00,
    checked: true,
    instrumento: 'Aditivo 1',
    editando: true
  });

  renderizarExecucaoFinanceira();
  mostrarToast("Nova parcela adicionada!");
}

// ====================================================
// MODAIS COMUNS E INICIALIZAÇÃO
// ====================================================

// MODAL DE OBSERVAÇÃO (REUTILIZÁVEL NAS DUAS ABAS)
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

// MODAL DE PROJETOS PARA ABA DE RECURSOS
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

  // Passo 14 (refinamento 4, 02/09/2026): popular dropdown de Área
  // Passo 14 (revisão, 02/09/2026): usa o catálogo institucional COMPLETO (OPCOES_AREAS)
  // — as áreas do contrato ficam no topo, o restante do catálogo aparece agrupado abaixo.
  const selectArea = document.getElementById('inputNovaFracArea');
  if(selectArea) {
    const usadas = Array.isArray(headerAreas) ? headerAreas : [];
    const outras = OPCOES_AREAS.filter(a => !usadas.includes(a));
    const grupoUsadas = usadas.length > 0
      ? `<optgroup label="Áreas atendidas deste contrato">${usadas.map(a=>`<option value="${_htmlEsc(a)}">${_htmlEsc(a)}</option>`).join('')}</optgroup>` : '';
    const grupoOutras = `<optgroup label="Demais áreas institucionais">${outras.map(a=>`<option value="${_htmlEsc(a)}">${_htmlEsc(a)}</option>`).join('')}</optgroup>`;
    selectArea.innerHTML = '<option value="">Selecione a área...</option>' + grupoUsadas + grupoOutras;
  }

  // Passo 16: gatilho "Contrato medido por horas?" já marcado quando pai é por horas
  const chk = document.getElementById('chkContratoPorHoras');
  const grp = document.getElementById('grpFracaoHoras');
  if(chk) {
    chk.checked = ehInstrumentoPorHoras(parent);
    if(grp) grp.classList.toggle('hidden', !chk.checked);
  }

  const modalSel = document.getElementById('modalSelectProjeto');
  if(modalSel) modalSel.classList.remove('hidden');
}

// Passo 16 (Sabrina + Ana Paula, 02/09/2026): abre/fecha grupo Qtd Horas + Valor Hora conforme checkbox
function toggleFracaoPorHoras() {
  const chk = document.getElementById('chkContratoPorHoras');
  const grp = document.getElementById('grpFracaoHoras');
  const marcado = !!(chk && chk.checked);
  if(grp) grp.classList.toggle('hidden', !marcado);
  if(!marcado) {
    ['inputNovaFracQtdHoras','inputNovaFracValorHora'].forEach(id=>{
      const el = document.getElementById(id); if(el) el.value = '';
    });
  }
  atualizarValorFracionadoModalNovaFracao();
}

function toggleNovoProjInput(val) {
  const gNovo = document.getElementById('groupNovoProjCode');
  if(gNovo) gNovo.classList.toggle('hidden', val !== 'NOVO_PROJETO');
}

function fecharModalProjeto() {
  const modalSel = document.getElementById('modalSelectProjeto');
  if(modalSel) modalSel.classList.add('hidden');
  ['inputNovoProjCode','inputNovaFracArea','inputNovaFracQtdHoras','inputNovaFracValorHora','inputNovaFracValorFracionado'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value = '';
  });
  const chk = document.getElementById('chkContratoPorHoras');
  if(chk) chk.checked = false;
  const grp = document.getElementById('grpFracaoHoras');
  if(grp) grp.classList.add('hidden');
}

// Passo 14/16 (Sabrina + Ana Paula, 02/09/2026): calcula Valor Fracionado ao vivo no modal
// Se checkbox "por horas" está marcado, o cálculo é Qtd × Valor Hora e trava o campo.
// Se desmarcado, libera edição direta do Valor Fracionado.
function atualizarValorFracionadoModalNovaFracao() {
  const chk = document.getElementById('chkContratoPorHoras');
  const elH = document.getElementById('inputNovaFracQtdHoras');
  const elV = document.getElementById('inputNovaFracValorHora');
  const elR = document.getElementById('inputNovaFracValorFracionado');
  if (!elR) return;
  if (chk && chk.checked) {
    const h = parseFloat(((elH && elH.value) || '').replace(',', '.')) || 0;
    const v = parseCurrency(elV ? elV.value : 0);
    const total = h * v;
    elR.value = total > 0 ? formatarMoedaBR(total) : '';
    elR.disabled = true;
    elR.style.background = '#f1f5f9';
    elR.style.cursor = 'not-allowed';
    elR.title = 'Calculado: Qtd. Horas × Valor da Hora';
  } else {
    elR.disabled = false;
    elR.style.background = '';
    elR.style.cursor = '';
    elR.title = 'Informe o Valor Fracionado direto (a % será calculada sobre o Valor Proporcional).';
  }
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

  // Passo 14/16 (Sabrina + Ana Paula, 02/09/2026): coletar novos campos
  const area      = (document.getElementById('inputNovaFracArea')?.value || '').trim();
  const chkHoras  = !!document.getElementById('chkContratoPorHoras')?.checked;
  let qtdHoras    = 0, valorHora = 0, val = 0;
  if (chkHoras) {
    qtdHoras  = parseFloat((document.getElementById('inputNovaFracQtdHoras')?.value || '').replace(',', '.')) || 0;
    valorHora = parseCurrency(document.getElementById('inputNovaFracValorHora')?.value || 0);
    val       = qtdHoras * valorHora;
  } else {
    val = parseCurrency(document.getElementById('inputNovaFracValorFracionado')?.value || 0);
  }
  const pct = parent.valorProporcional ? (val / parent.valorProporcional) * 100 : 0;

  if (!parent.projetosExpandidos) parent.projetosExpandidos = {};
  parent.projetosExpandidos[codigoProj] = true;

  parent.fracoes.push({
    id: 'f_' + Date.now(),
    projeto: codigoProj,
    area: area,
    uo: '1490',
    recurso: '1169',
    nad: '',
    periodo: '',
    qtdHoras: qtdHoras,
    valorHora: valorHora,
    pct: pct,
    val: val,
    obs: '',
    editando: true
  });

  fecharModalProjeto();
  renderizarValoresAtivos();
}

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
  const elPer = document.getElementById('selectNewPeriodicidade');
  const elInst = document.getElementById('selectNewInstrumento');
  const elIni = document.getElementById('inputNewInicio');
  const elFim = document.getElementById('inputNewFim');
  const elNum = document.getElementById('inputNewNumero');

  const valorAtu = parseCurrency(elValAtu ? elValAtu.value : 0);
  const periodicidade = elPer ? elPer.value : 'Mensal';
  const instrumento = elInst ? elInst.value : 'Aditivo';
  const inicio = elIni ? elIni.value.trim() : '';
  const fim = elFim ? elFim.value.trim() : '';
  const num = (elNum && elNum.value.trim()) ? elNum.value.trim() : '1';

  // Passo 14 (Guilherme, 01/09/2026): Valor Proporcional é 100% calculado pelo sistema (RN-01)
  const valorProp = calcularProporcionalPorMeses(valorAtu, inicio, fim);

  recursosAtivos.push({
    id: 'r_' + Date.now(),
    valorAtualizado: valorAtu,
    periodicidade: periodicidade !== 'Selecione...' ? periodicidade : 'Anual',
    inicio: inicio,
    fim: fim,
    valorProporcional: valorProp,
    instrumento: instrumento !== 'Selecione...' ? instrumento : 'Aditivo',
    numero: num,
    expandido: true,
    editando: false,
    projetosExpandidos: {},
    fracoes: []
  });

  // Passo 14 (refinamento 1): re-ordenar imediatamente após inserir
  recursosAtivos.sort(_ordenaInstrumento);

  fecharModalNovoRecurso();
  renderizarValoresAtivos();
  mostrarToast("Novo recurso criado com sucesso!");
}

// REDIMENSIONAMENTO DE COLUNAS
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

// CONFIRMAÇÃO GLOBAL E AÇÕES DE SALVAMENTO/EXCLUSÃO/INATIVAÇÃO
function abrirConfirmacao(tipo, pId, fId = null) {
  acaoPendente = { tipo, pId, fId };
  const titulo = document.getElementById('modalConfirmTitle');
  const desc = document.getElementById('modalConfirmDesc');
  const auditSection = document.getElementById('modalAuditSection');
  const senhaSection = document.getElementById('modalSenhaSection');
  const btnConfirmar = document.getElementById('btnConfirmarAcao');
  const inputMotivo = document.getElementById('inputMotivo');
  const inputSenha  = document.getElementById('inputSenhaMaster');
  const senhaErro   = document.getElementById('senhaErro');
  if(inputMotivo) inputMotivo.value = '';
  if(inputSenha)  inputSenha.value  = '';
  if(senhaErro)   senhaErro.classList.add('hidden');

  const now = new Date();
  const inputAuditData = document.getElementById('inputAuditData');
  if(inputAuditData) inputAuditData.value = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});

  // Passo 16 (Sabrina + Ana Paula, 02/09/2026): senha Master exigida apenas na EXCLUSÃO DEFINITIVA
  if(senhaSection) senhaSection.classList.add('hidden');

  if (tipo.includes('excluir')) {
    if(titulo) titulo.innerHTML = '🗑️ Exclusão Definitiva · Perfil Master';
    if(desc) desc.innerHTML = '<strong>Ação irreversível.</strong> O registro será removido permanentemente da base e ficará gravado no log de auditoria de exclusões. Prossiga apenas se realmente autorizado.';
    if(auditSection) auditSection.classList.remove('hidden');
    if(senhaSection) senhaSection.classList.remove('hidden');
    if(btnConfirmar) { btnConfirmar.className = 'btn-modal-danger'; btnConfirmar.innerHTML = 'Confirmar Exclusão Definitiva'; }
  } else if (tipo === 'inativar_pai') {
    if(titulo) titulo.innerHTML = '⚠️ Confirmar Inativação';
    if(desc) desc.innerHTML = 'Você deseja inativar este recurso? Ele será movido para o histórico de inativos e poderá ser reativado depois.';
    if(auditSection) auditSection.classList.remove('hidden');
    if(btnConfirmar) { btnConfirmar.className = 'btn-modal-danger'; btnConfirmar.innerHTML = 'Inativar'; }
  } else if (tipo.includes('salvar')) {
    if(titulo) titulo.innerHTML = '💾 Salvar Alterações';
    if(desc) desc.innerHTML = 'Você deseja finalizar a edição e salvar essas alterações?';
    if(auditSection) auditSection.classList.add('hidden');
    if(btnConfirmar) { btnConfirmar.className = 'btn-modal-pri'; btnConfirmar.innerHTML = 'Sim, Salvar'; }
  }

  const modalConf = document.getElementById('modalConfirmacao');
  if(modalConf) modalConf.classList.remove('hidden');
}

// Passo 16: senhas Master mockadas do protótipo (o backend real usará hash + política de segurança)
const SENHAS_MASTER = ['admin123', 'master@2026'];
window.logAuditoriaExclusoes = window.logAuditoriaExclusoes || [];

function fecharModalConfirmacao() {
  const modalConf = document.getElementById('modalConfirmacao');
  if(modalConf) modalConf.classList.add('hidden');
  acaoPendente = null;
}

function executarAcaoConfirmada() {
  if (!acaoPendente) return;
  const { tipo, pId, fId } = acaoPendente;
  const auditSection = document.getElementById('modalAuditSection');
  const senhaSection = document.getElementById('modalSenhaSection');
  const inputMotivo = document.getElementById('inputMotivo');
  const inputSenha  = document.getElementById('inputSenhaMaster');
  const senhaErro   = document.getElementById('senhaErro');

  if (auditSection && !auditSection.classList.contains('hidden') && inputMotivo && inputMotivo.value.trim() === '') {
    alert('Por favor, preencha o motivo para prosseguir (obrigatório para auditoria).');
    return;
  }

  // Passo 16 (Sabrina + Ana Paula, 02/09/2026): senha Master exigida na EXCLUSÃO DEFINITIVA
  const isExclusao = tipo && tipo.indexOf('excluir') === 0;
  if (isExclusao && senhaSection && !senhaSection.classList.contains('hidden')) {
    const senha = inputSenha ? inputSenha.value : '';
    if (!SENHAS_MASTER.includes(senha)) {
      if(senhaErro) senhaErro.classList.remove('hidden');
      if(inputSenha) { inputSenha.value = ''; inputSenha.focus(); }
      return;
    }
    if(senhaErro) senhaErro.classList.add('hidden');
  }

  // AÇÕES DA ABA 1 (VALORES E RECURSOS)
  // Passo 15/16 (Sabrina + Ana Paula, 02/09/2026):
  //  - Excluir = remocao definitiva + log central (registrarLogAcao) + log Master (window.logAuditoriaExclusoes)
  //  - Inativar = arquiva na tabela de Inativos (reversivel via Reativar) + carimbo imutavel.
  const motivoTxt = inputMotivo ? inputMotivo.value.trim() : '';
  const _logMaster = (idRegistro) => {
    const now = new Date();
    const entry = {
      dataHora: now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit', second:'2-digit'}),
      operador: 'Guilherme Alves Braga (MASTER)',
      idRegistro: idRegistro,
      motivo: motivoTxt,
      acao: 'EXCLUSAO_DEFINITIVA'
    };
    window.logAuditoriaExclusoes.push(entry);
    console.log('[SIGECOFI · Log Master de Exclusão]', entry);
  };
  if (tipo === 'excluir_pai') {
    const alvo = recursosAtivos.find(x => x.id === pId);
    const desc = alvo ? `${alvo.instrumento || ''} nº ${alvo.numero || ''} · ${formatarMoedaBR(alvo.valorAtualizado)}` : pId;
    recursosAtivos = recursosAtivos.filter(x => x.id !== pId);
    registrarLogAcao('EXCLUSAO_INSTRUMENTO', desc, motivoTxt);
    _logMaster(pId + ' · ' + desc);
    mostrarToast("Exclusão definitiva confirmada. Ação registrada no log de auditoria (perfil Master).");
  } else if (tipo === 'excluir_fracao') {
    const p = recursosAtivos.find(x => x.id === pId);
    const f = p?.fracoes.find(x => x.id === fId);
    const desc = (p && f) ? `Fração ${f.area || '-'} / Projeto ${f.projeto || '-'} do instrumento ${p.instrumento} nº ${p.numero}` : `${pId}/${fId}`;
    if (p) p.fracoes = p.fracoes.filter(x => x.id !== fId);
    registrarLogAcao('EXCLUSAO_FRACAO', desc, motivoTxt);
    _logMaster(fId + ' · ' + desc);
    mostrarToast("Fração excluída definitivamente. Ação registrada no log Master.");
  } else if (tipo === 'inativar_pai') {
    const idx = recursosAtivos.findIndex(x => x.id === pId);
    if (idx !== -1) {
      const item = recursosAtivos.splice(idx, 1)[0];
      item.editando = false;
      item.motivoAuditoria = motivoTxt || 'Não informado';
      const inputAuditData = document.getElementById('inputAuditData');
      item.dataAcao = inputAuditData ? inputAuditData.value : '';
      item.operador = 'Guilherme Alves Braga';
      recursosInativos.push(item);
      registrarLogAcao('INATIVACAO_INSTRUMENTO', `${item.instrumento} nº ${item.numero} · ${formatarMoedaBR(item.valorAtualizado)}`, motivoTxt);
      mostrarToast("Recurso inativado. Disponível no histórico para eventual reativação.");
    }
  } else if (tipo === 'salvar_pai') {
    salvarEdicaoPai(pId);
  } else if (tipo === 'salvar_fracao') {
    salvarEdicaoFracao(pId, fId);
  } 
  
  // AÇÕES DA ABA 2 (EXECUÇÃO FINANCEIRA)
  else if (tipo === 'excluir_empenho') {
    const alvo = empenhosAtivos.find(x => x.id === pId);
    const desc = alvo ? `Empenho ${alvo.numeroEmpenho} · ${alvo.area}` : pId;
    empenhosAtivos = empenhosAtivos.filter(x => x.id !== pId);
    registrarLogAcao('EXCLUSAO_EMPENHO', desc, motivoTxt);
    _logMaster(pId + ' · ' + desc);
    mostrarToast("Empenho excluído. Ação registrada no log Master.");
  } else if (tipo === 'excluir_parcela') {
    const emp = empenhosAtivos.find(x => x.id === pId);
    const par = emp?.parcelas.find(x => x.id === fId);
    const desc = par ? `Parcela ${par.comp} · ${formatarMoedaBR(par.valorParcela)} do empenho ${emp.numeroEmpenho}` : `${pId}/${fId}`;
    if (emp) emp.parcelas = emp.parcelas.filter(x => x.id !== fId);
    registrarLogAcao('EXCLUSAO_PARCELA', desc, motivoTxt);
    _logMaster(fId + ' · ' + desc);
    mostrarToast("Parcela excluída. Ação registrada no log Master.");
  } else if (tipo === 'salvar_empenho') {
    salvarEdicaoEmpenho(pId);
  } else if (tipo === 'salvar_parcela') {
    salvarEdicaoParcela(pId, fId);
  }

  fecharModalConfirmacao();
  renderizar();
}

// ====================================================
// PASSO 1 (Guilherme, 19/08/2026) — 7 abas novas
// State + Renderers + Handlers. Front-only para apresentacao.
// ====================================================

// -------- Estados ----------
let dadosGerais = { tags: [] }; // demais campos lidos direto do DOM
let contratados = [];
let evolucoes = [];
let processos = [];
let atoresGrupos = [];
let atoresDemais = [];
let garantias = [];
let semGarantia = false;
let diarios = [];

function _uid() { return Math.random().toString(36).slice(2, 10); }
function _valor(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function _setar(id, v) { const el = document.getElementById(id); if(el) el.value = v || ''; }
function _tdBtns(fnEdit, fnDel) {
  return `<td style="text-align:center; white-space:nowrap;">
    <button onclick="${fnDel}" class="btn-square-orange" title="Excluir">${iconTrash}</button>
    <button onclick="${fnEdit}" class="btn-square-teal" title="Editar">${iconPencil}</button>
  </td>`;
}

// Passo 7 (Guilherme, 20/08/2026): helpers reutilizáveis para 📋 copiar / 👁️ olho / 📅 datepicker nas tabelas.
function _escStr(v) { return String(v == null ? '' : v).replace(/'/g, "\\'"); }
function _htmlEsc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
// Célula de texto com botão de copiar inline (aparece sempre — mesmo em Modo Visualizar)
function celTextoCopy(val) {
  const v = _htmlEsc(val || '');
  if(!val) return '—';
  return `<span style="display:inline-flex; align-items:center; gap:4px;">${v} <button type="button" class="btn-copy-view" onclick="copiarTextoDireto('${_escStr(val)}', this)" title="Copiar">${iconCopy}</button></span>`;
}
// Célula de texto longo — mostra truncado + botão copiar + tooltip nativo (hover mostra texto integral)
// (Passo 12 Guilherme, 22/08/2026): removido botão 👁️ da coluna Observação — já existe na coluna Ações.
function celTextoLongo(val, titulo) {
  const v = val || '';
  if(!v) return '—';
  const trunc = v.length > 40 ? v.slice(0, 40) + '…' : v;
  return `<span style="display:inline-flex; align-items:center; gap:4px;" title="${_htmlEsc(v)}">${_htmlEsc(trunc)} <button type="button" class="btn-copy-view" onclick="copiarTextoDireto('${_escStr(v)}', this)" title="Copiar">${iconCopy}</button></span>`;
}
// Input de data com ícone de calendário funcional (Modo Editar)
function inputData(id, val, onChangeExpr) {
  const isEdit = modo === 'editar';
  if(!isEdit) return _htmlEsc(val || '—');
  return `<span class="date-input-wrap" style="display:inline-block; position:relative;">
    <input type="text" id="${id}" value="${_htmlEsc(val || '')}" oninput="applyDateMask(this); ${onChangeExpr||''}" class="input-plain" placeholder="dd/mm/aaaa" style="padding-right:22px;">
    <input type="date" class="date-picker-hidden" onchange="setDataFromPicker(this,'${id}')">
    <span class="th-cal-icon" style="right:4px;" onclick="abrirDatePicker(this)">📅</span>
  </span>`;
}
// Copiar texto direto (para strings — não vindas de input)
function copiarTextoDireto(txt, btn) {
  if(!txt) return;
  navigator.clipboard.writeText(txt).then(() => {
    mostrarToast('Copiado: ' + (txt.length > 30 ? txt.slice(0,30)+'…' : txt));
    if(btn) {
      const original = btn.innerHTML;
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      setTimeout(() => { btn.innerHTML = original; }, 1200);
    }
  });
}
// Abre modal de observação com um texto direto (não pega de campo)
function abrirModalObservacaoDireto(txt, titulo) {
  const modal = document.getElementById('modalLerObservacao');
  const texto = document.getElementById('textoModalObservacao');
  const tituloEl = modal?.querySelector('.modal-title');
  const auditWrap = document.getElementById('modalObsAuditWrap');
  if(!modal || !texto) return;
  texto.value = txt || '(vazio)';
  if(tituloEl) tituloEl.textContent = '📄 ' + (titulo || 'Observação Completa');
  if(auditWrap) auditWrap.classList.add('hidden'); // sem auditoria neste caso
  modal.classList.remove('hidden');
}
// Passo 11: abre modal COM AUDITORIA (usado no Diário — HU Ana Paula)
function abrirModalDiarioCompleto(id) {
  const d = diarios.find(x => x.id === id);
  if(!d) return;
  const modal = document.getElementById('modalLerObservacao');
  const texto = document.getElementById('textoModalObservacao');
  const tituloEl = modal?.querySelector('.modal-title');
  const auditWrap = document.getElementById('modalObsAuditWrap');
  if(!modal || !texto) return;
  texto.value = d.observacao || '(vazio)';
  if(tituloEl) tituloEl.textContent = '📄 Detalhes do Registro de Diário' + (d.imutavel ? ' — 🔒 IMUTÁVEL' : '');
  // Popular auditoria
  document.getElementById('modalObsCriadoPor').value = d.criadoPor || '—';
  document.getElementById('modalObsCriadoEm').value = d.criadoEm || '—';
  document.getElementById('modalObsAlteradoPor').value = d.alteradoPor || '—';
  document.getElementById('modalObsAlteradoEm').value = d.alteradoEm || '—';
  if(auditWrap) auditWrap.classList.remove('hidden');
  modal.classList.remove('hidden');
}

// -------- DADOS GERAIS ----------
function renderDadosGerais() {
  // Popula dropdown Periodicidade do valor (usa lista global OPCOES_PERIODICIDADE)
  const selPer = document.getElementById('dgPeriodicidade');
  if(selPer && selPer.options.length <= 1) {
    selPer.innerHTML = '<option value="">Selecione...</option>' +
      OPCOES_PERIODICIDADE.map(o => `<option>${o}</option>`).join('');
  }
  renderTags();
  atualizarBadgeEncerrado();
}
function renderTags() {
  const box = document.getElementById('dgTagsList');
  if(!box) return;
  box.innerHTML = (dadosGerais.tags || []).map((t, i) =>
    `<span class="dg-tag-chip">${t} <button type="button" onclick="removerTag(${i})" title="Remover">×</button></span>`
  ).join('');
}
function adicionarTag() {
  const inp = document.getElementById('inputNovaTag');
  const v = (inp?.value || '').trim();
  if(!v) return;
  (dadosGerais.tags = dadosGerais.tags || []).push(v);
  inp.value = '';
  renderTags();
  persistState();
}
function removerTag(i) {
  dadosGerais.tags.splice(i, 1);
  renderTags();
  persistState();
}
function atualizarBadgeEncerrado() {
  const chk = document.getElementById('dgEncerrado');
  const badgeHdr = document.getElementById('badgeEncerradoHdr');
  const on = !!(chk && chk.checked);
  if(badgeHdr) badgeHdr.classList.toggle('hidden', !on);
  persistState();
}

// Passo 2 (Guilherme, 19/08/2026): handlers do cabeçalho refinado (Áreas, Tags no header)
let headerAreas = ['DETIC', 'TESOURO'];
let headerTags = [];
function renderHeaderChips() {
  const areasBox = document.getElementById('hdrAreasChips');
  if(areasBox) {
    areasBox.innerHTML = headerAreas.map(a =>
      `<span class="badge-tag">${a} <span class="badge-close" onclick="removerArea('${a}')">×</span></span>`
    ).join('');
  }
  const tagsBox = document.getElementById('hdrTagsChips');
  if(tagsBox) {
    tagsBox.innerHTML = headerTags.map(t =>
      `<span class="badge-tag">${t} <span class="badge-close" onclick="removerTagHeader('${t}')">×</span></span>`
    ).join('');
  }
}
// Passo 5 (Guilherme, 20/08/2026): autocomplete flutuante com sugestões padrão
// Passo 14 (refinamento, 02/09/2026): catálogo institucional único usado em TODOS os dropdowns de Área
// (cabeçalho / valores e recursos / execução financeira). Ordem alfabética.
const OPCOES_AREAS = ['ACCESS','CAGE','DEPAD','DETIC','DICAF','GSF','JORNAL VALE','RECEITA','SECC','SEFIN','SGC','TARF','TESOURO'];
const OPCOES_TAGS  = ['SIGECOFI', 'PROMOVE', 'Fábrica de Software', 'Consultoria', 'Manutenção', 'TI', 'Encerrado', 'Prioritário'];
function renderSugestoes(tipo, termo) {
  const opcoes = tipo === 'area' ? OPCOES_AREAS : OPCOES_TAGS;
  const usados = tipo === 'area' ? headerAreas : headerTags;
  const box = document.getElementById(tipo === 'area' ? 'sugArea' : 'sugTag');
  if(!box) return;
  const t = (termo || '').toLowerCase().trim();
  const filtradas = opcoes.filter(op => !usados.includes(op) && op.toLowerCase().includes(t));
  if(filtradas.length === 0) {
    box.innerHTML = t ? `<div class="autocomplete-empty">Nada encontrado. Pressione Enter para adicionar "${t}".</div>` : '';
  } else {
    const fn = tipo === 'area' ? 'sugAdicionarArea' : 'sugAdicionarTag';
    box.innerHTML = filtradas.map(op => `<div class="autocomplete-item" onmousedown="${fn}('${op.replace(/'/g,"\\'")}')">${op}</div>`).join('');
  }
  box.classList.remove('hidden');
}
function esconderSugestoes() {
  document.getElementById('sugArea')?.classList.add('hidden');
  document.getElementById('sugTag')?.classList.add('hidden');
}
function sugAdicionarArea(val) {
  if(!headerAreas.includes(val)) headerAreas.push(val);
  const inp = document.getElementById('hdrInputArea'); if(inp) inp.value = '';
  esconderSugestoes(); renderHeaderChips(); persistState();
}
function sugAdicionarTag(val) {
  if(!headerTags.includes(val)) headerTags.push(val);
  const inp = document.getElementById('hdrInputTag'); if(inp) inp.value = '';
  esconderSugestoes(); renderHeaderChips(); persistState();
}
function adicionarArea() {
  const inp = document.getElementById('hdrInputArea');
  const v = (inp?.value || '').trim();
  if(!v) return;
  if(!headerAreas.includes(v)) headerAreas.push(v);
  if(inp) inp.value = '';
  esconderSugestoes();
  renderHeaderChips(); persistState();
}
function removerArea(a) {
  headerAreas = headerAreas.filter(x => x !== a);
  renderHeaderChips(); persistState();
}
function adicionarTagHeader() {
  const inp = document.getElementById('hdrInputTag');
  const v = (inp?.value || '').trim();
  if(!v) return;
  if(!headerTags.includes(v)) headerTags.push(v);
  if(inp) inp.value = '';
  esconderSugestoes();
  renderHeaderChips(); persistState();
}
function removerTagHeader(t) {
  headerTags = headerTags.filter(x => x !== t);
  renderHeaderChips(); persistState();
}
function salvarDadosGerais() {
  persistState();
  mostrarToast('Dados Gerais salvos.');
}
// Passo 5 (Guilherme, 20/08/2026): handlers dos ícones de ação nos campos
// Passo 17 (Sabrina + Ana Paula, 02/09/2026): Copiar padronizado com feedback verde temporário
function copiarCampo(id, btn) {
  const el = document.getElementById(id);
  if(!el) return;
  const v = el.value || '';
  if(!v.trim()) { mostrarToast('Campo vazio — nada para copiar.'); return; }
  navigator.clipboard.writeText(v).then(() => {
    mostrarToast('Copiado com sucesso!');
    if(btn) {
      const html = btn.innerHTML;
      const cor  = btn.style.color;
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      btn.style.color = '#16a34a';
      setTimeout(() => { btn.innerHTML = html; btn.style.color = cor; }, 1500);
    }
  }, () => mostrarToast('Não foi possível copiar.'));
}
function buscarProcesso() {
  const el = document.getElementById('dgProcesso');
  const v = (el?.value || '').trim();
  if(!v) { mostrarToast('Digite um número de processo antes de buscar.'); return; }
  mostrarToast('Buscando processo ' + v + '... (demo — sem back-end)');
}
// Passo 6: Datepicker nativo — clicar no ícone 📅 abre o calendário e preenche o input dd/mm/aaaa
function abrirDatePicker(icon) {
  if(modo !== 'editar') return; // trava no Modo Visualizar
  const wrap = icon.parentElement;
  const picker = wrap.querySelector('.date-picker-hidden');
  if(!picker) return;
  // Pré-preenche o picker com o valor atual (se dd/mm/aaaa) para abrir no mês certo
  const texto = wrap.querySelector('input[type="text"]');
  if(texto && texto.value) {
    const m = texto.value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if(m) picker.value = m[3] + '-' + m[2] + '-' + m[1];
  }
  if(typeof picker.showPicker === 'function') picker.showPicker();
  else picker.click(); // fallback pra browsers antigos
}
function setDataFromPicker(picker, targetId) {
  if(!picker.value) return;
  const [y, m, d] = picker.value.split('-');
  const el = document.getElementById(targetId);
  if(el) { el.value = d + '/' + m + '/' + y; el.dispatchEvent(new Event('input', {bubbles:true})); }
}
// Passo 6: abre o modal "Observação Completa" com o texto do campo alvo (Objeto, textareas, etc.)
function verObservacaoDeCampo(idCampo, titulo) {
  const el = document.getElementById(idCampo);
  const v = el?.value || '';
  const modal = document.getElementById('modalLerObservacao');
  const texto = document.getElementById('textoModalObservacao');
  const tituloEl = modal?.querySelector('.modal-title');
  if(!modal || !texto) return;
  texto.value = v || '(vazio)';
  if(tituloEl) tituloEl.textContent = '📄 ' + (titulo || 'Observação Completa');
  window.__observacaoModalOrigem = idCampo;
  modal.classList.remove('hidden');
}
function fecharDadosGerais() {
  mudarAba('valores');
}

// Passo 3 (Guilherme, 20/08/2026): salvar/fechar GLOBAIS acionados pelo rodapé
function salvarGlobal() {
  persistState();
  alternarModoGeral('visualizar');
  mostrarToast('Alterações salvas.');
}
function fecharGlobal() {
  // Se está em edit sem ter salvo, volta pra visualizar (não perde nada — persistState já salvou)
  alternarModoGeral('visualizar');
  mostrarToast('Modo visualizar ativado.');
}
// Toggles condicionais (fidelidade ao print SIGECOFI real)
// Passo 10 (Guilherme, 22/08/2026): Encerrado → mostra Motivo + Data com asterisco vermelho de obrigatório
function toggleEncerramentoCampos() {
  const chk = document.getElementById('dgEncerrado');
  const wrap = document.getElementById('dgEncerramentoWrap');
  if(wrap) wrap.classList.toggle('hidden', !(chk && chk.checked));
  persistState();
}
function togglePrazoOposicao() {
  const chk = document.getElementById('dgProrrogacao');
  const box = document.getElementById('dgPrazoWrap');
  if(box) box.classList.toggle('hidden', !(chk && chk.checked));
  persistState();
}
function toggleResponsaveis() {
  const chk = document.getElementById('dgEncerrado');
  const on = !!(chk && chk.checked);
  document.querySelectorAll('.dg-only-encerrado').forEach(el => el.classList.toggle('hidden', !on));
  persistState();
}

// -------- CONTRATADOS (Passo 4, Guilherme 20/08/2026: modal grande + histórico separado) ----------
function renderContratados() {
  const tbAtivos = document.getElementById('tbodyContratados');
  const tbHist   = document.getElementById('tbodyContratadosHist');
  if(!tbAtivos || !tbHist) return;
  const termo = (document.getElementById('inputSearchContratados')?.value || '').toLowerCase();
  const filtro = c => (c.nome || c.razao || '').toLowerCase().includes(termo);
  const ativos    = contratados.filter(c => c.status !== 'Inativo').filter(filtro);
  const inativos  = contratados.filter(c => c.status === 'Inativo').filter(filtro);
  const rowsFor = (arr, ehHist) => {
    if(arr.length === 0) return `<tr><td colspan="7" style="text-align:center; padding:16px; color:#94a3b8; font-style:italic;">${ehHist ? 'Nenhum contratado no histórico' : 'Nenhum contratado vinculado'}</td></tr>`;
    return arr.map(c => `
      <tr>
        <td>${celTextoCopy(c.nome || c.razao)}</td>
        <td>${celTextoCopy(c.doc)}</td>
        <td>${celTextoCopy(c.credor || c.codCredor)}</td>
        <td>${c.natureza || '—'}</td>
        <td>${c.dtIni || '—'}</td>
        <td>${c.dtFim || '—'}</td>
        <td style="text-align:center; white-space:nowrap;">
          <button onclick="abrirModalContratado('${c.id}')" class="btn-square-teal" title="Editar">${iconPencil}</button>
          <button onclick="removerContratado('${c.id}')" class="btn-square-orange" title="Excluir">${iconTrash}</button>
        </td>
      </tr>`).join('');
  };
  tbAtivos.innerHTML = rowsFor(ativos, false);
  tbHist.innerHTML   = rowsFor(inativos, true);
}
function atualizarContratado(id, campo, v) {
  const c = contratados.find(x => x.id === id); if(c) { c[campo] = v; persistState(); }
}
function removerContratado(id) {
  contratados = contratados.filter(c => c.id !== id); renderContratados(); persistState();
}
function ativarEdicao() { if(modo !== 'editar') alternarModoGeral('editar'); }

// Modal Contratado — abre pra criar (sem id) ou editar (com id)
let _mcEditingId = null;
let _mcContatos = [];
function abrirModalContratado(id) {
  _mcEditingId = id || null;
  _mcContatos = [];
  const c = id ? contratados.find(x => x.id === id) : null;
  const _s = (fid, v) => { const el = document.getElementById(fid); if(el) el.value = v || ''; };
  const _r = (radioId) => { const el = document.getElementById(radioId); if(el) el.checked = true; };
  _s('mcRazao',      c?.razao || c?.nome);
  _s('mcSigla',      c?.sigla);
  _s('mcDoc',        c?.doc);
  _s('mcCredor',     c?.credor);
  _s('mcFantasia',   c?.fantasia);
  _s('mcCep',        c?.cep);
  _s('mcLogradouro', c?.logradouro);
  _s('mcBairro',     c?.bairro);
  _s('mcMunicipio',  c?.municipio);
  _s('mcEstado',     c?.estado);
  _s('mcTelefone',   c?.telefone);
  _s('mcEmail',      c?.email);
  _s('mcNatureza',   c?.natureza);
  _s('mcCodCredor',  c?.codCredor);
  _s('mcDtIni',      c?.dtIni);
  _s('mcDtFim',      c?.dtFim);
  _r((c?.status === 'Inativo') ? 'mcStatusInativo' : 'mcStatusAtivo');
  document.getElementById('mcRazaoTitulo').textContent = (c?.razao || c?.nome || 'NOVO CONTRATADO').toUpperCase();
  _mcContatos = Array.isArray(c?.contatos) ? c.contatos.slice() : [];
  _mcRenderContatos();
  document.getElementById('modalContratado').classList.remove('hidden');
}
function fecharModalContratado() {
  document.getElementById('modalContratado').classList.add('hidden');
  _mcEditingId = null;
}
function _mcRenderContatos() {
  const box = document.getElementById('mcListaContatos');
  if(!box) return;
  if(_mcContatos.length === 0) {
    box.innerHTML = `<div style="color:#94a3b8; font-size:11px; font-style:italic; padding:6px;">Nenhum contato adicionado. Clique em + para adicionar.</div>`;
    return;
  }
  box.innerHTML = _mcContatos.map((v, i) =>
    `<div class="mc-contato-row"><input type="text" class="input-text input-blue" value="${v.replace(/"/g,'&quot;')}" oninput="_mcContatos[${i}] = this.value" placeholder="Nome / telefone / e-mail"><button type="button" onclick="mcRemoverContato(${i})">×</button></div>`
  ).join('');
}
function mcAdicionarContato() { _mcContatos.push(''); _mcRenderContatos(); }
function mcRemoverContato(i) { _mcContatos.splice(i,1); _mcRenderContatos(); }
function salvarModalContratado() {
  const val = id => document.getElementById(id)?.value || '';
  const rec = {
    razao: val('mcRazao'), nome: val('mcRazao'), // manter compat com colunas antigas
    sigla: val('mcSigla'), doc: val('mcDoc'), credor: val('mcCredor'),
    fantasia: val('mcFantasia'), cep: val('mcCep'), logradouro: val('mcLogradouro'),
    bairro: val('mcBairro'), municipio: val('mcMunicipio'), estado: val('mcEstado'),
    telefone: val('mcTelefone'), email: val('mcEmail'),
    natureza: val('mcNatureza'), codCredor: val('mcCodCredor'),
    dtIni: val('mcDtIni'), dtFim: val('mcDtFim'),
    status: document.getElementById('mcStatusInativo')?.checked ? 'Inativo' : 'Ativo',
    contatos: _mcContatos.filter(x => x && x.trim())
  };
  if(_mcEditingId) {
    const c = contratados.find(x => x.id === _mcEditingId);
    if(c) Object.assign(c, rec);
  } else {
    rec.id = _uid();
    contratados.push(rec);
  }
  fecharModalContratado();
  renderContratados(); persistState();
  mostrarToast('Contratado salvo.');
}

// -------- EVOLUÇÃO CONTRATUAL ----------
function renderEvolucao() {
  const tb = document.getElementById('tbodyEvolucao'); if(!tb) return;
  const termo = (document.getElementById('inputSearchEvolucao')?.value || '').toLowerCase();
  const lista = evolucoes.filter(e => (e.tipo||'').toLowerCase().includes(termo) || (e.numero||'').toLowerCase().includes(termo));
  if(lista.length === 0) {
    tb.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:16px; color:#94a3b8; font-style:italic;">Nenhuma alteração vinculada</td></tr>`;
    return;
  }
  const isEdit = modo === 'editar';
  tb.innerHTML = lista.map(e => `
    <tr>
      <td>${inputData('ev_dtAss_'+e.id, e.dtAss, `atualizarEvolucao('${e.id}','dtAss',this.value)`)}</td>
      <td>${isEdit ? `<select onchange="atualizarEvolucao('${e.id}','tipo',this.value)" class="input-plain">${getOptionsInstrumento(e.tipo)}</select>` : (e.tipo||'—')}</td>
      <td>${isEdit ? `<input type="text" value="${e.numero||''}" oninput="atualizarEvolucao('${e.id}','numero',this.value)" class="input-plain">` : celTextoCopy(e.numero)}</td>
      <td>${inputData('ev_ini_'+e.id, e.iniVig, `atualizarEvolucao('${e.id}','iniVig',this.value)`)}</td>
      <td>${inputData('ev_fim_'+e.id, e.fimVig, `atualizarEvolucao('${e.id}','fimVig',this.value)`)}</td>
      <td>${isEdit ? `<input type="text" value="${e.objeto||''}" oninput="atualizarEvolucao('${e.id}','objeto',this.value)" class="input-plain">` : celTextoLongo(e.objeto, 'Objeto da Evolução Contratual')}</td>
      <td>${isEdit ? `<input type="text" value="${e.valor||''}" oninput="applyCurrencyMask(this); atualizarEvolucao('${e.id}','valor',this.value)" class="input-plain">` : celTextoCopy(e.valor)}</td>
      <td>${isEdit ? `<select onchange="atualizarEvolucao('${e.id}','period',this.value)" class="input-plain">${getOptionsPeriodicidade(e.period)}</select>` : (e.period||'—')}</td>
      <td>${inputData('ev_publ_'+e.id, e.publ, `atualizarEvolucao('${e.id}','publ',this.value)`)}</td>
      <td>${isEdit ? `<input type="text" value="${e.pagina||''}" oninput="atualizarEvolucao('${e.id}','pagina',this.value)" class="input-plain">` : (e.pagina||'—')}</td>
      ${_tdBtns(`ativarEdicao()`, `removerEvolucao('${e.id}')`)}
    </tr>`).join('');
}
function adicionarEvolucao() { evolucoes.push({ id:_uid(), dtAss:'', tipo:'', numero:'', iniVig:'', fimVig:'', objeto:'', valor:'', period:'', publ:'', pagina:'' }); if(modo!=='editar') alternarModoGeral('editar'); renderEvolucao(); persistState(); }
function atualizarEvolucao(id, campo, v) { const e = evolucoes.find(x => x.id === id); if(e) { e[campo] = v; persistState(); } }
function removerEvolucao(id) { evolucoes = evolucoes.filter(e => e.id !== id); renderEvolucao(); persistState(); }

// -------- PROCESSOS VINCULADOS ----------
function renderProcessos() {
  const tb = document.getElementById('tbodyProcessos'); if(!tb) return;
  const termo = (document.getElementById('inputSearchProcessos')?.value || '').toLowerCase();
  const lista = processos.filter(p => (p.numero||'').toLowerCase().includes(termo));
  if(lista.length === 0) { tb.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:16px; color:#94a3b8; font-style:italic;">Nenhum processo vinculado</td></tr>`; return; }
  const isEdit = modo === 'editar';
  tb.innerHTML = lista.map(p => `
    <tr>
      <td>${isEdit ? `<input type="text" value="${p.numero||''}" oninput="atualizarProcesso('${p.id}','numero',this.value)" class="input-plain">` : celTextoCopy(p.numero)}</td>
      <td>${inputData('proc_dt_'+p.id, p.dtAbertura, `atualizarProcesso('${p.id}','dtAbertura',this.value)`)}</td>
      <td>${isEdit ? `<select onchange="atualizarProcesso('${p.id}','natureza',this.value)" class="input-plain">
        <option value="">Selecione...</option>
        <option${p.natureza==='Contratação PROA'?' selected':''}>Contratação PROA</option>
        <option${p.natureza==='Contratação SEI'?' selected':''}>Contratação SEI</option>
        <option${p.natureza==='Contratação SPI'?' selected':''}>Contratação SPI</option>
      </select>` : (p.natureza||'—')}</td>
      <td>${isEdit ? `<input type="text" value="${p.observacao||''}" oninput="atualizarProcesso('${p.id}','observacao',this.value)" class="input-plain">` : celTextoLongo(p.observacao, 'Observação do Processo')}</td>
      ${_tdBtns(`ativarEdicao()`, `removerProcesso('${p.id}')`)}
    </tr>`).join('');
}
function adicionarProcesso() { processos.push({ id:_uid(), numero:'', dtAbertura:'', natureza:'', observacao:'' }); if(modo!=='editar') alternarModoGeral('editar'); renderProcessos(); persistState(); }
function atualizarProcesso(id, campo, v) { const p = processos.find(x => x.id === id); if(p) { p[campo] = v; persistState(); } }
function removerProcesso(id) { processos = processos.filter(p => p.id !== id); renderProcessos(); persistState(); }

// -------- ATORES (Passo 8, Guilherme 20/08/2026 — layout completo SIGECOFI real) ----------
// Estrutura completa de cada Grupo Ordenador:
//   { id, nome, status, dtIni, dtFim, expandido,
//     responsaveis: [{id, nome, papel, status, dtIni, statusVig}],
//     fiscaisTitulares: [{id, nome, status, dtIni, dtFim, selecionado, suplentesExpandidos, suplentes:[{id,nome,dtIni}]}],
//     suplentesGlobalExpandido }
// Demais Atores: { id, nome, funcao, dtIni, instrumento }
function renderAtores() {
  const gBox = document.getElementById('atoresGrupos');
  const dBox = document.getElementById('atoresDemais');
  if(gBox) gBox.innerHTML = renderAtoresGrupos();
  if(dBox) dBox.innerHTML = renderAtoresDemais();
}
function renderAtoresGrupos() {
  if(atoresGrupos.length === 0) {
    return `<div style="padding:16px; text-align:center; color:#94a3b8; font-style:italic; font-size:12px;">Nenhum grupo ordenador vinculado ao contrato.</div>`;
  }
  return atoresGrupos.map(g => {
    const expandido = !!g.expandido;
    const qtdFiscais = (g.fiscaisTitulares || []).length;
    const selecionados = (g.fiscaisTitulares || []).filter(f => f.selecionado).length;
    const responsaveis = g.responsaveis || [];
    return `
      <div class="grupo-card">
        <div class="grupo-header" onclick="toggleGrupoAtor('${g.id}')">
          <div style="display:flex; align-items:center; gap:8px; flex:1;">
            <span class="chevron-icon">${expandido ? '▼' : '▶'}</span>
            <strong>${_htmlEsc(g.nome)}</strong>
            <span class="badge-status-ativo">${g.status || 'Ativo'}</span>
            <span class="badge-cinza">${(g.responsaveis?.length||0) + qtdFiscais} atores</span>
            <span style="color:#64748b; font-size:11px;">${g.dtIni || ''}</span>
          </div>
          <div style="display:flex; gap:4px;" onclick="event.stopPropagation()">
            <button class="btn-square-teal" title="Editar Grupo" onclick="editarGrupoAtor('${g.id}')">${iconPencil}</button>
            <button class="btn-square-orange" title="Desvincular Grupo" onclick="removerGrupoAtor('${g.id}')">🚫</button>
          </div>
        </div>
        ${expandido ? `
        <div class="grupo-body">
          <!-- Responsáveis do Grupo -->
          <div class="subsecao">
            <div class="subsecao-title">
              <span>👥 Responsáveis do Grupo</span>
              <span class="badge-cinza">${responsaveis.length}</span>
            </div>
            ${responsaveis.length === 0
              ? `<div style="padding:8px; color:#94a3b8; font-style:italic; font-size:11px;">Sem responsáveis cadastrados.</div>`
              : responsaveis.map(r => `
                <div class="responsavel-item">
                  <strong>${r.papel || 'Grupo Ordenador'}:</strong> ${_htmlEsc(r.nome)}
                  <span class="badge-tag" style="background:#fef3c7; color:#92400e; margin-left:4px;">${r.papel || 'Responsável'}</span>
                  <span class="badge-status-ativo">${r.status || 'Ativo'}</span>
                  <div style="font-size:11px; color:#64748b; margin-top:4px;">📅 ${r.dtIni || '—'} ${r.statusVig ? '('+r.statusVig+')' : ''}</div>
                </div>`).join('')}
          </div>
          <!-- Fiscais Técnicos Titulares -->
          <div class="subsecao">
            <div class="subsecao-title" style="justify-content:space-between;">
              <div style="display:flex; gap:6px; align-items:center;">
                <span onclick="toggleGrupoAtor('${g.id}')" style="cursor:pointer;">▼ Fiscais Técnicos Titulares</span>
                <span class="badge-cinza">${qtdFiscais}</span>
              </div>
              <div style="display:flex; gap:4px; flex-wrap:wrap;">
                <button class="btn-mini" onclick="toggleSuplentesGlobal('${g.id}')">↕ ${g.suplentesGlobalExpandido ? 'Recolher' : 'Expandir'} Suplentes</button>
                <button class="btn-mini" title="Histórico">🕒 Histórico</button>
                <button class="btn-mini" title="Ver Todos">☰ Ver Todos (${qtdFiscais})</button>
                <button class="btn-mini-orange" onclick="alertarModoEditar()">${selecionados > 0 ? 'Mover ('+selecionados+')' : '☐ Selecionar'}</button>
              </div>
            </div>
            ${(g.fiscaisTitulares || []).map(f => `
              <div class="fiscal-item ${f.selecionado ? 'selecionado' : ''}">
                <div style="display:flex; align-items:center; gap:8px; flex:1;">
                  <input type="checkbox" ${f.selecionado?'checked':''} onclick="event.stopPropagation()" onchange="toggleSelecionarFiscal('${g.id}','${f.id}',this.checked)">
                  <div>
                    <strong>${_htmlEsc(f.nome)}</strong>
                    <span class="badge-status-ativo">${f.status || 'Ativo'}</span>
                    <div style="font-size:11px; color:#64748b; margin-top:4px;">📅 ${f.dtIni || '—'} ${f.dtFim ? '· '+f.dtFim : '(sem data fim)'}</div>
                  </div>
                </div>
                <div style="display:flex; gap:4px;">
                  <button class="btn-mini-verde" onclick="gerenciarSuplentes('${g.id}','${f.id}')" title="Gerenciar Suplentes">👥</button>
                  <button class="btn-mini" title="Mais opções">⋮</button>
                </div>
              </div>
              ${(g.suplentesGlobalExpandido || f.suplentesExpandidos) ? `
                <div class="suplentes-list">
                  ${(f.suplentes||[]).length === 0
                    ? `<div style="padding:6px 12px; color:#94a3b8; font-style:italic; font-size:11px;">↳ Nenhum suplente vinculado</div>`
                    : (f.suplentes||[]).map(s => `<div class="suplente-item">↳ <strong>${_htmlEsc(s.nome)}</strong> <span style="color:#64748b; font-size:11px;">${s.dtIni||''}</span></div>`).join('')}
                </div>` : ''}
            `).join('')}
          </div>
        </div>` : ''}
      </div>`;
  }).join('');
}
function renderAtoresDemais() {
  if(atoresDemais.length === 0) {
    return `<div style="padding:16px; text-align:center; color:#94a3b8; font-style:italic; font-size:12px;">Nenhum ator ativo vinculado.</div>`;
  }
  return atoresDemais.map(a => `
    <div class="ator-demais-card">
      <div style="flex:1;">
        <strong>${_htmlEsc(a.nome)}</strong>
        <div style="font-size:11px; color:#005F73; font-weight:500; margin-top:2px;">${_htmlEsc(a.funcao || '—')}</div>
        <div style="font-size:11px; color:#94a3b8; margin-top:4px;">Início: ${a.dtIni || '(sem data)'} | Instrumento: ${a.instrumento || '(não informado)'}</div>
      </div>
      <div style="display:flex; gap:4px;">
        <button class="btn-mini-laranja" title="Histórico">🕒</button>
        <button class="btn-square-orange" title="Remover" onclick="removerAtorDemais('${a.id}')">${iconTrash}</button>
        <button class="btn-square-teal" title="Editar" onclick="alertarModoEditar()">${iconPencil}</button>
      </div>
    </div>`).join('');
}
function toggleGrupoAtor(id) {
  const g = atoresGrupos.find(x => x.id === id);
  if(g) { g.expandido = !g.expandido; renderAtores(); persistState(); }
}
function toggleSuplentesGlobal(id) {
  const g = atoresGrupos.find(x => x.id === id);
  if(g) { g.suplentesGlobalExpandido = !g.suplentesGlobalExpandido; renderAtores(); persistState(); }
}
function toggleSelecionarFiscal(gId, fId, marcado) {
  const g = atoresGrupos.find(x => x.id === gId); if(!g) return;
  const f = g.fiscaisTitulares?.find(x => x.id === fId); if(!f) return;
  f.selecionado = !!marcado; renderAtores(); persistState();
}
function gerenciarSuplentes(gId, fId) {
  const g = atoresGrupos.find(x => x.id === gId); if(!g) return;
  const f = g.fiscaisTitulares?.find(x => x.id === fId); if(!f) return;
  const nome = prompt(`Adicionar suplente para ${f.nome}:\nNome do suplente:`);
  if(!nome) return;
  f.suplentes = f.suplentes || [];
  f.suplentes.push({ id: _uid(), nome: nome.trim(), dtIni: '' });
  f.suplentesExpandidos = true;
  renderAtores(); persistState();
  mostrarToast('Suplente adicionado a ' + f.nome);
}
function editarGrupoAtor(id) {
  if(modo !== 'editar') { mostrarToast('Ative o Modo Editar primeiro.'); return; }
  const g = atoresGrupos.find(x => x.id === id); if(!g) return;
  const novo = prompt('Nome do Grupo Ordenador:', g.nome);
  if(novo) { g.nome = novo.trim(); renderAtores(); persistState(); }
}
function alertarModoEditar() {
  if(modo !== 'editar') { mostrarToast('Ative o Modo Editar para modificar.'); return false; }
  return true;
}
function vincularGrupo() {
  if(!alertarModoEditar()) return;
  const nome = prompt('Nome do Grupo Ordenador (ex.: ACCESS_RECEITA):'); if(!nome) return;
  atoresGrupos.push({
    id: _uid(), nome: nome.trim().toUpperCase(), status: 'Ativo', dtIni: new Date().toLocaleDateString('pt-BR'), dtFim: '',
    expandido: true, responsaveis: [], fiscaisTitulares: []
  });
  renderAtores(); persistState();
}
function adicionarAtor() {
  if(!alertarModoEditar()) return;
  const nome = prompt('Nome do Ator:'); if(!nome) return;
  const funcao = prompt('Função (ex.: Gestor do Contrato, Responsável SECC):') || '—';
  atoresDemais.push({ id: _uid(), nome: nome.trim(), funcao: funcao.trim(), dtIni: '', instrumento: '' });
  renderAtores(); persistState();
}
function removerGrupoAtor(id) {
  if(!alertarModoEditar()) return;
  atoresGrupos = atoresGrupos.filter(g => g.id !== id); renderAtores(); persistState();
}
function removerAtorDemais(id) {
  if(!alertarModoEditar()) return;
  atoresDemais = atoresDemais.filter(a => a.id !== id); renderAtores(); persistState();
}

// -------- GARANTIAS ----------
function renderGarantias() {
  const chk = document.getElementById('chkSemGarantia'); if(chk) chk.checked = !!semGarantia;
  const tb = document.getElementById('tbodyGarantias'); if(!tb) return;
  if(semGarantia) {
    tb.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:16px; color:#64748b; font-style:italic;">Contrato marcado como "sem garantia" — nenhuma obrigatoriedade se aplica.</td></tr>`;
    return;
  }
  const termo = (document.getElementById('inputSearchGarantias')?.value || '').toLowerCase();
  const lista = garantias.filter(g => (g.tipo||'').toLowerCase().includes(termo));
  if(lista.length === 0) { tb.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:16px; color:#94a3b8; font-style:italic;">Nenhuma garantia ativa vinculada ao contrato</td></tr>`; return; }
  const isEdit = modo === 'editar';
  tb.innerHTML = lista.map(g => `
    <tr>
      <td>${isEdit ? `<select onchange="atualizarGarantia('${g.id}','tipo',this.value)" class="input-plain">
        <option value="">Selecione...</option>
        ${['Caução em dinheiro','Seguro-garantia','Fiança bancária','Título da dívida pública'].map(t=>`<option${g.tipo===t?' selected':''}>${t}</option>`).join('')}
      </select>` : (g.tipo||'—')}</td>
      <td>${isEdit ? `<input type="text" value="${g.valor||''}" oninput="applyCurrencyMask(this); atualizarGarantia('${g.id}','valor',this.value)" class="input-plain">` : celTextoCopy(g.valor)}</td>
      <td>${inputData('gar_ini_'+g.id, g.dtIni, `atualizarGarantia('${g.id}','dtIni',this.value)`)}</td>
      <td>${inputData('gar_venc_'+g.id, g.dtVenc, `atualizarGarantia('${g.id}','dtVenc',this.value)`)}</td>
      ${_tdBtns(`ativarEdicao()`, `removerGarantia('${g.id}')`)}
    </tr>`).join('');
}
function adicionarGarantia() { if(semGarantia) { alert('Desmarque "Contrato sem Garantia" primeiro.'); return; } garantias.push({ id:_uid(), tipo:'', valor:'', dtIni:'', dtVenc:'' }); if(modo!=='editar') alternarModoGeral('editar'); renderGarantias(); persistState(); }
function atualizarGarantia(id, campo, v) { const g = garantias.find(x => x.id === id); if(g) { g[campo] = v; persistState(); } }
function removerGarantia(id) { garantias = garantias.filter(g => g.id !== id); renderGarantias(); persistState(); }
function toggleSemGarantia() { semGarantia = !semGarantia; renderGarantias(); persistState(); }

// -------- DIÁRIO ----------
function renderDiario() {
  const tb = document.getElementById('tbodyDiario'); if(!tb) return;
  const termo = (document.getElementById('inputSearchDiario')?.value || '').toLowerCase();
  const lista = diarios.filter(d => (d.observacao||'').toLowerCase().includes(termo));
  if(lista.length === 0) { tb.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:16px; color:#94a3b8; font-style:italic;">Nenhum registro no diário</td></tr>`; return; }
  const isEdit = modo === 'editar';
  tb.innerHTML = lista.map(d => {
    const imut = !!d.imutavel;
    // Registros imutáveis: sempre em modo texto (nunca inputs), sem botões de ação
    if(imut) {
      return `
        <tr class="diario-linha-imutavel">
          <td>${d.data || '—'}</td>
          <td>${d.area || '—'} <span class="badge-imutavel">🔒 IMUTÁVEL</span></td>
          <td>${d.movimento || '—'}</td>
          <td>${d.meio || '—'}</td>
          <td>${d.responsavel || '—'}</td>
          <td>${celTextoLongo(d.observacao, 'Observação (Histórico Imutável)')}</td>
          <td style="text-align:center; white-space:nowrap;">
            <button class="btn-square-teal" onclick="abrirModalDiarioCompleto('${d.id}')" title="Visualizar Completo (observação + auditoria)">${iconEye}</button>
          </td>
        </tr>`;
    }
    // Passo 12 (Guilherme, 22/08/2026): botões padronizados no Diário — ordem 👁️ | ✏️ | 🗑️ em Editar
    const acoesEdit = `<td style="text-align:center; white-space:nowrap;">
        <button onclick="abrirModalDiarioCompleto('${d.id}')" class="btn-square-teal" title="Visualizar completo (observação + auditoria)">${iconEye}</button>
        <button onclick="ativarEdicao()" class="btn-square-teal" title="Editar">${iconPencil}</button>
        <button onclick="removerDiario('${d.id}')" class="btn-square-orange" title="Excluir">${iconTrash}</button>
      </td>`;
    return `
    <tr>
      <td>${inputData('di_data_'+d.id, d.data, `atualizarDiario('${d.id}','data',this.value)`)}</td>
      <td>${isEdit ? `<input type="text" value="${d.area||''}" oninput="atualizarDiario('${d.id}','area',this.value)" class="input-plain">` : (d.area||'—')}</td>
      <td>${isEdit ? `<select onchange="atualizarDiario('${d.id}','movimento',this.value)" class="input-plain">
        <option value="">Selecione...</option>
        ${['Observação Contrato','Alteração de Vigência','Renovação','Notificação','Outro'].map(m=>`<option${d.movimento===m?' selected':''}>${m}</option>`).join('')}
      </select>` : (d.movimento||'—')}</td>
      <td>${isEdit ? `<input type="text" value="${d.meio||''}" oninput="atualizarDiario('${d.id}','meio',this.value)" class="input-plain">` : (d.meio||'—')}</td>
      <td>${isEdit ? `<input type="text" value="${d.responsavel||''}" oninput="atualizarDiario('${d.id}','responsavel',this.value)" class="input-plain">` : (d.responsavel||'—')}</td>
      <td>${isEdit
        ? `<span class="obs-cell-edit" title="${_htmlEsc(d.observacao||'')}"><input type="text" value="${_htmlEsc(d.observacao||'')}" oninput="atualizarDiario('${d.id}','observacao',this.value)" class="input-plain"><button type="button" class="btn-copy-view" onclick="copiarTextoDireto('${_escStr(d.observacao||'')}', this)" title="Copiar observação">${iconCopy}</button></span>`
        : celTextoLongo(d.observacao, 'Observação do Diário')}</td>
      ${isEdit ? acoesEdit : `<td style="text-align:center; white-space:nowrap;">
        <button onclick="abrirModalDiarioCompleto('${d.id}')" class="btn-square-teal" title="Visualizar completo (observação + auditoria)">${iconEye}</button>
      </td>`}
    </tr>`;
  }).join('');
}
// Passo 11 (Guilherme, 22/08/2026): auditoria de Diário — quem criou/alterou + quando
const USUARIO_ATUAL = 'Guilherme Alves Braga';
function _agoraStr() {
  const d = new Date();
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
}
function adicionarDiario() {
  const agora = _agoraStr();
  diarios.push({
    id: _uid(), data:'', area:'', movimento:'', meio:'', responsavel:'', observacao:'', imutavel:false,
    criadoPor: USUARIO_ATUAL, criadoEm: agora,
    alteradoPor: '', alteradoEm: ''
  });
  if(modo!=='editar') alternarModoGeral('editar');
  renderDiario(); persistState();
}
function atualizarDiario(id, campo, v) {
  const d = diarios.find(x => x.id === id);
  if(!d) return;
  if(d.imutavel) { mostrarToast('Registro imutável — não pode ser alterado.'); renderDiario(); return; }
  d[campo] = v;
  d.alteradoPor = USUARIO_ATUAL;
  d.alteradoEm = _agoraStr();
  persistState();
}
function removerDiario(id) {
  const d = diarios.find(x => x.id === id);
  if(d && d.imutavel) { mostrarToast('Registro imutável — não pode ser excluído (histórico).'); return; }
  diarios = diarios.filter(d => d.id !== id); renderDiario(); persistState();
}
// Passo 9 (Guilherme, 20/08/2026): Envio de e-mail de vencimento/prorrogação
//  · Trava se não houver responsável cadastrado (Card #15972)
//  · Grava registro imutável no histórico (Card #15603)
function enviarEmailDiario() {
  // Passo 13 (Guilherme, 28/08/2026): trava com MODAL CENTRALIZADO (não mais banner)
  const temRespGrupo = atoresGrupos.some(g => (g.responsaveis||[]).length > 0);
  const temRespDemais = atoresDemais.some(a => (a.funcao||'').toLowerCase().includes('responsável') || (a.funcao||'').toLowerCase().includes('gestor'));
  if(!temRespGrupo && !temRespDemais) {
    // Abre modal de alerta centralizado — operador decide se prossegue
    document.getElementById('modalAlertaEnvio').classList.remove('hidden');
    return;
  }
  _prosseguirEnvioEmail();
}
function fecharModalAlertaEnvio() {
  document.getElementById('modalAlertaEnvio').classList.add('hidden');
}
function confirmarEnvioSemResponsavel() {
  fecharModalAlertaEnvio();
  _prosseguirEnvioEmail();
}
function _prosseguirEnvioEmail() {
  const tipo = confirm('Enviar e-mail de VENCIMENTO ou PRORROGAÇÃO?\n\nOK = Vencimento\nCancelar = Prorrogação') ? 'Vencimento' : 'Prorrogação';
  const responsavel = (atoresGrupos.find(g=>(g.responsaveis||[]).length>0)?.responsaveis[0]?.nome) || (atoresDemais.find(a=>(a.funcao||'').toLowerCase().includes('gestor') || (a.funcao||'').toLowerCase().includes('responsável'))?.nome) || 'Sistema';
  const hoje = new Date().toLocaleDateString('pt-BR');
  // Passo 10 (Bug Ana Paula): garantir que TODAS as datas no corpo do e-mail sejam DD/MM/AAAA
  const dtFim = document.getElementById('hdrFim')?.value || '(não preenchida)';
  const dtProrr = document.getElementById('hdrProrr')?.value || '(não preenchida)';
  const nrContrato = document.getElementById('hdrNumero')?.value || '(não preenchido)';
  const corpoEmail = [
    `E-mail de ${tipo.toLowerCase()} enviado automaticamente pelo sistema em ${hoje}.`,
    ``,
    `Contrato: ${nrContrato}`,
    `Vencimento (Fim): ${dtFim}`,
    `Prorrogação até: ${dtProrr}`,
    ``,
    `Todas as datas estão no formato DD/MM/AAAA.`,
    `Registro imutável para fins de auditoria.`
  ].join('\n');
  // Grava registro IMUTÁVEL no topo do diário
  diarios.unshift({
    id: _uid(),
    data: hoje,
    area: 'Sistema',
    movimento: 'E-mail ' + tipo,
    meio: 'E-mail',
    responsavel: responsavel,
    observacao: corpoEmail,
    imutavel: true,
    criadoPor: 'Sistema (envio automático)',
    criadoEm: _agoraStr(),
    alteradoPor: '',
    alteradoEm: ''
  });
  renderDiario();
  persistState();
  mostrarToast(`✅ E-mail de ${tipo} enviado. Registro imutável gravado no diário.`);
}

// -------- LOCALSTORAGE ----------
const LS_KEY = 'sigecofi_dev_state_v1';
let _lsTimer = null;
function persistState() {
  if(_lsTimer) clearTimeout(_lsTimer);
  _lsTimer = setTimeout(() => {
    try {
      const snap = {
        headerAreas, headerTags,
        dadosGerais: {
          tags: dadosGerais.tags || [],
          processo: _valor('dgProcesso'),
          fpe: _valor('dgFPE'), externo: _valor('dgExterno'),
          modo_cont: _valor('dgModo'), tipo: _valor('dgTipo'),
          objeto: _valor('dgObjeto'), valor: _valor('dgValor'),
          period: _valor('dgPeriodicidade'), indice: _valor('dgIndice'),
          dtReajuste: _valor('dgDataReajuste'), publ: _valor('dgPublicacao'),
          ordemIni: _valor('dgOrdemInicio'), motivoEnc: _valor('dgMotivoEnc'),
          dtEnc: _valor('dgDataEnc'), prazoOpos: _valor('dgPrazoOpos'),
          secc: _valor('dgStatusSECC'), sgc: _valor('dgStatusSGC'), sefin: _valor('dgStatusSEFIN'),
          encerrado: !!document.getElementById('dgEncerrado')?.checked,
          emergencial: !!document.getElementById('dgEmergencial')?.checked,
          prorrogacao: !!document.getElementById('dgProrrogacao')?.checked
        },
        contratados, evolucoes, processos, atoresGrupos, atoresDemais,
        garantias, semGarantia, diarios,
        logAcoes
      };
      localStorage.setItem(LS_KEY, JSON.stringify(snap));
    } catch(e) { /* silencioso */ }
  }, 200);
}
function restoreState() {
  try {
    const raw = localStorage.getItem(LS_KEY); if(!raw) return;
    const s = JSON.parse(raw);
    if(s.dadosGerais) {
      dadosGerais.tags = s.dadosGerais.tags || [];
      // aguarda DOM estar pronto — será preenchido no primeiro renderDadosGerais via _setar abaixo
      window.__pendingDados = s.dadosGerais;
    }
    if(Array.isArray(s.headerAreas)) headerAreas = s.headerAreas;
    if(Array.isArray(s.headerTags)) headerTags = s.headerTags;
    contratados = s.contratados || [];
    evolucoes = s.evolucoes || [];
    processos = s.processos || [];
    atoresGrupos = s.atoresGrupos || [];
    atoresDemais = s.atoresDemais || [];
    garantias = s.garantias || [];
    semGarantia = !!s.semGarantia;
    diarios = s.diarios || [];
    logAcoes = Array.isArray(s.logAcoes) ? s.logAcoes : [];
  } catch(e) { /* silencioso */ }
}
function aplicarDadosGeraisDoStorage() {
  const s = window.__pendingDados; if(!s) return;
  _setar('dgProcesso', s.processo); _setar('dgFPE', s.fpe); _setar('dgExterno', s.externo);
  _setar('dgModo', s.modo_cont); _setar('dgTipo', s.tipo); _setar('dgObjeto', s.objeto);
  _setar('dgValor', s.valor); _setar('dgPeriodicidade', s.period); _setar('dgIndice', s.indice);
  _setar('dgDataReajuste', s.dtReajuste); _setar('dgPublicacao', s.publ);
  _setar('dgOrdemInicio', s.ordemIni); _setar('dgMotivoEnc', s.motivoEnc);
  _setar('dgDataEnc', s.dtEnc); _setar('dgPrazoOpos', s.prazoOpos);
  _setar('dgStatusSECC', s.secc); _setar('dgStatusSGC', s.sgc); _setar('dgStatusSEFIN', s.sefin);
  const chkE = document.getElementById('dgEncerrado'); if(chkE) chkE.checked = !!s.encerrado;
  const chkEm = document.getElementById('dgEmergencial'); if(chkEm) chkEm.checked = !!s.emergencial;
  const chkP = document.getElementById('dgProrrogacao'); if(chkP) chkP.checked = !!s.prorrogacao;
  window.__pendingDados = null;
}
// Salvar quando qualquer input do Dados Gerais mudar (delegated event)
document.addEventListener('input', function(e) {
  if(e.target && typeof e.target.id === 'string' && e.target.id.indexOf('dg') === 0) persistState();
});
document.addEventListener('change', function(e) {
  if(e.target && typeof e.target.id === 'string' && (e.target.id.indexOf('dg') === 0 || e.target.id === 'chkSemGarantia')) persistState();
});

// INICIALIZAÇÃO
window.onload = function() {
  recalcularProporcionaisAtivos();
  recalcularFracoesAtivas();
  restoreState();
  mudarAba('dados'); // abrir Dados Gerais por padrão (a primeira aba)
  aplicarDadosGeraisDoStorage();
  renderHeaderChips();
  atualizarBadgeEncerrado();
  togglePrazoOposicao();
  toggleEncerramentoCampos();
  toggleResponsaveis();
  alternarModoGeral('visualizar');
};
