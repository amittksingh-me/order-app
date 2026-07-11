// User Memory backed by IndexedDB.
// Stores user-preferred products and learned items locally.

const DB_NAME = "shopping-list-engine";
const DB_VERSION = 2;
const STORE = "userProducts";
const APP_STORE = "appState";

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
      if (!db.objectStoreNames.contains(APP_STORE)) {
        db.createObjectStore(APP_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode) {
  return openDB().then((db) => db.transaction(STORE, mode).objectStore(STORE));
}

function appTx(mode) {
  return openDB().then((db) => db.transaction(APP_STORE, mode).objectStore(APP_STORE));
}

export async function getDraft() {
  const store = await appTx("readonly");
  return new Promise((resolve, reject) => {
    const req = store.get("draft-input");
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDraft(value) {
  const store = await appTx("readwrite");
  return new Promise((resolve, reject) => {
    const req = store.put({ id: "draft-input", value });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDraft() {
  const store = await appTx("readwrite");
  return new Promise((resolve, reject) => {
    const req = store.delete("draft-input");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
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
