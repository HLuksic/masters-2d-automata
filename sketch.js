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
let spacePressed = false;
let isPlaying = false;
let needsRedraw = true;
let lastGridState = null;
let playPauseBtn, stepBtn, clearBtn;
let birthMinSlider, birthMaxSlider, survivalMinSlider, survivalMaxSlider;
let birthMinValue, birthMaxValue, survivalMinValue, survivalMaxValue;
let cellStages = 1; // Number of stages before full death
let cellStagesSlider, cellStagesValue;
let ring1Radio, ring2Radio, ring3Radio, customRadio;
let neighborDistanceSlider, neighborDistanceValue, customDistanceDiv;
let neighborhoodType = 'ring1';
let neighborDistance = 1;

let gameRules = {
    birthMin: 2,
    birthMax: 2,
    survivalMin: 2,
    survivalMax: 3
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
    customRadio = select('#custom');
    neighborDistanceSlider = select('#neighborDistance');
    neighborDistanceValue = select('#neighborDistanceValue');
    customDistanceDiv = select('#customDistance');

    birthMinSlider = select('#birthMin');
    birthMaxSlider = select('#birthMax');
    survivalMinSlider = select('#survivalMin');
    survivalMaxSlider = select('#survivalMax');

    birthMinValue = select('#birthMinValue');
    birthMaxValue = select('#birthMaxValue');
    survivalMinValue = select('#survivalMinValue');
    survivalMaxValue = select('#survivalMaxValue');

    cellStagesSlider = select('#cellStages');
    cellStagesValue = select('#cellStagesValue');

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

    cellStagesSlider.input(() => {
        cellStages = parseInt(cellStagesSlider.value());
        cellStagesValue.html(cellStages);
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
    });

    // Neighborhood radio events
    ring1Radio.mousePressed(() => {
        neighborhoodType = 'ring1';
        neighborDistance = 1;
        customDistanceDiv.style('display', 'none');
        updateNeighborhoodBounds();
    });

    ring2Radio.mousePressed(() => {
        neighborhoodType = 'ring2';
        neighborDistance = 2;
        customDistanceDiv.style('display', 'none');
        updateNeighborhoodBounds();
    });

    ring3Radio.mousePressed(() => {
        neighborhoodType = 'ring3';
        neighborDistance = 3;
        customDistanceDiv.style('display', 'none');
        updateNeighborhoodBounds();
    });

    customRadio.changed(() => {
        if (customRadio.checked()) {
            neighborhoodType = 'custom';
            neighborDistance = parseInt(neighborDistanceSlider.value());
            customDistanceDiv.style('display', 'block');
            updateNeighborhoodBounds();
        }
    });

    // Distance slider event
    neighborDistanceSlider.input(() => {
        neighborDistance = parseInt(neighborDistanceSlider.value());
        neighborDistanceValue.html(neighborDistance);
        updateNeighborhoodBounds();
    });
}

function getMaxNeighborsForDistance(gridType, distance) {
    if (gridType === 'hex') {
        if (distance === 1) return 6;
        if (distance === 2) return 18;
        if (distance === 3) return 36;
        // General formula for hex: 3 * distance * (distance + 1)
        return 3 * distance * (distance + 1);
    } else if (gridType === 'triangle') {
        if (distance === 1) return 12;
        if (distance === 2) return 30;
        if (distance === 3) return 54;
        // Approximate formula for triangle
        return 12 * distance * distance;
    }
    return 0;
}

function updateNeighborhoodBounds() {
    let maxNeighbors = getMaxNeighborsForDistance(gridSystem.type, neighborDistance);

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

    // Update neighborhood bounds
    updateNeighborhoodBounds();

    if (type === 'hex') {
        // Default Conway rules for hex
        gameRules = { birthMin: 2, birthMax: 2, survivalMin: 2, survivalMax: 3 };
    } else if (type === 'tri') {
        // Default rules for tri
        gameRules = { birthMin: 3, birthMax: 4, survivalMin: 3, survivalMax: 5 };
    }

    // Update UI to reflect new rules
    birthMinSlider.value(gameRules.birthMin);
    birthMaxSlider.value(gameRules.birthMax);
    survivalMinSlider.value(gameRules.survivalMin);
    survivalMaxSlider.value(gameRules.survivalMax);

    birthMinValue.html(gameRules.birthMin);
    birthMaxValue.html(gameRules.birthMax);
    survivalMinValue.html(gameRules.survivalMin);
    survivalMaxValue.html(gameRules.survivalMax);

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
    if (key === ' ') {
        cursor('grab');
        spacePressed = true;
    }
}

function keyReleased() {
    if (key === ' ') {
        cursor('default');
        spacePressed = false;
        camera.endDrag();
    }
}

function triggerRedraw() {
    needsRedraw = true;
}

// Mouse interaction
function mousePressed() {
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
        if (spacePressed) {
            cursor('grabbing');
            camera.startDrag(mouseX, mouseY);
        } else {
            // Handle cell placement/erasure
            let gridPos = renderer.screenToGrid(mouseX, mouseY);
            if (gridPos) {
                if (mouseButton === LEFT) {
                    gridSystem.setCell(gridPos.x, gridPos.y, cellStages);
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
    if (spacePressed && camera.isDragging) {
        camera.updateDrag(mouseX, mouseY);
        triggerRedraw();
    } else if (!spacePressed) {
        // Continue placing/erasing cells while dragging
        let gridPos = renderer.screenToGrid(mouseX, mouseY);
        if (gridPos) {
            if (mouseButton === LEFT) {
                gridSystem.setCell(gridPos.x, gridPos.y, cellStages);
                triggerRedraw();
            } else if (mouseButton === RIGHT) {
                gridSystem.setCell(gridPos.x, gridPos.y, 0);
                triggerRedraw();
            }
        }
    }
}

function mouseReleased() {
    if (spacePressed) {
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