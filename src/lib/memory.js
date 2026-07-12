const DB_NAME = "shopping-list-engine";
const DB_VERSION = 2;
const STORE = "userProducts";

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("appState")) {
        db.createObjectStore("appState", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode) {
  return openDB().then((db) => db.transaction(STORE, mode).objectStore(STORE));
}

export async function getAllMemory() {
  const store = await tx("readonly");
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const map = {};
      (req.result || []).forEach((rec) => {
        map[rec.key] = rec.product;
      });
      resolve(map);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getMemory(key) {
  const store = await tx("readonly");
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ? req.result.product : null);
    req.onerror = () => reject(req.error);
  });
}

export async function putMemory(key, product) {
  const store = await tx("readwrite");
  return new Promise((resolve, reject) => {
    const req = store.put({ key, product });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteMemory(key) {
  const store = await tx("readwrite");
  return new Promise((resolve, reject) => {
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearMemory() {
  const store = await tx("readwrite");
  return new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function exportMemory() {
  return getAllMemory();
}

export async function importMemory(map) {
  const store = await tx("readwrite");
  return new Promise((resolve, reject) => {
    const keys = Object.keys(map || {});
    let pending = keys.length;
    if (pending === 0) return resolve();
    keys.forEach((key) => {
      const req = store.put({ key, product: map[key] });
      req.onsuccess = () => {
        pending -= 1;
        if (pending === 0) resolve();
      };
      req.onerror = () => reject(req.error);
    });
  });
}
