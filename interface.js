class Interface {
    constructor() {
        // UI elements
        this.gridWidthSlider = null;
        this.gridHeightSlider = null;
        this.gridWidthValue = null;
        this.gridHeightValue = null;
        this.speedSlider = null;
        this.speedValue = null;
        this.playPauseBtn = null;
        this.stepBtn = null;
        this.clearBtn = null;
        this.randomizeBtn = null;
        this.hexBtn = null;
        this.triBtn = null;
        this.birthSlider = null;
        this.survivalSlider = null;
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
        this.saveStateBtn = null;
        this.clearStatesBtn = null;
        this.showOutlinesCheckbox = null;
        this.showOutline = true;
        this.notation = 'Gh/R1/P1/B2/S2-3/A#000000/D#ffffff/O#888888';

        this.initUI();
    }

    initUI() {
        // Sliders and UI elements
        const maxNeighbors = this.getMaxNeighborsForDistance(gridSystem.type, gameRules.neighborDistance);

        this.birthSlider = new MultiSlider('birth', 0, maxNeighbors, gameRules.birthNumbers);
        this.birthSlider.onChange = (values) => {
            gameRules.birthNumbers = values;
            this.updateRuleNotation();
        };

        this.survivalSlider = new MultiSlider('survival', 0, maxNeighbors, gameRules.survivalNumbers);
        this.survivalSlider.onChange = (values) => {
            gameRules.survivalNumbers = values;
            this.updateRuleNotation();
        };

        // Select UI elements
        const selectors = [
            ['gridWidthSlider', '#gridWidth'],
            ['gridHeightSlider', '#gridHeight'],
            ['speedSlider', '#speed'],
            ['ring1Radio', '#ring1'],
            ['ring2Radio', '#ring2'],
            ['ring3Radio', '#ring3'],
            ['vonNeumannRadio', '#vonNeumann'],
            ['mooreRadio', '#moore'],
            ['triangleNeighborhoodGroup', '#triangleNeighborhoodType'],
            ['cellPhasesSlider', '#cellPhases'],
            ['cellPhasesValue', '#cellPhasesValue'],
            ['deadColorPicker', '#deadColor'],
            ['aliveColorPicker', '#aliveColor'],
            ['showOutlinesCheckbox', '#showOutlines'],
            ['hexBtn', '#hexGrid'],
            ['triBtn', '#triGrid'],
            ['saveStateBtn', '#saveState'],
            ['clearStatesBtn', '#clearStates'],
            ['playPauseBtn', '#playPause'],
            ['stepBtn', '#stepBtn'],
            ['clearBtn', '#clearBtn'],
            ['randomizeBtn', '#randomizeBtn'],
            ['gridWidthValue', '#gridWidthValue'],
            ['gridHeightValue', '#gridHeightValue'],
            ['speedValue', '#speedValue']
        ];

        selectors.forEach(([prop, sel]) => {
            this[prop] = select(sel);
        });

        // Slider events
        this.gridWidthSlider.input(() => {
            const value = this.gridWidthSlider.value();
            this.gridWidthValue.html(value);
            gridSystem.resize(parseInt(value), gridSystem.height);
            needsRender = true;
        });

        this.gridHeightSlider.input(() => {
            const value = this.gridHeightSlider.value();
            this.gridHeightValue.html(value);
            gridSystem.resize(gridSystem.width, parseInt(value));
            needsRender = true;
        });

        this.cellPhasesSlider.input(() => {
            gameRules.cellPhases = parseInt(this.cellPhasesSlider.value());
            generation = 0;
            this.cellPhasesValue.html(gameRules.cellPhases);
            this.updateNeighborhoodBounds();
            this.updateRuleNotation();
        });

        this.speedSlider.input(() => {
            speed = parseInt(this.speedSlider.value());
            this.speedValue.html(speed);
        });

        // Grid type buttons
        this.hexBtn.mousePressed(() => {
            this.changeGrid('hex');
            needsRender = true;
        });

        this.triBtn.mousePressed(() => {
            this.changeGrid('tri');
            needsRender = true;
        });

        // Simulation controls
        this.playPauseBtn.mousePressed(() => {
            isPlaying = !isPlaying;
            this.playPauseBtn.html(isPlaying ? 'Pause' : 'Play');
        });

        this.stepBtn.mousePressed(() => {
            gridSystem.step();
            needsRender = true;
        });

        this.clearBtn.mousePressed(() => {
            gridSystem.cells = gridSystem.createEmptyGrid();
            generation = 0;
            needsRender = true;
        });

        this.randomizeBtn.mousePressed(() => {
            gridSystem.randomizeCells();
            generation = 0;
            needsRender = true;
        });

        // Neighborhood radio events
        this.ring1Radio.mousePressed(() => {
            if (gameRules.neighborDistance != 1) {
                generation = 0;
                gameRules.neighborDistance = 1;
                this.updateNeighborhoodBounds();
                this.updateRuleNotation();
                gridSystem.updateNeighborhood();
            }
        });

        this.ring2Radio.mousePressed(() => {
            if (gameRules.neighborDistance != 2) {
                generation = 0;
                gameRules.neighborDistance = 2;
                this.updateNeighborhoodBounds();
                this.updateRuleNotation();
                gridSystem.updateNeighborhood();
            }
        });

        this.ring3Radio.mousePressed(() => {
            if (gameRules.neighborDistance != 3) {
                generation = 0;
                gameRules.neighborDistance = 3;
                this.updateNeighborhoodBounds();
                this.updateRuleNotation();
                gridSystem.updateNeighborhood();
            }
        });

        // Triangle neighborhood type radio events
        this.vonNeumannRadio.mousePressed(() => {
            if (gameRules.triangleNeighborhoodType != 'vonNeumann') {
                generation = 0;
                gameRules.triangleNeighborhoodType = 'vonNeumann';
                this.updateNeighborhoodBounds();
                this.updateRuleNotation();
                gridSystem.updateNeighborhood();
            }
        });

        this.mooreRadio.mousePressed(() => {
            if (gameRules.triangleNeighborhoodType != 'moore') {
                generation = 0;
                gameRules.triangleNeighborhoodType = 'moore';
                this.updateNeighborhoodBounds();
                this.updateRuleNotation();
                gridSystem.updateNeighborhood();
            }
        });

        // Color pickers and outline checkbox
        this.deadColorPicker.input(() => {
            deadColor = this.hexToRgb(this.deadColorPicker.value());
            this.updateRuleNotation();
            needsRender = true;
        });

        this.aliveColorPicker.input(() => {
            aliveColor = this.hexToRgb(this.aliveColorPicker.value());
            this.updateRuleNotation();
            needsRender = true;
        });

        this.showOutlinesCheckbox.changed(() => {
            this.showOutline = this.showOutlinesCheckbox.checked();
            needsRender = true;
        });

        // Save/load state buttons
        this.saveStateBtn.mousePressed(() => {
            let name = prompt('Name:', `State ${new Date().toLocaleString()}`);
            if (!name) return;
            if (name.trim() === '') {
                alert('Name cannot be empty');
                return;
            }
            name = name.trim();

            if (saveSystem.stateExists(name)) {
                if (!confirm(`State "${name}" already exists. Overwrite?`)) {
                    return;
                }
            }

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
                if (!confirm(`Are you sure you want to load state "${e.target.getAttribute('data-name')}"?`)) {
                    return;
                }

                let name = e.target.getAttribute('data-name');
                let state = saveSystem.loadState(name);
                if (state) {
                    saveSystem.applyState(state);
                    this.refreshUI();
                    needsRender = true;
                } else {
                    console.error('Failed to load state:', name);
                }
                e.stopPropagation(); // Prevent card click event
            });
        });

        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                if (!confirm(`Are you sure you want to delete state "${e.target.getAttribute('data-name')}"?`)) {
                    return;
                }

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
        let birthRule = this.formatRuleForNotation(gameRules.birthNumbers);
        let survivalRule = this.formatRuleForNotation(gameRules.survivalNumbers);

        let neighborhoodType = '';
        if (gridSystem.type === 'tri') {
            neighborhoodType = `/N${gameRules.triangleNeighborhoodType === 'vonNeumann' ? 'V' : 'M'}`;
        }

        this.notation = `G${gridSystem.type[0]}/R${gameRules.neighborDistance}/P${gameRules.cellPhases}/B${birthRule}/S${survivalRule}${neighborhoodType}/A${this.rgbToHex(aliveColor)}/D${this.rgbToHex(deadColor)}`;

        select('#ruleCode').value(this.notation);
    }

    formatRuleForNotation(numbers) {
        if (!numbers.length) return '';

        const ranges = [];
        let start = numbers[0];
        let end = numbers[0];

        for (let i = 1; i <= numbers.length; i++) {
            if (i < numbers.length && numbers[i] === end + 1) {
                end = numbers[i];
            } else {
                if (start === end) {
                    ranges.push(start.toString());
                } else if (end === start + 1) {
                    ranges.push(`${start}.${end}`);
                } else {
                    ranges.push(`${start}-${end}`);
                }
                if (i < numbers.length) {
                    start = end = numbers[i];
                }
            }
        }

        return ranges.join('.');
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

        if (this.birthSlider) {
            this.birthSlider.updateRange(0, maxNeighbors);
            gameRules.birthNumbers = this.birthSlider.getValues();
        }

        if (this.survivalSlider) {
            this.survivalSlider.updateRange(0, maxNeighbors);
            gameRules.survivalNumbers = this.survivalSlider.getValues();
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
        generation = 0; // Reset generation on grid change

        // Show/hide triangle neighborhood controls
        if (gridSystem.type === 'tri') {
            this.triangleNeighborhoodGroup.style('display', 'block');
        } else {
            this.triangleNeighborhoodGroup.style('display', 'none');
        }

        // Update UI to reflect possible new rules
        this.gridWidthSlider.value(gridSystem.width);
        this.gridHeightSlider.value(gridSystem.height);
        this.cellPhasesSlider.value(gameRules.cellPhases);
        this.gridWidthValue.html(gridSystem.width);
        this.gridHeightValue.html(gridSystem.height);
        this.cellPhasesValue.html(gameRules.cellPhases);
        if (this.birthSlider) {
            this.birthSlider.setValues(gameRules.birthNumbers);
        }
        if (this.survivalSlider) {
            this.survivalSlider.setValues(gameRules.survivalNumbers);
        }

        // Update radio button states
        this.ring1Radio.elt.checked = (gameRules.neighborDistance === 1);
        this.ring2Radio.elt.checked = (gameRules.neighborDistance === 2);
        this.ring3Radio.elt.checked = (gameRules.neighborDistance === 3);

        // Update triangle neighborhood radio buttons
        this.vonNeumannRadio.elt.checked = (gameRules.triangleNeighborhoodType === 'vonNeumann');
        this.mooreRadio.elt.checked = (gameRules.triangleNeighborhoodType === 'moore');

        this.deadColorPicker.value(this.rgbToHex(deadColor));
        this.aliveColorPicker.value(this.rgbToHex(aliveColor));

        this.updateNeighborhoodBounds();
        this.updateRuleNotation();
    }
}

