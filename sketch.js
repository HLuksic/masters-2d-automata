// Global variables
let gridSystem;
let camera;
let renderer;
let gridRenderer;
let saveSystem;
let interface;
let populationGraph;
let overlayStats;
let controlPressed = false;
let isPlaying = false;
let needsRender = true;
let generation = 0;
let deadColor = [255, 255, 255];
let aliveColor = [0, 0, 0];
let canvasContainer = document.getElementById('canvas-container');
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
    let canvas = createCanvas(
        Math.max(1, canvasContainer.clientWidth),
        Math.max(1, canvasContainer.clientHeight),
        WEBGL
    );
    canvas.parent('canvas-container');
    canvas.style('display', 'block');

    // p5 1.9 creates a WebGL2 context by default; we share it.
    const gl = drawingContext;
    if (typeof WebGL2RenderingContext === 'undefined' || !(gl instanceof WebGL2RenderingContext)) {
        alert('This simulator requires WebGL2.');
        noLoop();
        return;
    }

    gridSystem = new GridSystem(gl);
    saveSystem = new SaveSystem();
    ui = new Interface();
    camera = new Camera();
    gridRenderer = new GridRenderer(gl);
    updateHTMLOverlay();

    // Keep the canvas filling its container (panel collapse/expand, window resize, etc.)
    new ResizeObserver(() => resizeCanvasToContainer()).observe(canvasContainer);
}

function draw() {
    if (!gridSystem) return;
    let targetFrameTime = 1000 / speed;

    if (isPlaying && millis() - lastFrameTime > targetFrameTime) {
        gridSystem.step();
        lastFrameTime = millis();
    }

    if (needsRender || isPlaying) {
        gridRenderer.render();
        needsRender = false;
        updateHTMLOverlay();
    }

    // Population is counted on the GPU and arrives asynchronously
    const samples = gridSystem.pollPopulation();
    if (samples.length > 0) {
        for (const s of samples) populationGraph.addSample(s.generation, s.population);
        updateHTMLOverlay();
    }
}

function updateHTMLOverlay() {
    let overlay = document.getElementById('info-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'info-overlay';
        overlayStats = document.createElement('div');
        overlay.appendChild(overlayStats);
        populationGraph = new PopulationGraph(overlay, { windowSize: 200, width: 200, height: 56 });
        canvasContainer.appendChild(overlay);
    }

    overlayStats.innerHTML = `FPS: ${floor(frameRate())}<br>Gen: ${generation}`;
    populationGraph.draw(gridSystem.getPopulation());
}

function resizeCanvasToContainer() {
    if (!gridRenderer) return;
    const w = Math.max(1, Math.floor(canvasContainer.clientWidth));
    const h = Math.max(1, Math.floor(canvasContainer.clientHeight));
    if (w === width && h === height) return;

    resizeCanvas(w, h, true);
    gridRenderer.resize();
    needsRender = true; // resizing clears the canvas, so redraw
}

function windowResized() {
    resizeCanvasToContainer();
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