class SaveSystem {
    constructor(gridSystem) {
        this.storageKey = 'cellularAutomataStates';
        this.gridSystem = gridSystem;
        this.loadStateList();
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

    applyState(state) {
        if (!state) return false;

        // Parse notation and set values: Gh/R1/P1/B2/S2-3/A#000000/D#ffffff/O#888888 G - grid type, R - ring value, P - phases, B - birth, S - survival, A - alive color, D - dead color, O - outline color
        let notationParts = state.notation.split('/');
        if (notationParts.length < 6) {
            console.error('Invalid notation format:', state.notation);
            return false;
        }
        // Remove first char from each part
        notationParts = notationParts.map(part => part.substring(1));

        this.gridSystem.setType(notationParts[0]);
        gameRules.neighborDistance = parseInt(notationParts[1]);
        gameRules.cellPhases = parseInt(notationParts[2]);
        gameRules.birthMin = parseInt(notationParts[3].length > 1 ? notationParts[3].split('-')[0] : notationParts[3]);
        gameRules.birthMax = parseInt(notationParts[3].length > 1 ? notationParts[3].split('-')[1] : notationParts[3]);
        gameRules.survivalMin = parseInt(notationParts[4].length > 1 ? notationParts[4].split('-')[0] : notationParts[4]);
        gameRules.survivalMax = parseInt(notationParts[4].length > 1 ? notationParts[4].split('-')[1] : notationParts[4]);
        aliveColor = this.hexToRgb(notationParts[5]);
        deadColor = this.hexToRgb(notationParts[6]);
        outlineColor = this.hexToRgb(notationParts[7]);

        console.log(gameRules);
        console.log(aliveColor, deadColor, outlineColor);


        // print all
        // console.log('Applying state with values:', {
        //     notationParts
        // });
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

    hexToRgb(hex) {
        let bigint = parseInt(hex.slice(1), 16);
        return [
            (bigint >> 16) & 255,
            (bigint >> 8) & 255,
            bigint & 255
        ];
    }
}