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
let playPauseBtn, stepBtn, clearBtn;

// UI elements
let gridWidthSlider, gridHeightSlider;
let gridWidthValue, gridHeightValue;
let hexBtn, triBtn;

function setup() {
    let canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    canvas.parent('canvas-container');
    canvas.style('display', 'block');

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

    // Slider events
    gridWidthSlider.input(() => {
        let value = gridWidthSlider.value();
        gridWidthValue.html(value);
        gridSystem.resize(parseInt(value), gridSystem.height);
    });

    gridHeightSlider.input(() => {
        let value = gridHeightSlider.value();
        gridHeightValue.html(value);
        gridSystem.resize(gridSystem.width, parseInt(value));
    });

    // Button events
    hexBtn.mousePressed(() => setGridType('hex', hexBtn));
    triBtn.mousePressed(() => setGridType('triangle', triBtn));

    playPauseBtn = select('#playPause');
    stepBtn = select('#stepBtn');
    clearBtn = select('#clearBtn');

    // Simulation button events
    playPauseBtn.mousePressed(() => {
        isPlaying = !isPlaying;
        playPauseBtn.html(isPlaying ? 'Pause' : 'Play');
    });

    stepBtn.mousePressed(() => {
        if (gridSystem.type === 'hex') {
            gridSystem.step();
        }
    });

    clearBtn.mousePressed(() => {
        gridSystem.cells = gridSystem.createEmptyGrid();
    });
}

function setGridType(type, activeBtn) {
    gridSystem.setType(type);

    // Update button states
    hexBtn.removeClass('active');
    triBtn.removeClass('active');
    activeBtn.addClass('active');
}

function draw() {
    background(240);

    // Auto-step if playing and hexagonal
    if (isPlaying && gridSystem.type === 'hex' && frameCount % 10 === 0) {
        gridSystem.step();
    }

    renderer.render();
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
                    gridSystem.setCell(gridPos.x, gridPos.y, 1);
                } else if (mouseButton === RIGHT) {
                    gridSystem.setCell(gridPos.x, gridPos.y, 0);
                }
            }
        }
    }
}

function mouseDragged() {
    if (spacePressed && camera.isDragging) {
        camera.updateDrag(mouseX, mouseY);
    } else if (!spacePressed) {
        // Continue placing/erasing cells while dragging
        let gridPos = renderer.screenToGrid(mouseX, mouseY);
        if (gridPos) {
            if (mouseButton === LEFT) {
                gridSystem.setCell(gridPos.x, gridPos.y, 1);
            } else if (mouseButton === RIGHT) {
                gridSystem.setCell(gridPos.x, gridPos.y, 0);
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
        return false; // Prevent page scrolling
    }
}

// Prevent right-click context menu on canvas
document.addEventListener('contextmenu', function (e) {
    if (e.target.tagName === 'CANVAS') {
        e.preventDefault();
    }
});