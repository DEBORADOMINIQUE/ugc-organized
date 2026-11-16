/* =========================================================
   assinatura.js · tela para quem ainda não assinou
   Mostra os planos e leva para o checkout da Kiwify.
   Troque os links abaixo pelos links de checkout de cada plano.
   ========================================================= */
(function () {
  const CHECKOUT = {
    pagina: '',      // link principal da página de compra na Kiwify
    mensal: '',      // link do plano Mensal
    anual: ''        // link do plano Anual
  };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  window.Assinatura = {
    bloquear(email, falhou) {
      const link = (k) => CHECKOUT[k] || CHECKOUT.pagina;
      document.body.classList.add('sem-acesso');
      document.body.innerHTML = `<main class="paywall">
        <div class="pw-cartao">
          <div class="logo"><span class="bolinha" aria-hidden="true"></span><b>UGC</b> organized</div>
          ${falhou
            ? `<h1>Não consegui conferir sua assinatura</h1><p class="pw-sub">Pode ser a internet. Recarregue a página em alguns segundos.</p><button class="pw-btn" onclick="location.reload()">Tentar de novo</button>`
            : `<h1>Falta só ativar sua assinatura ✦</h1>
              <p class="pw-sub">Você entrou como <b>${esc(email)}</b>, mas ainda não há uma assinatura ativa com esse e-mail.</p>
              <div class="pw-planos">
                <a class="pw-plano" href="${esc(link('mensal'))}" target="_blank" rel="noopener"><span>Mensal</span><b>R$ 29,90</b><small>por mês</small></a>
                <a class="pw-plano destaque" href="${esc(link('anual'))}" target="_blank" rel="noopener"><span>Anual</span><b>R$ 297</b><small>2 meses grátis · até 12x</small></a>
              </div>
              <p class="pw-dica">Já assinou? Use <b>o mesmo e-mail da compra</b> para entrar. A liberação leva alguns segundos depois do pagamento aprovado.</p>
              <div class="pw-acoes"><button class="pw-sec" onclick="location.reload()">Já paguei, conferir de novo</button><button class="pw-sec" onclick="Auth.logout()">Entrar com outro e-mail</button></div>`}
          <p class="pw-ajuda">Dúvidas? <a href="https://wa.me/5531984042252?text=${encodeURIComponent('Oi, Débora! Tenho uma dúvida sobre a assinatura do UGC Organized.')}" target="_blank" rel="noopener">Fale com a gente no WhatsApp</a></p>
        </div></main>`;
      document.body.classList.add('liberado');
      if (!CHECKOUT.pagina && !CHECKOUT.mensal) document.querySelectorAll('.pw-plano').forEach(a => { a.removeAttribute('href'); a.classList.add('em-breve'); a.querySelector('small').textContent = 'em breve'; });
    }
  };
})();
