// Global variables
let gridSystem;
let camera;
let renderer;
let saveSystem;
let interface;
let controlPressed = false;
let isPlaying = false;
let needsFullRedraw = true;
let generation = 0;
let deadColor = [255, 255, 255];
let aliveColor = [0, 0, 0];
let outlineColor = [136, 136, 136];
let canvasContainer = document.getElementById('canvas-container');
let canvasContainerWidth = canvasContainer.clientWidth;
let infoLayer;

let gameRules = {
    birthMin: 2,
    birthMax: 2,
    survivalMin: 2,
    survivalMax: 3,
    cellPhases: 1,
    neighborDistance: 1,
    triangleNeighborhoodType: 'vonNeumann', // 'vonNeumann' or 'moore'
};

function setup() {
    let canvas = createCanvas(canvasContainerWidth, 900);
    infoLayer = createGraphics(150, 100);
    canvas.parent('canvas-container');
    canvas.style('display', 'block');
    infoLayer.textFont('Courier New');
    infoLayer.fill(0);
    infoLayer.textAlign(LEFT, TOP);
    infoLayer.textSize(16);

    triggerRedraw();

    gridSystem = new GridSystem();
    saveSystem = new SaveSystem();  
    ui = new Interface();
    camera = new Camera();
    renderer = new GridRenderer();
}

function draw() {
    if (isPlaying) {
        gridSystem.step();
    }

    if (needsFullRedraw) background(150);
    renderer.render();

    infoLayer.background(150);
    infoLayer.text(`FPS: ${floor(frameRate())}`, 20, 20);
    infoLayer.text(`Gen: ${generation}`, 20, 40);
    image(infoLayer, 0, 0);
}

function windowResized() {
    canvasContainerWidth = canvasContainer.clientWidth;
    resizeCanvas(canvasContainerWidth, 900);
    triggerRedraw();
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
    needsFullRedraw = true;
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
                } else if (mouseButton === RIGHT) {
                    gridSystem.setCell(gridPos.x, gridPos.y, 0);
                }
            }
            generation = 0;
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
            } else if (mouseButton === RIGHT) {
                gridSystem.setCell(gridPos.x, gridPos.y, 0);
            }
        }
        generation = 0;
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
        needsFullRedraw = true;
        return false; // Prevent page scrolling
    }
}

// Prevent right-click context menu on canvas
document.addEventListener('contextmenu', function (e) {
    if (e.target.tagName === 'CANVAS') {
        e.preventDefault();
    }
});
