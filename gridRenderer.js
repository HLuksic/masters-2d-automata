// Renderer for different grid types
class GridRenderer {
    constructor(gridSystem, camera) {
        this.grid = gridSystem;
        this.camera = camera;
    }

    render() {
        this.camera.apply();

        let cellSize = this.calculateCellSize();

        switch (this.grid.type) {
            case 'hex':
                this.renderHexGrid(cellSize);
                break;
            case 'triangle':
                this.renderTriangleGrid(cellSize);
                break;
        }

        this.camera.unapply();
    }

    calculateCellSize() {
        let baseSize = 12;
        return baseSize;
    }

    renderHexGrid(cellSize) {
        stroke(150);
        strokeWeight(0.5);

        let hexRadius = cellSize * 0.5;
        let hexWidth = hexRadius * 2;
        let hexHeight = hexRadius * sqrt(3);

        let startX = -this.grid.width * hexWidth * 0.75 / 2;
        let startY = -this.grid.height * hexHeight / 2;

        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                let hexX = startX + x * hexWidth * 0.75;
                let hexY = startY + y * hexHeight + (x % 2) * hexHeight * 0.5;

                let cellValue = this.grid.getCell(x, y);
                if (cellValue === 1) {
                    fill(0);
                } else {
                    fill(255);
                }

                this.drawHexagon(hexX, hexY, hexRadius);
            }
        }
    }

    renderTriangleGrid(cellSize) {
        stroke(150);
        strokeWeight(0.5);

        let triHeight = cellSize * 0.866; // sqrt(3)/2 for equilateral triangle
        let triWidth = cellSize;
        let rowHeight = triHeight;

        let startX = -this.grid.width * triWidth * 0.5 / 2;
        let startY = -this.grid.height * rowHeight / 2;

        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                let triX = startX + x * triWidth * 0.5;
                let triY = startY + y * rowHeight;

                // Offset every other row
                if (y % 2 === 1) {
                    triX += triWidth * 0.5;
                }

                let cellValue = this.grid.getCell(x, y);
                if (cellValue === 1) {
                    fill(0);
                } else {
                    fill(255);
                }

                // Alternate triangle direction based on column
                let pointUp = x % 2 === 0;
                this.drawTriangle(triX, triY, triWidth, triHeight, pointUp);
            }
        }
    }

    drawHexagon(centerX, centerY, radius) {
        beginShape();
        for (let i = 0; i < 6; i++) {
            let angle = i * PI / 3;
            let x = centerX + cos(angle) * radius;
            let y = centerY + sin(angle) * radius;
            vertex(x, y);
        }
        endShape(CLOSE);
    }

    drawTriangle(centerX, centerY, width, height, pointUp) {
        beginShape();
        if (pointUp) {
            vertex(centerX, centerY - height * 0.5);
            vertex(centerX - width * 0.5, centerY + height * 0.5);
            vertex(centerX + width * 0.5, centerY + height * 0.5);
        } else {
            vertex(centerX, centerY + height * 0.5);
            vertex(centerX - width * 0.5, centerY - height * 0.5);
            vertex(centerX + width * 0.5, centerY - height * 0.5);
        }
        endShape(CLOSE);
    }

    // Convert screen coordinates to grid coordinates
    screenToGrid(screenX, screenY) {
        let worldPos = this.camera.screenToWorld(screenX, screenY);
        let cellSize = this.calculateCellSize();

        switch (this.grid.type) {
            case 'hex':
                return this.screenToHexGrid(worldPos, cellSize);
            case 'triangle':
                return this.screenToTriangleGrid(worldPos, cellSize);
        }
        return null;
    }

    screenToHexGrid(worldPos, cellSize) {
        let hexRadius = cellSize * 0.5;
        let hexWidth = hexRadius * 2;
        let hexHeight = hexRadius * sqrt(3);

        let startX = -this.grid.width * hexWidth * 0.75 / 2;
        let startY = -this.grid.height * hexHeight / 2;

        let approxX = Math.floor((worldPos.x - startX) / (hexWidth * 0.75));
        let approxY = Math.floor((worldPos.y - startY) / hexHeight);

        if (approxX >= 0 && approxX < this.grid.width && approxY >= 0 && approxY < this.grid.height) {
            return { x: approxX, y: approxY };
        }
        return null;
    }

    screenToTriangleGrid(worldPos, cellSize) {
        let triHeight = cellSize * 0.866;
        let triWidth = cellSize;
        let rowHeight = triHeight;

        let startX = -this.grid.width * triWidth * 0.5 / 2;
        let startY = -this.grid.height * rowHeight / 2;

        let approxX = Math.round((worldPos.x - startX) / (triWidth * 0.5));
        let approxY = Math.round((worldPos.y - startY) / rowHeight);

        if (approxX >= 0 && approxX < this.grid.width && approxY >= 0 && approxY < this.grid.height) {
            return { x: approxX, y: approxY };
        }
        return null;
    }
}