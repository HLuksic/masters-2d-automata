class SaveSystem {
    constructor(gridSystem) {
        this.storageKey = 'cellularAutomataStates';
        this.loadStateList();
    }

    saveState(name, notation) {
        // Capture canvas image
        let canvasImage = canvas.toDataURL('image/webp', 0.1);

        // Create state object
        let state = {
            timestamp: Date.now(),
            notation: notation,
            cells: gridSystem.cells.map(row => Array.from(row)), // Deep copy
            image: canvasImage
        };

        // Get existing states
        let existingStates = this.getAllStates();

        // Add new state (or replace if name exists)
        existingStates[name] = state;

        // Save to localStorage
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(existingStates));
            return true;
        } catch (error) {
            console.error('Failed to save state:', error);
            return false;
        }
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

        // Handle both old format (min-max or single number) and new format (dot-separated)
        const numbers = new Set();

        // New format - dots and ranges
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

        // Parse notation and set values
        let notationParts = state.notation.split('/');
        if (notationParts.length < 6) {
            console.error('Invalid notation format:', state.notation);
            return false;
        }

        // Remove first char from each part
        notationParts = notationParts.map(part => part.substring(1));

        let gridType = notationParts[0] == 'h' ? 'hex' : 'tri';
        gridSystem.setType(gridType);
        gridSystem.cells = state.cells.map(row => Uint8Array.from(row));
        gridSystem.height = gridSystem.cells.length;
        gridSystem.width = gridSystem.cells[0].length;
        gameRules.neighborDistance = parseInt(notationParts[1]);
        gameRules.cellPhases = parseInt(notationParts[2]);

        gameRules.birthNumbers = this.parseRuleString(notationParts[3]);
        gameRules.survivalNumbers = this.parseRuleString(notationParts[4]);

        // Handle triangle neighborhood type (if present)
        let colorStartIndex = 5;
        if (gridType === 'tri' && notationParts.length > 8) {
            // New format with neighborhood type
            gameRules.triangleNeighborhoodType = notationParts[5] === 'V' ? 'vonNeumann' : 'moore';
            colorStartIndex = 6;
        } else if (gridType === 'tri') {
            // Old format without neighborhood type - default to Moore (original behavior)
            gameRules.triangleNeighborhoodType = 'moore';
        }

        aliveColor = this.hexToRgb(notationParts[colorStartIndex]);
        deadColor = this.hexToRgb(notationParts[colorStartIndex + 1]);
        outlineColor = this.hexToRgb(notationParts[colorStartIndex + 2]);

        gridSystem.resize(gridSystem.width, gridSystem.height);

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
