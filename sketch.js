// Global variables
let gridSystem;
let camera;
let renderer;
let gridRenderer;
let saveSystem;
let interface;
let controlPressed = false;
let isPlaying = false;
let needsFullRedraw = true;
let generation = 0;
let deadColor = [255, 255, 255];
let aliveColor = [0, 0, 0];
let canvasContainer = document.getElementById('canvas-container');
let canvasContainerWidth = canvasContainer.clientWidth;
let canvasContainerHeight = canvasContainer.clientHeight;
let infoLayer;
let speed = 30;
let lastFrameTime = 0;


let gameRules = {
    birthNumbers: [2],
    survivalNumbers: [2, 3],
    cellPhases: 1,
    neighborDistance: 1,
    triangleNeighborhoodType: 'vonNeumann'
};

function setup() {
    let canvas = createCanvas(canvasContainerWidth, 900, WEBGL);
    canvas.parent('canvas-container');
    canvas.style('display', 'block');

    gridSystem = new GridSystem();
    saveSystem = new SaveSystem();
    ui = new Interface();
    camera = new Camera();
    gridRenderer = new GridRenderer();
}

function draw() {
    let targetFrameTime = 1000 / speed;

    if (isPlaying && millis() - lastFrameTime > targetFrameTime) {
        gridSystem.step();
        lastFrameTime = millis();
    }
    gridRenderer.render();

    // Create HTML overlay instead of WebGL text
    updateHTMLOverlay();
}

function updateHTMLOverlay() {
    let overlay = document.getElementById('info-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'info-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '10px';
        overlay.style.left = '10px';
        overlay.style.backgroundColor = `rgb(0, 0, 0, 0)`;
        overlay.style.color = 'black';
        overlay.style.padding = '10px';
        overlay.style.fontFamily = 'monospace';
        overlay.style.fontSize = '16px';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '1000';
        document.getElementById('canvas-container').appendChild(overlay);
    }

    overlay.innerHTML = `
        FPS: ${floor(frameRate())}<br>
        Gen: ${generation}<br>
        Pop: ${gridSystem.getPopulation()}
    `;
}

function windowResized() {
    canvasContainerWidth = canvasContainer.clientWidth;
    canvasContainerHeight = canvasContainer.clientHeight;
    resizeCanvas(canvasContainerWidth, canvasContainerHeight);

    if (gridRenderer) {
        gridRenderer.resize();
    }
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

// Mouse interaction
function mousePressed() {
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
        if (controlPressed) {
            cursor('grabbing');
            camera.startDrag(mouseX, mouseY);
        } else {
            let gridPos = gridRenderer.screenToGrid(mouseX, mouseY);

            if (gridPos) {
                if (mouseButton === LEFT) {
                    gridSystem.setCell(gridPos.x, gridPos.y, gameRules.cellPhases);
                } else if (mouseButton === RIGHT) {
                    gridSystem.setCell(gridPos.x, gridPos.y, 0);
                }
                generation = 0;
            }
        }
    }
}

function mouseDragged() {
    if (controlPressed && camera.isDragging) {
        camera.updateDrag(mouseX, mouseY);
    } else if (!controlPressed) {
        let gridPos = gridRenderer.screenToGrid(mouseX, mouseY);

        if (gridPos) {
            if (mouseButton === LEFT) {
                gridSystem.setCell(gridPos.x, gridPos.y, gameRules.cellPhases);
            } else if (mouseButton === RIGHT) {
                gridSystem.setCell(gridPos.x, gridPos.y, 0);
            }
            generation = 0;
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
        const zoomStep = 1.1;
        let zoomFactor = event.delta > 0 ? 1 / zoomStep : zoomStep;
        camera.zoomAt(mouseX, mouseY, zoomFactor);
        return false;
    }
}

// Prevent right-click context menu on canvas
document.addEventListener('contextmenu', function (e) {
    if (e.target.tagName === 'CANVAS') {
        e.preventDefault();
    }
});