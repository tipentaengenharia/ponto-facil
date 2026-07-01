/**
 * db.js
 * Banco local (IndexedDB) usado para guardar pontos batidos offline
 * (incluindo a foto em base64) até que a internet volte e o app consiga
 * sincronizar com o backend.
 */

const DB_NOME = 'ponto-facil-db';
const DB_VERSAO = 1;
const STORE_FILA = 'filaOffline';

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOME, DB_VERSAO);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_FILA)) {
        db.createObjectStore(STORE_FILA, { keyPath: 'idClienteTemp' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function salvarPontoOffline(pontoObj) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILA, 'readwrite');
    tx.objectStore(STORE_FILA).put(pontoObj);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function listarPontosOffline() {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILA, 'readonly');
    const req = tx.objectStore(STORE_FILA).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function removerPontoOffline(idClienteTemp) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILA, 'readwrite');
    tx.objectStore(STORE_FILA).delete(idClienteTemp);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function contarPontosOffline() {
  const lista = await listarPontosOffline();
  return lista.length;
}
