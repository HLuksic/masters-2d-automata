class Interface {
    constructor() {
        // UI elements
        this.gridWidthSlider = null;
        this.gridHeightSlider = null;
        this.gridWidthValue = null;
        this.gridHeightValue = null;
        this.playPauseBtn = null;
        this.stepBtn = null;
        this.clearBtn = null;
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
        this.neighborDistanceSlider = null;
        this.neighborDistanceValue = null;
        this.deadColorPicker = null;
        this.aliveColorPicker = null;
        this.outlineColorPicker = null;
        this.saveStateBtn = null;
        this.clearHistoryBtn = null;
        this.showOutline = true;
        this.deadColor = [255, 255, 255];
        this.aliveColor = [0, 0, 0];
        this.outlineColor = [136, 136, 136];
        this.notation = '';

        this.initUI();
    }

    initUI() {
        this.gridWidthSlider = select('#gridWidth');
        this.gridHeightSlider = select('#gridHeight');
        this.neighborDistanceSlider = select('#neighborDistance');
        this.birthMinSlider = select('#birthMin');
        this.birthMaxSlider = select('#birthMax');
        this.survivalMinSlider = select('#survivalMin');
        this.survivalMaxSlider = select('#survivalMax');
        this.ring1Radio = select('#ring1');
        this.ring2Radio = select('#ring2');
        this.ring3Radio = select('#ring3');
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

        this.gridWidthValue = select('#gridWidthValue');
        this.gridHeightValue = select('#gridHeightValue');
        this.neighborDistanceValue = select('#neighborDistanceValue');
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
            this.updateRuleNotation();
        });

        // Button events
        this.hexBtn.mousePressed(() => this.setGridType('hex', this.hexBtn));
        this.triBtn.mousePressed(() => this.setGridType('tri', this.triBtn));


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

        this.neighborDistanceSlider.input(() => {
            gameRules.neighborDistance = parseInt(this.neighborDistanceSlider.value());
            this.neighborDistanceValue.html(gameRules.neighborDistance);
            this.updateNeighborhoodBounds();
            this.updateRuleNotation();
        });

        this.deadColorPicker.input(() => {
            this.deadColor = this.hexToRgb(this.deadColorPicker.value());
            triggerRedraw();
            this.updateRuleNotation();
        });

        this.aliveColorPicker.input(() => {
            this.aliveColor = this.hexToRgb(this.aliveColorPicker.value());
            triggerRedraw();
            this.updateRuleNotation();
        });

        this.outlineColorPicker.input(() => {
            this.outlineColor = this.hexToRgb(this.outlineColorPicker.value());
            triggerRedraw();
            this.updateRuleNotation();
        });

        this.showOutlinesCheckbox.changed(() => {
            this.showOutline = this.showOutlinesCheckbox.checked();
            triggerRedraw();
        });

        this.saveStateBtn.mousePressed(() => {
            let saveSystem = new SaveSystem();
            saveSystem.saveState(camera);
            alert('State saved successfully!');
        });

        this.clearStatesBtn.mousePressed(() => {
            select('#statesList').html('');
            alert('States cleared!');
        });
    }

    hexToRgb(hex) {
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    }

    colorToHex(color) {
        return `#${color[0].toString(16).padStart(2, '0')}${color[1].toString(16).padStart(2, '0')}${color[2].toString(16).padStart(2, '0')}`;
    }

    updateRuleNotation() {
        let birthRange = gameRules.birthMin === gameRules.birthMax ? gameRules.birthMin : `${gameRules.birthMin}-${gameRules.birthMax}`;
        let survivalRange = gameRules.survivalMin === gameRules.survivalMax ?
            gameRules.survivalMin : `${gameRules.survivalMin}-${gameRules.survivalMax}`;
        this.notation = `G${gridSystem.type[0]}/R${gameRules.neighborDistance}/P${gameRules.cellPhases}/B${birthRange}/S${survivalRange}/A${this.colorToHex(this.aliveColor)}/D${this.colorToHex(this.deadColor)}/O${this.colorToHex(this.outlineColor)}`;

        select('#ruleCode').value(this.notation);
    }

    getMaxNeighborsForDistance(gridType, distance) {
        if (gridType === 'hex') {
            if (distance === 1) return 6;
            if (distance === 2) return 18;
            if (distance === 3) return 36;
        } else if (gridType === 'tri') {
            if (distance === 1) return 12;
            if (distance === 2) return 30;
            if (distance === 3) return 54;
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

    updateSliderBounds() {
        let maxNeighbors = gridSystem.type === 'hex' ? 6 : 12;

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

    setGridType(type, activeBtn) {
        gridSystem.setType(type);

        // Update button states
        this.hexBtn.removeClass('active');
        this.triBtn.removeClass('active');
        activeBtn.addClass('active');

        // Update bounds
        this.updateNeighborhoodBounds();
        this.updateSliderBounds();

        // Update UI to reflect new rules
        this.birthMinSlider.value(gameRules.birthMin);
        this.birthMaxSlider.value(gameRules.birthMax);
        this.survivalMinSlider.value(gameRules.survivalMin);
        this.survivalMaxSlider.value(gameRules.survivalMax);
        this.birthMinValue.html(gameRules.birthMin);
        this.birthMaxValue.html(gameRules.birthMax);
        this.survivalMinValue.html(gameRules.survivalMin);
        this.survivalMaxValue.html(gameRules.survivalMax);

        this.updateRuleNotation();
        triggerRedraw();
    }
}