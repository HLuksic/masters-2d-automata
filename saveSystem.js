// ---------------------------------------------------------------------------
// Save system
//
// A saved state is a self-contained binary document:
//
//   "CAUT" | ver u8 | flags u8 | headerLen u32 | thumbLen u32 | cellLen u32
//          | body = [gzip]( headerJSON ‖ thumbnail(webp) ‖ cells(RLE or raw) )
//
// The same bytes are (a) stored in IndexedDB as the local library and
// (b) downloadable as a ".cauto" file, so users can keep/share states without
// any server, account or database. "Export all" writes a bundle:
//
//   "CAUB" | ver u8 | count u32 | [docLen u32 | document]*
// ---------------------------------------------------------------------------

const CA_DOC_MAGIC = 'CAUT';
const CA_BUNDLE_MAGIC = 'CAUB';
const CA_FORMAT_VERSION = 1;
const CA_FILE_EXT = '.cauto';
const CA_DOC_HEADER_BYTES = 18;
const CA_BUNDLE_HEADER_BYTES = 9;
const CA_FLAG_GZIP = 1 << 0;
const CA_FLAG_RLE = 1 << 1;


// ---------------- binary helpers ----------------

function caReadMagic(bytes, offset = 0) {
    if (bytes.length < offset + 4) return '';
    return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

function caWriteMagic(view, offset, magic) {
    for (let i = 0; i < 4; i++) view.setUint8(offset + i, magic.charCodeAt(i));
}

function caConcat(parts) {
    let total = 0;
    for (const p of parts) total += p.length;
    const out = new Uint8Array(total);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
}

function caVarintSize(v) {
    let n = 1;
    while (v >= 0x80) { v >>>= 7; n++; }
    return n;
}

function caWriteVarint(out, pos, v) {
    while (v >= 0x80) { out[pos++] = (v & 0x7f) | 0x80; v >>>= 7; }
    out[pos++] = v;
    return pos;
}

// Run-length encoding: [varint runLength][value]. Two passes so we allocate exactly.
function caRleEncode(cells) {
    const n = cells.length;
    if (n === 0) return new Uint8Array(0);

    let size = 0, i = 0;
    while (i < n) {
        const v = cells[i];
        let j = i + 1;
        while (j < n && cells[j] === v) j++;
        size += caVarintSize(j - i) + 1;
        i = j;
    }

    const out = new Uint8Array(size);
    let pos = 0;
    i = 0;
    while (i < n) {
        const v = cells[i];
        let j = i + 1;
        while (j < n && cells[j] === v) j++;
        pos = caWriteVarint(out, pos, j - i);
        out[pos++] = v;
        i = j;
    }
    return out;
}

function caRleDecode(bytes, count) {
    const out = new Uint8Array(count);
    let pos = 0, o = 0;
    while (pos < bytes.length && o < count) {
        let shift = 0, run = 0, b;
        do {
            b = bytes[pos++];
            run += (b & 0x7f) * Math.pow(2, shift);
            shift += 7;
        } while (b & 0x80 && pos < bytes.length);
        const v = bytes[pos++];
        const end = Math.min(o + run, count);
        if (v !== 0) out.fill(v, o, end);
        o = end;
    }
    return out;
}

async function caDeflate(bytes) {
    if (typeof CompressionStream === 'undefined') return null;
    try {
        const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch (e) {
        console.warn('Compression unavailable, storing uncompressed:', e);
        return null;
    }
}

async function caInflate(bytes) {
    if (typeof DecompressionStream === 'undefined') {
        throw new Error('This browser cannot read compressed state files.');
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}


// ---------------- misc helpers ----------------

function caUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'st-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function caFormatBytes(n) {
    if (!Number.isFinite(n)) return '?';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / 1048576).toFixed(1)} MB`;
    return `${(n / 1073741824).toFixed(2)} GB`;
}

function caSafeFilename(name) {
    return (name || 'state').replace(/[^\w\-. ]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80) || 'state';
}

function caDownloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function caCanvasToBlob(canvas, type = 'image/webp', quality = 0.75) {
    return new Promise(resolve => {
        if (!canvas || !canvas.toBlob) { resolve(null); return; }
        canvas.toBlob(b => resolve(b), type, quality);
    });
}

function caHexToRgb(hex) {
    const bigint = parseInt(String(hex).replace('#', ''), 16) || 0;
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function caRgbToHex(c) {
    return `#${c.map(v => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, '0')).join('')}`;
}

