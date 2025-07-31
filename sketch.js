// Global constants
const CANVAS_WIDTH = 1500;
const CANVAS_HEIGHT = 1000;
const BLACK = [0, 0, 0];
const GREY = [128, 128, 128];
const WHITE = [255, 255, 255];

// Global variables
let gridSystem;
let camera;
let renderer;
let controlPressed = false;
let isPlaying = false;
let needsRedraw = true;
let lastGridState = null;
let playPauseBtn, stepBtn, clearBtn;
let showOutline = true;
let birthMinSlider, birthMaxSlider, survivalMinSlider, survivalMaxSlider;
let birthMinValue, birthMaxValue, survivalMinValue, survivalMaxValue;
let cellPhasesSlider, cellPhasesValue;
let ring1Radio, ring2Radio, ring3Radio;
let neighborDistanceSlider, neighborDistanceValue;
let deadColorPicker, aliveColorPicker, outlineColorPicker;
let deadColor = [255, 255, 255];
let aliveColor = [0, 0, 0];
let outlineColor = [136, 136, 136];

let gameRules = {
    birthMin: 2,
    birthMax: 2,
    survivalMin: 2,
    survivalMax: 3,
    cellPhases: 1,
    neighborDistance: 1,
};

// UI elements
let gridWidthSlider, gridHeightSlider;
let gridWidthValue, gridHeightValue;
let hexBtn, triBtn;

function setup() {
    let canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    canvas.parent('canvas-container');
    canvas.style('display', 'block');

    triggerRedraw();

    // Initialize systems
    gridSystem = new GridSystem();
    camera = new Camera();
    renderer = new GridRenderer(gridSystem, camera);

    // Initialize UI
    setupUI();
}

function hexToRgb(hex) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
}

function setupUI() {
    gridWidthSlider = select('#gridWidth');
    gridHeightSlider = select('#gridHeight');
    gridWidthValue = select('#gridWidthValue');
    gridHeightValue = select('#gridHeightValue');

    hexBtn = select('#hexGrid');
    triBtn = select('#triGrid');

    ring1Radio = select('#ring1');
    ring2Radio = select('#ring2');
    ring3Radio = select('#ring3');
    neighborDistanceSlider = select('#neighborDistance');
    neighborDistanceValue = select('#neighborDistanceValue');

    birthMinSlider = select('#birthMin');
    birthMaxSlider = select('#birthMax');
    survivalMinSlider = select('#survivalMin');
    survivalMaxSlider = select('#survivalMax');

    birthMinValue = select('#birthMinValue');
    birthMaxValue = select('#birthMaxValue');
    survivalMinValue = select('#survivalMinValue');
    survivalMaxValue = select('#survivalMaxValue');

    cellPhasesSlider = select('#cellPhases');
    cellPhasesValue = select('#cellPhasesValue');

    deadColorPicker = select('#deadColor');
    aliveColorPicker = select('#aliveColor');

    outlineColorPicker = select('#outlineColor');
    showOutlinesCheckbox = select('#showOutlines');

    // Slider events
    gridWidthSlider.input(() => {
        let value = gridWidthSlider.value();
        gridWidthValue.html(value);
        gridSystem.resize(parseInt(value), gridSystem.height);
        triggerRedraw();
    });

    gridHeightSlider.input(() => {
        let value = gridHeightSlider.value();
        gridHeightValue.html(value);
        gridSystem.resize(gridSystem.width, parseInt(value));
        triggerRedraw();
    });

    cellPhasesSlider.input(() => {
        gameRules.cellPhases = parseInt(cellPhasesSlider.value());
        cellPhasesValue.html(gameRules.cellPhases);
        updateRuleNotation();
    });

    // Button events
    hexBtn.mousePressed(() => setGridType('hex', hexBtn));
    triBtn.mousePressed(() => setGridType('tri', triBtn));

    playPauseBtn = select('#playPause');
    stepBtn = select('#stepBtn');
    clearBtn = select('#clearBtn');

    // Simulation button events
    playPauseBtn.mousePressed(() => {
        isPlaying = !isPlaying;
        playPauseBtn.html(isPlaying ? 'Pause' : 'Play');
    });

    stepBtn.mousePressed(() => {
        gridSystem.step();
        triggerRedraw();
    });

    clearBtn.mousePressed(() => {
        gridSystem.cells = gridSystem.createEmptyGrid();
        triggerRedraw();
    });

    birthMinSlider.input(() => {
        gameRules.birthMin = parseInt(birthMinSlider.value());
        birthMinValue.html(gameRules.birthMin);
        // Ensure min <= max
        if (gameRules.birthMin > gameRules.birthMax) {
            gameRules.birthMax = gameRules.birthMin;
            birthMaxSlider.value(gameRules.birthMax);
            birthMaxValue.html(gameRules.birthMax);
        }
        updateRuleNotation();
    });

    birthMaxSlider.input(() => {
        gameRules.birthMax = parseInt(birthMaxSlider.value());
        birthMaxValue.html(gameRules.birthMax);
        // Ensure min <= max
        if (gameRules.birthMax < gameRules.birthMin) {
            gameRules.birthMin = gameRules.birthMax;
            birthMinSlider.value(gameRules.birthMin);
            birthMinValue.html(gameRules.birthMin);
        }
        updateRuleNotation();
    });

    survivalMinSlider.input(() => {
        gameRules.survivalMin = parseInt(survivalMinSlider.value());
        survivalMinValue.html(gameRules.survivalMin);
        // Ensure min <= max
        if (gameRules.survivalMin > gameRules.survivalMax) {
            gameRules.survivalMax = gameRules.survivalMin;
            survivalMaxSlider.value(gameRules.survivalMax);
            survivalMaxValue.html(gameRules.survivalMax);
        }
        updateRuleNotation();
    });

    survivalMaxSlider.input(() => {
        gameRules.survivalMax = parseInt(survivalMaxSlider.value());
        survivalMaxValue.html(gameRules.survivalMax);
        // Ensure min <= max
        if (gameRules.survivalMax < gameRules.survivalMin) {
            gameRules.survivalMin = gameRules.survivalMax;
            survivalMinSlider.value(gameRules.survivalMin);
            survivalMinValue.html(gameRules.survivalMin);
        }
        updateRuleNotation();
    });

    // Neighborhood radio events
    ring1Radio.mousePressed(() => {
        gameRules.neighborDistance = 1;
        updateNeighborhoodBounds();
        updateRuleNotation();
    });

    ring2Radio.mousePressed(() => {
        gameRules.neighborDistance = 2;
        updateNeighborhoodBounds();
        updateRuleNotation();
    });

    ring3Radio.mousePressed(() => {
        gameRules.neighborDistance = 3;
        updateNeighborhoodBounds();
        updateRuleNotation();
    });

    // Distance slider event
    neighborDistanceSlider.input(() => {
        gameRules.neighborDistance = parseInt(neighborDistanceSlider.value());
        neighborDistanceValue.html(gameRules.neighborDistance);
        updateNeighborhoodBounds();
        updateRuleNotation();
    });

    // Color picker events
    deadColorPicker.input(() => {
        deadColor = hexToRgb(deadColorPicker.value());
        triggerRedraw();
        updateRuleNotation();
    });

    aliveColorPicker.input(() => {
        aliveColor = hexToRgb(aliveColorPicker.value());
        triggerRedraw();
        updateRuleNotation();
    });

    outlineColorPicker.input(() => {
        outlineColor = hexToRgb(outlineColorPicker.value());
        triggerRedraw();
        updateRuleNotation();
    });

    showOutlinesCheckbox.changed(() => {
        showOutlines = showOutlinesCheckbox.checked();
        triggerRedraw();
    });
}

