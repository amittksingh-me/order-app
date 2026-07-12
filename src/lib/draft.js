const DB_NAME = "shopping-list-engine";
const DB_VERSION = 2;
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
      if (!db.objectStoreNames.contains(APP_STORE)) {
        db.createObjectStore(APP_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
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