class MultiSlider {
    constructor(containerId, min = 0, max = 18, initialValues = []) {
        this.containerId = containerId;
        this.min = min;
        this.max = max;
        this.range = max - min + 1;
        this.selectedValues = new Set(initialValues);
        this.track = document.getElementById(containerId + 'Track');
        this.preview = document.getElementById(containerId + 'Preview');
        this.tooltip = document.getElementById(containerId + 'Tooltip');

        this.isDragging = false;
        this.lastSelection = null;
        this.dragMode = null;
        this.onChange = null;

        this.init();
    }

    init() {
        this.createSegments();
        this.updateDisplay();
        this.attachEvents();
    }

    createSegments() {
        this.track.innerHTML = '';
        this.segments = [];

        for (let i = 0; i <= this.max - this.min; i++) {
            const segment = document.createElement('div');
            segment.className = 'multi-slider-segment';
            segment.style.left = `${(i / this.range) * 100}%`;
            segment.style.width = `${(1 / this.range) * 100}%`;
            segment.dataset.value = i + this.min;
            this.track.appendChild(segment);
            this.segments.push(segment);
        }
    }

    attachEvents() {
        this.track.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.track.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.track.addEventListener('mouseup', () => this.handleMouseUp());
        this.track.addEventListener('mouseleave', () => this.handleMouseUp());
        this.track.addEventListener('selectstart', (e) => e.preventDefault());
        this.track.addEventListener('mouseenter', () => this.showTooltip());
        this.track.addEventListener('mousemove', (e) => this.updateTooltip(e));
    }

