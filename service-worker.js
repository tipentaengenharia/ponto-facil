/**
 * service-worker.js
 * Faz o "app shell" (HTML/CSS/JS/ícones) funcionar offline e permite que o
 * navegador ofereça a instalação do PWA. As chamadas de API (para o Apps
 * Script) NÃO são cacheadas — sempre tentam a rede, pois o registro de
 * ponto real precisa ser processado no servidor assim que houver conexão.
 */

const CACHE_NOME = 'ponto-facil-v2';
const ARQUIVOS_APP_SHELL = [
  './',
  './index.html',
  './config.js',
  './manifest.json',
  './styles.css',
  './db.js',
  './api.js',
  './utils.js',
  './auth.js',
  './funcionario.js',
  './admin.js',
  './desenvolvedor.js',
  './app.js'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NOME).then((cache) => cache.addAll(ARQUIVOS_APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((n) => n !== CACHE_NOME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const url = new URL(evento.request.url);

  // Nunca cachear chamadas ao backend (Google Apps Script) - sempre rede,
  // e se falhar, deixa o próprio app decidir enfileirar offline.
  if (url.hostname.indexOf('script.google.com') !== -1 || url.hostname.indexOf('googleusercontent.com') !== -1) {
    return; // deixa passar direto para a rede
  }

  evento.respondWith(
    caches.match(evento.request).then((respostaCache) => {
      if (respostaCache) return respostaCache;
      return fetch(evento.request).then((respostaRede) => {
        // Cacheia dinamicamente novos arquivos do próprio app (mesma origem)
        if (evento.request.method === 'GET' && url.origin === self.location.origin) {
          const clone = respostaRede.clone();
          caches.open(CACHE_NOME).then((cache) => cache.put(evento.request, clone));
        }
        return respostaRede;
      }).catch(() => {
        if (evento.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
