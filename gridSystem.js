const NEUMANN_TRIANGLE_NEIGHBORS_UP_EVEN = [[-1, 0], [1, 0], [-1, 1]];
const NEUMANN_TRIANGLE_NEIGHBORS_UP_ODD = [[-1, 0], [1, 0], [1, 1]];
const NEUMANN_TRIANGLE_NEIGHBORS_DOWN_EVEN = [[-1, 0], [1, 0], [-1, -1]];
const NEUMANN_TRIANGLE_NEIGHBORS_DOWN_ODD = [[-1, 0], [1, 0], [1, -1]];

const NEUMANN_TRIANGLE_NEIGHBOR_MAP = {
    'true-true': NEUMANN_TRIANGLE_NEIGHBORS_UP_EVEN,
    'true-false': NEUMANN_TRIANGLE_NEIGHBORS_DOWN_EVEN,
    'false-true': NEUMANN_TRIANGLE_NEIGHBORS_UP_ODD,
    'false-false': NEUMANN_TRIANGLE_NEIGHBORS_DOWN_ODD
};

const MOORE_TRIANGLE_NEIGHBORS_UP_EVEN = [
    // Side neighbors (3)
    [-1, 0], [1, 0], // left, right
    [-1, 1], // top
    // Point neighbors (9)
    [-2, 0], [2, 0], // far left, far right
    [-2, -1], [-1, -1], [0, -1], // bottom row
    [-2, 1], [0, 1], // top
    [-3, 1], [1, 1] // far top
];

const MOORE_TRIANGLE_NEIGHBORS_UP_ODD = [
    [-1, 0], [1, 0],
    [1, 1],
    [-2, 0], [2, 0],
    [0, -1], [1, -1], [2, -1],
    [0, 1], [2, 1],
    [-1, 1], [3, 1]
];

const MOORE_TRIANGLE_NEIGHBORS_DOWN_EVEN = [
    [-1, 0], [1, 0],
    [-1, -1],
    [-2, 0], [2, 0],
    [-2, 1], [-1, 1], [0, 1],
    [-2, -1], [0, -1],
    [-3, -1], [1, -1]
];

const MOORE_TRIANGLE_NEIGHBORS_DOWN_ODD = [
    [-1, 0], [1, 0],
    [1, -1],
    [-2, 0], [2, 0],
    [0, 1], [1, 1], [2, 1],
    [0, -1], [2, -1],
    [-1, -1], [3, -1]
];

const MOORE_TRIANGLE_NEIGHBOR_MAP = {
    'true-true': MOORE_TRIANGLE_NEIGHBORS_UP_EVEN,
    'true-false': MOORE_TRIANGLE_NEIGHBORS_DOWN_EVEN,
    'false-true': MOORE_TRIANGLE_NEIGHBORS_UP_ODD,
    'false-false': MOORE_TRIANGLE_NEIGHBORS_DOWN_ODD
};

const HEX_NEIGHBORS_EVEN = [
    [0, -1],     // top
    [1, -1],     // top-right
    [1, 0],      // bottom-right
    [0, 1],      // bottom
    [-1, 0],     // bottom-left
    [-1, -1]     // top-left
];

const HEX_NEIGHBORS_ODD = [
    [0, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0]
];

const HEX_NEIGHBOR_MAP = {
    'true': HEX_NEIGHBORS_EVEN,
    'false': HEX_NEIGHBORS_ODD
};

// ---------------------------------------------------------------------------
// GPU shaders
// ---------------------------------------------------------------------------

const RULE_LUT_SIZE = 128;   // 128x128 = 16384 possible neighbour sums (max real sum is 54 * 255)
const REDUCE_BLOCK = 8;      // population reduction: each pass sums 8x8 blocks
const MAX_POPULATION_QUERIES = 4; // in-flight async readbacks, so every generation gets sampled

// Copies the overlapping region of the old grid into a resized one (rest = 0).
const COPY_FS = `#version 300 es
precision highp float;
precision highp int;
precision highp usampler2D;
uniform usampler2D u_src;
uniform ivec2 u_srcSize;
layout(location = 0) out uvec4 outValue;
void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    uint v = 0u;
    if (p.x < u_srcSize.x && p.y < u_srcSize.y) v = texelFetch(u_src, p, 0).r;
    outValue = uvec4(v, 0u, 0u, 0u);
}`;

