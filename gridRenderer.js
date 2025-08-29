class GridRenderer {
    constructor() {
        this.hexVertices = this.precomputeHexVertices();
        this.cellSize = 12;
    }

    precomputeHexVertices() {
        let vertices = [];
        for (let i = 0; i < 6; i++) {
            let angle = i * PI / 3;
            vertices.push({
                x: cos(angle),
                y: sin(angle)
            });
        }
        return vertices;
    }

    render() {
        camera.apply();

        switch (gridSystem.type) {
            case 'hex':
                this.renderHexGrid(this.cellSize, needsFullRedraw ? gridSystem.getAllCells() : gridSystem.getChangedCells());
                break;
            case 'tri':
                this.renderTriangleGrid(this.cellSize, needsFullRedraw ? gridSystem.getAllCells() : gridSystem.getChangedCells());
                break;
        }

        needsFullRedraw = false;
        gridSystem.clearChangedCells();
        camera.unapply();
    }

    lerpColor(color1, color2, amount) {
        return [
            lerp(color1[0], color2[0], amount),
            lerp(color1[1], color2[1], amount),
            lerp(color1[2], color2[2], amount)
        ];
    }

    setCellColor(cellValue) {
        if (ui.showOutline) {
            stroke(outlineColor);
            strokeWeight(cellValue === 0 ? 0.5 : 0.3);
        } else {
            noStroke();
        }

        if (cellValue === 0) {
            // Dead cell
            fill(deadColor);
        } else {
            // Living cell - interpolate between dead and alive colors based on phase
            if (gameRules.cellPhases === 1) {
                fill(aliveColor);
            } else {
                let t = map(cellValue, 0, gameRules.cellPhases, 0, 1);
                let r = lerp(deadColor[0], aliveColor[0], t);
                let g = lerp(deadColor[1], aliveColor[1], t);
                let b = lerp(deadColor[2], aliveColor[2], t);
                fill(r, g, b);
            }
        }
    }

    allCells() {
        const arr = [];
        for (let y = 0; y < gridSystem.height; y++) {
            for (let x = 0; x < gridSystem.width; x++) {
                arr.push({ x, y });
            }
        }
        return arr;
    }

    renderHexGrid(cellSize, cellsToDraw) {
        let hexRadius = cellSize * 0.5;
        let hexWidth = cellSize;
        let hexHeight = hexRadius * sqrt(3);
        let startX = -gridSystem.width * hexWidth * 0.75 / 2;
        let startY = -gridSystem.height * hexHeight / 2;

        for (let { x, y } of cellsToDraw) {
            let hexX = startX + x * hexWidth * 0.75;
            let hexY = startY + y * hexHeight + (x % 2) * hexHeight * 0.5;

            let cellValue = gridSystem.getCell(x, y);
            this.setCellColor(cellValue);
            this.drawHexagon(hexX, hexY, hexRadius * 1.02);
        }
    }

    renderTriangleGrid(cellSize, cellsToDraw) {
        let triHeight = cellSize * 0.866;
        let triWidth = cellSize;
        let rowHeight = triHeight;

        let startX = -gridSystem.width * triWidth * 0.5 / 2;
        let startY = -gridSystem.height * rowHeight / 2;

        for (let { x, y } of cellsToDraw) {
            let triX = startX + x * triWidth * 0.5;
            let triY = startY + y * rowHeight;

            // Offset every other row
            if (y % 2 === 1) {
                triX += triWidth * 0.5;
            }

            let cellValue = gridSystem.getCell(x, y);
            this.setCellColor(cellValue);

            // Alternate triangle direction based on column
            let pointUp = x % 2 === 0;
            this.drawTriangle(triX, triY, triWidth, triHeight, pointUp);
        }
    }

    drawHexagon(centerX, centerY, radius) {
        beginShape();
        for (let i = 0; i < 6; i++) {
            let x = centerX + this.hexVertices[i].x * radius;
            let y = centerY + this.hexVertices[i].y * radius;
            vertex(x, y);
        }
        endShape(CLOSE);
    }

    drawTriangle(centerX, centerY, width, height, pointUp) {
        if (pointUp) {
            triangle(centerX, centerY - height * 0.5,
                centerX - width * 0.5, centerY + height * 0.5,
                centerX + width * 0.5, centerY + height * 0.5);
        } else {
            triangle(centerX, centerY + height * 0.5,
                centerX - width * 0.5, centerY - height * 0.5,
                centerX + width * 0.5, centerY - height * 0.5);
        }
    }

    screenToGrid(screenX, screenY) {
        let worldPos = camera.screenToWorld(screenX, screenY);

        switch (gridSystem.type) {
            case 'hex':
                return this.screenToHexGrid(worldPos, this.cellSize);
            case 'tri':
                return this.screenToTriangleGrid(worldPos, this.cellSize);
        }
        return null;
    }

    screenToHexGrid(worldPos, cellSize) {
        let hexRadius = cellSize * 0.5;
        let hexWidth = hexRadius * 2;
        let hexHeight = hexRadius * Math.sqrt(3);

        let startX = -gridSystem.width * hexWidth * 0.75 / 2;
        let startY = -gridSystem.height * hexHeight / 2;

        // Convert to axial coordinates first
        let q = (worldPos.x - startX) * (2 / 3) / hexRadius;
        let r = (-worldPos.x + startX) / (3 * hexRadius) + (worldPos.y - startY) * Math.sqrt(3) / (3 * hexRadius);

        // Convert axial to cube coordinates
        let cubeX = q;
        let cubeZ = r;
        let cubeY = -cubeX - cubeZ;

        // Round cube coordinates
        let roundX = Math.round(cubeX);
        let roundY = Math.round(cubeY);
        let roundZ = Math.round(cubeZ);

        // Handle rounding errors by adjusting the coordinate with largest error
        let xDiff = Math.abs(roundX - cubeX);
        let yDiff = Math.abs(roundY - cubeY);
        let zDiff = Math.abs(roundZ - cubeZ);

        if (xDiff > yDiff && xDiff > zDiff) {
            roundX = -roundY - roundZ;
        } else if (yDiff > zDiff) {
            roundY = -roundX - roundZ;
        } else {
            roundZ = -roundX - roundY;
        }

        // Convert back to offset coordinates
        let col = roundX;
        let row = roundZ + (roundX - (roundX & 1)) / 2;

        // Adjust for your grid's coordinate system
        let gridX = col;
        let gridY = row;

        if (gridX >= 0 && gridX < gridSystem.width && gridY >= 0 && gridY < gridSystem.height) {
            return { x: gridX, y: gridY };
        }
        return null;
    }

    screenToTriangleGrid(worldPos, cellSize) {
        // Check collision, account for flipped triangles by row, no offset
        let triHeight = cellSize * 0.866;
        let triWidth = cellSize;
        let rowHeight = triHeight;
        let startX = -gridSystem.width * triWidth * 0.5 / 2;
        let startY = -gridSystem.height * rowHeight / 2;
        let approxX = Math.round((worldPos.x - startX) / (triWidth * 0.5));
        let approxY = Math.round((worldPos.y - startY) / rowHeight);
        if (approxX >= 0 && approxX < gridSystem.width && approxY >= 0 && approxY < gridSystem.height) {
            // Adjust for row offset
            if (approxY % 2 === 1) {
                approxX = Math.floor(approxX - 0.5);
            }
            return { x: approxX, y: approxY };
        }
        return null;
    }
}