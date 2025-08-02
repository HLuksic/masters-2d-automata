class GridRenderer {
    constructor() {
        this.hexVertices = this.precomputeHexVertices();
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
        let cellSize = this.calculateCellSize();

        switch (gridSystem.type) {
            case 'hex':
                this.renderHexGrid(cellSize);
                break;
            case 'tri':
                this.renderTriangleGrid(cellSize);
                break;
        }

        camera.unapply();
    }

    calculateCellSize() {
        let baseSize = 12;
        return baseSize;
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
            stroke(outlineColor[0], outlineColor[1], outlineColor[2]);
            strokeWeight(cellValue === 0 ? 0.5 : 0.3);
        } else {
            noStroke();
        }

        if (cellValue === 0) {
            // Dead cell
            fill(deadColor[0], deadColor[1], deadColor[2]);
        } else {
            // Living cell - interpolate between dead and alive colors based on phase
            if (gameRules.cellPhases === 1) {
                fill(aliveColor[0], aliveColor[1], aliveColor[2]);
            } else {
                let t = map(cellValue, 0, gameRules.cellPhases, 0, 1);
                let r = lerp(deadColor[0], aliveColor[0], t);
                let g = lerp(deadColor[1], aliveColor[1], t);
                let b = lerp(deadColor[2], aliveColor[2], t);
                fill(r, g, b);
            }
        }
    }

    renderHexGrid(cellSize) {
        stroke(150);
        strokeWeight(0.5);

        let hexRadius = cellSize * 0.5;
        let hexWidth = cellSize;
        let hexHeight = hexRadius * sqrt(3);

        let startX = -gridSystem.width * hexWidth * 0.75 / 2;
        let startY = -gridSystem.height * hexHeight / 2;

        for (let y = 0; y < gridSystem.height; y++) {
            for (let x = 0; x < gridSystem.width; x++) {
                let hexX = startX + x * hexWidth * 0.75;
                let hexY = startY + y * hexHeight + (x % 2) * hexHeight * 0.5;

                let cellValue = gridSystem.getCell(x, y);
                this.setCellColor(cellValue);
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

        let startX = -gridSystem.width * triWidth * 0.5 / 2;
        let startY = -gridSystem.height * rowHeight / 2;

        for (let y = 0; y < gridSystem.height; y++) {
            for (let x = 0; x < gridSystem.width; x++) {
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
    }

    drawHexagon(centerX, centerY, radius) {
        beginShape();
        for (let i = 0; i < 6; i++) {
            let x = centerX + this.hexVertices[i].x * radius * 100;
            let y = centerY + this.hexVertices[i].y * radius * 100;
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

    // Convert screen coordinates to gridSystem coordinates
    screenToGrid(screenX, screenY) {
        let worldPos = camera.screenToWorld(screenX, screenY);
        let cellSize = this.calculateCellSize();

        switch (gridSystem.type) {
            case 'hex':
                return this.screenToHexGrid(worldPos, cellSize);
            case 'tri':
                return this.screenToTriangleGrid(worldPos, cellSize);
        }
        return null;
    }

    screenToHexGrid(worldPos, cellSize) {
        let hexRadius = cellSize * 0.5;
        let hexWidth = hexRadius * 2;
        let hexHeight = hexRadius * sqrt(3);

        let startX = -gridSystem.width * hexWidth * 0.75 / 2;
        let startY = -gridSystem.height * hexHeight / 2;
        // Account for column offset
        let offsetY = (Math.floor((worldPos.x - startX) / (hexWidth * 0.75)) % 2) * (hexHeight * 0.5);
        let approxX = Math.round((worldPos.x - startX) / (hexWidth * 0.75));
        let approxY = Math.round((worldPos.y - startY - offsetY) / hexHeight);

        if (approxX >= 0 && approxX < gridSystem.width && approxY >= 0 && approxY < gridSystem.height) {
            return { x: approxX, y: approxY };
        }
        return null;
    }

    screenToTriangleGrid(worldPos, cellSize) {
        // check collision, account for flipped triangles by row, no offset
        let triHeight = cellSize * 0.866; // sqrt(3)/2
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