function getMaxNeighborsForDistance(gridType, distance) {
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

function colorToHex(color) {
    return `#${color[0].toString(16).padStart(2, '0')}${color[1].toString(16).padStart(2, '0')}${color[2].toString(16).padStart(2, '0')}`;
}

function updateRuleNotation() {
    let birthRange = gameRules.birthMin === gameRules.birthMax ? gameRules.birthMin : `${gameRules.birthMin}-${gameRules.birthMax}`;
    let survivalRange = gameRules.survivalMin === gameRules.survivalMax ?
        gameRules.survivalMin : `${gameRules.survivalMin}-${gameRules.survivalMax}`;
    let notation = `G${gridSystem.type[0]}/R${gameRules.neighborDistance}/P${gameRules.cellPhases}/B${birthRange}/S${survivalRange}/A${colorToHex(aliveColor)}/D${colorToHex(deadColor)}/O${colorToHex(outlineColor)}`;

    select('#ruleCode').value(notation);
}

function updateNeighborhoodBounds() {
    let maxNeighbors = getMaxNeighborsForDistance(gridSystem.type, gameRules.neighborDistance);

    // Update slider max values
    birthMinSlider.attribute('max', maxNeighbors);
    birthMaxSlider.attribute('max', maxNeighbors);
    survivalMinSlider.attribute('max', maxNeighbors);
    survivalMaxSlider.attribute('max', maxNeighbors);

    // Clamp current values to new bounds
    if (gameRules.birthMin > maxNeighbors) {
        gameRules.birthMin = maxNeighbors;
        birthMinSlider.value(gameRules.birthMin);
        birthMinValue.html(gameRules.birthMin);
    }
    if (gameRules.birthMax > maxNeighbors) {
        gameRules.birthMax = maxNeighbors;
        birthMaxSlider.value(gameRules.birthMax);
        birthMaxValue.html(gameRules.birthMax);
    }
    if (gameRules.survivalMin > maxNeighbors) {
        gameRules.survivalMin = maxNeighbors;
        survivalMinSlider.value(gameRules.survivalMin);
        survivalMinValue.html(gameRules.survivalMin);
    }
    if (gameRules.survivalMax > maxNeighbors) {
        gameRules.survivalMax = maxNeighbors;
        survivalMaxSlider.value(gameRules.survivalMax);
        survivalMaxValue.html(gameRules.survivalMax);
    }
}

function updateSliderBounds() {
    let maxNeighbors = gridSystem.type === 'hex' ? 6 : 12;

    // Update slider max values
    birthMinSlider.attribute('max', maxNeighbors);
    birthMaxSlider.attribute('max', maxNeighbors);
    survivalMinSlider.attribute('max', maxNeighbors);
    survivalMaxSlider.attribute('max', maxNeighbors);

    // Clamp current values to new bounds
    if (gameRules.birthMin > maxNeighbors) {
        gameRules.birthMin = maxNeighbors;
        birthMinSlider.value(gameRules.birthMin);
        birthMinValue.html(gameRules.birthMin);
    }
    if (gameRules.birthMax > maxNeighbors) {
        gameRules.birthMax = maxNeighbors;
        birthMaxSlider.value(gameRules.birthMax);
        birthMaxValue.html(gameRules.birthMax);
    }
    if (gameRules.survivalMin > maxNeighbors) {
        gameRules.survivalMin = maxNeighbors;
        survivalMinSlider.value(gameRules.survivalMin);
        survivalMinValue.html(gameRules.survivalMin);
    }
    if (gameRules.survivalMax > maxNeighbors) {
        gameRules.survivalMax = maxNeighbors;
        survivalMaxSlider.value(gameRules.survivalMax);
        survivalMaxValue.html(gameRules.survivalMax);
    }
}

function setGridType(type, activeBtn) {
    gridSystem.setType(type);

    // Update button states
    hexBtn.removeClass('active');
    triBtn.removeClass('active');
    activeBtn.addClass('active');

    // Update bounds
    updateNeighborhoodBounds();
    updateSliderBounds();

    // Update UI to reflect new rules
    birthMinSlider.value(gameRules.birthMin);
    birthMaxSlider.value(gameRules.birthMax);
    survivalMinSlider.value(gameRules.survivalMin);
    survivalMaxSlider.value(gameRules.survivalMax);

    birthMinValue.html(gameRules.birthMin);
    birthMaxValue.html(gameRules.birthMax);
    survivalMinValue.html(gameRules.survivalMin);
    survivalMaxValue.html(gameRules.survivalMax);

    updateRuleNotation();
    triggerRedraw();
}

function draw() {
    // Only redraw if something has changed
    if ((!needsRedraw && !isPlaying) || frameCount % 5 !== 0) {
        return;
    }

    // Auto-step if playing
    if (isPlaying) {
        gridSystem.step();
    }

    background(150);
    renderer.render();
    needsRedraw = false;
}

// Keyboard events
function keyPressed() {
    if (keyCode === 17) {
        cursor('grab');
        controlPressed = true;
    }
}

function keyReleased() {
    if (keyCode === 17) {
        cursor('default');
        controlPressed = false;
        camera.endDrag();
    }
}

function triggerRedraw() {
    needsRedraw = true;
}

// Mouse interaction
function mousePressed() {
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
        if (controlPressed) {
            cursor('grabbing');
            camera.startDrag(mouseX, mouseY);
        } else {
            // Handle cell placement/erasure
            let gridPos = renderer.screenToGrid(mouseX, mouseY);
            if (gridPos) {
                if (mouseButton === LEFT) {
                    gridSystem.setCell(gridPos.x, gridPos.y, gameRules.cellPhases);
                    triggerRedraw();
                } else if (mouseButton === RIGHT) {
                    gridSystem.setCell(gridPos.x, gridPos.y, 0);
                    triggerRedraw();
                }
            }
        }
    }
}

function mouseDragged() {
    if (controlPressed && camera.isDragging) {
        camera.updateDrag(mouseX, mouseY);
        triggerRedraw();
    } else if (!controlPressed) {
        // Continue placing/erasing cells while dragging
        let gridPos = renderer.screenToGrid(mouseX, mouseY);
        if (gridPos) {
            if (mouseButton === LEFT) {
                gridSystem.setCell(gridPos.x, gridPos.y, gameRules.cellPhases);
                triggerRedraw();
            } else if (mouseButton === RIGHT) {
                gridSystem.setCell(gridPos.x, gridPos.y, 0);
                triggerRedraw();
            }
        }
    }
}

function mouseReleased() {
    if (controlPressed) {
        cursor('grab');
    }
    camera.endDrag();
}

function mouseWheel(event) {
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
        let zoomFactor = event.delta > 0 ? 0.9 : 1.1;
        camera.zoomAt(mouseX, mouseY, zoomFactor);
        needsRedraw = true;
        return false; // Prevent page scrolling
    }
}

// Prevent right-click context menu on canvas
document.addEventListener('contextmenu', function (e) {
    if (e.target.tagName === 'CANVAS') {
        e.preventDefault();
    }
});