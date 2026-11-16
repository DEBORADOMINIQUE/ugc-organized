/* =========================================================
   sugestoes.js · "Sugestões de hoje" (Menu Principal)
   O app como assessor: avisa quem chamar hoje e já entrega
   a mensagem pronta, adaptada à marca e à data.
   1) Repescagem: "agora não", sem resposta depois de 2 follow-ups
      e ex-clientes sem parceria nova (30, 60 ou 90 dias).
   2) Datas que vendem: Black Friday, Natal, Dia das Mães... avisa
      de 3 a 5 semanas antes, cruzando com o nicho da marca.
   ========================================================= */
(function () {
  let raiz;
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const paraISO = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const deISO = (s) => { const [a, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(a, m - 1, d); };
  const hoje = () => paraISO(new Date());
  const somaDias = (iso, n) => { const d = deISO(iso); d.setDate(d.getDate() + n); return paraISO(d); };
  const diasEntre = (a, b) => Math.round((deISO(b) - deISO(a)) / 864e5);
  const fmtDia = (iso) => deISO(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  const prefs = () => (window.Tarefas ? Tarefas.prefs() : {});
  const diasRep = () => Number(prefs().repescagem_dias || 60);
  const nome = () => (window.Tarefas ? Tarefas.nome() : G.apelido());
  const chave = (t) => String(t || '').trim().toLowerCase();
  const soDigitos = (t) => { let d = String(t || '').replace(/\D/g, ''); if (d.length === 10 || d.length === 11) d = '55' + d; return d; };
  const usuarioIg = (ig) => String(ig || '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '');

  function toast(msg) {
    let t = document.getElementById('toast-marcas');
    if (!t) { t = document.createElement('div'); t.id = 'toast-marcas'; document.body.appendChild(t); }
    t.textContent = msg; t.className = 'toast-m ativo'; clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('ativo'), 2800);
  }

  // ===== Calendário comercial do Brasil =====
  function pascoa(a) {
    const b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4, g = Math.floor((c + 8) / 25);
    const h = Math.floor((c - g + 1) / 3), i = (19 * b + c - e - h + 15) % 30, k = Math.floor(d / 4), l = d % 4;
    const m = (32 + 2 * f + 2 * k - i - l) % 7, n = Math.floor((b + 11 * i + 22 * m) / 451);
    return new Date(a, Math.floor((i + m - 7 * n + 114) / 31) - 1, ((i + m - 7 * n + 114) % 31) + 1);
  }
  const enesimoDomingo = (a, mes, n) => { const d = new Date(a, mes, 1); while (d.getDay() !== 0) d.setDate(d.getDate() + 1); d.setDate(d.getDate() + 7 * (n - 1)); return d; };
  function blackFriday(a) { const d = new Date(a, 10, 1); let q = 0; while (true) { if (d.getDay() === 4 && ++q === 4) break; d.setDate(d.getDate() + 1); } d.setDate(d.getDate() + 1); return d; }
  const mais = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  // nichos: palavras que combinam com a data ('*' = todas as marcas)
  function datasDoAno(a) {
    return [
      { nome: 'a volta às aulas', d: new Date(a, 1, 2), nichos: ['papelaria', 'escola', 'infantil', 'mochila', 'tecnologia', 'livro', 'educa'], gancho: 'é quando as famílias mais compram material e tecnologia' },
      { nome: 'o Carnaval', d: mais(pascoa(a), -48), nichos: ['beleza', 'maquiagem', 'moda', 'protetor', 'skincare', 'bebida', 'cabelo', 'fitness'], gancho: 'é época de maquiagem, looks e cuidados com o sol' },
      { nome: 'o Dia da Mulher', d: new Date(a, 2, 8), nichos: ['beleza', 'skincare', 'moda', 'autocuidado', 'bem-estar', 'perfume', 'joia', 'acessório'], gancho: 'marcas de autocuidado e moda costumam fazer campanhas especiais' },
      { nome: 'o Dia do Consumidor', d: new Date(a, 2, 15), nichos: ['*'], gancho: 'é a "Black Friday do primeiro semestre", com muita promoção' },
      { nome: 'a Páscoa', d: pascoa(a), nichos: ['chocolate', 'alimento', 'doce', 'infantil', 'confeitaria', 'presente', 'café'], gancho: 'é a data mais forte para chocolates e presentes' },
      { nome: 'o Dia das Mães', d: enesimoDomingo(a, 4, 2), nichos: ['beleza', 'skincare', 'moda', 'casa', 'perfume', 'joia', 'acessório', 'bem-estar', 'decora', 'flor', 'café'], gancho: 'é a segunda data que mais vende no ano' },
      { nome: 'o Dia dos Namorados', d: new Date(a, 5, 12), nichos: ['beleza', 'perfume', 'moda', 'joia', 'lingerie', 'restaurante', 'experiência', 'chocolate', 'acessório', 'presente'], gancho: 'marcas de presente, beleza e experiências vendem muito' },
      { nome: 'as férias de julho', d: new Date(a, 6, 1), nichos: ['infantil', 'viagem', 'lazer', 'turismo', 'hotel', 'brinquedo', 'jogo'], gancho: 'é quando as famílias planejam passeios e viagens' },
      { nome: 'o Dia dos Pais', d: enesimoDomingo(a, 7, 2), nichos: ['moda', 'masculin', 'tecnologia', 'barba', 'perfume', 'bebida', 'esporte', 'relógio', 'ferrament'], gancho: 'é uma das datas mais fortes para presentes masculinos' },
      { nome: 'o Dia do Cliente', d: new Date(a, 8, 15), nichos: ['*'], gancho: 'muitas marcas fazem ofertas e ações de relacionamento' },
      { nome: 'o Dia das Crianças', d: new Date(a, 9, 12), nichos: ['infantil', 'brinquedo', 'jogo', 'roupa infantil', 'educa', 'livro', 'doce'], gancho: 'é a data mais forte do ano para o público infantil' },
      { nome: 'a Black Friday', d: blackFriday(a), nichos: ['*'], gancho: 'é a data que mais vende no e-commerce brasileiro' },
      { nome: 'o Natal', d: new Date(a, 11, 25), nichos: ['*'], gancho: 'é a data que mais vende no ano, e as marcas planejam cedo' },
      { nome: 'o verão e o Ano Novo', d: new Date(a, 11, 31), nichos: ['moda praia', 'praia', 'protetor', 'skincare', 'bebida', 'viagem', 'fitness', 'cabelo'], gancho: 'é a temporada de praia, viagens e festas' }
    ].map(x => ({ ...x, iso: paraISO(x.d) }));
  }
  // Datas entre 10 e 35 dias à frente (as marcas precisam de 3 a 4 semanas para produzir)
  function datasDaVez() {
    const h = hoje(), a = new Date().getFullYear();
    return datasDoAno(a).concat(datasDoAno(a + 1)).map(x => ({ ...x, falta: diasEntre(h, x.iso) })).filter(x => x.falta >= 10 && x.falta <= 35).sort((x, y) => x.falta - y.falta);
  }
  const combina = (data, nicho) => data.nichos.includes('*') || (nicho && data.nichos.some(p => chave(nicho).includes(p)));

  // ===== Mensagens prontas =====
  const primeiro = (n) => String(n || '').trim().split(' ')[0] || '';
  function texto(tipo, alvo, data) {
    const oi = primeiro(alvo.contato) ? `Oi, ${primeiro(alvo.contato)}! Tudo bem?` : 'Oi! Tudo bem?';
    if (tipo === 'data') return `${oi} ${data.nome.charAt(0).toUpperCase() + data.nome.slice(1)} está chegando (${fmtDia(data.iso)}) e pensei em um conteúdo UGC para a ${alvo.marca} aproveitar essa data e acelerar as vendas. Tenho algumas ideias de vídeo para a campanha. Posso te mandar?`;
    if (tipo === 'ex') return `${oi} Faz um tempinho da nossa parceria com a ${alvo.marca} e eu amei o resultado. Tenho ideias novas de conteúdo para vocês. Posso te mandar uma proposta?`;
    return `${oi} Falamos há um tempo sobre conteúdos UGC para a ${alvo.marca}. Tenho ideias novas que combinam com o momento de vocês. Faz sentido conversarmos de novo?`;
  }

  // ===== Quem chamar hoje =====
  function sugestoes() {
    const h = hoje(), adiadas = prefs().sugestoes_adiadas || {};
    const ativoAte = (k) => adiadas[k] && adiadas[k] > h;
    const marcas = window.Marcas ? Marcas.lista() : [], pros = window.Prospeccao ? Prospeccao.lista() : [];
    // Marcas que já estão em conversa (não incomodar)
    const emConversa = new Set(marcas.filter(m => !['concluida', 'perdida'].includes(m.etapa)).map(m => chave(m.nome))
      .concat(pros.filter(p => p.status === 'enviada' && (p.followups || 0) < 2 || p.status === 'respondeu').map(p => chave(p.marca))));

    // Ex-clientes: a última parceria de cada marca
    const ex = {};
    marcas.filter(m => m.etapa === 'concluida').forEach(m => {
      const k = chave(m.nome), d = m.finalizada_em || m.data_pagamento || m.data_entregue || String(m.created_at || '').slice(0, 10);
      if (!ex[k] || d > ex[k].d) ex[k] = { m, d };
    });
    const alvos = [];
    Object.entries(ex).forEach(([k, { m, d }]) => {
      if (emConversa.has(k)) return;
      const quando = m.repescagem_em || somaDias(d, diasRep());
      alvos.push({ k, tipo: 'ex', marca: m.nome, nicho: m.nicho, contato: m.contato_nome, zap: m.contato_whatsapp, email: m.contato_email, ig: m.contato_instagram, vence: quando, marcaId: m.id, desde: d });
    });
    pros.forEach(p => {
      const k = chave(p.marca);
      if (ex[k] || emConversa.has(k) || alvos.some(a => a.k === k)) return;
      const repescar = p.status === 'recusada' || (p.status === 'enviada' && (p.followups || 0) >= 2);
      if (!repescar) return;
      alvos.push({ k, tipo: p.status === 'recusada' ? 'agora-nao' : 'sem-resposta', marca: p.marca, nicho: p.nicho, contato: p.contato_nome, zap: p.whatsapp, email: p.email, ig: p.instagram, vence: p.proximo_followup || somaDias(p.data_abordagem, diasRep()), prosId: p.id });
    });

    const lista = [];
    // 1) Datas comerciais: marcas que combinam com a data (mesmo antes do prazo de repescagem)
    datasDaVez().forEach(data => {
      alvos.filter(a => combina(data, a.nicho) && !ativoAte(a.k + '|' + data.iso)).slice(0, 3).forEach(a => {
        if (lista.some(x => x.alvo.k === a.k)) return;
        lista.push({ id: a.k + '|' + data.iso, tipo: 'data', alvo: a, data, peso: data.falta,
          frase: `${nome()}, ${data.nome} é dia ${fmtDia(data.iso)}. Que tal mandar mensagem para a <b>${esc(a.marca)}</b> hoje sugerindo um vídeo para a campanha? ${a.nicho ? `Marcas de ${esc(chave(a.nicho))} costumam acelerar as vendas nessa época.` : esc(data.gancho.charAt(0).toUpperCase() + data.gancho.slice(1)) + '.'}`,
          msg: texto('data', a, data) });
      });
    });
    // 2) Repescagem que venceu
    alvos.filter(a => a.vence <= h && !ativoAte(a.k + '|rep') && !lista.some(x => x.alvo.k === a.k)).forEach(a => {
      const motivo = a.tipo === 'ex' ? `já faz ${diasEntre(a.desde, h)} dias da última parceria` : a.tipo === 'agora-nao' ? 'ela disse "agora não" e já passou um tempo' : 'ela não respondeu e já passou um tempo';
      lista.push({ id: a.k + '|rep', tipo: 'rep', alvo: a, peso: 100 + diasEntre(a.vence, h) * -0.01,
        frase: `${nome()}, seria legal mandar mensagem para a <b>${esc(a.marca)}</b> hoje sugerindo uma nova parceria: ${motivo}.`,
        msg: texto(a.tipo === 'ex' ? 'ex' : 'rep', a) });
    });
    return lista.sort((x, y) => x.peso - y.peso);
  }

  // ===== Desenho =====
  function desenhar() {
    if (!raiz || !window.Tarefas || !Tarefas.pronto()) return;
    const lista = sugestoes(), dr = diasRep(), proxData = datasDaVez()[0];
    raiz.innerHTML = `<div class="cartao sugestoes">
      <div class="sg-topo">
        <div><h2>Sugestões de hoje ✦</h2><p class="desc">${lista.length ? 'Quem chamar hoje, com a mensagem pronta. É só revisar e enviar.' : 'Nada para hoje. Assim que tiver uma marca para repescar ou uma data importante chegando, eu te aviso aqui.'}</p></div>
        <div class="sg-rep"><span>Repescagem depois de</span><div class="visoes">${[30, 60, 90].map(d => `<button class="vis-btn ${dr === d ? 'ativo' : ''}" data-sg-rep="${d}">${d} dias</button>`).join('')}</div></div>
      </div>
      ${proxData && !lista.some(s => s.tipo === 'data') ? `<p class="sg-data">📅 ${proxData.nome.charAt(0).toUpperCase() + proxData.nome.slice(1)} é dia ${fmtDia(proxData.iso)} (faltam ${proxData.falta} dias). Cadastre o nicho das suas marcas para eu sugerir quem chamar.</p>` : ''}
      ${lista.slice(0, 5).map((s, i) => `<div class="sg-item ${s.tipo}">
        <div class="sg-txt"><span class="sg-tag">${s.tipo === 'data' ? '📅 ' + esc(s.data.nome.replace(/^(o|a|as|os) /, '')) : '🔁 Repescagem'}</span><p>${s.frase}</p>
          <details><summary>Ver a mensagem pronta</summary><textarea data-sg-msg="${i}" rows="4">${esc(s.msg)}</textarea></details></div>
        <div class="sg-acoes">
          ${s.alvo.zap ? `<a class="mini-btn zap" target="_blank" rel="noopener" data-sg-zap="${i}" href="#">WhatsApp</a>` : ''}
          ${s.alvo.ig ? `<a class="mini-btn" target="_blank" rel="noopener" data-sg-ig="${i}" href="#">📸 DM</a>` : ''}
          ${s.alvo.email ? `<a class="mini-btn" data-sg-email="${i}" href="#">E-mail</a>` : ''}
          <button class="mini-btn" data-sg-copiar="${i}">Copiar texto</button>
          <button class="mini-btn feito" data-sg-feito="${i}">✓ Já mandei</button>
          <button class="link-precos" data-sg-adiar="${i}">Agora não</button>
        </div>
      </div>`).join('')}
    </div>`;
    raiz._lista = lista;
  }

  async function adiar(s, dias) {
    const a = { ...(prefs().sugestoes_adiadas || {}) };
    Object.keys(a).forEach(k => { if (a[k] < hoje()) delete a[k]; });   // limpa os vencidos
    a[s.id] = somaDias(hoje(), dias);
    await Tarefas.salvarPrefsParcial({ sugestoes_adiadas: a });
  }

  async function feito(s) {
    try {
      if (s.alvo.prosId && window.Prospeccao) await Prospeccao.reabordou(s.alvo.prosId);
      if (s.alvo.marcaId && window.Marcas) await Marcas.atualizarSilencioso(s.alvo.marcaId, { repescagem_em: somaDias(hoje(), diasRep()) });
      await adiar(s, s.tipo === 'data' ? 60 : diasRep());
      desenhar(); toast(`Arrasou! ${s.alvo.prosId ? 'Te lembro do follow-up em 3 dias' : 'Anotei o contato'} ✦`);
    } catch (e) { console.error(e); toast('Não consegui salvar agora.'); }
  }

  window.Sugestoes = {
    iniciar(el) {
      raiz = el;
      raiz.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-sg-rep], [data-sg-zap], [data-sg-ig], [data-sg-email], [data-sg-copiar], [data-sg-feito], [data-sg-adiar]'); if (!b) return;
        if (b.dataset.sgRep) { await Tarefas.salvarPrefsParcial({ repescagem_dias: Number(b.dataset.sgRep) }); desenhar(); return toast(`Repescagem: ${b.dataset.sgRep} dias ✦`); }
        const i = Number(b.dataset.sgZap ?? b.dataset.sgIg ?? b.dataset.sgEmail ?? b.dataset.sgCopiar ?? b.dataset.sgFeito ?? b.dataset.sgAdiar);
        const s = raiz._lista[i]; if (!s) return;
        const campo = raiz.querySelector(`[data-sg-msg="${i}"]`), msg = campo ? campo.value : s.msg;
        if (b.dataset.sgZap !== undefined) { b.href = `https://wa.me/${soDigitos(s.alvo.zap)}?text=${encodeURIComponent(msg)}`; return; }
        if (b.dataset.sgIg !== undefined) { navigator.clipboard.writeText(msg).catch(() => {}); b.href = `https://ig.me/m/${encodeURIComponent(usuarioIg(s.alvo.ig))}`; return toast('Mensagem copiada: é só colar na DM ✦'); }
        if (b.dataset.sgEmail !== undefined) { e.preventDefault(); location.href = `mailto:${encodeURIComponent(s.alvo.email)}?subject=${encodeURIComponent(s.alvo.marca + ' · conteúdo UGC')}&body=${encodeURIComponent(msg)}`; return; }
        if (b.dataset.sgCopiar !== undefined) return navigator.clipboard.writeText(msg).then(() => toast('Mensagem copiada ✦'), () => toast('Não consegui copiar.'));
        if (b.dataset.sgFeito !== undefined) return feito(s);
        if (b.dataset.sgAdiar !== undefined) { await adiar(s, 7); desenhar(); toast('Ok! Te lembro de novo em 7 dias.'); }
      });
      setTimeout(desenhar, 1500); setTimeout(desenhar, 4000);
    },
    desenhar,
    // Para outras áreas (ex.: aviso) saberem quantas sugestões há
    quantas: () => (window.Tarefas && Tarefas.pronto() ? sugestoes().length : 0)
  };
})();
