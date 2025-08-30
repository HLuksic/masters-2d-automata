// Global variables
let gridSystem;
let camera;
let renderer;
let gridRenderer;
let saveSystem;
let interface;
let controlPressed = false;
let isPlaying = false;
let needsRender = true;
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
    survivalNumbers: [2],
    cellPhases: 1,
    neighborDistance: 1,
    triangleNeighborhoodType: 'moore'
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

    const startTime = performance.now();

    let stepTime = 0, renderTime = 0;
    if (isPlaying && millis() - lastFrameTime > targetFrameTime) {
        const stepStart = performance.now();
        gridSystem.step();
        stepTime = performance.now() - stepStart;
        lastFrameTime = millis();
    }

    if (needsRender || isPlaying) {
        const renderStart = performance.now();
        gridRenderer.render();
        renderTime = performance.now() - renderStart;
        needsRender = false;
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Print times in one line
    console.log(`step: ${stepTime.toFixed(2)}ms, render: ${renderTime.toFixed(2)}ms, total: ${totalTime.toFixed(2)}ms`);

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
        overlay.style.color = 'rgb(150, 150, 150)';
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
        needsRender = false;
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
            needsRender = true;
        } else {
            let gridPos = gridRenderer.screenToGrid(mouseX, mouseY);

            if (gridPos) {
                if (mouseButton === LEFT) {
                    gridSystem.setCell(gridPos.x, gridPos.y, gameRules.cellPhases);
                } else if (mouseButton === RIGHT) {
                    gridSystem.setCell(gridPos.x, gridPos.y, 0);
                }
                needsRender = true;
                generation = 0;
            }
        }
    }
}

function mouseDragged() {
    if (controlPressed && camera.isDragging) {
        camera.updateDrag(mouseX, mouseY);
        needsRender = true;
    } else if (!controlPressed) {
        let gridPos = gridRenderer.screenToGrid(mouseX, mouseY);

        if (gridPos) {
            if (mouseButton === LEFT) {
                gridSystem.setCell(gridPos.x, gridPos.y, gameRules.cellPhases);
            } else if (mouseButton === RIGHT) {
                gridSystem.setCell(gridPos.x, gridPos.y, 0);
            }
            needsRender = true;
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
        needsRender = true;
        return false;
    }
}

// Prevent right-click context menu on canvas
document.addEventListener('contextmenu', function (e) {
    if (e.target.tagName === 'CANVAS') {
        e.preventDefault();
    }
});