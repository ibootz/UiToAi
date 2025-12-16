// ============================================================
// UiToAi - IndexedDB (Projects / Runs)
// ============================================================

import { createDefaultRunSettings, createEmptySamples, createEmptySpec } from "./schema.js";

const DB_NAME = "sui2_db";
const DB_VERSION = 1;
const STORE_PROJECTS = "projects";
const STORE_RUNS = "runs";

let dbInstance = null;

export async function openDb() {
  if (dbInstance) return dbInstance;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_RUNS)) {
        const runStore = db.createObjectStore(STORE_RUNS, { keyPath: "id" });
        runStore.createIndex("projectId", "projectId", { unique: false });
        runStore.createIndex("startedAt", "startedAt", { unique: false });
      }
    };
    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(dbInstance);
    };
    req.onerror = () => reject(req.error);
  });
}

// ---------------------- Project CRUD ----------------------
export async function listProjects() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, "readonly");
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.getAll();
    req.onsuccess = () => {
      const list = req.result || [];
      list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getProject(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, "readonly");
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getProjectByHost(host) {
  const list = await listProjects();
  return list.find((p) => p.host === host) || null;
}

export async function createProject(host, notes = "") {
  const db = await openDb();
  const project = {
    id: crypto.randomUUID(),
    host: host,
    createdAt: new Date().toISOString(),
    notes: notes
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, "readwrite");
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.add(project);
    req.onsuccess = () => resolve(project);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteProject(id) {
  const db = await openDb();
  // 同时删除该 project 下的所有 runs
  const runs = await listRunsByProject(id);
  for (const run of runs) {
    await deleteRun(run.id);
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, "readwrite");
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

// ---------------------- Run CRUD ----------------------
export async function listRunsByProject(projectId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RUNS, "readonly");
    const store = tx.objectStore(STORE_RUNS);
    const index = store.index("projectId");
    const req = index.getAll(projectId);
    req.onsuccess = () => {
      const list = req.result || [];
      list.sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""));
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getRun(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RUNS, "readonly");
    const store = tx.objectStore(STORE_RUNS);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function startRun(projectId, url, title, settings) {
  const db = await openDb();
  const now = new Date().toISOString();
  const host = new URL(url).host;
  const run = {
    id: crypto.randomUUID(),
    projectId: projectId,
    startedAt: now,
    endedAt: null,
    url: url,
    title: title,
    settings: settings || createDefaultRunSettings(),
    spec: createEmptySpec({ host, url, title, capturedAt: now }),
    samples: createEmptySamples()
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RUNS, "readwrite");
    const store = tx.objectStore(STORE_RUNS);
    const req = store.add(run);
    req.onsuccess = () => resolve(run);
    req.onerror = () => reject(req.error);
  });
}

export async function stopRun(id) {
  const run = await getRun(id);
  if (!run) throw new Error("run_not_found");
  run.endedAt = new Date().toISOString();
  return saveRun(run);
}

export async function saveRun(run) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RUNS, "readwrite");
    const store = tx.objectStore(STORE_RUNS);
    const req = store.put(run);
    req.onsuccess = () => resolve(run);
    req.onerror = () => reject(req.error);
  });
}

export async function updateRunSpec(id, spec) {
  const run = await getRun(id);
  if (!run) throw new Error("run_not_found");
  run.spec = spec;
  return saveRun(run);
}

export async function addRunSample(id, sample) {
  const run = await getRun(id);
  if (!run) throw new Error("run_not_found");
  if (!run.samples) run.samples = createEmptySamples();
  run.samples.elements.push(sample);

  // 限制样本数量
  const maxElements = run.settings?.maxElements || 50;
  if (run.samples.elements.length > maxElements) {
    run.samples.elements = run.samples.elements.slice(-maxElements);
  }

  return saveRun(run);
}

export async function deleteRun(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RUNS, "readwrite");
    const store = tx.objectStore(STORE_RUNS);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}
