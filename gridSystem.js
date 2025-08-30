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
        this.width = 100;
        this.height = 70;
        this.type = 'hex';
        this.population = 0;
        this.cells = this.createEmptyGrid();
        this.buffer = this.createEmptyGrid();
        this.changedCells = [];
        this.offsetsByDistance = this.buildOffsetRings(3);
    }

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

        // Hex (precompute for both starting parities)
        res.hex['true'] = bfsHex(true);
        res.hex['false'] = bfsHex(false);

        // Tri (precompute for all starting parity/orientation combos)
        res.tri['true-true'] = bfsTri(true, true);
        res.tri['true-false'] = bfsTri(true, false);
        res.tri['false-true'] = bfsTri(false, true);
        res.tri['false-false'] = bfsTri(false, false);

        return res;
    }

    updateNeighborhood() {
        this.offsetsByDistance = this.buildOffsetRings(gameRules.neighborDistance);
    }

    sumNeighbors(x, y) {
        let count = 0;
        const dist = gameRules.neighborDistance;

        if (this.type === 'hex') {
            const isEvenCol = x % 2 === 0 ? 'true' : 'false';
            for (const [dx, dy] of this.offsetsByDistance.hex[isEvenCol][dist]) {
                count += this.getCell(x + dx, y + dy);
            }
            return count;
        } else if (this.type === 'tri') {
            const isEvenRow = y % 2 === 0;
            const pointUp = x % 2 === 0;
            const key = `${isEvenRow}-${pointUp}`;
            for (const [dx, dy] of this.offsetsByDistance.tri[key][dist]) {
                count += this.getCell(x + dx, y + dy);
            }
            return count;
        }
        return 0;
    }

    createEmptyGrid() {
        this.population = 0;
        let grid = Array(this.height).fill(null).map(() => new Uint8Array(this.width));
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                grid[y][x] = 0;
            }
        }
        return grid;
    }

    randomizeCells() {
        this.population = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let value = Math.random() < 0.5 ? 0 : Math.floor(Math.random() * gameRules.cellPhases) + 1;
                this.cells[y][x] = value;
                if (value > 0) this.population++;
            }
        }
    }

    getPopulation() {
        return this.population;
    }

    resize(newWidth, newHeight) {
        this.population = 0;
        let oldGrid = this.cells;
        this.width = newWidth;
        this.height = newHeight;
        this.cells = this.createEmptyGrid();
        this.buffer = this.createEmptyGrid();
        this.updateNeighborhood();

        for (let y = 0; y < Math.min(oldGrid.length, this.height); y++) {
            for (let x = 0; x < Math.min(oldGrid[y].length, this.width); x++) {
                this.cells[y][x] = oldGrid[y][x];
                if (this.cells[y][x] > 0) this.population++;
            }
        }
    }

    setType(newType) {
        this.type = newType;
        this.updateNeighborhood();
    }

    getCell(x, y) {
        const dist = gameRules.neighborDistance;
        if (x < dist || x >= this.width - dist || y < dist || y >= this.height - dist) {
            x = ((x % this.width) + this.width) % this.width;
            y = ((y % this.height) + this.height) % this.height;
        }
        return this.cells[y][x];
    }

    getLiveCells() {
        const liveCells = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells[y][x] > 0) {
                    liveCells.push({ x, y, value: this.cells[y][x] });
                }
            }
        }
        return liveCells;
    }

    setCell(x, y, value) {
        if (value !== this.cells[y][x]) {
            if (value > 0) this.population++;
            else this.population--;
            this.cells[y][x] = value;
            this.changedCells.push({ x, y });
        }
    }

    step() {
        generation++;
        let newGrid = this.buffer;
        let oldGrid = this.cells;

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let liveNeighbors = this.sumNeighbors(x, y);
                let currentCell = this.getCell(x, y);
                let newValue;

                if (currentCell > 0) {
                    if (gameRules.survivalNumbers.includes(liveNeighbors) && currentCell == gameRules.cellPhases) {
                        newValue = gameRules.cellPhases;
                    } else {
                        newValue = Math.max(0, currentCell - 1);
                    }
                } else {
                    if (gameRules.birthNumbers.includes(liveNeighbors)) {
                        newValue = gameRules.cellPhases;
                    } else {
                        newValue = 0;
                    }
                }

                if (newValue !== currentCell) {
                    if (newValue == 0 && currentCell > 0) this.population--;
                    else if (newValue > 0 && currentCell == 0) this.population++;
                }

                newGrid[y][x] = newValue;
            }
        }
        [this.cells, this.buffer] = [newGrid, oldGrid];
    }
}
