class GridRenderer {
    constructor() {
        this.gl = null;
        this.program = null;
        this.hexProgram = null;
        this.triProgram = null;
        this.triUpProgram = null;
        this.triDownProgram = null;
        this.hexBuffer = null;
        this.triUpBuffer = null;
        this.triDownBuffer = null;
        this.instanceBuffer = null;
        this.colorBuffer = null;
        this.cellSize = 12;
        this.maxInstances = 250000;
        this.instanceData = new Float32Array(this.maxInstances * 2);
        this.colorData = new Float32Array(this.maxInstances * 3);
        this.hexVertices = this.precomputeHexVertices();
        this.triVertices = this.precomputeTriVertices();
        this.init();
    }

    init() {
        const canvas = document.querySelector('canvas');
        this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

        if (!this.gl) {
            console.error('WebGL not supported');
            return;
        }

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.createShaders();
        this.createBuffers();
    }

    createShaders() {
        const vertexShaderSource = `
        attribute vec2 a_position;
        attribute vec2 a_instancePosition;
        attribute vec3 a_color;
        attribute float a_orientation;
        
        uniform mat3 u_transform;
        uniform float u_scale;
        
        varying vec3 v_color;
        
        void main() {
            vec2 pos = a_position;
            if (a_orientation > 0.5) {
                pos.y = -pos.y;
            }
            vec2 scaledPos = pos * u_scale;
            vec2 worldPos = scaledPos + a_instancePosition;
            vec3 transformed = u_transform * vec3(worldPos, 1.0);
            gl_Position = vec4(transformed.xy, 0.0, 1.0);
            v_color = a_color;
        }
    `;

        const fragmentShaderSource = `
        precision mediump float;
        varying vec3 v_color;
        
        void main() {
            gl_FragColor = vec4(v_color, 1.0);
        }
    `;

        this.hexProgram = this.createProgram(vertexShaderSource, fragmentShaderSource);
        this.triProgram = this.createProgram(vertexShaderSource, fragmentShaderSource);
    }


