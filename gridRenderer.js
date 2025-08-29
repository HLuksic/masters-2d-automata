class WebGLRenderer {
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
        this.triUpVertices = this.precomputeTriUpVertices();
        this.triDownVertices = this.precomputeTriDownVertices();
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
            
            uniform mat3 u_transform;
            uniform float u_scale;
            
            varying vec3 v_color;
            
            void main() {
                vec2 scaledPos = a_position * u_scale;
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
        this.triUpProgram = this.createProgram(vertexShaderSource, fragmentShaderSource);
        this.triDownProgram = this.createProgram(vertexShaderSource, fragmentShaderSource);
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

    precomputeTriUpVertices() {
        const height = 0.433;
        return new Float32Array([
            0, -height,      // top
            -0.5, height,    // bottom left
            0.5, height      // bottom right
        ]);
    }

    precomputeTriDownVertices() {
        const height = 0.433;
        return new Float32Array([
            0, height,       // bottom
            -0.5, -height,   // top left
            0.5, -height     // top right
        ]);
    }

    createBuffers() {
        // Hexagon vertices
        this.hexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.hexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.hexVertices, this.gl.STATIC_DRAW);

        // Triangle up vertices
        this.triUpBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.triUpBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.triUpVertices, this.gl.STATIC_DRAW);

        // Triangle down vertices
        this.triDownBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.triDownBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.triDownVertices, this.gl.STATIC_DRAW);

        // Instance positions
        this.instanceBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.instanceData, this.gl.DYNAMIC_DRAW);

        // Instance colors
        this.colorBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.colorData, this.gl.DYNAMIC_DRAW);
    }

    render() {
        if (!this.gl) return;

        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clearColor(150 / 255, 150 / 255, 150 / 255, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        const cellsToDraw = needsFullRedraw ? this.getAllCells() : this.getAllCells();

        switch (gridSystem.type) {
            case 'hex':
                this.renderHexGrid(cellsToDraw);
                break;
            case 'tri':
                this.renderTriangleGrid(cellsToDraw);
                break;
        }

        needsFullRedraw = false;
        gridSystem.changedCells = [];
    }

    getAllCells() {
        const arr = [];
        for (let y = 0; y < gridSystem.height; y++) {
            for (let x = 0; x < gridSystem.width; x++) {
                arr.push({ x, y });
            }
        }
        return arr;
    }

    renderHexGrid(cellsToDraw) {
        if (cellsToDraw.length === 0) return;

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

        // Separate up and down triangles
        const upTriangles = [];
        const downTriangles = [];

        for (const { x, y } of cellsToDraw) {
            let triX = startX + x * triWidth * 0.5;
            let triY = startY + y * rowHeight;

            // Offset every other row
            if (y % 2 === 1) {
                triX += triWidth * 0.5;
            }

            const cellValue = gridSystem.getCell(x, y);
            const color = this.getCellColor(cellValue);

            const triangleData = {
                x: triX,
                y: triY,
                color: color
            };

            // Alternate triangle direction based on column
            if (x % 2 === 0) {
                upTriangles.push(triangleData);
            } else {
                downTriangles.push(triangleData);
            }
        }

        // Render up triangles
        this.renderTriangleSet(upTriangles, this.triUpProgram, this.triUpBuffer);

        // Render down triangles
        this.renderTriangleSet(downTriangles, this.triDownProgram, this.triDownBuffer);
    }

    renderTriangleSet(triangles, program, vertexBuffer) {
        if (triangles.length === 0) return;

        this.gl.useProgram(program);

        // Prepare instance data
        let instanceCount = 0;
        for (const tri of triangles) {
            if (instanceCount >= this.maxInstances) break;

            this.instanceData[instanceCount * 2] = tri.x;
            this.instanceData[instanceCount * 2 + 1] = tri.y;

            this.colorData[instanceCount * 3] = tri.color[0] / 255;
            this.colorData[instanceCount * 3 + 1] = tri.color[1] / 255;
            this.colorData[instanceCount * 3 + 2] = tri.color[2] / 255;

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
        this.gl.uniform1f(scaleLoc, this.cellSize);

        // Bind vertex positions
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
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

        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 3, instanceCount);
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