// Fullscreen pass: each screen pixel finds the hex/triangle it lies in and reads that cell's state.
// Cost depends on screen resolution only, not on grid size or population.
const RENDER_FS = `#version 300 es
precision highp float;
precision highp int;
precision highp usampler2D;

uniform usampler2D u_state;
uniform ivec2 u_gridSize;
uniform int u_gridType;        // 0 = hex, 1 = tri
uniform float u_cellSize;
uniform vec2 u_start;          // world position of cell (0,0)
uniform vec2 u_camera;         // camera.x, camera.y
uniform vec2 u_pixelScale;     // device pixels per world unit (zoom * pixelDensity)
uniform vec2 u_bufferCenter;   // drawing-buffer centre in device pixels
uniform vec3 u_aliveColor;
uniform vec3 u_deadColor;
uniform int u_phases;
uniform bool u_showOutline;
uniform vec4 u_outline;        // left, bottom, right, top in (floored) device pixels

out vec4 outColor;

float jsRound(float x) { return floor(x + 0.5); } // matches Math.round

// Same cube-rounding as screenToHexGrid (flat-top hexes, odd columns shifted down)
ivec2 hexCell(vec2 rel) {
    float R = u_cellSize * 0.5;
    float q = rel.x * (2.0 / 3.0) / R;
    float r = -rel.x / (3.0 * R) + rel.y * sqrt(3.0) / (3.0 * R);
    vec3 cube = vec3(q, -q - r, r);
    vec3 rc = vec3(jsRound(cube.x), jsRound(cube.y), jsRound(cube.z));
    vec3 d = abs(rc - cube);
    if (d.x > d.y && d.x > d.z) rc.x = -rc.y - rc.z;
    else if (d.y > d.z)         rc.y = -rc.x - rc.z;
    else                        rc.z = -rc.x - rc.y;
    int col = int(rc.x);
    int row = int(rc.z) + (col - (col & 1)) / 2;
    return ivec2(col, row);
}

// Exact point-in-triangle for the layout used by the original renderer:
// centre = (startX + x*w/2 (+w/2 on odd rows), startY + y*h), even x = point up.
ivec2 triCell(vec2 rel) {
    float h = u_cellSize * 0.866;
    float halfW = u_cellSize * 0.5;
    float fy = rel.y / h + 0.5;
    float rowF = floor(fy);
    int row = int(rowF);
    float v = fy - rowF - 0.5;                      // -0.5 = top of row, +0.5 = bottom
    float u = rel.x / halfW - float(row & 1);       // triangle x index coordinate
    float k = floor(u);
    float t = u - k;
    int ki = int(k);
    bool kUp = (ki & 1) == 0;
    int col = (t <= (kUp ? v + 0.5 : 0.5 - v)) ? ki : ki + 1;
    return ivec2(col, row);
}

void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 world = u_camera + vec2(
        (frag.x - u_bufferCenter.x) / u_pixelScale.x,
        (u_bufferCenter.y - frag.y) / u_pixelScale.y);
    vec2 rel = world - u_start;
    ivec2 cell = (u_gridType == 0) ? hexCell(rel) : triCell(rel);

    vec3 color = u_deadColor;
    if (all(greaterThanEqual(cell, ivec2(0))) && all(lessThan(cell, u_gridSize))) {
        uint v = texelFetch(u_state, cell, 0).r;
        if (v > 0u) {
            if (u_phases == 1) color = u_aliveColor;
            else color = u_deadColor + (u_aliveColor - u_deadColor) * (float(v) / float(u_phases));
        }
    }

    if (u_showOutline) {
        vec2 px = floor(frag);
        bool onV = (px.x == u_outline.x || px.x == u_outline.z) && px.y >= u_outline.y && px.y <= u_outline.w;
        bool onH = (px.y == u_outline.y || px.y == u_outline.w) && px.x >= u_outline.x && px.x <= u_outline.z;
        if (onV || onH) color = vec3(0.0);
    }

    outColor = vec4(color, 1.0);
}`;

class GridRenderer {
    constructor(gl) {
        this.gl = gl;
        this.cellSize = 12;
        this.vao = gl.createVertexArray();
        this.program = new ShaderProgram(gl, FULLSCREEN_VS, RENDER_FS);
    }