// 50% dead, otherwise uniform in [1, phases] - same distribution as the old Math.random() version.
const RANDOM_FS = `#version 300 es
precision highp float;
precision highp int;
uniform uint u_seed;
uniform uint u_phases;
layout(location = 0) out uvec4 outValue;
uint hash(uint x) {
    x ^= x >> 16u; x *= 0x7feb352du;
    x ^= x >> 15u; x *= 0x846ca68bu;
    x ^= x >> 16u;
    return x;
}
void main() {
    uvec2 p = uvec2(gl_FragCoord.xy);
    uint h1 = hash(p.x ^ hash(p.y ^ hash(u_seed)));
    uint h2 = hash(h1 ^ 0x9e3779b9u);
    uint v = 0u;
    if ((h1 & 0x80000000u) != 0u) {
        float r = float(h2 >> 8u) / 16777216.0; // [0, 1)
        v = min(uint(r * float(u_phases)) + 1u, u_phases);
    }
    outValue = uvec4(v, 0u, 0u, 0u);
}`;

// Sums REDUCE_BLOCK x REDUCE_BLOCK texels. First pass counts non-zero cells, later passes add partial sums.
const REDUCE_FS = `#version 300 es
precision highp float;
precision highp int;
precision highp usampler2D;
uniform usampler2D u_src;
uniform ivec2 u_srcSize;
uniform bool u_countNonZero;
layout(location = 0) out uvec4 outValue;
void main() {
    ivec2 base = ivec2(gl_FragCoord.xy) * ${REDUCE_BLOCK};
    uint s = 0u;
    for (int j = 0; j < ${REDUCE_BLOCK}; j++) {
        for (int i = 0; i < ${REDUCE_BLOCK}; i++) {
            ivec2 q = base + ivec2(i, j);
            if (q.x < u_srcSize.x && q.y < u_srcSize.y) {
                uint v = texelFetch(u_src, q, 0).r;
                s += u_countNonZero ? (v > 0u ? 1u : 0u) : v;
            }
        }
    }
    outValue = uvec4(s, 0u, 0u, 0u);
}`;

// Packs 4 cells into one RGBA8 texel so saving reads back 1 byte per cell.
const PACK_FS = `#version 300 es
precision highp float;
precision highp int;
precision highp usampler2D;
uniform usampler2D u_src;
uniform ivec2 u_srcSize;
out vec4 outColor;
float cellAt(int x, int y) {
    if (x >= u_srcSize.x) return 0.0;
    return float(texelFetch(u_src, ivec2(x, y), 0).r) / 255.0;
}
void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    int x = p.x * 4;
    outColor = vec4(cellAt(x, p.y), cellAt(x + 1, p.y), cellAt(x + 2, p.y), cellAt(x + 3, p.y));
}`;

// Generates the step shader with the neighbourhood offsets baked in as constants.
// classLists[i] = offset list for parity class i (selected by classExpr).
function buildStepShaderSource(classLists, classExpr) {
    let margin = 1;
    for (const list of classLists) {
        for (const [dx, dy] of list) margin = Math.max(margin, Math.abs(dx), Math.abs(dy));
    }

    const emit = (fetchFn) => classLists.map((list, i) => {
        const lines = list.map(([dx, dy]) => `            s += ${fetchFn}(p + ivec2(${dx}, ${dy}));`).join('\n');
        return `        ${i === 0 ? '' : 'else '}if (cls == ${i}) {\n${lines}\n        }`;
    }).join('\n');

    return `#version 300 es
precision highp float;
precision highp int;
precision highp usampler2D;

uniform usampler2D u_state;
uniform usampler2D u_rules;
uniform ivec2 u_size;
uniform uint u_phases;
layout(location = 0) out uvec4 outValue;

uint cellFast(ivec2 p) { return texelFetch(u_state, p, 0).r; }
// Toroidal wrap (positive bias because GLSL % is undefined for negative operands)
uint cellWrap(ivec2 p) { return texelFetch(u_state, (p + u_size * 16) % u_size, 0).r; }

uint sumNeighbors(ivec2 p) {
    uint s = 0u;
    int cls = ${classExpr};
    if (p.x >= ${margin} && p.y >= ${margin} && p.x < u_size.x - ${margin} && p.y < u_size.y - ${margin}) {
${emit('cellFast')}
    } else {
${emit('cellWrap')}
    }
    return s;
}

void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    uint cur = texelFetch(u_state, p, 0).r;
    uint n = sumNeighbors(p);

    uint rule = 0u; // bit 0 = birth, bit 1 = survival
    if (n < ${RULE_LUT_SIZE * RULE_LUT_SIZE}u) {
        rule = texelFetch(u_rules, ivec2(int(n % ${RULE_LUT_SIZE}u), int(n / ${RULE_LUT_SIZE}u)), 0).r;
    }

    uint next;
    if (cur > 0u) {
        next = ((rule & 2u) != 0u && cur == u_phases) ? u_phases : cur - 1u;
    } else {
        next = ((rule & 1u) != 0u) ? u_phases : 0u;
    }
    outValue = uvec4(next, 0u, 0u, 0u);
}`;
}

