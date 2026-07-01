/**
 * app.js
 * Bootstrap do PWA: registra o service worker, carrega a configuração
 * pública (nome/cores/logo) e decide qual painel mostrar de acordo com
 * o perfil da sessão salva (desenvolvedor, administrador ou funcionário).
 */

async function iniciarApp() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch((e) => console.warn('SW falhou:', e));
  }

  const cfgResp = await Api.chamar('config.publica', {});
  const cfg = cfgResp.sucesso ? cfgResp.dados : { nomeSistema: NOME_SISTEMA_PADRAO };
  Utils.aplicarTema(cfg);

  const sessao = Auth.sessao();
  if (!sessao) {
    Utils.mostrar('tela-login');
    initLogin();
    return;
  }

  document.querySelectorAll('#nome-usuario-logado, #nome-usuario-logado-admin').forEach((el) => { el.textContent = sessao.usuario; });
  document.querySelectorAll('.btn-logout').forEach((b) => b.addEventListener('click', () => Auth.logout()));

  if (sessao.perfil === 'funcionario') {
    Utils.mostrar('tela-funcionario');
    await Funcionario.iniciar(sessao, cfg);
  } else if (sessao.perfil === 'administrador') {
    Utils.mostrar('tela-admin');
    document.getElementById('nav-dev-link').classList.add('oculto');
    await Admin.iniciar();
  } else if (sessao.perfil === 'desenvolvedor') {
    // Desenvolvedor enxerga também o painel administrativo (aba extra "Configurações")
    Utils.mostrar('tela-admin');
    Utils.mostrar('nav-dev-link');
    document.getElementById('nav-dev-link').addEventListener('click', async () => {
      Utils.esconder('tela-admin');
      Utils.mostrar('tela-dev');
      await Desenvolvedor.iniciar();
    });
    await Admin.iniciar();
  }
}

document.addEventListener('DOMContentLoaded', iniciarApp);
