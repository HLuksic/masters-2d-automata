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
        this.ruleCodeInput = null;
        this.applyCodeBtn = null;
        this.ruleCodeError = null;
        this.showOutline = true;
        this.notation = '';

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
            gridSystem.clear();
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

        // Save / library buttons
        this.saveStateBtn.mousePressed(() => this.handleSaveState());
        this.clearStatesBtn.mousePressed(() => this.handleClearStates());
        this.initStateLibraryControls();
        this.initRuleCodeEditor();
        this.initCollapsiblePanels();

        // Make the code field reflect the actual initial rules
        this.updateRuleNotation();
    }

    // ---------------- Rule code editor ----------------

    initRuleCodeEditor() {
        this.ruleCodeInput = document.getElementById('ruleCode');
        this.applyCodeBtn = document.getElementById('applyCode');
        this.ruleCodeError = document.getElementById('ruleCodeError');
        this.ruleCodeInput.disabled = false;

        this.ruleCodeInput.addEventListener('input', () => this.validateRuleCodeInput());

        this.ruleCodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.applyRuleCode();
            } else if (e.key === 'Escape') {
                this.ruleCodeInput.value = this.notation;
                this.validateRuleCodeInput();
                this.ruleCodeInput.blur();
            }
        });

        this.applyCodeBtn.addEventListener('click', () => this.applyRuleCode());
    }

    // Updates Apply button / error display. Returns the parsed rules if applicable, else null.
    validateRuleCodeInput() {
        const text = this.ruleCodeInput.value.trim();
        const modified = text !== this.notation;
        const result = modified ? this.parseRuleCode(text) : null;
        const valid = !!(result && !result.error);

        this.applyCodeBtn.disabled = !(modified && valid);
        this.ruleCodeInput.classList.toggle('modified', modified && valid);
        this.ruleCodeInput.classList.toggle('invalid', modified && !valid);
        this.ruleCodeError.textContent = (modified && !valid) ? result.error : '';

        return valid ? result.value : null;
    }

    applyRuleCode() {
        const rules = this.validateRuleCodeInput();
        if (!rules) return;

        gridSystem.setType(rules.gridType);
        gameRules.neighborDistance = rules.neighborDistance;
        gameRules.cellPhases = rules.cellPhases;
        if (rules.triangleNeighborhoodType) {
            gameRules.triangleNeighborhoodType = rules.triangleNeighborhoodType;
        }
        gameRules.birthNumbers = rules.birthNumbers;
        gameRules.survivalNumbers = rules.survivalNumbers;
        aliveColor = rules.aliveColor;
        deadColor = rules.deadColor;

        this.refreshUI(); // syncs every control and rewrites the code field in canonical form
        gridSystem.updateNeighborhood();
        needsRender = true;
    }

    // Parses "Gh/R1/P1/B2/S2-3/A#000000/D#ffffff" (tri: ".../S.../NV|NM/A.../D...").
    // Returns { value } on success or { error } with a human-readable message.
    parseRuleCode(text) {
        const fail = (error) => ({ error });
        const code = text.trim();
        if (code === '') return fail('The code is empty.');

        const parts = code.split('/').map(p => p.trim());

        const g = parts[0].match(/^G([ht])$/);
        if (!g) return fail('Section 1 must be "Gh" (hexagonal) or "Gt" (triangular).');
        const gridType = g[1] === 'h' ? 'hex' : 'tri';

        const expected = gridType === 'hex' ? 7 : 8;
        const layout = gridType === 'hex' ? 'G/R/P/B/S/A/D' : 'G/R/P/B/S/N/A/D';
        if (parts.length !== expected) {
            return fail(`A ${gridType === 'hex' ? 'hexagonal' : 'triangular'} code needs ${expected} sections (${layout}), found ${parts.length}.`);
        }

        const r = parts[1].match(/^R([1-3])$/);
        if (!r) return fail('Range must be R1, R2 or R3.');
        const neighborDistance = parseInt(r[1], 10);

        const p = parts[2].match(/^P(\d+)$/);
        const cellPhases = p ? parseInt(p[1], 10) : NaN;
        if (!p || cellPhases < 1 || cellPhases > 10) return fail('Cell phases must be P1 to P10.');

        let triangleNeighborhoodType = null;
        let colorIndex = 5;
        if (gridType === 'tri') {
            const n = parts[5].match(/^N([VM])$/);
            if (!n) return fail('Triangle neighborhood must be NV (von Neumann) or NM (Moore).');
            triangleNeighborhoodType = n[1] === 'V' ? 'vonNeumann' : 'moore';
            colorIndex = 6;
        }

        const maxN = this.computeMaxNeighbors(gridType, neighborDistance, cellPhases,
            triangleNeighborhoodType ?? gameRules.triangleNeighborhoodType);

        if (!parts[3].startsWith('B')) return fail('Section 4 must start with "B" (birth rule).');
        const birth = this.parseRuleList(parts[3].slice(1), 'Birth', maxN);
        if (birth.error) return birth;

        if (!parts[4].startsWith('S')) return fail('Section 5 must start with "S" (survival rule).');
        const survival = this.parseRuleList(parts[4].slice(1), 'Survival', maxN);
        if (survival.error) return survival;

        const a = parts[colorIndex].match(/^A#([0-9a-fA-F]{6})$/);
        if (!a) return fail('Alive color must look like A#rrggbb.');
        const d = parts[colorIndex + 1].match(/^D#([0-9a-fA-F]{6})$/);
        if (!d) return fail('Dead color must look like D#rrggbb.');

        return {
            value: {
                gridType,
                neighborDistance,
                cellPhases,
                triangleNeighborhoodType,
                birthNumbers: birth.values,
                survivalNumbers: survival.values,
                aliveColor: this.hexToRgb('#' + a[1]),
                deadColor: this.hexToRgb('#' + d[1])
            }
        };
    }

    // "2.4-6.9" -> [2,4,5,6,9]; empty string = no values.
    parseRuleList(body, label, max) {
        if (body === '') return { values: [] };

        const values = new Set();
        for (const token of body.split('.')) {
            if (token === '') {
                return { error: `${label} rule has an empty entry (check for stray "." characters).` };
            }
            const m = token.match(/^(\d+)(?:-(\d+))?$/);
            if (!m) return { error: `${label} rule: "${token}" is not a number or range (e.g. 2.4-6).` };

            const start = parseInt(m[1], 10);
            const end = m[2] !== undefined ? parseInt(m[2], 10) : start;
            if (end < start) return { error: `${label} rule: range "${token}" is backwards.` };
            if (end > max) return { error: `${label} rule: ${end} exceeds the maximum of ${max} for this neighborhood.` };

            for (let i = start; i <= end; i++) values.add(i);
        }
        return { values: Array.from(values).sort((a, b) => a - b) };
    }

    // ---------------- Collapsible panels ----------------

    initCollapsiblePanels() {
        const storageKey = 'caPanelState';
        let saved = {};
        try {
            saved = JSON.parse(localStorage.getItem(storageKey)) || {};
        } catch (e) { /* ignore */ }

        const panels = [
            { panel: 'savedStates', button: 'toggleStates', key: 'states', label: 'saved states', expandedIcon: '◀', collapsedIcon: '▶' },
            { panel: 'controls', button: 'toggleControls', key: 'controls', label: 'controls', expandedIcon: '▲', collapsedIcon: '▼' }
        ];

        for (const p of panels) {
            const panel = document.getElementById(p.panel);
            const button = document.getElementById(p.button);

            const setCollapsed = (collapsed) => {
                panel.classList.toggle('collapsed', collapsed);
                button.textContent = collapsed ? p.collapsedIcon : p.expandedIcon;
                button.title = `${collapsed ? 'Expand' : 'Collapse'} ${p.label}`;
                saved[p.key] = collapsed;
                try {
                    localStorage.setItem(storageKey, JSON.stringify(saved));
                } catch (e) { /* ignore */ }
                // The canvas resizes itself via the ResizeObserver in sketch.js
            };

            setCollapsed(!!saved[p.key]);
            button.addEventListener('click', () => setCollapsed(!panel.classList.contains('collapsed')));
        }
    }

    // ---------------- Saved states ----------------

    async handleSaveState() {
        let name = prompt('Name:', `State ${new Date().toLocaleString()}`);
        if (!name) return;
        if (name.trim() === '') { alert('Name cannot be empty'); return; }
        name = name.trim();

        const existing = await saveSystem.findByName(name);
        if (existing && !confirm(`State "${name}" already exists. Overwrite?`)) return;

        this.saveStateBtn.elt.disabled = true;
        const label = this.saveStateBtn.html();
        this.saveStateBtn.html('Saving…');
        try {
            await saveSystem.saveState(name);
        } catch (e) {
            console.error(e);
            alert('Could not save the state: ' + (e.message || e));
        } finally {
            this.saveStateBtn.html(label);
            this.saveStateBtn.elt.disabled = false;
        }
    }

    async handleClearStates() {
        if (!confirm('Are you sure you want to delete all saved states? Export them first if you want to keep them.')) return;
        await saveSystem.deleteAllStates();
    }

    initStateLibraryControls() {
        const importBtn = document.getElementById('importStates');
        const exportAllBtn = document.getElementById('exportAllStates');
        const fileInput = document.getElementById('importFileInput');

        if (importBtn && fileInput) {
            importBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', async () => {
                await saveSystem.importFiles(fileInput.files);
                fileInput.value = '';
            });
        }
        if (exportAllBtn) exportAllBtn.addEventListener('click', () => saveSystem.exportAll());
    }

    // ---------------- Helpers ----------------

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

        if (this.ruleCodeInput) {
            this.ruleCodeInput.value = this.notation;
            this.validateRuleCodeInput(); // resets Apply button / error state
        }
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

    computeMaxNeighbors(gridType, distance, phases, triangleNeighborhoodType) {
        let counts;
        if (gridType === 'hex') {
            counts = { 1: 6, 2: 18, 3: 36 };
        } else if (triangleNeighborhoodType === 'vonNeumann') {
            counts = { 1: 3, 2: 9, 3: 18 };   // Von Neumann (3 side neighbors)
        } else {
            counts = { 1: 12, 2: 30, 3: 54 }; // Moore (12 neighbors)
        }
        return (counts[distance] || 0) * phases;
    }

    getMaxNeighborsForDistance(gridType, distance) {
        return this.computeMaxNeighbors(gridType, distance, gameRules.cellPhases, gameRules.triangleNeighborhoodType);
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
        this.hexBtn.removeClass('active');
        this.triBtn.removeClass('active');
        gridSystem.type === 'hex' ? this.hexBtn.addClass('active') : this.triBtn.addClass('active');
        generation = 0;

        if (gridSystem.type === 'tri') {
            this.triangleNeighborhoodGroup.style('display', 'block');
        } else {
            this.triangleNeighborhoodGroup.style('display', 'none');
        }

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

        this.ring1Radio.elt.checked = (gameRules.neighborDistance === 1);
        this.ring2Radio.elt.checked = (gameRules.neighborDistance === 2);
        this.ring3Radio.elt.checked = (gameRules.neighborDistance === 3);

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