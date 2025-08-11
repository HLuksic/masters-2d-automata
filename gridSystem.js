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
    [1, 0],     // bottom-right
    [0, 1],     // bottom
    [-1, 0],    // bottom-left
    [-1, -1]    // top-left
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

class GridSystem {
    constructor() {
        this.width = 50;
        this.height = 40;
        this.type = 'hex'; // 'hex', 'triangle'
        this.cells = this.createEmptyGrid();
    }

    createEmptyGrid() {
        let grid = Array(this.height).fill(null)
            .map(() => new Uint8Array(this.width));
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                grid[y][x] = 0; // 0 = dead, 1+ = alive
            }
        }
        return grid;
    }

    randomizeCells() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Randomly set cells to random cellPhase
                this.cells[y][x] = Math.random() < 0.5 ? 0 : Math.floor(Math.random() * gameRules.cellPhases) + 1;
            }
        }
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

        // x = ((x % this.width) + this.width) % this.width;
        // y = ((y % this.height) + this.height) % this.height;
        // return this.cells[y][x];
    }

    setCell(x, y, value) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.cells[y][x] = value;
        }
    }

    getHexNeighbors(x, y) {
        const isEvenCol = x % 2 === 0;

        return HEX_NEIGHBOR_MAP[isEvenCol].map(([dx, dy]) => [x + dx, y + dy]);
    }

    getTriangleNeighbors(x, y) {
        const isEvenRow = y % 2 === 0;
        const pointUp = x % 2 === 0;
        const key = `${isEvenRow}-${pointUp}`;

        const offsets = gameRules.triangleNeighborhoodType === 'vonNeumann' ? NEUMANN_TRIANGLE_NEIGHBOR_MAP[key] : MOORE_TRIANGLE_NEIGHBOR_MAP[key];
        return offsets.map(([dx, dy]) => [x + dx, y + dy]);
    }

    getHexNeighborsAtDistance(x, y, maxDistance) {
        if (maxDistance === 1) {
            return this.getHexNeighbors(x, y);
        }

        const visited = new Set();
        const result = [];
        let currentRing = [[x, y]];

        const coordKey = (x, y) => `${x},${y}`;
        visited.add(coordKey(x, y));

        for (let distance = 1; distance <= maxDistance; distance++) {
            const nextRing = [];

            for (const [cx, cy] of currentRing) {
                for (const [nx, ny] of this.getHexNeighbors(cx, cy)) {
                    const key = coordKey(nx, ny);
                    if (!visited.has(key)) {
                        visited.add(key);
                        nextRing.push([nx, ny]);
                        result.push([nx, ny]);
                    }
                }
            }

            currentRing = nextRing;
        }

        return result;
    }

    getTriangleNeighborsAtDistance(x, y, maxDistance) {
        if (maxDistance === 1) {
            return this.getTriangleNeighbors(x, y);
        }

        const visited = new Set();
        const result = [];
        let currentRing = [[x, y]];

        const coordKey = (x, y) => `${x},${y}`;
        visited.add(coordKey(x, y));

        for (let distance = 1; distance <= maxDistance; distance++) {
            const nextRing = [];

            for (const [cx, cy] of currentRing) {
                for (const [nx, ny] of this.getTriangleNeighbors(cx, cy)) {
                    const key = coordKey(nx, ny);
                    if (!visited.has(key)) {
                        visited.add(key);
                        nextRing.push([nx, ny]);
                        result.push([nx, ny]);
                    }
                }
            }

            currentRing = nextRing;
        }

        return result;
    }

    getNeighborsAtDistance(x, y, distance) {
        if (this.type === 'hex') {
            return this.getHexNeighborsAtDistance(x, y, distance);
        } else if (this.type === 'tri') {
            return this.getTriangleNeighborsAtDistance(x, y, distance);
        }
        return [];
    }

    isCellAlive(x, y) {
        return this.getCell(x, y) > 0;
    }

    countLiveNeighbors(x, y) {
        let neighbors = this.getNeighborsAtDistance(x, y, gameRules.neighborDistance);

        let count = 0;
        for (let [nx, ny] of neighbors) {
            count += this.getCell(nx, ny);
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
                        newGrid[y][x] = gameRules.cellPhases;
                    } else {
                        // Cell should die - decrease stage
                        newGrid[y][x] = Math.max(0, currentCell - 1);
                    }
                } else {
                    // Dead cell - check birth rules
                    if (liveNeighbors >= gameRules.birthMin && liveNeighbors <= gameRules.birthMax) {
                        // Cell is born
                        newGrid[y][x] = gameRules.cellPhases;
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
