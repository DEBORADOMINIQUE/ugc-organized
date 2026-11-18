/* =========================================================
   assistente.js · "✦ Assistente" do UGC Organized
   Cole uma conversa, e-mail ou briefing (ou mande um print):
   a IA entende e abre a ficha certa já preenchida para você
   só conferir e salvar. Chama a Edge Function "assistente".
   ========================================================= */
(function () {
  let sb, imagens = [], ultimo = null;
  const MAX_IMAGENS = 8;
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hoje = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const ROTULOS = { prospeccao: '📸 Abordagem (Prospecção)', marca: '💼 Parceria (Marcas)', tarefa: '🗓️ Tarefa', conteudo: '🎬 Conteúdo', despesa: '🧾 Despesa', nada: '✦ Nada para registrar' };
  const NOMES_CAMPOS = { marca: 'Marca', instagram: 'Instagram', site: 'Site', nicho: 'Nicho', contato_nome: 'Contato', email: 'E-mail', whatsapp: 'WhatsApp', canal: 'Canal',
    entregaveis: 'Entregas', valor: 'Valor', prazo_dias: 'Prazo (dias)', data_entrega: 'Entregar até', data_publicacao: 'Publicar em', titulo: 'Título', categoria: 'Categoria',
    data: 'Dia', hora: 'Horário', duracao_min: 'Duração (min)', gancho: 'Gancho', desenvolvimento: 'Desenvolvimento', cta: 'Chamada', formato: 'Formato', descricao: 'Descrição', status: 'Status', notas: 'Anotações' };
  const valido = (v, lista) => lista.includes(v) ? v : undefined;
  const numero = (v) => { const n = Number(String(v || '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(n) && n > 0 ? n : undefined; };
  const data = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : undefined;
  // Tira campos vazios para não apagar os valores padrão das fichas
  const limpo = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));

  function toast(msg, erro) {
    let t = document.getElementById('toast-marcas');
    if (!t) { t = document.createElement('div'); t.id = 'toast-marcas'; document.body.appendChild(t); }
    t.textContent = msg; t.className = 'toast-m ativo' + (erro ? ' erro' : '');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('ativo'), 3000);
  }

  // Diminui o print antes de enviar (mais rápido e mais barato)
  function lerImagem(arquivo) {
    return new Promise((ok, falha) => {
      const img = new Image(), url = URL.createObjectURL(arquivo);
      img.onload = () => {
        const max = 1568, esc2 = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * esc2); c.height = Math.round(img.height * esc2);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        const dataUrl = c.toDataURL('image/jpeg', 0.85);
        ok({ media_type: 'image/jpeg', data: dataUrl.split(',')[1], previa: dataUrl });
      };
      img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('imagem')); };
      img.src = url;
    });
  }

  // Leva o que a IA entendeu para a ficha certa
  function abrirFicha(r) {
    const d = r.dados || {};
    document.getElementById('assistente-dlg').close();
    const canal = valido(d.canal, ['instagram', 'email', 'whatsapp', 'plataforma', 'linkedin', 'outro']);
    if (r.tipo === 'prospeccao' && window.Prospeccao) return Prospeccao.novaCom(limpo({ marca: d.marca, instagram: d.instagram, site: d.site, nicho: d.nicho, contato_nome: d.contato_nome, email: d.email, whatsapp: d.whatsapp, canal, status: valido(d.status, ['enviada', 'respondeu', 'aprovada', 'recusada']), data_abordagem: data(d.data), notas: d.notas }));
    if (r.tipo === 'marca' && window.Marcas) return Marcas.novaCom(limpo({ nome: d.marca, nicho: d.nicho, contato_nome: d.contato_nome, contato_email: d.email, contato_whatsapp: d.whatsapp, contato_instagram: d.instagram,
      canal: valido(d.canal, ['instagram', 'email', 'whatsapp', 'plataforma']), entregaveis: d.entregaveis, valor: numero(d.valor), prazo_dias: numero(d.prazo_dias) ? Math.round(numero(d.prazo_dias)) : undefined, data_entrega: data(d.data_entrega), notas: d.notas }));
    if (r.tipo === 'tarefa' && window.Tarefas) return Tarefas.novaCom(limpo({ titulo: d.titulo, categoria: valido(d.categoria, ['roteiro', 'gravar', 'editar', 'postar', 'marca', 'prospectar', 'admin', 'pessoal', 'outro']), data: data(d.data), hora: /^\d{2}:\d{2}$/.test(d.hora || '') ? d.hora : undefined, duracao_min: numero(d.duracao_min) ? Math.round(numero(d.duracao_min)) : undefined, notas: d.notas }));
    if (r.tipo === 'conteudo' && window.Conteudo) {
      const m = d.marca && window.Marcas ? Marcas.lista().find(x => x.nome.toLowerCase() === d.marca.toLowerCase()) : null;
      return Conteudo.novaCom(limpo({ titulo: d.titulo || d.marca, formato: valido(d.formato, ['reels', 'carrossel', 'story', 'foto', 'video_ugc', 'live', 'video_longo']), gancho: d.gancho, desenvolvimento: d.desenvolvimento, cta: d.cta, data_publicacao: data(d.data_publicacao) || data(d.data), notas: d.notas, marca_id: m ? m.id : undefined, plataforma: m ? 'marca' : undefined }));
    }
    if (r.tipo === 'despesa' && window.Financeiro) return Financeiro.novaCom(limpo({ descricao: d.descricao || d.titulo, valor: numero(d.valor), data: data(d.data) }));
    toast('Não encontrei onde registrar isso.', true);
  }

  async function processar() {
    const dlg = document.getElementById('assistente-dlg');
    const texto = dlg.querySelector('#as-texto').value.trim();
    if (!texto && !imagens.length) return toast('Cole um texto ou envie um print.', true);
    const btn = dlg.querySelector('#as-ir'), res = dlg.querySelector('#as-resultado');
    if (btn.disabled) return;   // já está lendo
    btn.disabled = true; btn.textContent = 'Lendo... ✦';
    res.innerHTML = '<div class="as-pensando"><span></span><span></span><span></span></div>';
    try {
      const { data: r, error } = await sb.functions.invoke('bright-endpoint', { body: { texto, imagens: imagens.map(i => ({ media_type: i.media_type, data: i.data })), imagem: imagens[0] && { media_type: imagens[0].media_type, data: imagens[0].data }, hoje: hoje() } });
      if (error) {
        let msg = 'O assistente ainda não está ativado. Siga os passos de configuração.';
        try { const corpo = await error.context.json(); if (corpo && corpo.erro) msg = corpo.erro; } catch (e) {}
        throw new Error(msg);
      }
      ultimo = r;
      const campos = Object.entries(r.dados || {}).filter(([, v]) => v);
      res.innerHTML = `<div class="as-card">
        <div class="as-tipo">${ROTULOS[r.tipo] || r.tipo}</div>
        <p class="as-resumo">${esc(r.resumo)}</p>
        ${campos.length ? `<dl class="as-campos">${campos.map(([k, v]) => `<dt>${NOMES_CAMPOS[k] || k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
        ${r.tipo !== 'nada' ? '<button class="btn-primario" id="as-abrir">Abrir a ficha preenchida ✦</button><small class="desc">Você confere e salva. Nada é salvo sem você.</small>' : ''}
      </div>`;
      const ab = res.querySelector('#as-abrir'); if (ab) ab.addEventListener('click', () => abrirFicha(ultimo));
    } catch (e) {
      res.innerHTML = `<div class="faixa-erro">${esc(e.message || 'Não consegui agora. Tente de novo.')}</div>`;
    } finally { btn.disabled = false; btn.textContent = 'Preencher ✦'; }
  }

  function abrir() {
    const dlg = document.getElementById('assistente-dlg');
    imagens = [];
    dlg.innerHTML = `<div class="ficha">
      <header class="ficha-cab"><div><small>Raquel · sua assistente ✦</small><h2>Oi, ${window.Tarefas ? Tarefas.nome() : G.apelido()}! Sou a Raquel. O que aconteceu?</h2></div><button type="button" class="fechar" data-fechar aria-label="Fechar">×</button></header>
      <div class="ficha-corpo">
        <p class="desc" style="margin-top:12px">Cole a conversa com a marca, o e-mail, o briefing, ou só escreva do seu jeito ("abordei a Sallve pelo direct", "gravar o reels da Kaisan sexta às 14h", "comprei um microfone de 189"). Eu entendo e preencho a ficha certa.</p>
        <label class="campo largo"><textarea id="as-texto" rows="7" placeholder="Cole ou escreva aqui... (Enter envia · Shift + Enter pula linha)"></textarea></label>
        <div class="as-print">
          <label class="mini-btn"><input type="file" id="as-arquivo" accept="image/*" multiple hidden>📷 Enviar prints (pode marcar vários)</label>
          <div id="as-previa"></div>
        </div>
        <div id="as-resultado"></div>
      </div>
      <footer class="ficha-rodape"><span></span><div><button type="button" class="btn-secundario" data-fechar>Fechar</button><button type="button" class="btn-primario" id="as-ir">Preencher ✦</button></div></footer>
    </div>`;
    dlg.querySelectorAll('[data-fechar]').forEach(b => b.addEventListener('click', () => dlg.close()));
    dlg.querySelector('#as-ir').addEventListener('click', processar);
    // Enter envia; Shift + Enter pula linha
    dlg.querySelector('#as-texto').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); processar(); } });
    const previa = dlg.querySelector('#as-previa');
    const desenharPrevia = () => {
      previa.innerHTML = imagens.map((im, i) => `<div class="as-mini"><img src="${im.previa}" alt="Print ${i + 1}"><button type="button" data-tirar="${i}" aria-label="Tirar print ${i + 1}">×</button></div>`).join('')
        + (imagens.length > 1 ? `<small class="as-qtd">${imagens.length} prints</small>` : '');
    };
    previa.addEventListener('click', (e) => { const b = e.target.closest('[data-tirar]'); if (!b) return; imagens.splice(+b.dataset.tirar, 1); desenharPrevia(); });
    async function adicionar(arquivos) {
      const lista = [...arquivos].filter(f => f && f.type && f.type.startsWith('image/'));
      if (!lista.length) return;
      const cabe = MAX_IMAGENS - imagens.length;
      if (cabe <= 0) return toast(`Até ${MAX_IMAGENS} prints por vez.`, true);
      if (lista.length > cabe) toast(`Peguei só ${cabe}: o limite é ${MAX_IMAGENS} prints por vez.`, true);
      for (const f of lista.slice(0, cabe)) {
        try { imagens.push(await lerImagem(f)); } catch (x) { toast(`Não consegui abrir ${f.name || 'uma imagem'}.`, true); }
      }
      desenharPrevia();
    }
    dlg.querySelector('#as-arquivo').addEventListener('change', async (e) => { await adicionar(e.target.files); e.target.value = ''; });
    // Colar um print direto (Cmd+V) também funciona
    dlg.addEventListener('paste', async (e) => {
      const itens = [...(e.clipboardData || {}).items || []].filter(i => i.type.startsWith('image/'));
      if (!itens.length) return;
      e.preventDefault();
      await adicionar(itens.map(i => i.getAsFile()));
    });
    // Arrastar vários prints para dentro da Raquel
    dlg.addEventListener('dragover', (e) => { if ([...(e.dataTransfer.items || [])].some(i => i.kind === 'file')) e.preventDefault(); });
    dlg.addEventListener('drop', (e) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); adicionar(e.dataTransfer.files); });
    dlg.showModal();
    setTimeout(() => dlg.querySelector('#as-texto').focus(), 50);
  }

  window.Assistente = {
    iniciar(cliente) {
      sb = cliente;
      // O assistente NÃO faz parte do plano vendido: só aparece para contas liberadas
      // no banco (preferencias.dados.assistente_ia = true). O servidor confere de novo.
      const esperar = (n = 0) => {
        if (window.Tarefas && Tarefas.pronto()) { if (Tarefas.prefs().assistente_ia === true) montar(); return; }
        if (n < 40) setTimeout(() => esperar(n + 1), 300);
      };
      esperar();
    }
  };
  function montar() {
      const d = document.createElement('dialog'); d.id = 'assistente-dlg'; d.className = 'dialogo-ficha'; document.body.appendChild(d);
      const b = document.createElement('button'); b.className = 'assistente-fab'; b.innerHTML = '<span>✦</span> Raquel'; b.setAttribute('aria-label', 'Falar com a Raquel, sua assistente');
      b.addEventListener('click', abrir); document.body.appendChild(b);
  }
})();
