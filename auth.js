/**
 * auth.js
 * Tela de login. Depois de autenticado, guarda o token e os dados da
 * sessão em localStorage e o app.js decide qual painel mostrar (funcionário,
 * administrador ou desenvolvedor).
 */

const Auth = {
  sessao() {
    try { return JSON.parse(localStorage.getItem('ponto_sessao') || 'null'); } catch (e) { return null; }
  },
  salvarSessao(dados) {
    localStorage.setItem('ponto_sessao', JSON.stringify(dados));
    Api.setToken(dados.token);
  },
  limparSessao() {
    localStorage.removeItem('ponto_sessao');
    Api.setToken(null);
  },
  logado() {
    return !!this.sessao();
  },

  async login(usuario, senha) {
    const resp = await Api.chamar('auth.login', { usuario, senha });
    if (!resp.sucesso) return resp;
    this.salvarSessao(resp.dados);
    return resp;
  },

  async logout() {
    await Api.chamar('auth.logout', {});
    this.limparSessao();
    location.hash = '';
    location.reload();
  }
};

function initLogin() {
  const form = document.getElementById('form-login');
  if (!form) return;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const usuario = document.getElementById('login-usuario').value.trim();
    const senha = document.getElementById('login-senha').value;
    const btn = document.getElementById('btn-login');
    btn.disabled = true; btn.textContent = 'Entrando...';
    const resp = await Auth.login(usuario, senha);
    btn.disabled = false; btn.textContent = 'Entrar';
    if (!resp.sucesso) {
      Utils.toast(resp.erro, 'erro');
      return;
    }
    Utils.toast('Login realizado com sucesso!', 'sucesso');
    setTimeout(() => location.reload(), 400);
  });
}