// ---------------------------------------------------------------------------

class GridSystem {
    constructor(gl) {
        this.gl = gl;
        this.width = 100;
        this.height = 70;
        this.type = 'hex';
        this.population = 0;

        const maxViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
        this.maxSize = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), maxViewport[0], maxViewport[1]);

        this.vao = gl.createVertexArray();
        this.copyProgram = new ShaderProgram(gl, FULLSCREEN_VS, COPY_FS);
        this.randomProgram = new ShaderProgram(gl, FULLSCREEN_VS, RANDOM_FS);
        this.reduceProgram = new ShaderProgram(gl, FULLSCREEN_VS, REDUCE_FS);
        this.packProgram = new ShaderProgram(gl, FULLSCREEN_VS, PACK_FS);

        this.simProgram = null;
        this.simSignature = null;

        this.ruleLUT = createGLTexture(gl, gl.R8UI, RULE_LUT_SIZE, RULE_LUT_SIZE);
        this.ruleData = new Uint8Array(RULE_LUT_SIZE * RULE_LUT_SIZE);
        this.ruleSignature = null;

        // Async population readback (several queries in flight so every generation gets a sample)
        this.populationDirty = false;
        this.populationEpoch = 0;
        this.populationQueries = [];
        this.populationPBOPool = [];
        this.populationReadback = new Uint32Array(4);
        this.populationPBO = gl.createBuffer();
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.populationPBO);
        gl.bufferData(gl.PIXEL_PACK_BUFFER, 16, gl.STREAM_READ);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

        this.scratchCell = new Uint8Array(1);
        this.offsetsByDistance = this.buildOffsetRings(3);

        this.current = 0;
        this.storage = this.createStorage(this.width, this.height);
    }

    get stateTexture() {
        return this.storage.textures[this.current];
    }

    // ---------------- Neighbourhoods (identical BFS to the original) ----------------

    buildOffsetRings(maxDist) {
        const res = {
            hex: { 'true': [], 'false': [] }, tri: {
                'true-true': [], 'true-false': [], 'false-true': [], 'false-false': []
            }
        };

        const bfsHex = (startEvenCol) => {
            const levels = Array(maxDist + 1).fill(null).map(() => []);
            const visited = new Set(['0,0']);
            let ring = [[0, 0]];
            const collected = [];

            for (let d = 1; d <= maxDist; d++) {
                const nextRing = [];
                for (const [cx, cy] of ring) {
                    const absEvenCol = (startEvenCol ? 0 : 1) ^ (Math.abs(cx) & 1) ? false : true;
                    const base = HEX_NEIGHBOR_MAP[absEvenCol];
                    for (const [dx, dy] of base) {
                        const nx = cx + dx, ny = cy + dy;
                        const key = `${nx},${ny}`;
                        if (!visited.has(key)) {
                            visited.add(key);
                            nextRing.push([nx, ny]);
                            collected.push([nx, ny]);
                        }
                    }
                }
                ring = nextRing;
                levels[d] = collected.slice();
            }
            return levels;
        };

        const bfsTri = (startEvenRow, startPointUp) => {
            const levels = Array(maxDist + 1).fill(null).map(() => []);
            const visited = new Set(['0,0']);
            let ring = [[0, 0]];
            const collected = [];

            for (let d = 1; d <= maxDist; d++) {
                const nextRing = [];
                for (const [cx, cy] of ring) {
                    const absEvenRow = (startEvenRow ? 0 : 1) ^ (Math.abs(cy) & 1) ? false : true;
                    const absPointUp = (startPointUp ? 0 : 1) ^ (Math.abs(cx) & 1) ? false : true;
                    const keyParity = `${absEvenRow}-${absPointUp}`;
                    const offsets = gameRules.triangleNeighborhoodType === 'vonNeumann'
                        ? NEUMANN_TRIANGLE_NEIGHBOR_MAP[keyParity]
                        : MOORE_TRIANGLE_NEIGHBOR_MAP[keyParity];

                    for (const [dx, dy] of offsets) {
                        const nx = cx + dx, ny = cy + dy;
                        const k = `${nx},${ny}`;
                        if (!visited.has(k)) {
                            visited.add(k);
                            nextRing.push([nx, ny]);
                            collected.push([nx, ny]);
                        }
                    }
                }
                ring = nextRing;
                levels[d] = collected.slice();
            }
            return levels;
        };

        res.hex['true'] = bfsHex(true);
        res.hex['false'] = bfsHex(false);

        res.tri['true-true'] = bfsTri(true, true);
        res.tri['true-false'] = bfsTri(true, false);
        res.tri['false-true'] = bfsTri(false, true);
        res.tri['false-false'] = bfsTri(false, false);

        return res;
    }

    // Forces the step shader to be regenerated on the next step.
    updateNeighborhood() {
        this.simSignature = null;
    }

    ensureSimProgram() {
        const dist = gameRules.neighborDistance;
        const sig = this.type === 'hex'
            ? `hex|${dist}`
            : `tri|${dist}|${gameRules.triangleNeighborhoodType}`;
        if (this.simProgram && sig === this.simSignature) return;

        this.offsetsByDistance = this.buildOffsetRings(dist);

        let lists, classExpr;
        if (this.type === 'hex') {
            // class 0 = even column ('true'), 1 = odd column ('false')
            lists = ['true', 'false'].map(k => this.offsetsByDistance.hex[k][dist]);
            classExpr = 'p.x & 1';
        } else {
            // class = (rowOdd << 1) | colOdd  -> 'evenRow-pointUp' key order below
            lists = ['true-true', 'true-false', 'false-true', 'false-false']
                .map(k => this.offsetsByDistance.tri[k][dist]);
            classExpr = '((p.y & 1) << 1) | (p.x & 1)';
        }

        if (this.simProgram) this.simProgram.dispose();
        this.simProgram = new ShaderProgram(this.gl, FULLSCREEN_VS, buildStepShaderSource(lists, classExpr));
        this.simSignature = sig;
    }

    ensureRuleLUT() {
        const sig = gameRules.birthNumbers.join(',') + '/' + gameRules.survivalNumbers.join(',');
        if (sig === this.ruleSignature) return;
        this.ruleSignature = sig;

        const data = this.ruleData;
        data.fill(0);
        for (const n of gameRules.birthNumbers) {
            if (Number.isInteger(n) && n >= 0 && n < data.length) data[n] |= 1;
        }
        for (const n of gameRules.survivalNumbers) {
            if (Number.isInteger(n) && n >= 0 && n < data.length) data[n] |= 2;
        }
        this.uploadR8UI(this.ruleLUT, 0, 0, RULE_LUT_SIZE, RULE_LUT_SIZE, data);
    }

    // ---------------- GPU storage ----------------

    createStorage(w, h) {
        const gl = this.gl;
        const textures = [createGLTexture(gl, gl.R8UI, w, h), createGLTexture(gl, gl.R8UI, w, h)];
        const framebuffers = textures.map(t => createGLFramebuffer(gl, t));

        const reduction = [];
        let rw = w, rh = h;
        do {
            rw = Math.ceil(rw / REDUCE_BLOCK);
            rh = Math.ceil(rh / REDUCE_BLOCK);
            const tex = createGLTexture(gl, gl.R32UI, rw, rh);
            reduction.push({ tex, fbo: createGLFramebuffer(gl, tex), w: rw, h: rh });
        } while (rw > 1 || rh > 1);

        return { textures, framebuffers, reduction };
    }

    destroyStorage(s) {
        const gl = this.gl;
        s.framebuffers.forEach(f => gl.deleteFramebuffer(f));
        s.textures.forEach(t => gl.deleteTexture(t));
        for (const level of s.reduction) {
            gl.deleteFramebuffer(level.fbo);
            gl.deleteTexture(level.tex);
        }
    }

    bindTexture(unit, tex) {
        const gl = this.gl;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
    }

    uploadR8UI(tex, x, y, w, h, data) {
        const gl = this.gl;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, w, h, gl.RED_INTEGER, gl.UNSIGNED_BYTE, data);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    clampSize(v) {
        v = Math.floor(Number(v));
        if (!Number.isFinite(v)) v = 1;
        return Math.max(1, Math.min(this.maxSize, v));
    }

    // ---------------- Public API ----------------

    step() {
        generation++;
        const gl = this.gl;
        this.ensureSimProgram();
        this.ensureRuleLUT();

        const next = 1 - this.current;
        resetGLState(gl);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.storage.framebuffers[next]);
        gl.viewport(0, 0, this.width, this.height);

        const prog = this.simProgram.use();
        this.bindTexture(0, this.stateTexture);
        this.bindTexture(1, this.ruleLUT);
        gl.uniform1i(prog.loc('u_state'), 0);
        gl.uniform1i(prog.loc('u_rules'), 1);
        gl.uniform2i(prog.loc('u_size'), this.width, this.height);
        gl.uniform1ui(prog.loc('u_phases'), gameRules.cellPhases);
        drawFullscreenTriangle(gl, this.vao);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.activeTexture(gl.TEXTURE0);
        this.current = next;
        this.invalidatePopulation(false);
    }

    randomizeCells() {
        const gl = this.gl;
        resetGLState(gl);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.storage.framebuffers[this.current]);
        gl.viewport(0, 0, this.width, this.height);
        const prog = this.randomProgram.use();
        gl.uniform1ui(prog.loc('u_seed'), (Math.random() * 4294967296) >>> 0);
        gl.uniform1ui(prog.loc('u_phases'), gameRules.cellPhases);
        drawFullscreenTriangle(gl, this.vao);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.invalidatePopulation(true);
    }

    clear() {
        const gl = this.gl;
        resetGLState(gl);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.storage.framebuffers[this.current]);
        gl.clearBufferuiv(gl.COLOR, 0, new Uint32Array(4));
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.population = 0;
        this.invalidatePopulation(true);
    }

    getPopulation() {
        return this.population;
    }

    resize(newWidth, newHeight) {
        const gl = this.gl;
        newWidth = this.clampSize(newWidth);
        newHeight = this.clampSize(newHeight);

        const old = this.storage;
        const oldTex = this.stateTexture;
        const oldW = this.width, oldH = this.height;

        this.width = newWidth;
        this.height = newHeight;
        this.storage = this.createStorage(newWidth, newHeight);
        this.current = 0;

        // Copy the overlapping top-left region, like the original loop did.
        resetGLState(gl);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.storage.framebuffers[0]);
        gl.viewport(0, 0, newWidth, newHeight);
        const prog = this.copyProgram.use();
        this.bindTexture(0, oldTex);
        gl.uniform1i(prog.loc('u_src'), 0);
        gl.uniform2i(prog.loc('u_srcSize'), oldW, oldH);
        drawFullscreenTriangle(gl, this.vao);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        this.destroyStorage(old);
        this.updateNeighborhood();
        this.invalidatePopulation(true);
    }

    // Replaces the whole grid with row-major cell data (used when loading saved states).
    loadCells(width, height, data) {
        const w = this.clampSize(width);
        const h = this.clampSize(height);

        this.destroyStorage(this.storage);
        this.width = w;
        this.height = h;
        this.storage = this.createStorage(w, h);
        this.current = 0;

        let upload = data;
        if (w !== width || h !== height) {
            upload = new Uint8Array(w * h);
            for (let y = 0; y < h; y++) {
                upload.set(data.subarray(y * width, y * width + w), y * w);
            }
        }
        this.uploadR8UI(this.storage.textures[0], 0, 0, w, h, upload);

        this.updateNeighborhood();
        this.invalidatePopulation(true);
    }

    setType(newType) {
        this.type = newType;
        this.updateNeighborhood();
    }

    setCell(x, y, value) {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
        this.scratchCell[0] = value;
        this.uploadR8UI(this.stateTexture, x, y, 1, 1, this.scratchCell);
        this.invalidatePopulation(false);
    }

    // Synchronous readback of the whole grid as a row-major Uint8Array (only used for saving).
    readCells() {
        const gl = this.gl;
        const w = this.width, h = this.height;
        const packedW = Math.ceil(w / 4);

        const tex = createGLTexture(gl, gl.RGBA8, packedW, h);
        const fbo = createGLFramebuffer(gl, tex);

        resetGLState(gl);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(0, 0, packedW, h);
        const prog = this.packProgram.use();
        this.bindTexture(0, this.stateTexture);
        gl.uniform1i(prog.loc('u_src'), 0);
        gl.uniform2i(prog.loc('u_srcSize'), w, h);
        drawFullscreenTriangle(gl, this.vao);

        const raw = new Uint8Array(packedW * 4 * h);
        gl.pixelStorei(gl.PACK_ALIGNMENT, 4);
        gl.readPixels(0, 0, packedW, h, gl.RGBA, gl.UNSIGNED_BYTE, raw);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.deleteFramebuffer(fbo);
        gl.deleteTexture(tex);

        if (packedW * 4 === w) return raw;
        const out = new Uint8Array(w * h);
        const stride = packedW * 4;
        for (let y = 0; y < h; y++) {
            out.set(raw.subarray(y * stride, y * stride + w), y * w);
        }
        return out;
    }

    // ---------------- Population (GPU reduction + async readback) ----------------

    invalidatePopulation(discardPending) {
        if (discardPending) this.populationEpoch++;
        this.populationDirty = true;
    }

        requestPopulation() {
        const gl = this.gl;
        if (this.populationQueries.length >= MAX_POPULATION_QUERIES) return; // stays dirty, retried next frame
        this.populationDirty = false;

        resetGLState(gl);
        const prog = this.reduceProgram.use();
        gl.uniform1i(prog.loc('u_src'), 0);

        let src = this.stateTexture, srcW = this.width, srcH = this.height, countNonZero = true;
        for (const level of this.storage.reduction) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, level.fbo);
            gl.viewport(0, 0, level.w, level.h);
            this.bindTexture(0, src);
            gl.uniform2i(prog.loc('u_srcSize'), srcW, srcH);
            gl.uniform1i(prog.loc('u_countNonZero'), countNonZero ? 1 : 0);
            drawFullscreenTriangle(gl, this.vao);
            src = level.tex;
            srcW = level.w;
            srcH = level.h;
            countNonZero = false;
        }

        let pbo = this.populationPBOPool.pop();
        if (!pbo) {
            pbo = gl.createBuffer();
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
            gl.bufferData(gl.PIXEL_PACK_BUFFER, 16, gl.STREAM_READ);
        } else {
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
        }
        // Last level (1x1) is still bound: copy it into the PBO without stalling
        gl.readPixels(0, 0, 1, 1, gl.RGBA_INTEGER, gl.UNSIGNED_INT, 0);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        this.populationQueries.push({
            pbo,
            sync: gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0),
            epoch: this.populationEpoch,
            generation: generation
        });
        gl.flush();
    }

    // Call once per frame. Returns an array of { generation, population } samples that arrived.
    pollPopulation() {
        const gl = this.gl;
        const samples = [];

        while (this.populationQueries.length > 0) {
            const q = this.populationQueries[0];
            if (gl.getSyncParameter(q.sync, gl.SYNC_STATUS) !== gl.SIGNALED) break;
            this.populationQueries.shift();
            gl.deleteSync(q.sync);

            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, q.pbo);
            gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, this.populationReadback);
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
            this.populationPBOPool.push(q.pbo);

            // Ignore results from before a bulk change (clear / randomize / resize / load)
            if (q.epoch === this.populationEpoch) {
                this.population = this.populationReadback[0];
                samples.push({ generation: q.generation, population: this.population });
            }
        }

        if (this.populationDirty) this.requestPopulation();
        return samples;
    }
}