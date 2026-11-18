/* =========================================================
   conteudo.js · Área "Conteúdo" do UGC Organized
   Quadro de produção estilo Trello (da ideia à entrega/post):
   colunas, cartões com etiquetas, prazo, checklist e marca,
   arrastar entre colunas e reordenar, adicionar rápido.
   Biblioteca de roteiros (gancho, desenvolvimento, chamada).
   Tabela: conteudos (conteudo.sql + conteudo-quadro.sql).
   ========================================================= */
(function () {
  const ETAPAS = [
    { id: 'ideia', nome: 'Ideias', emoji: '💡', dica: 'Tudo que pode virar conteúdo' },
    { id: 'briefing', nome: 'Aguardando briefing', emoji: '📋', dica: 'Esperando a marca mandar o briefing' },
    { id: 'produto', nome: 'Aguardando produto', emoji: '📦', dica: 'Esperando o produto chegar' },
    { id: 'roteiro', nome: 'Roteiro', emoji: '✍️', dica: 'Gancho, falas e chamada' },
    { id: 'aprovacao', nome: 'Aprovação da marca', emoji: '📨', dica: 'Esperando a marca aprovar' },
    { id: 'gravar', nome: 'Gravar', emoji: '🎥', dica: 'Pronto para gravar' },
    { id: 'editar', nome: 'Editar', emoji: '✂️', dica: 'Corte, legenda e música' },
    { id: 'ajustes', nome: 'Ajustes', emoji: '🔁', dica: 'A marca pediu alterações' },
    { id: 'agendado', nome: 'Pronto / agendado', emoji: '📅', dica: 'Esperando a data' },
    { id: 'postado', nome: 'Entregue / postado', emoji: '✓', dica: 'Concluído' }
  ];
  const ETIQUETAS = {
    urgente: { nome: 'Urgente', cor: '#ff4d6d' },
    pago: { nome: 'Pago', cor: '#7fc400' },
    permuta: { nome: 'Permuta', cor: '#a77bff' },
    ads: { nome: 'Anúncio / Ads', cor: '#3d8bff' },
    collab: { nome: 'Collab', cor: '#ff2d9b' },
    organico: { nome: 'Orgânico', cor: '#f2b705' },
    produto: { nome: 'Esperando produto', cor: '#ff8a3d' }
  };
  // Checklist que já vem pronta em cada cartão novo (dá para editar)
  function checklistPadrao(paraMarca) {
    return (paraMarca
      ? ['Ler o briefing', 'Escrever o roteiro', 'Roteiro aprovado pela marca', 'Gravar', 'Editar', 'Enviar para aprovação', 'Vídeo aprovado', 'Entregar o arquivo final']
      : ['Escrever o roteiro', 'Gravar', 'Editar', 'Legenda e hashtags', 'Capa', 'Agendar ou postar']).map(t => ({ t, ok: false }));
  }
  const NOME_ETAPA = Object.fromEntries(ETAPAS.map(e => [e.id, e.nome]));
  const PLATAFORMAS = { instagram: '📸 Instagram', tiktok: '🎵 TikTok', youtube: '▶️ YouTube', marca: '💼 Para a marca', outro: '✦ Outro' };
  const FORMATOS = { reels: 'Reels', carrossel: 'Carrossel', story: 'Story', foto: 'Foto', video_ugc: 'Vídeo UGC', live: 'Live', video_longo: 'Vídeo longo' };
  const STATUS_ROTEIRO = { rascunho: { nome: 'Rascunho', cor: 'neutro' }, enviado: { nome: 'Enviado à marca', cor: 'alerta' }, ajustes: { nome: 'Pediram ajustes', cor: 'atraso' }, aprovado: { nome: 'Aprovado', cor: 'ok' } };

  let sb, raiz, itens = [], visao = 'planner', mesCal = new Date(), carregado = false, arrastando = null;
  const filtro = { busca: '', marca: '', etiqueta: '' };
  const chk = (c) => (Array.isArray(c.checklist) ? c.checklist : []);
  const etqs = (c) => (Array.isArray(c.etiquetas) ? c.etiquetas : []);
  // Colunas recolhidas (fica guardado neste aparelho)
  let recolhidas = []; try { recolhidas = JSON.parse(localStorage.getItem('oug_qd_recolhidas') || '[]'); } catch (e) {}
  const alternarColuna = (id) => { recolhidas = recolhidas.includes(id) ? recolhidas.filter(x => x !== id) : recolhidas.concat(id); try { localStorage.setItem('oug_qd_recolhidas', JSON.stringify(recolhidas)); } catch (e) {} desenharPlanner(); };
  // O que a marca ainda vai mandar (lista do acordo nas Marcas)
  const aReceber = (marcaId) => { const m = marcaId && marcas().find(x => x.id === marcaId); return m && Array.isArray(m.acordo) ? m.acordo.filter(x => x.envio && !x.recebido) : []; };
  const faltaSQL = (e) => /checklist|etiquetas|posicao|link_arquivo|etapa_check|aprovacao|ajustes|briefing|23514|PGRST204/i.test((e && (e.message + ' ' + e.code)) || '');
  mesCal.setDate(1);

  const $ = (s, el) => (el || raiz).querySelector(s);
  const $$ = (s, el) => [...(el || raiz).querySelectorAll(s)];
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const paraISO = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const deISO = (s) => { const [a, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(a, m - 1, d); };
  const hoje = () => paraISO(new Date());
  const somaDias = (iso, n) => { const d = deISO(iso); d.setDate(d.getDate() + n); return paraISO(d); };
  const fmtCurta = (iso) => iso ? deISO(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
  const marcas = () => (window.Marcas ? Marcas.lista() : []);
  const nomeMarca = (id) => (marcas().find(m => m.id === id) || {}).nome;
  const temRoteiro = (c) => !!(c.gancho || c.desenvolvimento || c.cta);
  const digitos = (t) => { let d = String(t || '').replace(/\D/g, ''); if (d.length === 10 || d.length === 11) d = '55' + d; return d; };

  function toast(msg, erro) {
    let t = document.getElementById('toast-marcas');
    if (!t) { t = document.createElement('div'); t.id = 'toast-marcas'; document.body.appendChild(t); }
    t.textContent = msg; t.className = 'toast-m ativo' + (erro ? ' erro' : '');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('ativo'), 2800);
  }

  function textoRoteiro(c) {
    const partes = [`ROTEIRO: ${c.titulo}${c.marca_id ? ' · ' + (nomeMarca(c.marca_id) || '') : ''}`];
    if (c.formato) partes.push(`Formato: ${FORMATOS[c.formato] || c.formato}`);
    if (c.gancho) partes.push(`\nGANCHO (primeiros segundos)\n${c.gancho}`);
    if (c.desenvolvimento) partes.push(`\nDESENVOLVIMENTO\n${c.desenvolvimento}`);
    if (c.cta) partes.push(`\nCHAMADA PARA AÇÃO\n${c.cta}`);
    if (c.legenda) partes.push(`\nLEGENDA\n${c.legenda}`);
    return partes.join('\n');
  }

  // ===== Banco =====
  async function salvar(id, dados) {
    const q = id ? sb.from('conteudos').update(dados).eq('id', id) : sb.from('conteudos').insert(dados);
    const { data, error } = await q.select().single();
    if (error) throw error;
    const i = itens.findIndex(x => x.id === data.id);
    if (i >= 0) itens[i] = data; else itens.unshift(data);
    return data;
  }

  async function mover(id, etapa) {
    const c = itens.find(x => x.id === id); if (!c || c.etapa === etapa) return;
    try {
      const extra = etapa === 'aprovacao' && temRoteiro(c) && (!c.roteiro_status || c.roteiro_status === 'rascunho') ? { roteiro_status: 'enviado' } : {};
      if (c.etapa === 'produto' && etqs(c).includes('produto')) extra.etiquetas = etqs(c).filter(k => k !== 'produto');
      await salvar(id, { etapa, ...extra }); desenhar();
      toast(etapa === 'postado' ? `${c.titulo}: no ar! ${G.t('Arrasou', 'Mandou bem')}, ${G.apelido()} ✦` : `${c.titulo} foi para "${NOME_ETAPA[etapa]}"`);
      if (etapa === 'gravar' && window.Tarefas && confirm('Quer reservar um horário para gravar?')) Tarefas.novaCom({ titulo: `Gravar: ${c.titulo}`, categoria: 'gravar', marca_id: c.marca_id });
    } catch (e) { console.error(e); toast(faltaSQL(e) ? 'Falta ativar o quadro novo: rode o conteudo-quadro.sql no Supabase.' : 'Não consegui mover agora.', true); }
  }

  // Ordem dos cartões dentro da coluna (como no Trello)
  const ordenar = (lista) => lista.slice().sort((a, b) => (a.posicao ?? 1e9) - (b.posicao ?? 1e9) || (a.data_publicacao || '9999').localeCompare(b.data_publicacao || '9999') || String(a.created_at || '').localeCompare(String(b.created_at || '')));
  const daColuna = (etapa) => ordenar(itens.filter(c => c.etapa === etapa));
  async function soltar(id, etapa, antesDe) {
    const c = itens.find(x => x.id === id); if (!c) return;
    const lista = daColuna(etapa).filter(x => x.id !== id);
    const i = antesDe ? lista.findIndex(x => x.id === antesDe) : -1;
    lista.splice(i < 0 ? lista.length : i, 0, c);
    const mudouEtapa = c.etapa !== etapa;
    try {
      if (mudouEtapa) await mover(id, etapa);
      await Promise.all(lista.map((x, n) => (x.posicao === n + 1 ? null : salvar(x.id, { posicao: n + 1 }))).filter(Boolean));
      desenhar();
    } catch (e) { console.error(e); toast(faltaSQL(e) ? 'Falta ativar o quadro novo: rode o conteudo-quadro.sql no Supabase.' : 'Não consegui reorganizar agora.', true); desenhar(); }
  }
  async function criarRapido(etapa, titulo) {
    const ult = daColuna(etapa).slice(-1)[0];
    const pos = ult ? (ult.posicao ?? daColuna(etapa).length) + 1 : 1;
    await salvar(null, { titulo, etapa, formato: 'reels', plataforma: 'instagram', posicao: pos, checklist: checklistPadrao(false) });
  }

  // ===== Desenho =====
  function desenhar() {
    if (!carregado) return;
    const h = hoje(), semana = somaDias(h, 6);
    const daSemana = itens.filter(c => c.data_publicacao && c.data_publicacao >= h && c.data_publicacao <= semana);
    const aguardando = itens.filter(c => c.etapa === 'aprovacao' || (c.roteiro_status === 'enviado' && c.etapa !== 'postado'));
    const atrasados = itens.filter(c => c.data_publicacao && c.data_publicacao < h && c.etapa !== 'postado');
    const postadosMes = itens.filter(c => c.etapa === 'postado' && c.data_publicacao && c.data_publicacao.slice(0, 7) === h.slice(0, 7));
    $('#c-numeros').innerHTML = `
      <div class="cartao numero destaque"><div class="rotulo">Para os próximos 7 dias</div><div class="valor">${daSemana.length}</div><div class="extra">${daSemana.filter(c => c.etapa === 'agendado' || c.etapa === 'postado').length} já prontos</div></div>
      <div class="cartao numero"><div class="rotulo">Postados no mês</div><div class="valor">${postadosMes.length}</div><div class="extra">conteúdos no ar</div></div>
      <div class="cartao numero"><div class="rotulo">Com a marca</div><div class="valor">${aguardando.length}</div><div class="extra">esperando aprovação</div></div>
      <div class="cartao numero"><div class="rotulo">Banco de ideias</div><div class="valor">${itens.filter(c => c.etapa === 'ideia').length}</div><div class="extra">${atrasados.length ? `⚠ ${atrasados.length} com data passada` : 'nada atrasado ✦'}</div></div>`;
    $$('.vis-btn', raiz).forEach(b => b.classList.toggle('ativo', b.dataset.cvis === visao));
    if (visao === 'planner') desenharPlanner(); else if (visao === 'calendario') desenharCalendario(); else desenharRoteiros();
  }

  function cartao(c) {
    const i = ETAPAS.findIndex(e => e.id === c.etapa), prox = ETAPAS[i + 1];
    const marca = c.marca_id && nomeMarca(c.marca_id), h = hoje(), feito = c.etapa === 'postado';
    const d = c.data_publicacao, classeData = !d ? '' : feito ? 'ok' : d < h ? 'atraso' : d <= somaDias(h, 2) ? 'alerta' : '';
    const lista = chk(c), ok = lista.filter(x => x.ok).length;
    return `<article class="card-marca qd-card" draggable="true" data-cid="${c.id}" tabindex="0">
      ${etqs(c).length ? `<div class="qd-etqs">${etqs(c).filter(k => ETIQUETAS[k]).map(k => `<span style="background:${ETIQUETAS[k].cor}" title="${ETIQUETAS[k].nome}">${ETIQUETAS[k].nome}</span>`).join('')}</div>` : ''}
      <div class="qd-titulo">${esc(c.titulo)}</div>
      <div class="qd-badges">
        ${d ? `<span class="qd-badge ${classeData}" title="${feito ? 'Concluído' : 'Prazo'}">🕒 ${d === h ? 'hoje' : fmtCurta(d)}</span>` : ''}
        ${lista.length ? `<span class="qd-badge ${ok === lista.length ? 'ok' : ''}" title="Checklist">☑ ${ok}/${lista.length}</span>` : ''}
        ${c.roteiro_status ? `<span class="qd-badge ${c.roteiro_status === 'aprovado' ? 'ok' : c.roteiro_status === 'ajustes' ? 'atraso' : ''}" title="Roteiro: ${STATUS_ROTEIRO[c.roteiro_status].nome}">✍️ ${STATUS_ROTEIRO[c.roteiro_status].nome}</span>` : temRoteiro(c) ? '<span class="qd-badge" title="Tem roteiro">✍️</span>' : ''}
        ${c.link_arquivo ? '<span class="qd-badge" title="Arquivo final anexado">📎</span>' : ''}
        ${aReceber(c.marca_id).length && c.etapa !== 'postado' ? `<span class="qd-badge alerta" title="${esc(aReceber(c.marca_id).map(x => x.item).join(', '))}">📦 ${aReceber(c.marca_id).length} a receber</span>` : ''}
        <span class="qd-badge fmt">${esc(FORMATOS[c.formato] || c.formato)}</span>
      </div>
      ${marca ? `<div class="qd-marca"><span class="qd-av">${esc(marca.trim().charAt(0).toUpperCase())}</span>${esc(marca)}</div>` : ''}
      ${prox ? `<button class="avancar" data-cavancar="${c.id}" data-para="${prox.id}" title="Mover para ${prox.nome}">→</button>` : ''}
    </article>`;
  }
  const visivel = (c) => (!filtro.busca || (c.titulo + ' ' + (c.notas || '') + ' ' + (nomeMarca(c.marca_id) || '')).toLowerCase().includes(filtro.busca.toLowerCase()))
    && (!filtro.marca || (filtro.marca === 'meu' ? !c.marca_id : c.marca_id === filtro.marca))
    && (!filtro.etiqueta || etqs(c).includes(filtro.etiqueta));

  function desenharPlanner() {
    if (!itens.length) {
      $('#c-visao').innerHTML = `<div class="cartao vazio-grande"><h2>Seu banco de ideias começa aqui ✦</h2>
        <p>Anote ideias de conteúdo, escreva roteiros (seus e das marcas) e acompanhe cada um até ir ao ar.</p>
        <button class="btn-primario" data-cnovo>+ Primeira ideia</button></div>`;
      return;
    }
    const ms = marcas().filter(m => itens.some(c => c.marca_id === m.id));
    const ativo = filtro.busca || filtro.marca || filtro.etiqueta;
    $('#c-visao').innerHTML = `<div class="qd-filtros">
        <input type="search" data-qdbusca placeholder="🔎 Buscar cartão" value="${esc(filtro.busca)}">
        <select data-qdmarca><option value="">Todos os conteúdos</option><option value="meu" ${filtro.marca === 'meu' ? 'selected' : ''}>🌸 Só os meus</option>${ms.map(m => `<option value="${m.id}" ${filtro.marca === m.id ? 'selected' : ''}>💼 ${esc(m.nome)}</option>`).join('')}</select>
        <select data-qdetq><option value="">Todas as etiquetas</option>${Object.entries(ETIQUETAS).map(([k, v]) => `<option value="${k}" ${filtro.etiqueta === k ? 'selected' : ''}>${v.nome}</option>`).join('')}</select>
        ${ativo ? '<button class="link-precos" data-qdlimpar>Limpar filtros</button>' : ''}
      </div>
      <div class="funil qd-quadro">${ETAPAS.map(e => {
      const todos = daColuna(e.id), lista = todos.filter(visivel);
      if (recolhidas.includes(e.id)) return `<section class="coluna qd-coluna recolhida" data-cetapa="${e.id}" data-qdrecolher="${e.id}" title="Abrir ${e.nome}"><span class="qd-vert">${e.emoji} ${e.nome} · ${todos.length}</span></section>`;
      return `<section class="coluna qd-coluna" data-cetapa="${e.id}"><header><div><h3>${e.emoji} ${e.nome} <span class="qtd">${todos.length}</span></h3><small>${e.dica}</small></div><button class="qd-recolher" data-qdrecolher="${e.id}" title="Recolher coluna" aria-label="Recolher ${e.nome}">‹</button></header>
        <div class="cards">${lista.slice(0, e.id === 'postado' ? 15 : 200).map(cartao).join('') || `<p class="coluna-vazia">${ativo ? 'Nada com esse filtro' : 'Arraste para cá'}</p>`}</div>
        ${e.id === 'postado' && lista.length > 15 ? `<p class="qd-mais">+ ${lista.length - 15} concluídos</p>` : ''}
        <div class="qd-add" data-qdadd="${e.id}"><button class="add-coluna" data-qdabrir>+ Adicionar cartão</button></div></section>`;
    }).join('')}</div>`;
    $$('.card-marca[data-cid]').forEach(el => {
      el.addEventListener('dragstart', (ev) => { arrastando = el.dataset.cid; el.classList.add('arrastando'); ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', arrastando); });
      el.addEventListener('dragend', () => { el.classList.remove('arrastando'); $$('.coluna').forEach(k => k.classList.remove('sobre')); $$('.qd-antes').forEach(k => k.classList.remove('qd-antes')); });
    });
    // Cartão que vai ficar logo abaixo de onde a pessoa soltou
    const alvo = (col, y) => [...col.querySelectorAll('.card-marca[data-cid]:not(.arrastando)')].find(el => { const r = el.getBoundingClientRect(); return y < r.top + r.height / 2; });
    $$('.coluna[data-cetapa]').forEach(col => {
      col.addEventListener('dragover', (ev) => {
        if (!arrastando) return; ev.preventDefault(); col.classList.add('sobre');
        $$('.qd-antes').forEach(k => k.classList.remove('qd-antes')); const a = alvo(col, ev.clientY); if (a) a.classList.add('qd-antes');
      });
      col.addEventListener('dragleave', (ev) => { if (!col.contains(ev.relatedTarget)) { col.classList.remove('sobre'); $$('.qd-antes', col).forEach(k => k.classList.remove('qd-antes')); } });
      col.addEventListener('drop', (ev) => {
        ev.preventDefault(); col.classList.remove('sobre'); const a = alvo(col, ev.clientY);
        $$('.qd-antes').forEach(k => k.classList.remove('qd-antes'));
        const id = arrastando; arrastando = null; if (id) soltar(id, col.dataset.cetapa, a ? a.dataset.cid : null);
      });
    });
    const bus = $('[data-qdbusca]');
    bus.addEventListener('input', () => { filtro.busca = bus.value; const p = bus.selectionStart; desenharPlanner(); const n = $('[data-qdbusca]'); n.focus(); n.setSelectionRange(p, p); });
    $('[data-qdmarca]').addEventListener('change', (ev) => { filtro.marca = ev.target.value; desenharPlanner(); });
    $('[data-qdetq]').addEventListener('change', (ev) => { filtro.etiqueta = ev.target.value; desenharPlanner(); });
  }

  function desenharCalendario() {
    const ano = mesCal.getFullYear(), mes = mesCal.getMonth(), primeiro = new Date(ano, mes, 1), dias = new Date(ano, mes + 1, 0).getDate(), h = hoje();
    let cel = '';
    for (let i = 0; i < primeiro.getDay(); i++) cel += '<div class="dia fora"></div>';
    for (let d = 1; d <= dias; d++) {
      const iso = paraISO(new Date(ano, mes, d)), doDia = itens.filter(c => c.data_publicacao === iso);
      cel += `<div class="dia ${iso === h ? 'hoje' : ''} ${iso < h ? 'passado' : ''}" data-cdia="${iso}"><span class="num">${d}</span>
        ${doDia.map(c => `<button class="ev ${c.etapa === 'postado' ? 'feito' : c.marca_id ? 'entrega' : 'followup'}" data-cabrir="${c.id}" title="${esc(c.titulo)}">${esc(c.titulo)}</button>`).join('')}</div>`;
    }
    const t = primeiro.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    $('#c-visao').innerHTML = `<div class="cartao calendario">
      <div class="cal-cab"><button class="cal-nav" data-cmes="-1" aria-label="Mês anterior">‹</button><h2>${t.charAt(0).toUpperCase() + t.slice(1)}</h2><button class="cal-nav" data-cmes="1" aria-label="Próximo mês">›</button></div>
      <div class="legenda"><span class="followup">Seu conteúdo</span><span class="entrega">Para marca</span><span class="feito">Postado</span></div>
      <p class="desc" style="text-align:center">Toque num dia vazio para planejar um conteúdo nele.</p>
      <div class="cal-grade">${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(s => `<div class="sem">${s}</div>`).join('')}${cel}</div></div>`;
  }

  function desenharRoteiros() {
    const lista = itens.filter(temRoteiro).sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    $('#c-visao').innerHTML = lista.length ? `<div class="textos">${lista.map(c => `
      <div class="cartao texto-card roteiro-card">
        <div class="fb-topo"><strong>${esc(c.titulo)}</strong>${c.roteiro_status ? `<span class="p-status ${STATUS_ROTEIRO[c.roteiro_status].cor}">${STATUS_ROTEIRO[c.roteiro_status].nome}</span>` : ''}</div>
        <div class="t-meta"><span class="chip">${esc(FORMATOS[c.formato] || c.formato)}</span>${c.marca_id ? `<span class="chip marca">💼 ${esc(nomeMarca(c.marca_id) || 'marca')}</span>` : '<span class="chip">🌸 Meu conteúdo</span>'}</div>
        ${c.gancho ? `<p class="gancho">“${esc(c.gancho)}”</p>` : ''}
        ${c.desenvolvimento ? `<p class="texto-previa">${esc(c.desenvolvimento)}</p>` : ''}
        <div class="atalhos"><button class="mini-btn" data-ccopiar="${c.id}">Copiar roteiro</button><button class="mini-btn" data-cabrir="${c.id}">Abrir</button></div>
      </div>`).join('')}</div>`
      : `<div class="cartao"><p class="vazio">Nenhum roteiro escrito ainda. Abra uma ideia e preencha gancho, desenvolvimento e chamada.</p></div>`;
  }

  // ===== Ficha =====
  function abrirFicha(c, dados) {
    const nova = !c;
    c = c || { etapa: 'ideia', plataforma: 'instagram', formato: 'reels', ...(dados || {}) };
    const ativas = marcas().filter(m => !['perdida'].includes(m.etapa));
    const m = c.marca_id && marcas().find(x => x.id === c.marca_id);
    const dlg = document.getElementById('ficha-marca');
    dlg.innerHTML = `<form class="ficha" novalidate>
      <header class="ficha-cab"><div><small>${nova ? 'Novo conteúdo' : esc(NOME_ETAPA[c.etapa])}</small><h2>${nova ? 'Qual é a ideia?' : esc(c.titulo)}</h2></div><button type="button" class="fechar" data-fechar aria-label="Fechar">×</button></header>
      <div class="ficha-corpo">
        <div class="faixa-erro" id="c-erro" hidden></div>
        <fieldset><legend>Conteúdo</legend>
          <label class="campo largo"><span>Título / ideia *</span><input name="titulo" maxlength="140" value="${esc(c.titulo || '')}" placeholder="Ex.: 3 erros que eu cometia no skincare"></label>
          <div class="cat-escolha">${Object.entries(FORMATOS).map(([k, v]) => `<label><input type="radio" name="formato" value="${k}" ${c.formato === k ? 'checked' : ''}><span>${v}</span></label>`).join('')}</div>
          <div class="grade-campos">
            <label class="campo"><span>Para quem?</span><select name="marca_id"><option value="">🌸 Meu conteúdo</option>${ativas.map(x => `<option value="${x.id}" ${c.marca_id === x.id ? 'selected' : ''}>💼 ${esc(x.nome)}</option>`).join('')}</select></label>
            <label class="campo"><span>Onde vai sair</span><select name="plataforma">${Object.entries(PLATAFORMAS).map(([k, v]) => `<option value="${k}" ${c.plataforma === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
            <label class="campo"><span>Etapa</span><select name="etapa">${ETAPAS.map(e => `<option value="${e.id}" ${c.etapa === e.id ? 'selected' : ''}>${e.emoji} ${e.nome}</option>`).join('')}</select></label>
            <label class="campo"><span>Prazo (entrega ou post)</span><input type="date" name="data_publicacao" value="${c.data_publicacao || ''}"></label>
          </div>
          <label class="campo largo" style="margin-top:12px"><span>Link do arquivo final (Drive, WeTransfer...)</span><input name="link_arquivo" type="url" value="${esc(c.link_arquivo || '')}" placeholder="Cole aqui o link do vídeo pronto para a marca"></label>
        </fieldset>
        <fieldset><legend>Etiquetas</legend>
          <div class="qd-etq-escolha">${Object.entries(ETIQUETAS).map(([k, v]) => `<label><input type="checkbox" name="etq" value="${k}" ${etqs(c).includes(k) ? 'checked' : ''}><span style="--cor:${v.cor}">${v.nome}</span></label>`).join('')}</div>
        </fieldset>
        <fieldset><legend>Checklist</legend>
          <div class="qd-prog"><div></div><span></span></div>
          <div class="qd-chk" id="qd-chk"></div>
          <div class="qd-chk-add"><input id="qd-chk-novo" maxlength="120" placeholder="Adicionar um item e apertar Enter"><button type="button" class="mini-btn" data-chk-add>Adicionar</button></div>
          <button type="button" class="link-precos" data-chk-padrao>Usar a checklist pronta</button>
        </fieldset>
        <fieldset><legend>Roteiro</legend>
          <label class="campo largo"><span>Gancho (os primeiros 3 segundos)</span><textarea name="gancho" rows="2" placeholder="A frase ou cena que faz a pessoa parar de rolar">${esc(c.gancho || '')}</textarea></label>
          <label class="campo largo"><span>Desenvolvimento</span><textarea name="desenvolvimento" rows="5" placeholder="Cenas, falas, mostra do produto, benefícios...">${esc(c.desenvolvimento || '')}</textarea></label>
          <label class="campo largo"><span>Chamada para ação</span><textarea name="cta" rows="2" placeholder="Ex.: Corre no link da bio / Comenta EU QUERO">${esc(c.cta || '')}</textarea></label>
          <div class="grade-campos" style="margin-top:12px">
            <label class="campo"><span>Status do roteiro</span><select name="roteiro_status"><option value="">Sem roteiro / só ideia</option>${Object.entries(STATUS_ROTEIRO).map(([k, v]) => `<option value="${k}" ${c.roteiro_status === k ? 'selected' : ''}>${v.nome}</option>`).join('')}</select></label>
            <label class="campo"><span>Referência (link)</span><input name="referencia" type="url" value="${esc(c.referencia || '')}" placeholder="Vídeo que te inspirou"></label>
          </div>
        </fieldset>
        <fieldset><legend>Legenda e anotações</legend>
          <label class="campo largo"><span>Legenda</span><textarea name="legenda" rows="3">${esc(c.legenda || '')}</textarea></label>
          <label class="campo largo"><span>Anotações</span><textarea name="notas" rows="2" placeholder="Look, cenário, props, música...">${esc(c.notas || '')}</textarea></label>
        </fieldset>
        ${!nova ? `<fieldset><legend>Atalhos</legend><div class="atalhos">
          <button type="button" class="mini-btn" data-copiar-este>Copiar roteiro</button>
          ${m && m.contato_whatsapp ? `<a class="mini-btn zap" target="_blank" rel="noopener" href="https://wa.me/${digitos(m.contato_whatsapp)}?text=${encodeURIComponent(`Oi! Segue o roteiro para aprovação:\n\n${textoRoteiro(c)}`)}">Enviar para a marca</a>` : ''}
          ${window.Tarefas ? '<button type="button" class="mini-btn" data-reservar>Reservar horário para gravar</button>' : ''}
          ${c.referencia ? `<a class="mini-btn" href="${esc(c.referencia)}" target="_blank" rel="noopener">Ver referência</a>` : ''}
        </div></fieldset>` : ''}
      </div>
      <footer class="ficha-rodape">${!nova ? '<button type="button" class="btn-perigo" data-excluir>Excluir</button>' : '<span></span>'}
        <div><button type="button" class="btn-secundario" data-fechar>Cancelar</button><button type="submit" class="btn-primario">${nova ? 'Guardar ✦' : 'Salvar'}</button></div></footer>
    </form>`;
    const f = dlg.querySelector('form');
    dlg.querySelectorAll('[data-fechar]').forEach(b => b.addEventListener('click', () => dlg.close()));
    dlg.oncancel = null;
    // ===== Checklist (salva na hora nos cartões que já existem, como no Trello) =====
    let lista = chk(c).map(x => ({ ...x }));
    if (nova && !lista.length) lista = checklistPadrao(!!c.marca_id);
    const caixa = dlg.querySelector('#qd-chk');
    const guardarChk = async () => { if (nova) return; try { await salvar(c.id, { checklist: lista }); desenhar(); } catch (e) { console.error(e); toast(faltaSQL(e) ? 'Falta ativar o quadro novo: rode o conteudo-quadro.sql no Supabase.' : 'Não consegui salvar a checklist.', true); } };
    function desenharChk() {
      const ok = lista.filter(x => x.ok).length, pct = lista.length ? Math.round(ok / lista.length * 100) : 0;
      dlg.querySelector('.qd-prog div').style.width = pct + '%';
      dlg.querySelector('.qd-prog span').textContent = lista.length ? `${pct}%` : '';
      dlg.querySelector('.qd-prog').classList.toggle('completo', !!lista.length && ok === lista.length);
      caixa.innerHTML = lista.map((x, i) => `<div class="qd-item ${x.ok ? 'ok' : ''}"><label><input type="checkbox" data-chk-i="${i}" ${x.ok ? 'checked' : ''}><span>${esc(x.t)}</span></label><button type="button" class="qd-x" data-chk-del="${i}" aria-label="Remover item">×</button></div>`).join('') || '<p class="desc">Sem itens. Adicione abaixo ou use a checklist pronta.</p>';
      dlg.querySelector('[data-chk-padrao]').hidden = !!lista.length;
    }
    desenharChk();
    caixa.addEventListener('change', (e) => { const i = e.target.dataset.chkI; if (i === undefined) return; lista[i].ok = e.target.checked; desenharChk(); guardarChk();
      if (lista.length && lista.every(x => x.ok) && c.etapa !== 'postado' && !nova) toast('Checklist completa! Dá para mover para "Entregue / postado" ✦'); });
    caixa.addEventListener('click', (e) => { const i = e.target.dataset.chkDel; if (i === undefined) return; lista.splice(Number(i), 1); desenharChk(); guardarChk(); });
    const novoItem = dlg.querySelector('#qd-chk-novo');
    const addItem = () => { const t = novoItem.value.trim(); if (!t) return; lista.push({ t, ok: false }); novoItem.value = ''; desenharChk(); guardarChk(); novoItem.focus(); };
    dlg.querySelector('[data-chk-add]').addEventListener('click', addItem);
    novoItem.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } });
    dlg.querySelector('[data-chk-padrao]').addEventListener('click', () => { lista = checklistPadrao(!!f.marca_id.value); desenharChk(); guardarChk(); });
    // Escolheu uma marca? Já sugere "vídeo UGC" e "para a marca"
    f.marca_id.addEventListener('change', () => {
      if (f.marca_id.value && nova) { f.plataforma.value = 'marca'; const r = f.querySelector('input[value="video_ugc"]'); if (r) r.checked = true; }
      if (nova && !lista.some(x => x.ok)) { lista = checklistPadrao(!!f.marca_id.value); desenharChk(); }
    });
    // Escreveu o roteiro? Marca como rascunho e sobe a etapa
    ['gancho', 'desenvolvimento', 'cta'].forEach(n => f[n].addEventListener('input', () => {
      if (!f.roteiro_status.value && f[n].value.trim()) f.roteiro_status.value = 'rascunho';
      if (f.etapa.value === 'ideia' && f[n].value.trim()) f.etapa.value = 'roteiro';
    }));
    const cp = dlg.querySelector('[data-copiar-este]'); if (cp) cp.addEventListener('click', () => navigator.clipboard.writeText(textoRoteiro(c)).then(() => toast('Roteiro copiado ✦')));
    const rs = dlg.querySelector('[data-reservar]'); if (rs) rs.addEventListener('click', () => { dlg.close(); Tarefas.novaCom({ titulo: `Gravar: ${c.titulo}`, categoria: 'gravar', marca_id: c.marca_id }); });
    const exc = dlg.querySelector('[data-excluir]');
    if (exc) exc.addEventListener('click', async () => {
      if (!confirm('Excluir este conteúdo?')) return;
      const { error } = await sb.from('conteudos').delete().eq('id', c.id);
      if (error) return toast('Não consegui excluir agora.', true);
      itens = itens.filter(x => x.id !== c.id); dlg.close(); desenhar();
    });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const titulo = f.titulo.value.trim();
      if (!titulo) { const el = dlg.querySelector('#c-erro'); el.textContent = 'Dê um título para a ideia.'; el.hidden = false; return f.titulo.focus(); }
      const t = (n) => f[n].value.trim() || null;
      const dados = { titulo, formato: f.formato.value || 'reels', marca_id: f.marca_id.value || null, plataforma: f.plataforma.value, etapa: f.etapa.value,
        data_publicacao: t('data_publicacao'), gancho: t('gancho'), desenvolvimento: t('desenvolvimento'), cta: t('cta'),
        roteiro_status: f.roteiro_status.value || null, referencia: t('referencia'), legenda: t('legenda'), notas: t('notas'),
        link_arquivo: t('link_arquivo'), etiquetas: [...f.querySelectorAll('input[name="etq"]:checked')].map(i => i.value), checklist: lista };
      if (nova || dados.etapa !== c.etapa) { const ult = daColuna(dados.etapa).filter(x => x.id !== c.id).slice(-1)[0]; dados.posicao = ult ? (ult.posicao ?? daColuna(dados.etapa).length) + 1 : 1; }
      try { await salvar(nova ? null : c.id, dados); dlg.close(); desenhar(); toast(nova ? 'Cartão criado ✦' : 'Salvo.'); }
      catch (err) { console.error(err); const el = dlg.querySelector('#c-erro'); el.textContent = faltaSQL(err) ? 'Falta ativar o quadro novo: rode o arquivo conteudo-quadro.sql no Supabase.' : 'Não consegui salvar agora.'; el.hidden = false; }
    });
    dlg.showModal();
    if (nova) setTimeout(() => f.titulo.focus(), 50);
  }

  function montar() {
    raiz.innerHTML = `
      <div class="marcas-barra"><p class="saudacao">Da ideia à entrega, sem perder nada.</p><button class="btn-primario" data-cnovo>+ Novo cartão</button></div>
      <div class="numeros quatro" id="c-numeros"></div>
      <div class="marcas-ferramentas"><div class="visoes"><button class="vis-btn ativo" data-cvis="planner">Quadro</button><button class="vis-btn" data-cvis="roteiros">Roteiros</button></div><button class="btn-secundario ver-agenda" data-ver-agenda="post">📅 Ver na Agenda</button></div>
      <div id="c-visao"><p class="carregando">Carregando seus conteúdos...</p></div>`;
    raiz.addEventListener('click', (e) => {
      const rc = e.target.closest('[data-qdrecolher]'); if (rc) return alternarColuna(rc.dataset.qdrecolher);
      if (e.target.closest('[data-qdlimpar]')) { filtro.busca = ''; filtro.marca = ''; filtro.etiqueta = ''; return desenharPlanner(); }
      const ab = e.target.closest('[data-qdabrir]');
      if (ab) {
        const box = ab.closest('[data-qdadd]'), etapa = box.dataset.qdadd;
        box.innerHTML = `<textarea rows="2" maxlength="140" placeholder="Título do cartão..."></textarea><div class="qd-add-acoes"><button type="button" class="btn-primario" data-qdcriar>Adicionar cartão</button><button type="button" class="qd-x" data-qdfechar aria-label="Cancelar">×</button></div>`;
        const ta = box.querySelector('textarea'); ta.focus();
        const criar = async () => {
          const t = ta.value.trim(); if (!t) return ta.focus();
          try { await criarRapido(etapa, t); desenharPlanner(); const nb = raiz.querySelector(`[data-qdadd="${etapa}"] [data-qdabrir]`); if (nb) nb.click(); }
          catch (err) { console.error(err); toast(faltaSQL(err) ? 'Falta ativar o quadro novo: rode o conteudo-quadro.sql no Supabase.' : 'Não consegui criar agora.', true); }
        };
        ta.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); criar(); } if (ev.key === 'Escape') desenharPlanner(); });
        box.querySelector('[data-qdcriar]').addEventListener('click', criar);
        box.querySelector('[data-qdfechar]').addEventListener('click', () => desenharPlanner());
        return;
      }
      const a = e.target.closest('[data-cnovo], [data-cvis], [data-cavancar], [data-cabrir], [data-ccopiar], [data-cmes], [data-cdia], .card-marca[data-cid]');
      if (!a) return;
      if (a.matches('[data-cnovo]')) return abrirFicha(null);
      if (a.matches('[data-cvis]')) { if (a.dataset.cvis === 'calendario' && window.Agenda) return Agenda.abrirEm('mes'); visao = a.dataset.cvis; return desenhar(); }
      if (a.matches('[data-cavancar]')) { e.stopPropagation(); return mover(a.dataset.cavancar, a.dataset.para); }
      if (a.matches('[data-cmes]')) { mesCal.setMonth(mesCal.getMonth() + Number(a.dataset.cmes)); return desenharCalendario(); }
      if (a.matches('[data-ccopiar]')) { const c = itens.find(x => x.id === a.dataset.ccopiar); return navigator.clipboard.writeText(textoRoteiro(c)).then(() => toast('Roteiro copiado ✦')); }
      if (a.matches('[data-cdia]') && !e.target.closest('.ev')) return abrirFicha(null, { data_publicacao: a.dataset.cdia });
      const c = itens.find(x => x.id === (a.dataset.cabrir || a.dataset.cid)); if (c) abrirFicha(c);
    });
  }

  window.Conteudo = {
    async iniciar(cliente, secao) {
      sb = cliente; raiz = secao; montar();
      try {
        let tudo = [], ini = 0;
        while (true) {
          const { data, error } = await sb.from('conteudos').select('*').order('created_at', { ascending: false }).range(ini, ini + 999);
          if (error) throw error; tudo = tudo.concat(data || []); if (!data || data.length < 1000) break; ini += 1000;
        }
        itens = tudo; carregado = true; desenhar();
      } catch (e) {
        console.error(e);
        $('#c-visao').innerHTML = `<div class="cartao"><p class="vazio">${/conteudos|relation|schema cache|PGRST205|42P01/i.test((e && (e.message + ' ' + e.code)) || '')
          ? 'A área de Conteúdo ainda não foi ativada no banco. Rode o arquivo conteudo.sql no Supabase e recarregue a página.'
          : 'Não consegui carregar seus conteúdos agora. Confira sua conexão e recarregue a página.'}</p></div>`;
      }
    },
    aoAbrir() { desenhar(); },
    lista: () => itens,
    // Usada pelo Assistente: abre "nova ideia" já preenchida
    abrir(id) { const c = itens.find(x => x.id === id); if (c) abrirFicha(c); },
    novaCom(dados) { document.querySelector('[data-tab="aba-conteudo"]').click(); abrirFicha(null, dados); }
  };
})();
