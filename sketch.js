// Global variables
let gridSystem;
let camera;
let renderer;
let webglRenderer;
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

    triggerRedraw();

    gridSystem = new GridSystem();
    saveSystem = new SaveSystem();
    ui = new Interface();
    camera = new Camera();
    webglRenderer = new WebGLRenderer();
}

function draw() {
    let targetFrameTime = 1000 / speed;

    if (isPlaying && millis() - lastFrameTime > targetFrameTime) {
        gridSystem.step();
        lastFrameTime = millis();
    }

    webglRenderer.render();

    // Draw info overlay using WebGL context
    const gl = webglRenderer.gl;
    gl.disable(gl.DEPTH_TEST);

    // Create simple overlay quad for info display
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = 120;
    overlayCanvas.height = 80;
    const ctx = overlayCanvas.getContext('2d');

    ctx.fillStyle = `rgb(${deadColor})`;
    ctx.fillRect(0, 0, 120, 80);
    ctx.fillStyle = 'black';
    ctx.font = '16px Courier New';
    ctx.fillText(`FPS: ${floor(frameRate())}`, 20, 20);
    ctx.fillText(`Gen: ${generation}`, 20, 40);
    ctx.fillText(`Pop: ${gridSystem.getPopulation()}`, 20, 60);

    // Draw the overlay canvas directly to screen
    const canvas = document.querySelector('canvas');
    const overlayCtx = canvas.getContext('2d');
    if (overlayCtx) {
        overlayCtx.drawImage(overlayCanvas, 0, 0);
    }
}

function windowResized() {
    canvasContainerWidth = canvasContainer.clientWidth;
    canvasContainerHeight = canvasContainer.clientHeight;
    resizeCanvas(canvasContainerWidth, canvasContainerHeight);

    if (webglRenderer) {
        webglRenderer.resize();
    }

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
            let gridPos = webglRenderer.screenToGrid(mouseX, mouseY);

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
        triggerRedraw();
    } else if (!controlPressed) {
        let gridPos = webglRenderer.screenToGrid(mouseX, mouseY);

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
        triggerRedraw();
        return false;
    }
}

// Prevent right-click context menu on canvas
document.addEventListener('contextmenu', function (e) {
    if (e.target.tagName === 'CANVAS') {
        e.preventDefault();
    }
});