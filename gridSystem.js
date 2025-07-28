// Grid system
class GridSystem {
    constructor() {
        this.width = 50;
        this.height = 40;
        this.type = 'hex'; // 'hex', 'triangle'
        this.cells = this.createEmptyGrid();
    }

    createEmptyGrid() {
        let grid = [];
        for (let y = 0; y < this.height; y++) {
            grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                grid[y][x] = 0; // 0 = dead, 1+ = alive
            }
        }
        return grid;
    }

    resize(newWidth, newHeight) {
        let oldGrid = this.cells;
        this.width = newWidth;
        this.height = newHeight;
        this.cells = this.createEmptyGrid();

        // Copy over existing cells where possible
        for (let y = 0; y < Math.min(oldGrid.length, this.height); y++) {
            for (let x = 0; x < Math.min(oldGrid[y].length, this.width); x++) {
                this.cells[y][x] = oldGrid[y][x];
            }
        }
    }

    setType(newType) {
        this.type = newType;
    }

    getCell(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.cells[y][x];
        }
        return 0;
    }

    setCell(x, y, value) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.cells[y][x] = value;
        }
    }

    getHexNeighbors(x, y) {
        let neighbors = [];

        // Hexagonal grid has 6 neighbors
        // The neighbor pattern depends on whether the column is even or odd
        let isEvenCol = x % 2 === 0;

        if (isEvenCol) {
            // Even columns
            neighbors = [
                [x, y - 1],     // top
                [x + 1, y - 1], // top-right
                [x + 1, y],     // bottom-right
                [x, y + 1],     // bottom
                [x - 1, y],     // bottom-left
                [x - 1, y - 1]  // top-left
            ];
        } else {
            // Odd columns
            neighbors = [
                [x, y - 1],     // top
                [x + 1, y],     // top-right
                [x + 1, y + 1], // bottom-right
                [x, y + 1],     // bottom
                [x - 1, y + 1], // bottom-left
                [x - 1, y]      // top-left
            ];
        }

        return neighbors;
    }

    getTriangleNeighbors(x, y) {
        let neighbors = [];

        // All 12 neighbors that touch by side or point
        let isEvenRow = y % 2 === 0;
        let pointUp = x % 2 === 0;

        if (isEvenRow) {
            // Even rows (no horizontal offset)
            if (pointUp) {
                // Upward pointing triangle in even row
                neighbors = [
                    // Side neighbors (3)
                    [x - 1, y], [x + 1, y], // left, right
                    [x - 1, y + 1], // bottom
                    // Point neighbors (9)
                    [x - 2, y], [x + 2, y], // far left, far right
                    [x - 2, y - 1], [x - 1, y - 1], [x, y - 1], // top row
                    [x - 2, y + 1], [x, y + 1], // bottom neighbors
                    [x - 3, y + 1], [x + 1, y + 1] // far bottom neighbors
                ];
            } else {
                // Downward pointing triangle in even row
                neighbors = [
                    // Side neighbors (3)
                    [x - 1, y], [x + 1, y], // left, right
                    [x - 1, y - 1], // top
                    // Point neighbors (9)
                    [x - 2, y], [x + 2, y], // far left, far right
                    [x - 2, y + 1], [x - 1, y + 1], [x, y + 1], // bottom row
                    [x - 2, y - 1], [x, y - 1], // top neighbors
                    [x - 3, y - 1], [x + 1, y - 1] // far top neighbors
                ];
            }
        } else {
            // Odd rows(horizontally offset)
            if (pointUp) {
                // Upward pointing triangle in odd row
                neighbors = [
                    // Side neighbors (3)
                    [x - 1, y], [x + 1, y], // left, right
                    [x + 1, y + 1], // bottom
                    // Point neighbors (9)
                    [x - 2, y], [x + 2, y], // far left, far right
                    [x, y - 1], [x + 1, y - 1], [x + 2, y - 1], // top row
                    [x, y + 1], [x + 2, y + 1], // bottom neighbors
                    [x - 1, y + 1], [x + 3, y + 1] // far bottom neighbors
                ];
            } else {
                // Downward pointing triangle in odd row
                neighbors = [
                    // Side neighbors (3)
                    [x - 1, y], [x + 1, y], // left, right
                    [x + 1, y - 1], // top
                    // Point neighbors (9)
                    [x - 2, y], [x + 2, y], // far left, far right
                    [x, y + 1], [x + 1, y + 1], [x + 2, y + 1], // bottom row
                    [x, y - 1], [x + 2, y - 1], // top neighbors
                    [x - 1, y - 1], [x + 3, y - 1] // far top neighbors
                ];
            }
        }

        return neighbors;
    }

    isCellAlive(x, y) {
        return this.getCell(x, y) > 0;
    }

    countLiveNeighbors(x, y) {
        let neighbors;

        if (this.type === 'hex') {
            neighbors = this.getHexNeighbors(x, y);
        } else if (this.type === 'tri') {
            neighbors = this.getTriangleNeighbors(x, y);
        } else {
            return 0;
        }

        let count = 0;
        for (let [nx, ny] of neighbors) {
            if (this.isCellAlive(nx, ny)) {
                count++;
            }
        }

        return count;
    }

    step() {
        let newGrid = this.createEmptyGrid();

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let liveNeighbors = this.countLiveNeighbors(x, y);
                let currentCell = this.getCell(x, y);
                let isAlive = this.isCellAlive(x, y);

                if (isAlive) {
                    // Live cell - check survival rules
                    if (liveNeighbors >= gameRules.survivalMin && liveNeighbors <= gameRules.survivalMax) {
                        // Cell survives - reset to full life
                        newGrid[y][x] = cellStages;
                    } else {
                        // Cell should die - decrease stage
                        newGrid[y][x] = Math.max(0, currentCell - 1);
                    }
                } else {
                    // Dead cell - check birth rules
                    if (liveNeighbors >= gameRules.birthMin && liveNeighbors <= gameRules.birthMax) {
                        // Cell is born
                        newGrid[y][x] = cellStages;
                    } else {
                        // Cell stays dead
                        newGrid[y][x] = 0;
                    }
                }
            }
        }

        this.cells = newGrid;
    }
}