    // Same startX/startY/bounds math as the original renderer and outline code.
    getGridLayout() {
        const W = gridSystem.width, H = gridSystem.height;
        if (gridSystem.type === 'hex') {
            const hexRadius = this.cellSize * 0.5;
            const hexWidth = hexRadius * 2;
            const hexHeight = hexRadius * Math.sqrt(3);
            const startX = -W * hexWidth * 0.75 / 2;
            const startY = -H * hexHeight / 2;
            return {
                startX, startY,
                bounds: {
                    left: startX - hexRadius,
                    right: startX + (W - 1) * hexWidth * 0.75 + hexRadius,
                    top: startY - hexHeight / 2,
                    bottom: startY + H * hexHeight
                }
            };
        }
        const triHeight = this.cellSize * 0.866;
        const triWidth = this.cellSize;
        const startX = -W * triWidth * 0.5 / 2;
        const startY = -H * triHeight * 0.5;
        return {
            startX, startY,
            bounds: {
                left: startX - triWidth * 0.5,
                right: startX + W * triWidth * 0.5 + triWidth * 0.5,
                top: startY - triHeight * 0.5,
                bottom: startY + H * triHeight - triHeight * 0.5
            }
        };
    }

    // One render of the grid into `fbo` (null = the canvas) with an arbitrary virtual camera.
    // Used both for the live view and for offscreen thumbnails.
    drawPass({ fbo = null, bufW, bufH, camX, camY, sx, sy, showOutline, layout }) {
        const gl = this.gl;
        const b = layout.bounds;

        resetGLState(gl);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(0, 0, bufW, bufH);

        const p = this.program.use();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, gridSystem.stateTexture);
        gl.uniform1i(p.loc('u_state'), 0);
        gl.uniform2i(p.loc('u_gridSize'), gridSystem.width, gridSystem.height);
        gl.uniform1i(p.loc('u_gridType'), gridSystem.type === 'hex' ? 0 : 1);
        gl.uniform1f(p.loc('u_cellSize'), this.cellSize);
        gl.uniform2f(p.loc('u_start'), layout.startX, layout.startY);
        gl.uniform2f(p.loc('u_camera'), camX, camY);
        gl.uniform2f(p.loc('u_pixelScale'), sx, sy);
        gl.uniform2f(p.loc('u_bufferCenter'), bufW / 2, bufH / 2);
        gl.uniform3f(p.loc('u_aliveColor'), aliveColor[0] / 255, aliveColor[1] / 255, aliveColor[2] / 255);
        gl.uniform3f(p.loc('u_deadColor'), deadColor[0] / 255, deadColor[1] / 255, deadColor[2] / 255);
        gl.uniform1i(p.loc('u_phases'), gameRules.cellPhases);
        gl.uniform1i(p.loc('u_showOutline'), showOutline ? 1 : 0);

        // Outline rectangle in device pixels (y up), like the old 1px LINE_LOOP
        const toDevX = wx => bufW / 2 + (wx - camX) * sx;
        const toDevY = wy => bufH / 2 - (wy - camY) * sy;
        gl.uniform4f(p.loc('u_outline'),
            Math.floor(toDevX(b.left)), Math.floor(toDevY(b.bottom)),
            Math.floor(toDevX(b.right)), Math.floor(toDevY(b.top)));

        drawFullscreenTriangle(gl, this.vao);
        if (fbo) gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    render() {
        if (!this.gl) return;
        const gl = this.gl;
        const layout = this.getGridLayout();
        const b = layout.bounds;

        // Allow zooming out far enough to see large grids (never stricter than the original 0.1).
        const fit = Math.min(width / (b.right - b.left), height / (b.bottom - b.top));
        camera.minZoom = Math.min(0.1, fit * 0.5);

        const bufW = gl.drawingBufferWidth, bufH = gl.drawingBufferHeight;

        this.drawPass({
            fbo: null,
            bufW, bufH,
            camX: camera.x, camY: camera.y,
            sx: camera.zoom * bufW / width,
            sy: camera.zoom * bufH / height,
            showOutline: !!(typeof ui !== 'undefined' && ui && ui.showOutline),
            layout
        });
    }