    showTooltip() {
        this.tooltip.classList.add('visible');
    }

    hideTooltip() {
        this.tooltip.classList.remove('visible');
    }

    updateTooltip(e) {
        const value = this.getValueFromEvent(e);
        const rect = this.track.getBoundingClientRect();
        const x = e.clientX;
        const y = rect.top - 30;

        // Update tooltip content and position
        this.tooltip.textContent = `${value}`;
        this.tooltip.style.left = `${x}px`;
        this.tooltip.style.top = `${y}px`;

        // Make sure tooltip stays visible
        this.tooltip.classList.add('visible');
    }

    handleMouseDown(e) {
        generation = 0;
        const value = this.getValueFromEvent(e);
        if (value === null) return;

        this.isDragging = true;

        // Determine drag mode based on current state of clicked value
        this.dragMode = this.selectedValues.has(value) ? 'deselect' : 'select';

        // Apply the mode to the clicked value
        if (this.dragMode === 'select') {
            this.selectedValues.add(value);
        } else {
            this.selectedValues.delete(value);
        }

        this.updateDisplay();
        e.preventDefault();
    }

    handleMouseMove(e) {
        this.updateTooltip(e);

        if (!this.isDragging) return;

        const value = this.getValueFromEvent(e);
        if (value === null) return;

        // Apply the same mode determined on mousedown
        if (this.dragMode === 'select') {
            this.selectedValues.add(value);
        } else if (this.dragMode === 'deselect') {
            this.selectedValues.delete(value);
        }

        this.updateDisplay();
    }

