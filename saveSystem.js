class SaveSystem {
    constructor() {
        this.storageKey = 'cellularAutomataStates';
        this.loadStateList();
    }

        saveState(name, notation) {
        // Capture canvas image (p5's WebGL canvas uses preserveDrawingBuffer, so this works)
        let canvasImage = gridRenderer.gl.canvas.toDataURL('image/webp', 0.1);

        // Serialize cells as a flat string (row-major, joined by '\n') - same format as before
        let cellString = this.serializeCells(gridSystem.readCells(), gridSystem.width, gridSystem.height);

        let state = {
            timestamp: Date.now(),
            notation: notation,
            cells: cellString,
            image: canvasImage
        };

        let existingStates = this.getAllStates();
        existingStates[name] = state;

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(existingStates));
            return true;
        } catch (error) {
            console.error('Failed to save state:', error);
            return false;
        }
    }

    // Equivalent to rows.map(row => Array.from(row).join('')).join('\n'), but fast for big grids.
    serializeCells(cells, width, height) {
        const decoder = new TextDecoder();
        const chars = new Uint8Array(width);
        const rows = new Array(height);
        for (let y = 0; y < height; y++) {
            const row = cells.subarray(y * width, (y + 1) * width);
            let singleDigit = true;
            for (let x = 0; x < width; x++) {
                const v = row[x];
                if (v > 9) { singleDigit = false; break; }
                chars[x] = 48 + v;
            }
            rows[y] = singleDigit ? decoder.decode(chars) : Array.from(row).join('');
        }
        return rows.join('\n');
    }

    loadState(notation) {
        let states = this.getAllStates();
        return states[notation] || null;
    }

    getAllStates() {
        try {
            let stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Failed to load states:', error);
            return {};
        }
    }

    stateExists(name) {
        let states = this.getAllStates();
        return states.hasOwnProperty(name);
    }

    deleteAllStates() {
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error('Failed to clear states:', error);
            return false;
        }
    }

    deleteState(name) {
        let states = this.getAllStates();
        if (states[name]) {
            delete states[name];
            localStorage.setItem(this.storageKey, JSON.stringify(states));
            return true;
        }
        return false;
    }

    loadStateList() {
        let states = this.getAllStates();
        let statesList = document.getElementById('statesList');
        statesList.innerHTML = ''; // Clear existing list

        // Order states by timestamp (newest first)
        let keys = Object.keys(states).reverse();

        for (let key of keys) {
            let state = states[key];
            let notation = state.notation;
            let date = new Date(state.timestamp);
            let formattedDate = date.toLocaleString();

            let card = document.createElement('div');
            card.id = 'stateCard';
            card.innerHTML = `
                <h3>${key}</h3>
                <p data-notation="${notation}">${notation}</p>
                <p>Created: ${formattedDate}</p>
                <img src="${state.image}" alt="State Image">
                <div class="control-group">
                    <button class="loadState" data-name="${key}">Load</button>
                    <button class="deleteState" data-name="${key}">Delete</button>
                </div>
            `;
            statesList.appendChild(card);
        }
    }

    parseRuleString(ruleString) {
        if (!ruleString || ruleString.trim() === '') return [];

        const numbers = new Set();

        const parts = ruleString.split('.').map(s => s.trim());
        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                        numbers.add(i);
                    }
                }
            } else {
                const num = parseInt(part);
                if (!isNaN(num)) {
                    numbers.add(num);
                }
            }
        }

        return Array.from(numbers).sort((a, b) => a - b);
    }

        applyState(state) {
        if (!state) return false;

        let notationParts = state.notation.split('/');
        if (notationParts.length < 6) {
            console.error('Invalid notation format:', state.notation);
            return false;
        }

        notationParts = notationParts.map(part => part.substring(1));

        let gridType = notationParts[0] == 'h' ? 'hex' : 'tri';
        gridSystem.setType(gridType);

        // Deserialize cells from string (same rules as before: width = first row's length)
        let cellRows = state.cells.split('\n');
        let height = cellRows.length;
        let width = cellRows[0].length;
        let cells = new Uint8Array(width * height);
        for (let y = 0; y < height; y++) {
            const row = cellRows[y];
            const n = Math.min(row.length, width);
            for (let x = 0; x < n; x++) {
                const d = row.charCodeAt(x) - 48;
                cells[y * width + x] = (d >= 0 && d <= 9) ? d : 0;
            }
        }

        gameRules.neighborDistance = parseInt(notationParts[1]);
        gameRules.cellPhases = parseInt(notationParts[2]);
        gameRules.birthNumbers = this.parseRuleString(notationParts[3]);
        gameRules.survivalNumbers = this.parseRuleString(notationParts[4]);

        let colorStartIndex = 5;
        if (gridType === 'tri') {
            gameRules.triangleNeighborhoodType = notationParts[5] === 'V' ? 'vonNeumann' : 'moore';
            colorStartIndex = 6;
        }

        aliveColor = this.hexToRgb(notationParts[colorStartIndex]);
        deadColor = this.hexToRgb(notationParts[colorStartIndex + 1]);

        gridSystem.loadCells(width, height, cells);

        return true;
    }

    hexToRgb(hex) {
        let bigint = parseInt(hex.slice(1), 16);
        return [
            (bigint >> 16) & 255,
            (bigint >> 8) & 255,
            bigint & 255
        ];
    }
}
