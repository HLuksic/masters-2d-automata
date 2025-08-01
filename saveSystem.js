// Add this new SaveSystem class
class SaveSystem {
    constructor(gridSystem) {
        this.storageKey = 'cellularAutomataStates';
        this.gridSystem = gridSystem;
    }

    saveState(name, notation) {
        // Capture canvas image
        let canvasImage = canvas.toDataURL('image/webp', 0.1);

        // Create state object
        let state = {
            timestamp: Date.now(),
            notation: notation,
            cells: JSON.parse(JSON.stringify(this.gridSystem.cells)), // Deep copy
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

        for (let key in states) {
            let state = states[key];
            let notation = state.notation;
            let date = new Date(state.timestamp);
            let formattedDate = date.toLocaleString();

            let card = document.createElement('div');
            card.id = 'stateCard';
            card.innerHTML = `
                <h4>${key}</h4>
                <p>Notation: ${notation}</p>
                <p>Created: ${formattedDate}</p>
                <img src="${state.image}" alt="State Image">
                <div class="control-group">
                    <button class="loadState" data-name="${key}">Load</button>
                    <button class="deleteState" data-name="${key}">Delete</button>
                </div>
            `;
            statesList.appendChild(card);
        }

        // Add event listeners for load and delete buttons
        this.addStateEventListeners();
    }

    addStateEventListeners() {
        let loadButtons = document.querySelectorAll('.loadState');
        let deleteButtons = document.querySelectorAll('.deleteState');

        loadButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                let notation = e.target.getAttribute('data-notation');
                let state = this.loadState(notation);
                if (state) {
                    this.applyState(state, gridSystem, camera);
                } else {
                    console.error('State not found:', notation);
                }
            });
        });

        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                let name = e.target.getAttribute('data-name');
                if (this.deleteState(name)) {
                    this.loadStateList(); // Refresh the list
                } else {
                    console.error('Failed to delete state:', name);
                }
            });
        });
    }

    applyState(state, gridSystem) {
        if (!state) return false;


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
}