    handleMouseUp() {
        this.isDragging = false;
        this.dragMode = null;
        this.hideTooltip();
    }

    getValueFromEvent(e) {
        const rect = this.track.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const value = Math.floor(percentage * this.range) + this.min;

        if (value < this.min || value > this.max) return null;
        return value;
    }

    toggleValue(value) {
        if (this.selectedValues.has(value)) {
            this.selectedValues.delete(value);
        } else {
            this.selectedValues.add(value);
        }
    }

    selectRange(start, end) {
        for (let i = start; i <= end; i++) {
            this.selectedValues.add(i);
        }
    }

    setValues(values) {
        this.selectedValues = new Set(values);
        this.updateDisplay();
    }

    getValues() {
        return Array.from(this.selectedValues).sort((a, b) => a - b);
    }

    clear() {
        this.selectedValues.clear();
        this.updateDisplay();
    }

    updateRange(newMin, newMax) {
        this.min = newMin;
        this.max = newMax;
        this.range = newMax - newMin + 1;

        this.selectedValues = new Set(
            Array.from(this.selectedValues).filter(v => v >= newMin && v <= newMax)
        );

        this.createSegments();
        this.updateLabels();
        this.updateDisplay();
    }

    updateLabels() {
        const labelsContainer = document.querySelector(`#${this.containerId}Slider .multi-slider-labels`);
        if (labelsContainer) {
            const quarterPoints = [
                this.min,
                Math.floor(this.min + this.range * 0.33),
                Math.floor(this.min + this.range * 0.66),
                this.max
            ];
            labelsContainer.innerHTML = quarterPoints.map(n => `<span>${n}</span>`).join('');
        }
    }

    updateDisplay() {
        this.segments.forEach((segment, i) => {
            const value = i + this.min;
            if (this.selectedValues.has(value)) {
                segment.classList.add('selected');
            } else {
                segment.classList.remove('selected');
            }
        });

        const values = this.getValues();
        const label = this.containerId.charAt(0).toUpperCase() + this.containerId.slice(1);
        this.preview.textContent = `${label}: ${this.formatValues(values)}`;

        this.onChange && this.onChange(values);
    }

    formatValues(values) {
        if (values.length === 0) return '';

        const ranges = [];
        let start = values[0];
        let end = values[0];

        for (let i = 1; i <= values.length; i++) {
            if (i < values.length && values[i] === end + 1) {
                end = values[i];
            } else {
                if (start === end) {
                    ranges.push(start.toString());
                } else if (end === start + 1) {
                    ranges.push(`${start},${end}`);
                } else {
                    ranges.push(`${start}-${end}`);
                }
                if (i < values.length) {
                    start = end = values[i];
                }
            }
        }

        return ranges.join(',');
    }
}