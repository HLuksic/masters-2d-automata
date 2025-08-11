class Interface {
    constructor() {
        this.gridWidthSlider = null;
        this.gridHeightSlider = null;
        this.gridWidthValue = null;
        this.gridHeightValue = null;
        this.playPauseBtn = null;
        this.stepBtn = null;
        this.clearBtn = null;
        this.randomizeBtn = null;
        this.hexBtn = null;
        this.triBtn = null;
        this.birthMinSlider = null;
        this.birthMaxSlider = null;
        this.survivalMinSlider = null;
        this.survivalMaxSlider = null;
        this.birthMinValue = null;
        this.birthMaxValue = null;
        this.survivalMinValue = null;
        this.survivalMaxValue = null;
        this.cellPhasesSlider = null;
        this.cellPhasesValue = null;
        this.ring1Radio = null;
        this.ring2Radio = null;
        this.ring3Radio = null;
        this.vonNeumannRadio = null;
        this.mooreRadio = null;
        this.triangleNeighborhoodGroup = null;
        this.deadColorPicker = null;
        this.aliveColorPicker = null;
        this.outlineColorPicker = null;
        this.saveStateBtn = null;
        this.showOutline = false;
        this.notation = 'Gh/R1/P1/B2/S2-3/A#000000/D#ffffff/O#888888';

        this.initUI();
    }

    initUI() {
        this.gridWidthSlider = select('#gridWidth');
        this.gridHeightSlider = select('#gridHeight');
        this.birthMinSlider = select('#birthMin');
        this.birthMaxSlider = select('#birthMax');
        this.survivalMinSlider = select('#survivalMin');
        this.survivalMaxSlider = select('#survivalMax');
        this.ring1Radio = select('#ring1');
        this.ring2Radio = select('#ring2');
        this.ring3Radio = select('#ring3');
        this.vonNeumannRadio = select('#vonNeumann');
        this.mooreRadio = select('#moore');
        this.triangleNeighborhoodGroup = select('#triangleNeighborhoodType');
        this.cellPhasesSlider = select('#cellPhases');
        this.cellPhasesValue = select('#cellPhasesValue');
        this.deadColorPicker = select('#deadColor');
        this.aliveColorPicker = select('#aliveColor');
        this.outlineColorPicker = select('#outlineColor');
        this.showOutlinesCheckbox = select('#showOutlines');
        this.hexBtn = select('#hexGrid');
        this.triBtn = select('#triGrid');
        this.saveStateBtn = select('#saveState');
        this.clearStatesBtn = select('#clearStates');
        this.playPauseBtn = select('#playPause');
        this.stepBtn = select('#stepBtn');
        this.clearBtn = select('#clearBtn');
        this.randomizeBtn = select('#randomizeBtn');

        this.gridWidthValue = select('#gridWidthValue');
        this.gridHeightValue = select('#gridHeightValue');
        this.birthMinValue = select('#birthMinValue');
        this.birthMaxValue = select('#birthMaxValue');
        this.survivalMinValue = select('#survivalMinValue');
        this.survivalMaxValue = select('#survivalMaxValue');

        // Slider events
        this.gridWidthSlider.input(() => {
            let value = this.gridWidthSlider.value();
            this.gridWidthValue.html(value);
            gridSystem.resize(parseInt(value), gridSystem.height);
            triggerRedraw();
        });

        this.gridHeightSlider.input(() => {
            let value = this.gridHeightSlider.value();
            this.gridHeightValue.html(value);
            gridSystem.resize(gridSystem.width, parseInt(value));
            triggerRedraw();
        });

        this.cellPhasesSlider.input(() => {
            gameRules.cellPhases = parseInt(this.cellPhasesSlider.value());
            this.cellPhasesValue.html(gameRules.cellPhases);
            this.updateNeighborhoodBounds();
            this.updateRuleNotation();
        });

        // Button events
        this.hexBtn.mousePressed(() => this.changeGrid('hex'));
        this.triBtn.mousePressed(() => this.changeGrid('tri'));

        // Simulation button events
        this.playPauseBtn.mousePressed(() => {
            isPlaying = !isPlaying;
            this.playPauseBtn.html(isPlaying ? 'Pause' : 'Play');
        });

        this.stepBtn.mousePressed(() => {
            gridSystem.step();
            triggerRedraw();
        });

        this.clearBtn.mousePressed(() => {
            gridSystem.cells = gridSystem.createEmptyGrid();
            triggerRedraw();
        });

        this.randomizeBtn.mousePressed(() => {
            gridSystem.randomizeCells();
            triggerRedraw();
        });

        this.birthMinSlider.input(() => {
            gameRules.birthMin = parseInt(this.birthMinSlider.value());
            this.birthMinValue.html(gameRules.birthMin);
            // Ensure min <= max
            if (gameRules.birthMin > gameRules.birthMax) {
                gameRules.birthMax = gameRules.birthMin;
                this.birthMaxSlider.value(gameRules.birthMax);
                this.birthMaxValue.html(gameRules.birthMax);
            }
            this.updateRuleNotation();
        });

        this.birthMaxSlider.input(() => {
            gameRules.birthMax = parseInt(this.birthMaxSlider.value());
            this.birthMaxValue.html(gameRules.birthMax);
            // Ensure min <= max
            if (gameRules.birthMax < gameRules.birthMin) {
                gameRules.birthMin = gameRules.birthMax;
                this.birthMinSlider.value(gameRules.birthMin);
                this.birthMinValue.html(gameRules.birthMin);
            }
            this.updateRuleNotation();
        });

        this.survivalMinSlider.input(() => {
            gameRules.survivalMin = parseInt(this.survivalMinSlider.value());
            this.survivalMinValue.html(gameRules.survivalMin);
            // Ensure min <= max
            if (gameRules.survivalMin > gameRules.survivalMax) {
                gameRules.survivalMax = gameRules.survivalMin;
                this.survivalMaxSlider.value(gameRules.survivalMax);
                this.survivalMaxValue.html(gameRules.survivalMax);
            }
            this.updateRuleNotation();
        });

        this.survivalMaxSlider.input(() => {
            gameRules.survivalMax = parseInt(this.survivalMaxSlider.value());
            this.survivalMaxValue.html(gameRules.survivalMax);
            // Ensure min <= max
            if (gameRules.survivalMax < gameRules.survivalMin) {
                gameRules.survivalMin = gameRules.survivalMax;
                this.survivalMinSlider.value(gameRules.survivalMin);
                this.survivalMinValue.html(gameRules.survivalMin);
            }
            this.updateRuleNotation();
        });

        // Neighborhood radio events
        this.ring1Radio.mousePressed(() => {
            gameRules.neighborDistance = 1;
            this.updateNeighborhoodBounds();
            this.updateRuleNotation();
        });

        this.ring2Radio.mousePressed(() => {
            gameRules.neighborDistance = 2;
            this.updateNeighborhoodBounds();
            this.updateRuleNotation();
        });

        this.ring3Radio.mousePressed(() => {
            gameRules.neighborDistance = 3;
            this.updateNeighborhoodBounds();
            this.updateRuleNotation();
        });

        // Triangle neighborhood type radio events
        this.vonNeumannRadio.mousePressed(() => {
            gameRules.triangleNeighborhoodType = 'vonNeumann';
            this.updateNeighborhoodBounds();
            this.updateRuleNotation();
        });

        this.mooreRadio.mousePressed(() => {
            gameRules.triangleNeighborhoodType = 'moore';
            this.updateNeighborhoodBounds();
            this.updateRuleNotation();
        });

        this.deadColorPicker.input(() => {
            deadColor = this.hexToRgb(this.deadColorPicker.value());
            triggerRedraw();
            this.updateRuleNotation();
        });

        this.aliveColorPicker.input(() => {
            aliveColor = this.hexToRgb(this.aliveColorPicker.value());
            triggerRedraw();
            this.updateRuleNotation();
        });

        this.outlineColorPicker.input(() => {
            outlineColor = this.hexToRgb(this.outlineColorPicker.value());
            triggerRedraw();
            this.updateRuleNotation();
        });

        this.showOutlinesCheckbox.changed(() => {
            this.showOutline = this.showOutlinesCheckbox.checked();
            triggerRedraw();
        });

        this.saveStateBtn.mousePressed(() => {
            let name = prompt('Name:', `State ${new Date().toLocaleString()}`);
            if (!name) return;
            if (name.trim() === '') {
                alert('Name cannot be empty');
                return;
            }
            name = name.trim();
            // if (saveSystem.stateExists(name)) {
            //     if (!confirm(`State "${name}" already exists. Overwrite?`)) {
            //         return;
            //     }
            // }
            saveSystem.saveState(name, this.notation);
            saveSystem.loadStateList();
            this.addStateEventListeners();
        });

        this.clearStatesBtn.mousePressed(() => {
            confirm('Are you sure you want to clear all saved states?') && saveSystem.deleteAllStates();
            saveSystem.loadStateList();
        });

        this.addStateEventListeners();
    }

    addStateEventListeners() {
        // Add click events to state card load and delete buttons
        let loadButtons = document.querySelectorAll('.loadState');
        let deleteButtons = document.querySelectorAll('.deleteState');

        loadButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                let name = e.target.getAttribute('data-name');
                let state = saveSystem.loadState(name);
                if (state) {
                    saveSystem.applyState(state);
                    this.refreshUI();
                    triggerRedraw();
                } else {
                    console.error('Failed to load state:', name);
                }
                e.stopPropagation(); // Prevent card click event
            });
        });

        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                let name = e.target.getAttribute('data-name');
                if (saveSystem.deleteState(name)) {
                    saveSystem.loadStateList(); // Refresh the list
                    this.addStateEventListeners(); // Re-add event listeners
                } else {
                    console.error('Failed to delete state:', name);
                }
            });
        });
    }

    hexToRgb(hex) {
        let bigint = parseInt(hex.slice(1), 16);
        return [
            (bigint >> 16) & 255,
            (bigint >> 8) & 255,
            bigint & 255
        ];
    }

    rgbToHex(color) {
        return `#${color[0].toString(16).padStart(2, '0')}${color[1].toString(16).padStart(2, '0')}${color[2].toString(16).padStart(2, '0')}`;
    }

    updateRuleNotation() {
        let birthRange = gameRules.birthMin === gameRules.birthMax ? gameRules.birthMin : `${gameRules.birthMin}-${gameRules.birthMax}`;
        let survivalRange = gameRules.survivalMin === gameRules.survivalMax ?
            gameRules.survivalMin : `${gameRules.survivalMin}-${gameRules.survivalMax}`;

        let neighborhoodType = '';
        if (gridSystem.type === 'tri') {
            neighborhoodType = `/N${gameRules.triangleNeighborhoodType === 'vonNeumann' ? 'V' : 'M'}`;
        }

        this.notation = `G${gridSystem.type[0]}/R${gameRules.neighborDistance}/P${gameRules.cellPhases}/B${birthRange}/S${survivalRange}${neighborhoodType}/A${this.rgbToHex(aliveColor)}/D${this.rgbToHex(deadColor)}/O${this.rgbToHex(outlineColor)}`;

        select('#ruleCode').value(this.notation);
    }

    getMaxNeighborsForDistance(gridType, distance) {
        if (gridType === 'hex') {
            if (distance === 1) return 6 * gameRules.cellPhases;
            if (distance === 2) return 18 * gameRules.cellPhases;
            if (distance === 3) return 36 * gameRules.cellPhases;
        } else if (gridType === 'tri') {
            if (gameRules.triangleNeighborhoodType === 'vonNeumann') {
                // Von Neumann neighborhood (3 side neighbors)
                if (distance === 1) return 3 * gameRules.cellPhases;
                if (distance === 2) return 9 * gameRules.cellPhases;
                if (distance === 3) return 18 * gameRules.cellPhases;
            } else {
                // Moore neighborhood (12 neighbors)
                if (distance === 1) return 12 * gameRules.cellPhases;
                if (distance === 2) return 30 * gameRules.cellPhases;
                if (distance === 3) return 54 * gameRules.cellPhases;
            }
        }
        return 0;
    }

    updateNeighborhoodBounds() {
        let maxNeighbors = this.getMaxNeighborsForDistance(gridSystem.type, gameRules.neighborDistance);

        // Update slider max values
        this.birthMinSlider.attribute('max', maxNeighbors);
        this.birthMaxSlider.attribute('max', maxNeighbors);
        this.survivalMinSlider.attribute('max', maxNeighbors);
        this.survivalMaxSlider.attribute('max', maxNeighbors);

        // Clamp current values to new bounds
        if (gameRules.birthMin > maxNeighbors) {
            gameRules.birthMin = maxNeighbors;
            this.birthMinSlider.value(gameRules.birthMin);
            this.birthMinValue.html(gameRules.birthMin);
        }
        if (gameRules.birthMax > maxNeighbors) {
            gameRules.birthMax = maxNeighbors;
            this.birthMaxSlider.value(gameRules.birthMax);
            this.birthMaxValue.html(gameRules.birthMax);
        }
        if (gameRules.survivalMin > maxNeighbors) {
            gameRules.survivalMin = maxNeighbors;
            this.survivalMinSlider.value(gameRules.survivalMin);
            this.survivalMinValue.html(gameRules.survivalMin);
        }
        if (gameRules.survivalMax > maxNeighbors) {
            gameRules.survivalMax = maxNeighbors;
            this.survivalMaxSlider.value(gameRules.survivalMax);
            this.survivalMaxValue.html(gameRules.survivalMax);
        }
    }

    changeGrid(type) {
        gridSystem.setType(type);
        this.refreshUI();
    }

    refreshUI() {
        // Update button states
        this.hexBtn.removeClass('active');
        this.triBtn.removeClass('active');
        gridSystem.type === 'hex' ? this.hexBtn.addClass('active') : this.triBtn.addClass('active');

        // Show/hide triangle neighborhood controls
        if (gridSystem.type === 'tri') {
            this.triangleNeighborhoodGroup.style('display', 'block');
        } else {
            this.triangleNeighborhoodGroup.style('display', 'none');
        }

        // Update bounds
        this.updateNeighborhoodBounds();

        // Update UI to reflect possible new rules
        this.gridWidthSlider.value(gridSystem.width);
        this.gridHeightSlider.value(gridSystem.height);
        this.birthMinSlider.value(gameRules.birthMin);
        this.birthMaxSlider.value(gameRules.birthMax);
        this.survivalMinSlider.value(gameRules.survivalMin);
        this.survivalMaxSlider.value(gameRules.survivalMax);
        this.cellPhasesSlider.value(gameRules.cellPhases);
        this.gridWidthValue.html(gridSystem.width);
        this.gridHeightValue.html(gridSystem.height);
        this.birthMinValue.html(gameRules.birthMin);
        this.birthMaxValue.html(gameRules.birthMax);
        this.survivalMinValue.html(gameRules.survivalMin);
        this.survivalMaxValue.html(gameRules.survivalMax);
        this.cellPhasesValue.html(gameRules.cellPhases);

        // Update radio button states
        this.ring1Radio.elt.checked = (gameRules.neighborDistance === 1);
        this.ring2Radio.elt.checked = (gameRules.neighborDistance === 2);
        this.ring3Radio.elt.checked = (gameRules.neighborDistance === 3);

        // Update triangle neighborhood radio buttons
        this.vonNeumannRadio.elt.checked = (gameRules.triangleNeighborhoodType === 'vonNeumann');
        this.mooreRadio.elt.checked = (gameRules.triangleNeighborhoodType === 'moore');

        this.deadColorPicker.value(this.rgbToHex(deadColor));
        this.aliveColorPicker.value(this.rgbToHex(aliveColor));
        this.outlineColorPicker.value(this.rgbToHex(outlineColor));

        this.updateRuleNotation();
        triggerRedraw();
    }
}