function caClampInt(v, lo, hi, fallback) {
    v = parseInt(v, 10);
    if (!Number.isFinite(v)) return fallback;
    return Math.max(lo, Math.min(hi, v));
}

function caCleanRuleList(list, max) {
    if (!Array.isArray(list)) return [];
    return Array.from(new Set(list
        .map(n => parseInt(n, 10))
        .filter(n => Number.isInteger(n) && n >= 0 && n <= max)))
        .sort((a, b) => a - b);
}


// ---------------------------------------------------------------------------

class SaveSystem {
    constructor() {
        this.dbName = 'cellularAutomataDB';
        this.storeName = 'states';
        this.dbVersion = 1;
        this.legacyKey = 'cellularAutomataStates';

        this.db = null;
        this.usingMemory = false;          // fallback when IndexedDB is blocked (private mode, etc.)
        this.memoryStore = new Map();

        this.listEl = document.getElementById('statesList');
        this.usageEl = document.getElementById('storageUsage');
        this.panelEl = document.getElementById('savedStates');
        this.thumbUrls = [];

        this.ready = this.init();
    }

    async init() {
        try {
            this.db = await this.openDB();
        } catch (e) {
            console.warn('IndexedDB unavailable; states will only live in this tab. Use Export to keep them.', e);
            this.usingMemory = true;
        }

        try { await this.migrateLegacyStates(); } catch (e) { console.warn('Legacy migration failed:', e); }

        this.initDropZone();
        await this.refreshList();

        // Ask the browser not to evict the library when disk gets tight.
        if (navigator.storage && navigator.storage.persist) {
            navigator.storage.persist().catch(() => { });
        }
    }

    // ---------------- IndexedDB plumbing ----------------

