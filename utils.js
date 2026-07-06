/**
 * utils.js
 * Funções auxiliares de UI (toasts, modais), câmera e geolocalização
 * usadas por todas as áreas do sistema.
 */

const Utils = {
  toast(mensagem, tipo = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) { alert(mensagem); return; }
    const el = document.createElement('div');
    el.className = `toast toast-${tipo}`;
    el.textContent = mensagem;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast-visivel'));
    setTimeout(() => {
      el.classList.remove('toast-visivel');
      setTimeout(() => el.remove(), 300);
    }, 4200);
  },

  mostrar(id) { const el = document.getElementById(id); if (el) el.classList.remove('oculto'); },
  esconder(id) { const el = document.getElementById(id); if (el) el.classList.add('oculto'); },

  formatarDataBR(dataISO) {
    if (!dataISO) return '';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  },

  agora() {
    return new Date();
  },

  /** Captura uma foto usando a câmera do dispositivo (getUserMedia) e retorna um data URL base64 JPEG. */
  async capturarFoto(videoEl, canvasEl) {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });
    videoEl.srcObject = stream;
    await videoEl.play();
    // pequena espera para o sensor ajustar exposição
    await new Promise((r) => setTimeout(r, 350));
    canvasEl.width = videoEl.videoWidth || 480;
    canvasEl.height = videoEl.videoHeight || 360;
    const ctx = canvasEl.getContext('2d');
    ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
    stream.getTracks().forEach((t) => t.stop());
    return canvasEl.toDataURL('image/jpeg', 0.75);
  },

  pararCamera(videoEl) {
    const stream = videoEl.srcObject;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    videoEl.srcObject = null;
  },

  /** Obtém a geolocalização atual do navegador como {latitude, longitude, precisao}. */
  obterGeolocalizacao() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          precisao: Math.round(pos.coords.accuracy)
        }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    });
  },

  identificarDispositivo() {
    const ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua)) return 'Celular';
    if (/iPad|Tablet/i.test(ua)) return 'Tablet';
    return 'Computador';
  },

  uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  aplicarTema(cfg) {
    if (!cfg) return;
    const root = document.documentElement;
    if (cfg.corPrimaria) root.style.setProperty('--cor-primaria', cfg.corPrimaria);
    if (cfg.corSecundaria) root.style.setProperty('--cor-secundaria', cfg.corSecundaria);
    document.title = cfg.nomeSistema || NOME_SISTEMA_PADRAO;
    const nomeEls = document.querySelectorAll('[data-nome-sistema]');
    nomeEls.forEach((el) => { el.textContent = cfg.nomeSistema || NOME_SISTEMA_PADRAO; });
    if (cfg.logoUrl) {
      document.querySelectorAll('[data-logo-sistema]').forEach((el) => { el.src = cfg.logoUrl; el.classList.remove('oculto'); });
    }
  },

  baixarCSV(nomeArquivo, cabecalho, linhas) {
    const escapar = (v) => `"${String(v === undefined || v === null ? '' : v).replace(/"/g, '""')}"`;
    const csv = [cabecalho.map(escapar).join(';'), ...linhas.map((l) => l.map(escapar).join(';'))].join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nomeArquivo;
    a.click();
  }
};

window.addEventListener('online', () => Utils.toast('Conexão com a internet restabelecida.', 'sucesso'));
window.addEventListener('offline', () => Utils.toast('Você está offline. Os pontos serão sincronizados depois.', 'aviso'));