    // Renders the ENTIRE grid (independent of camera/zoom/canvas size) into an offscreen
    // framebuffer and returns a 2D canvas with the result. Supersampled, then downscaled.
    captureThumbnail(maxDim = 480, supersample = 2) {
        const gl = this.gl;
        const layout = this.getGridLayout();
        const b = layout.bounds;

        const worldW = Math.max(1e-6, b.right - b.left);
        const worldH = Math.max(1e-6, b.bottom - b.top);
        const aspect = worldW / worldH;

        let outW, outH;
        if (aspect >= 1) { outW = maxDim; outH = Math.max(1, Math.round(maxDim / aspect)); }
        else { outH = maxDim; outW = Math.max(1, Math.round(maxDim * aspect)); }

        const maxTex = gridSystem.maxSize || 2048;
        const ss = Math.max(1, Math.min(supersample, Math.floor(maxTex / Math.max(outW, outH)) || 1));
        const bufW = outW * ss, bufH = outH * ss;

        // Fit the whole grid inside the buffer, leaving room for the 1px outline.
        const pad = 2 * ss;
        const scale = Math.min((bufW - 2 * pad) / worldW, (bufH - 2 * pad) / worldH);

        const tex = createGLTexture(gl, gl.RGBA8, bufW, bufH);
        const fbo = createGLFramebuffer(gl, tex);

        this.drawPass({
            fbo, bufW, bufH,
            camX: (b.left + b.right) / 2,
            camY: (b.top + b.bottom) / 2,
            sx: scale, sy: scale,
            showOutline: true,
            layout
        });

        const pixels = new Uint8Array(bufW * bufH * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.pixelStorei(gl.PACK_ALIGNMENT, 4);
        gl.readPixels(0, 0, bufW, bufH, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.deleteFramebuffer(fbo);
        gl.deleteTexture(tex);

        // GL rows come back bottom-up; flip while copying into the 2D canvas.
        const full = document.createElement('canvas');
        full.width = bufW;
        full.height = bufH;
        const fctx = full.getContext('2d');
        const img = fctx.createImageData(bufW, bufH);
        const stride = bufW * 4;
        for (let y = 0; y < bufH; y++) {
            img.data.set(pixels.subarray((bufH - 1 - y) * stride, (bufH - y) * stride), y * stride);
        }
        fctx.putImageData(img, 0, 0);

        needsRender = true; // the live canvas still holds the previous frame

        if (ss === 1) return full;

        const out = document.createElement('canvas');
        out.width = outW;
        out.height = outH;
        const octx = out.getContext('2d');
        octx.imageSmoothingEnabled = true;
        octx.imageSmoothingQuality = 'high';
        octx.drawImage(full, 0, 0, outW, outH);
        return out;
    }


    screenToGrid(screenX, screenY) {
        const worldPos = camera.screenToWorld(screenX, screenY);

        switch (gridSystem.type) {
            case 'hex':
                return this.screenToHexGrid(worldPos, this.cellSize);
            case 'tri':
                return this.screenToTriangleGrid(worldPos, this.cellSize);
        }
        return null;
    }

    screenToHexGrid(worldPos, cellSize) {
        const hexRadius = cellSize * 0.5;
        const hexWidth = hexRadius * 2;
        const hexHeight = hexRadius * Math.sqrt(3);

        const startX = -gridSystem.width * hexWidth * 0.75 / 2;
        const startY = -gridSystem.height * hexHeight / 2;

        const q = (worldPos.x - startX) * (2 / 3) / hexRadius;
        const r = (-worldPos.x + startX) / (3 * hexRadius) + (worldPos.y - startY) * Math.sqrt(3) / (3 * hexRadius);

        const cubeX = q;
        const cubeZ = r;
        const cubeY = -cubeX - cubeZ;

        let roundX = Math.round(cubeX);
        let roundY = Math.round(cubeY);
        let roundZ = Math.round(cubeZ);

        const xDiff = Math.abs(roundX - cubeX);
        const yDiff = Math.abs(roundY - cubeY);
        const zDiff = Math.abs(roundZ - cubeZ);

        if (xDiff > yDiff && xDiff > zDiff) {
            roundX = -roundY - roundZ;
        } else if (yDiff > zDiff) {
            roundY = -roundX - roundZ;
        } else {
            roundZ = -roundX - roundY;
        }

        const col = roundX;
        const row = roundZ + (roundX - (roundX & 1)) / 2;

        if (col >= 0 && col < gridSystem.width && row >= 0 && row < gridSystem.height) {
            return { x: col, y: row };
        }
        return null;
    }

    screenToTriangleGrid(worldPos, cellSize) {
        const triHeight = cellSize * 0.866;
        const triWidth = cellSize;
        const rowHeight = triHeight;
        const startX = -gridSystem.width * triWidth * 0.5 / 2;
        const startY = -gridSystem.height * rowHeight / 2;

        let approxX = Math.round((worldPos.x - startX) / (triWidth * 0.5));
        const approxY = Math.round((worldPos.y - startY) / rowHeight);

        if (approxX >= 0 && approxX < gridSystem.width && approxY >= 0 && approxY < gridSystem.height) {
            if (approxY % 2 === 1) {
                approxX = Math.floor(approxX - 0.5);
            }
            return { x: approxX, y: approxY };
        }
        return null;
    }

    resize() {
        // Nothing to do: render() reads the drawing-buffer size every frame.
    }
}