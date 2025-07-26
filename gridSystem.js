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
                grid[y][x] = 0; // 0 = empty, 1 = alive
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

    countLiveNeighbors(x, y) {
        if (this.type !== 'hex') return 0;

        let neighbors = this.getHexNeighbors(x, y);
        let count = 0;

        for (let [nx, ny] of neighbors) {
            if (this.getCell(nx, ny) === 1) {
                count++;
            }
        }

        return count;
    }

    step() {
        if (this.type !== 'hex') return;

        let newGrid = this.createEmptyGrid();

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let liveNeighbors = this.countLiveNeighbors(x, y);
                let currentCell = this.getCell(x, y);

                // Conway's rules adapted for hexagonal grid:
                // - Live cell with 2-3 neighbors survives
                // - Dead cell with exactly 2 neighbors becomes alive
                if (currentCell === 1) {
                    // Live cell
                    if (liveNeighbors === 2 || liveNeighbors === 3) {
                        newGrid[y][x] = 1; // Survives
                    } else {
                        newGrid[y][x] = 0; // Dies
                    }
                } else {
                    // Dead cell
                    if (liveNeighbors === 2) {
                        newGrid[y][x] = 1; // Becomes alive
                    } else {
                        newGrid[y][x] = 0; // Stays dead
                    }
                }
            }
        }

        this.cells = newGrid;
    }
}