    openDB() {
        return new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') { reject(new Error('no indexedDB')); return; }
            const req = indexedDB.open(this.dbName, this.dbVersion);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('createdAt', 'createdAt');
                    store.createIndex('name', 'name');
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error || new Error('indexedDB open failed'));
            req.onblocked = () => reject(new Error('indexedDB blocked'));
        });
    }

    run(mode, action) {
        if (this.usingMemory || !this.db) return Promise.resolve(action(null));
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.storeName, mode);
            const store = tx.objectStore(this.storeName);
            let result;
            const req = action(store);
            if (req) req.onsuccess = () => { result = req.result; };
            tx.oncomplete = () => resolve(result);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error || new Error('transaction aborted'));
        });
    }

    async putRecord(record) {
        if (this.usingMemory || !this.db) { this.memoryStore.set(record.id, record); return record; }
        await this.run('readwrite', store => store.put(record));
        return record;
    }

    async getRecord(id) {
        if (this.usingMemory || !this.db) return this.memoryStore.get(id) || null;
        return (await this.run('readonly', store => store.get(id))) || null;
    }

    async getAllRecords() {
        let records;
        if (this.usingMemory || !this.db) records = Array.from(this.memoryStore.values());
        else records = (await this.run('readonly', store => store.getAll())) || [];
        return records.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    async deleteState(id) {
        if (this.usingMemory || !this.db) this.memoryStore.delete(id);
        else await this.run('readwrite', store => store.delete(id));
        await this.refreshList();
        return true;
    }

    async deleteAllStates() {
        if (this.usingMemory || !this.db) this.memoryStore.clear();
        else await this.run('readwrite', store => store.clear());
        await this.refreshList();
        return true;
    }

    async findByName(name) {
        const all = await this.getAllRecords();
        return all.find(r => r.name === name) || null;
    }

    async uniqueName(name) {
        const all = await this.getAllRecords();
        const taken = new Set(all.map(r => r.name));
        if (!taken.has(name)) return name;
        let i = 2;
        while (taken.has(`${name} (${i})`)) i++;
        return `${name} (${i})`;
    }

    // ---------------- Document encoding ----------------

    buildHeader(name, cells) {
        let population = 0;
        for (let i = 0; i < cells.length; i++) if (cells[i] !== 0) population++;

        return {
            app: 'cellular-automata',
            version: CA_FORMAT_VERSION,
            name,
            createdAt: Date.now(),
            notation: (typeof ui !== 'undefined' && ui) ? ui.notation : '',
            grid: { type: gridSystem.type, width: gridSystem.width, height: gridSystem.height },
            rules: {
                birth: gameRules.birthNumbers.slice(),
                survival: gameRules.survivalNumbers.slice(),
                cellPhases: gameRules.cellPhases,
                neighborDistance: gameRules.neighborDistance,
                triangleNeighborhoodType: gameRules.triangleNeighborhoodType
            },
            colors: { alive: caRgbToHex(aliveColor), dead: caRgbToHex(deadColor) },
            view: camera ? { x: camera.x, y: camera.y, zoom: camera.zoom } : null,
            generation,
            population,
            thumbType: 'image/webp'
        };
    }

    async encodeDocument(header, cells, thumbBytes = new Uint8Array(0)) {
        const headerBytes = new TextEncoder().encode(JSON.stringify(header));

        // Pick whichever cell encoding is smaller; gzip then squeezes the rest.
        const rle = caRleEncode(cells);
        const useRle = rle.length < cells.length;
        const cellBytes = useRle ? rle : cells;

        let flags = useRle ? CA_FLAG_RLE : 0;
        let body = caConcat([headerBytes, thumbBytes, cellBytes]);

        const gz = await caDeflate(body);
        if (gz && gz.length < body.length) { body = gz; flags |= CA_FLAG_GZIP; }

        const out = new Uint8Array(CA_DOC_HEADER_BYTES + body.length);
        const view = new DataView(out.buffer);
        caWriteMagic(view, 0, CA_DOC_MAGIC);
        view.setUint8(4, CA_FORMAT_VERSION);
        view.setUint8(5, flags);
        view.setUint32(6, headerBytes.length, true);
        view.setUint32(10, thumbBytes.length, true);
        view.setUint32(14, cellBytes.length, true);
        out.set(body, CA_DOC_HEADER_BYTES);
        return out;
    }

    async decodeDocument(bytes) {
        if (bytes.length < CA_DOC_HEADER_BYTES || caReadMagic(bytes) !== CA_DOC_MAGIC) {
            throw new Error('Not a cellular-automata state file.');
        }
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const version = view.getUint8(4);
        if (version > CA_FORMAT_VERSION) {
            throw new Error('This file was saved by a newer version of the simulator.');
        }
        const flags = view.getUint8(5);
        const headerLen = view.getUint32(6, true);
        const thumbLen = view.getUint32(10, true);
        const cellLen = view.getUint32(14, true);

        let body = bytes.subarray(CA_DOC_HEADER_BYTES);
        if (flags & CA_FLAG_GZIP) body = await caInflate(body);

        const header = JSON.parse(new TextDecoder().decode(body.subarray(0, headerLen)));
        const thumbBytes = body.subarray(headerLen, headerLen + thumbLen);
        const cellPayload = body.subarray(headerLen + thumbLen, headerLen + thumbLen + cellLen);

        const width = caClampInt(header.grid && header.grid.width, 1, 1 << 20, 1);
        const height = caClampInt(header.grid && header.grid.height, 1, 1 << 20, 1);
        const total = width * height;

        let cells;
        if (flags & CA_FLAG_RLE) {
            cells = caRleDecode(cellPayload, total);
        } else {
            cells = new Uint8Array(total);
            cells.set(cellPayload.subarray(0, Math.min(total, cellPayload.length)));
        }

        const thumbBlob = thumbLen > 0
            ? new Blob([thumbBytes.slice()], { type: header.thumbType || 'image/webp' })
            : null;

        return { header, cells, thumbBlob, bytes };
    }

    // ---------------- Thumbnail ----------------

    async captureThumbnail() {
        try {
            const canvas = gridRenderer.captureThumbnail(480, 2);
            let blob = await caCanvasToBlob(canvas, 'image/webp', 0.75);
            if (!blob || blob.size === 0) blob = await caCanvasToBlob(canvas, 'image/jpeg', 0.8);
            return blob;
        } catch (e) {
            console.warn('Thumbnail capture failed:', e);
            return null;
        }
    }

    // ---------------- Saving ----------------

    async saveState(name) {
        await this.ready;

        const cells = gridSystem.readCells();
        const header = this.buildHeader(name, cells);

        const thumbBlob = await this.captureThumbnail();
        const thumbBytes = thumbBlob ? new Uint8Array(await thumbBlob.arrayBuffer()) : new Uint8Array(0);
        header.thumbType = thumbBlob ? thumbBlob.type : 'image/webp';

        const existing = await this.findByName(name);
        if (existing) header.createdAt = existing.createdAt;

        const bytes = await this.encodeDocument(header, cells, thumbBytes);
        const record = this.makeRecord(header, bytes, thumbBlob, existing ? existing.id : null);

        try {
            await this.putRecord(record);
        } catch (e) {
            console.error('Failed to save state:', e);
            throw new Error(e && e.name === 'QuotaExceededError'
                ? 'Not enough storage space. Delete some states or export them to files.'
                : 'Could not write to the local database.');
        }

        await this.refreshList();
        return record;
    }

    makeRecord(header, bytes, thumbBlob, id) {
        return {
            id: id || caUUID(),
            name: header.name,
            createdAt: header.createdAt || Date.now(),
            updatedAt: Date.now(),
            notation: header.notation || '',
            gridType: header.grid.type,
            width: header.grid.width,
            height: header.grid.height,
            generation: header.generation || 0,
            population: header.population || 0,
            thumb: thumbBlob || null,
            data: bytes,
            size: bytes.length
        };
    }

    // ---------------- Loading ----------------

    async loadStateIntoSimulation(id) {
        const record = await this.getRecord(id);
        if (!record) return null;
        const doc = await this.decodeDocument(new Uint8Array(record.data));
        this.applyDocument(doc);
        return doc;
    }

    applyDocument(doc) {
        const h = doc.header;
        const rules = h.rules || {};
        const colors = h.colors || {};

        gridSystem.setType(h.grid.type === 'tri' ? 'tri' : 'hex');

        gameRules.neighborDistance = caClampInt(rules.neighborDistance, 1, 3, 1);
        gameRules.cellPhases = caClampInt(rules.cellPhases, 1, 10, 1);
        gameRules.triangleNeighborhoodType =
            rules.triangleNeighborhoodType === 'vonNeumann' ? 'vonNeumann' : 'moore';

        const maxN = (typeof ui !== 'undefined' && ui)
            ? ui.computeMaxNeighbors(gridSystem.type, gameRules.neighborDistance,
                gameRules.cellPhases, gameRules.triangleNeighborhoodType)
            : 4096;
        gameRules.birthNumbers = caCleanRuleList(rules.birth, maxN);
        gameRules.survivalNumbers = caCleanRuleList(rules.survival, maxN);

        aliveColor = caHexToRgb(colors.alive || '#000000');
        deadColor = caHexToRgb(colors.dead || '#ffffff');

        gridSystem.loadCells(h.grid.width, h.grid.height, doc.cells);

        if (camera && h.view) {
            camera.x = Number(h.view.x) || 0;
            camera.y = Number(h.view.y) || 0;
            const z = Number(h.view.zoom);
            if (Number.isFinite(z) && z > 0) camera.zoom = Math.min(camera.maxZoom, z);
        }

        if (typeof ui !== 'undefined' && ui) ui.refreshUI();   // refreshUI() resets `generation`
        generation = Math.max(0, parseInt(h.generation, 10) || 0);
        if (typeof populationGraph !== 'undefined' && populationGraph) populationGraph.reset();
        needsRender = true;
        return true;
    }

    // ---------------- Export / import ----------------

    async exportState(id) {
        const record = await this.getRecord(id);
        if (!record) return false;
        caDownloadBlob(new Blob([record.data], { type: 'application/octet-stream' }),
            caSafeFilename(record.name) + CA_FILE_EXT);
        return true;
    }

    async exportAll() {
        const records = await this.getAllRecords();
        if (records.length === 0) { alert('There are no saved states to export.'); return; }

        const parts = [];
        const head = new Uint8Array(CA_BUNDLE_HEADER_BYTES);
        const view = new DataView(head.buffer);
        caWriteMagic(view, 0, CA_BUNDLE_MAGIC);
        view.setUint8(4, CA_FORMAT_VERSION);
        view.setUint32(5, records.length, true);
        parts.push(head);

        for (const r of records) {
            const len = new Uint8Array(4);
            new DataView(len.buffer).setUint32(0, r.data.length, true);
            parts.push(len, new Uint8Array(r.data));
        }

        const stamp = new Date().toISOString().slice(0, 10);
        caDownloadBlob(new Blob(parts, { type: 'application/octet-stream' }),
            `cellular-automata-library-${stamp}${CA_FILE_EXT}`);
    }

    async importFiles(fileList) {
        const files = Array.from(fileList || []);
        if (files.length === 0) return;

        let imported = 0;
        const errors = [];

        for (const file of files) {
            try {
                const bytes = new Uint8Array(await file.arrayBuffer());
                const magic = caReadMagic(bytes);

                if (magic === CA_BUNDLE_MAGIC) {
                    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
                    const count = view.getUint32(5, true);
                    let off = CA_BUNDLE_HEADER_BYTES;
                    for (let i = 0; i < count && off + 4 <= bytes.length; i++) {
                        const len = view.getUint32(off, true);
                        off += 4;
                        await this.importDocumentBytes(bytes.slice(off, off + len));
                        off += len;
                        imported++;
                    }
                } else if (magic === CA_DOC_MAGIC) {
                    await this.importDocumentBytes(bytes);
                    imported++;
                } else {
                    throw new Error('unrecognised file');
                }
            } catch (e) {
                console.warn('Import failed for', file.name, e);
                errors.push(`${file.name}: ${e.message || e}`);
            }
        }

        await this.refreshList();

        if (errors.length) {
            alert(`Imported ${imported} state(s).\n\nCould not import:\n${errors.join('\n')}`);
        }
        return imported;
    }

    async importDocumentBytes(bytes) {
        const doc = await this.decodeDocument(bytes);
        doc.header.name = await this.uniqueName(doc.header.name || 'Imported state');
        const record = this.makeRecord(doc.header, bytes, doc.thumbBlob, null);
        await this.putRecord(record);
        return record;
    }

    initDropZone() {
        if (!this.panelEl) return;
        const stop = e => { e.preventDefault(); e.stopPropagation(); };

        ['dragenter', 'dragover'].forEach(type => this.panelEl.addEventListener(type, e => {
            stop(e);
            this.panelEl.classList.add('drop-active');
        }));
        ['dragleave', 'dragend'].forEach(type => this.panelEl.addEventListener(type, e => {
            stop(e);
            this.panelEl.classList.remove('drop-active');
        }));
        this.panelEl.addEventListener('drop', e => {
            stop(e);
            this.panelEl.classList.remove('drop-active');
            if (e.dataTransfer && e.dataTransfer.files.length) this.importFiles(e.dataTransfer.files);
        });
    }

    // ---------------- Legacy localStorage migration ----------------

    async migrateLegacyStates() {
        let raw = null;
        try { raw = localStorage.getItem(this.legacyKey); } catch (e) { return; }
        if (!raw) return;

        let states;
        try { states = JSON.parse(raw) || {}; } catch (e) { states = {}; }

        for (const [name, old] of Object.entries(states)) {
            try {
                const rows = String(old.cells || '').split('\n');
                const height = rows.length;
                const width = rows[0] ? rows[0].length : 0;
                if (!width || !height) continue;

                const cells = new Uint8Array(width * height);
                for (let y = 0; y < height; y++) {
                    const row = rows[y];
                    for (let x = 0, n = Math.min(row.length, width); x < n; x++) {
                        const d = row.charCodeAt(x) - 48;
                        cells[y * width + x] = (d >= 0 && d <= 9) ? d : 0;
                    }
                }

                const header = this.legacyHeader(name, old, width, height, cells);

                let thumbBlob = null;
                let thumbBytes = new Uint8Array(0);
                if (old.image) {
                    try {
                        thumbBlob = await (await fetch(old.image)).blob();
                        thumbBytes = new Uint8Array(await thumbBlob.arrayBuffer());
                        header.thumbType = thumbBlob.type;
                    } catch (e) { /* thumbnail is optional */ }
                }

                const bytes = await this.encodeDocument(header, cells, thumbBytes);
                await this.putRecord(this.makeRecord(header, bytes, thumbBlob, null));
            } catch (e) {
                console.warn('Could not migrate legacy state', name, e);
            }
        }

        try { localStorage.removeItem(this.legacyKey); } catch (e) { /* ignore */ }
    }

    legacyHeader(name, old, width, height, cells) {
        const parts = String(old.notation || '').split('/').map(p => p.substring(1));
        const gridType = parts[0] === 'h' ? 'hex' : 'tri';
        const colorIndex = gridType === 'tri' ? 6 : 5;

        const parseList = (s) => {
            if (!s) return [];
            const out = new Set();
            for (const token of s.split('.')) {
                const m = token.match(/^(\d+)(?:-(\d+))?$/);
                if (!m) continue;
                const a = parseInt(m[1], 10);
                const b = m[2] !== undefined ? parseInt(m[2], 10) : a;
                for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.add(i);
            }
            return Array.from(out).sort((x, y) => x - y);
        };

        let population = 0;
        for (let i = 0; i < cells.length; i++) if (cells[i] !== 0) population++;

        return {
            app: 'cellular-automata',
            version: CA_FORMAT_VERSION,
            name,
            createdAt: old.timestamp || Date.now(),
            notation: old.notation || '',
            grid: { type: gridType, width, height },
            rules: {
                birth: parseList(parts[3]),
                survival: parseList(parts[4]),
                cellPhases: caClampInt(parts[2], 1, 10, 1),
                neighborDistance: caClampInt(parts[1], 1, 3, 1),
                triangleNeighborhoodType: parts[5] === 'V' ? 'vonNeumann' : 'moore'
            },
            colors: { alive: parts[colorIndex] || '#000000', dead: parts[colorIndex + 1] || '#ffffff' },
            view: null,
            generation: 0,
            population,
            thumbType: 'image/webp'
        };
    }

    // ---------------- UI list ----------------

    releaseThumbUrls() {
        for (const url of this.thumbUrls) URL.revokeObjectURL(url);
        this.thumbUrls = [];
    }

    async refreshList() {
        if (!this.listEl) return;

        const records = await this.getAllRecords();
        this.releaseThumbUrls();
        this.listEl.innerHTML = '';

        if (records.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'states-empty';
            empty.textContent = 'No saved states yet. Save one, or drop a .cauto file here.';
            this.listEl.appendChild(empty);
        }

        for (const record of records) {
            this.listEl.appendChild(this.buildCard(record));
        }

        this.updateUsage(records);
    }

    buildCard(record) {
        const card = document.createElement('div');
        card.className = 'state-card';
        card.dataset.id = record.id;

        const title = document.createElement('h3');
        title.textContent = record.name;                       // textContent: names are user input
        card.appendChild(title);

        const notation = document.createElement('p');
        notation.className = 'state-notation';
        notation.textContent = record.notation || '';
        card.appendChild(notation);

        const meta = document.createElement('p');
        meta.className = 'state-meta';
        meta.textContent = `${record.width}×${record.height} · ${record.population.toLocaleString()} alive · ` +
            `${caFormatBytes(record.size)}\n${new Date(record.createdAt).toLocaleString()}`;
        card.appendChild(meta);

        if (record.thumb) {
            const url = URL.createObjectURL(record.thumb);
            this.thumbUrls.push(url);
            const img = document.createElement('img');
            img.src = url;
            img.alt = `${record.name} thumbnail`;
            img.loading = 'lazy';
            card.appendChild(img);
        }

        const actions = document.createElement('div');
        actions.className = 'control-group';

        const addBtn = (label, cls, handler) => {
            const b = document.createElement('button');
            b.className = cls;
            b.textContent = label;
            b.addEventListener('click', handler);
            actions.appendChild(b);
            return b;
        };

        addBtn('Load', 'loadState', async () => {
            if (!confirm(`Load state "${record.name}"? The current grid will be replaced.`)) return;
            try {
                await this.loadStateIntoSimulation(record.id);
            } catch (e) {
                console.error(e);
                alert('Could not load this state: ' + (e.message || e));
            }
        });

        addBtn('Export', 'exportState', () => this.exportState(record.id));

        addBtn('Rename', 'renameState', async () => {
            const next = prompt('New name:', record.name);
            if (!next || !next.trim() || next.trim() === record.name) return;
            const name = next.trim();
            if (await this.findByName(name)) { alert(`A state named "${name}" already exists.`); return; }
            const stored = await this.getRecord(record.id);
            const doc = await this.decodeDocument(new Uint8Array(stored.data));
            doc.header.name = name;
            const thumbBytes = doc.thumbBlob ? new Uint8Array(await doc.thumbBlob.arrayBuffer()) : new Uint8Array(0);
            const bytes = await this.encodeDocument(doc.header, doc.cells, thumbBytes);
            await this.putRecord(this.makeRecord(doc.header, bytes, doc.thumbBlob, record.id));
            await this.refreshList();
        });

        addBtn('Delete', 'deleteState', async () => {
            if (!confirm(`Delete state "${record.name}"? This cannot be undone.`)) return;
            await this.deleteState(record.id);
        });

        card.appendChild(actions);
        return card;
    }

    async updateUsage(records) {
        if (!this.usageEl) return;

        const total = records.reduce((sum, r) => sum + (r.size || 0), 0);
        let text = `${records.length} state${records.length === 1 ? '' : 's'} · ${caFormatBytes(total)}`;

        if (this.usingMemory) {
            text += ' · not persisted (export to keep)';
        } else if (navigator.storage && navigator.storage.estimate) {
            try {
                const { quota } = await navigator.storage.estimate();
                if (quota) text += ` of ~${caFormatBytes(quota)} available`;
            } catch (e) { /* ignore */ }
        }

        this.usageEl.textContent = text;
    }
}