    createProgram(vertexSource, fragmentSource) {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);

        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Program link error:', this.gl.getProgramInfoLog(program));
        }

        return program;
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    precomputeHexVertices() {
        const vertices = [];
        for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI / 3;
            vertices.push(Math.cos(angle), Math.sin(angle));
        }
        return new Float32Array(vertices);
    }

    precomputeTriVertices() {
        const height = 0.433;
        return new Float32Array([
            0, -height,      // top
            -0.5, height,    // bottom left
            0.5, height      // bottom right
        ]);
    }

    createBuffers() {
        // Hexagon vertices
        this.hexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.hexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.hexVertices, this.gl.STATIC_DRAW);

        // Triangle vertices (use up triangle, shader will flip for down)
        this.triBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.triBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.triVertices, this.gl.STATIC_DRAW);

        // Instance positions
        this.instanceBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.instanceData, this.gl.DYNAMIC_DRAW);

        // Instance colors
        this.colorBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.colorData, this.gl.DYNAMIC_DRAW);

        // Orientation buffer
        this.orientationBuffer = this.gl.createBuffer();
        this.orientationData = new Float32Array(this.maxInstances);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.orientationBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.orientationData, this.gl.DYNAMIC_DRAW);
    }

    render() {
        if (!this.gl) return;

        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clearColor(deadColor[0] / 255, deadColor[1] / 255, deadColor[2] / 255, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        if (gridSystem.type === 'hex') {
            this.renderHexGrid(gridSystem.getLiveCells());
        } else if (gridSystem.type === 'tri') {
            this.renderTriangleGrid(gridSystem.getLiveCells());
        }
        this.renderGridOutline();
    }

    renderHexGrid(cellsToDraw) {
        if (cellsToDraw.length === 0) return;

        this.gl.flush();
        this.gl.finish();

        const program = this.hexProgram;
        this.gl.useProgram(program);

        const hexRadius = this.cellSize * 0.5;
        const hexWidth = hexRadius * 2;
        const hexHeight = hexRadius * Math.sqrt(3);
        const startX = -gridSystem.width * hexWidth * 0.75 / 2;
        const startY = -gridSystem.height * hexHeight / 2;

        let instanceCount = 0;

        for (const { x, y } of cellsToDraw) {
            if (instanceCount >= this.maxInstances) break;

            const hexX = startX + x * hexWidth * 0.75;
            const hexY = startY + y * hexHeight + (x % 2) * hexHeight * 0.5;

            this.instanceData[instanceCount * 2] = hexX;
            this.instanceData[instanceCount * 2 + 1] = hexY;

            const cellValue = gridSystem.getCell(x, y);
            const color = this.getCellColor(cellValue);

            this.colorData[instanceCount * 3] = color[0] / 255;
            this.colorData[instanceCount * 3 + 1] = color[1] / 255;
            this.colorData[instanceCount * 3 + 2] = color[2] / 255;

            instanceCount++;
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.instanceData.subarray(0, instanceCount * 2));

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.colorData.subarray(0, instanceCount * 3));

        // Set uniforms
        const transformLoc = this.gl.getUniformLocation(program, 'u_transform');
        const scaleLoc = this.gl.getUniformLocation(program, 'u_scale');

        const transform = this.getTransformMatrix();
        this.gl.uniformMatrix3fv(transformLoc, false, transform);
        this.gl.uniform1f(scaleLoc, hexRadius * 1.02);

        // Bind vertex positions
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.hexBuffer);
        const positionLoc = this.gl.getAttribLocation(program, 'a_position');
        this.gl.enableVertexAttribArray(positionLoc);
        this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);

        // Bind instance positions
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
        const instancePosLoc = this.gl.getAttribLocation(program, 'a_instancePosition');
        this.gl.enableVertexAttribArray(instancePosLoc);
        this.gl.vertexAttribPointer(instancePosLoc, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.vertexAttribDivisor(instancePosLoc, 1);

        // Bind colors
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
        const colorLoc = this.gl.getAttribLocation(program, 'a_color');
        this.gl.enableVertexAttribArray(colorLoc);
        this.gl.vertexAttribPointer(colorLoc, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.vertexAttribDivisor(colorLoc, 1);

        this.gl.drawArraysInstanced(this.gl.TRIANGLE_FAN, 0, 6, instanceCount);
    }

    renderTriangleGrid(cellsToDraw) {
        if (cellsToDraw.length === 0) return;

        const triHeight = this.cellSize * 0.866;
        const triWidth = this.cellSize;
        const rowHeight = triHeight;
        const startX = -gridSystem.width * triWidth * 0.5 / 2;
        const startY = -gridSystem.height * rowHeight / 2;

        let instanceCount = 0;

        for (const { x, y } of cellsToDraw) {
            if (instanceCount >= this.maxInstances) break;

            let triX = startX + x * triWidth * 0.5;
            let triY = startY + y * rowHeight;

            if (y % 2 === 1) {
                triX += triWidth * 0.5;
            }

            const cellValue = gridSystem.getCell(x, y);
            const color = this.getCellColor(cellValue);

            this.instanceData[instanceCount * 2] = triX;
            this.instanceData[instanceCount * 2 + 1] = triY;

            this.colorData[instanceCount * 3] = color[0] / 255;
            this.colorData[instanceCount * 3 + 1] = color[1] / 255;
            this.colorData[instanceCount * 3 + 2] = color[2] / 255;

            // 0.0 for up triangles, 1.0 for down triangles
            this.orientationData[instanceCount] = (x % 2 === 0) ? 0.0 : 1.0;

            instanceCount++;
        }

        const program = this.triProgram;
        this.gl.useProgram(program);

        // Update buffers
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.instanceData.subarray(0, instanceCount * 2));

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.colorData.subarray(0, instanceCount * 3));

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.orientationBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.orientationData.subarray(0, instanceCount));

        // Set uniforms
        const transformLoc = this.gl.getUniformLocation(program, 'u_transform');
        const scaleLoc = this.gl.getUniformLocation(program, 'u_scale');

        const transform = this.getTransformMatrix();
        this.gl.uniformMatrix3fv(transformLoc, false, transform);
        this.gl.uniform1f(scaleLoc, this.cellSize);

        // Bind vertex positions
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.triBuffer);
        const positionLoc = this.gl.getAttribLocation(program, 'a_position');
        this.gl.enableVertexAttribArray(positionLoc);
        this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);

        // Bind instance positions
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
        const instancePosLoc = this.gl.getAttribLocation(program, 'a_instancePosition');
        this.gl.enableVertexAttribArray(instancePosLoc);
        this.gl.vertexAttribPointer(instancePosLoc, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.vertexAttribDivisor(instancePosLoc, 1);

        // Bind colors
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
        const colorLoc = this.gl.getAttribLocation(program, 'a_color');
        this.gl.enableVertexAttribArray(colorLoc);
        this.gl.vertexAttribPointer(colorLoc, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.vertexAttribDivisor(colorLoc, 1);

        // Bind orientation
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.orientationBuffer);
        const orientationLoc = this.gl.getAttribLocation(program, 'a_orientation');
        this.gl.enableVertexAttribArray(orientationLoc);
        this.gl.vertexAttribPointer(orientationLoc, 1, this.gl.FLOAT, false, 0, 0);
        this.gl.vertexAttribDivisor(orientationLoc, 1);

        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 3, instanceCount);
    }

    renderGridOutline() {
        if (!ui.showOutline) return;

        const program = this.hexProgram;
        this.gl.useProgram(program);

        // Calculate grid bounds to match actual cell positioning
        let bounds;
        if (gridSystem.type === 'hex') {
            const hexRadius = this.cellSize * 0.5;
            const hexWidth = hexRadius * 2;
            const hexHeight = hexRadius * Math.sqrt(3);

            // Use the same startX/startY logic as renderHexGrid
            const startX = -gridSystem.width * hexWidth * 0.75 / 2;
            const startY = -gridSystem.height * hexHeight / 2;

            bounds = {
                left: startX - hexRadius,
                right: startX + (gridSystem.width - 1) * hexWidth * 0.75 + hexRadius,
                top: startY - hexHeight / 2,
                bottom: startY + gridSystem.height * hexHeight
            };
        } else { // triangle
            const triHeight = this.cellSize * 0.866;
            const triWidth = this.cellSize;
            const rowHeight = triHeight;

            // Use the same startX/startY logic as renderTriangleGrid
            const startX = -gridSystem.width * triWidth * 0.5 / 2;
            const startY = -gridSystem.height * rowHeight / 2;

            bounds = {
                left: startX - triWidth / 2,
                right: startX + gridSystem.width * triWidth * 0.5 + triWidth / 2,
                top: startY - triHeight / 2,
                bottom: startY + gridSystem.height * rowHeight - triHeight / 2
            };
        }

        // Create outline vertices (rectangle)
        const outlineVertices = new Float32Array([
            bounds.left, bounds.top,     // top-left
            bounds.right, bounds.top,    // top-right
            bounds.right, bounds.bottom, // bottom-right
            bounds.left, bounds.bottom   // bottom-left
        ]);

        // Create buffer for outline
        if (!this.outlineBuffer) {
            this.outlineBuffer = this.gl.createBuffer();
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.outlineBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, outlineVertices, this.gl.STATIC_DRAW);

        // Set uniforms
        const transformLoc = this.gl.getUniformLocation(program, 'u_transform');
        const scaleLoc = this.gl.getUniformLocation(program, 'u_scale');

        const transform = this.getTransformMatrix();
        this.gl.uniformMatrix3fv(transformLoc, false, transform);
        this.gl.uniform1f(scaleLoc, 1.0);

        // Bind vertices
        const positionLoc = this.gl.getAttribLocation(program, 'a_position');
        this.gl.enableVertexAttribArray(positionLoc);
        this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);

        // Set color to outline color
        const instancePosLoc = this.gl.getAttribLocation(program, 'a_instancePosition');
        const colorLoc = this.gl.getAttribLocation(program, 'a_color');

        // Disable instancing for the outline
        this.gl.disableVertexAttribArray(instancePosLoc);
        this.gl.disableVertexAttribArray(colorLoc);
        this.gl.vertexAttrib2f(instancePosLoc, 0, 0);

        // Draw outline as line loop
        this.gl.drawArrays(this.gl.LINE_LOOP, 0, 4);
    }

    getCellColor(cellValue) {
        if (cellValue === 0) {
            return deadColor;
        } else {
            if (gameRules.cellPhases === 1) {
                return aliveColor;
            } else {
                const t = (cellValue / gameRules.cellPhases);
                return [
                    deadColor[0] + (aliveColor[0] - deadColor[0]) * t,
                    deadColor[1] + (aliveColor[1] - deadColor[1]) * t,
                    deadColor[2] + (aliveColor[2] - deadColor[2]) * t
                ];
            }
        }
    }

    getTransformMatrix() {
        const zoom = camera.zoom;
        const tx = -camera.x * zoom;
        const ty = camera.y * zoom;
        const scaleX = zoom * 2 / width;
        const scaleY = -zoom * 2 / height;

        return new Float32Array([
            scaleX, 0, 0,
            0, scaleY, 0,
            tx * 2 / width, ty * 2 / height, 1
        ]);
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

        const gridX = col;
        const gridY = row;

        if (gridX >= 0 && gridX < gridSystem.width && gridY >= 0 && gridY < gridSystem.height) {
            return { x: gridX, y: gridY };
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
        if (this.gl) {
            this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        }
    }
}