// Add this new SaveSystem class
class SaveSystem {
    constructor(gridSystem) {
        this.storageKey = 'cellularAutomataStates';
        this.gridSystem = gridSystem;
    }

    saveState(name, gameRules, cellStages, neighborhoodType, neighborDistance, deadColor, aliveColor, outlineColor, showOutlines) {
        // Capture canvas image
        let canvasImage = canvas.toDataURL('image/png');

        // Create state object
        let state = {
            name: name,
            timestamp: Date.now(),
            notation: notation,
            gridType: gridSystem.type,
            cells: JSON.parse(JSON.stringify(gridSystem.cells)), // Deep copy
            gameRules: { ...gameRules },
            cellStages: cellStages,
            neighborhoodType: neighborhoodType,
            neighborDistance: neighborDistance,
            colors: {
                dead: [...deadColor],
                alive: [...aliveColor],
                outline: [...outlineColor],
                showOutlines: showOutlines
            },
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

    loadState(name) {
        let states = this.getAllStates();
        return states[name] || null;
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

    deleteState(name) {
        let states = this.getAllStates();
        if (states[name]) {
            delete states[name];
            localStorage.setItem(this.storageKey, JSON.stringify(states));
            return true;
        }
        return false;
    }

    generateNotation(gridSystem, gameRules, cellStages, neighborhoodType, neighborDistance) {
        let gridTypeChar = gridSystem.type === 'hex' ? 'H' : 'T';
        let neighborChar = neighborhoodType === 'ring1' ? '1' :
            neighborhoodType === 'ring2' ? '2' :
                neighborhoodType === 'ring3' ? '3' :
                    neighborDistance.toString();

        let birthRule = gameRules.birthMin === gameRules.birthMax ?
            gameRules.birthMin.toString() :
            `${gameRules.birthMin}-${gameRules.birthMax}`;

        let survivalRule = gameRules.survivalMin === gameRules.survivalMax ?
            gameRules.survivalMin.toString() :
            `${gameRules.survivalMin}-${gameRules.survivalMax}`;

        let stageChar = cellStages > 1 ? `S${cellStages}` : '';

        return `${gridTypeChar}${neighborChar}/B${birthRule}/S${survivalRule}${stageChar}`;
    }

    applyState(state, gridSystem, camera) {
        if (!state) return false;

        try {
            // Apply grid settings
            gridSystem.setType(state.gridType);
            gridSystem.resize(state.gridWidth, state.gridHeight);
            gridSystem.cells = JSON.parse(JSON.stringify(state.cells)); // Deep copy

            // Apply game rules
            Object.assign(gameRules, state.gameRules);

            // Apply other settings
            cellStages = state.cellStages;
            neighborhoodType = state.neighborhoodType;
            neighborDistance = state.neighborDistance;

            // Apply colors
            deadColor = [...state.colors.dead];
            aliveColor = [...state.colors.alive];
            outlineColor = [...state.colors.outline];
            showOutlines = state.colors.showOutlines;

            // Update UI to reflect loaded state
            this.updateUIFromState(state);

            // Trigger redraw
            triggerRedraw();

            return true;
        } catch (error) {
            console.error('Failed to apply state:', error);
            return false;
        }
    }

    updateUIFromState(state) {
        // Update grid type buttons
        hexBtn.removeClass('active');
        triBtn.removeClass('active');
        if (state.gridType === 'hex') {
            hexBtn.addClass('active');
        } else {
            triBtn.addClass('active');
        }

        // Update sliders
        gridWidthSlider.value(state.gridWidth);
        gridHeightSlider.value(state.gridHeight);
        gridWidthValue.html(state.gridWidth);
        gridHeightValue.html(state.gridHeight);

        cellStagesSlider.value(state.cellStages);
        cellStagesValue.html(state.cellStages);

        // Update rule sliders
        birthMinSlider.value(state.gameRules.birthMin);
        birthMaxSlider.value(state.gameRules.birthMax);
        survivalMinSlider.value(state.gameRules.survivalMin);
        survivalMaxSlider.value(state.gameRules.survivalMax);

        birthMinValue.html(state.gameRules.birthMin);
        birthMaxValue.html(state.gameRules.birthMax);
        survivalMinValue.html(state.gameRules.survivalMin);
        survivalMaxValue.html(state.gameRules.survivalMax);

        // Update neighborhood radio buttons
        ring1Radio.checked(state.neighborhoodType === 'ring1');
        ring2Radio.checked(state.neighborhoodType === 'ring2');
        ring3Radio.checked(state.neighborhoodType === 'ring3');
        customRadio.checked(state.neighborhoodType === 'custom');

        if (state.neighborhoodType === 'custom') {
            customDistanceDiv.style('display', 'block');
            neighborDistanceSlider.value(state.neighborDistance);
            neighborDistanceValue.html(state.neighborDistance);
        } else {
            customDistanceDiv.style('display', 'none');
        }

        // Update color pickers
        deadColorPicker.value(this.rgbToHex(state.colors.dead));
        aliveColorPicker.value(this.rgbToHex(state.colors.alive));
        outlineColorPicker.value(this.rgbToHex(state.colors.outline));
        showOutlinesCheckbox.checked(state.colors.showOutlines);
    }

    rgbToHex(rgb) {
        return "#" + rgb.map(x => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }).join('');
    }

    exportState(name) {
        let state = this.loadState(name);
        if (state) {
            let dataStr = JSON.stringify(state, null, 2);
            let dataBlob = new Blob([dataStr], { type: 'application/json' });

            let link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `${name}.json`;
            link.click();
        }
    }

    importState(fileInput) {
        return new Promise((resolve, reject) => {
            let file = fileInput.files[0];
            if (!file) {
                reject('No file selected');
                return;
            }

            let reader = new FileReader();
            reader.onload = (e) => {
                try {
                    let state = JSON.parse(e.target.result);
                    resolve(state);
                } catch (error) {
                    reject('Invalid file format');
                }
            };
            reader.readAsText(file);
        });
    }
}