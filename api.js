/**
 * api.js
 * Camada de comunicação com o backend (Google Apps Script).
 * Usa Content-Type "text/plain" de propósito: isso faz a requisição ser
 * tratada como "simple request" pelo navegador, evitando o preflight CORS
 * (OPTIONS) que o Apps Script não sabe responder.
 */

const Api = {
  token() {
    return localStorage.getItem('ponto_token') || '';
  },
  setToken(token) {
    if (token) localStorage.setItem('ponto_token', token);
    else localStorage.removeItem('ponto_token');
  },

  async chamar(action, body = {}) {
    const payload = { action, token: this.token(), body };
    try {
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const json = await resp.json();
      if (!json.sucesso) {
        return { sucesso: false, erro: json.erro || 'Erro desconhecido.', codigo: json.codigo };
      }
      return json;
    } catch (e) {
      return { sucesso: false, erro: 'Sem conexão com o servidor.', codigo: 'OFFLINE', excecao: true };
    }
  },

  online() {
    return navigator.onLine;
  }
};
