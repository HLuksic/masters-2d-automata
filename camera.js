class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.zoom = 1.7;
        this.minZoom = 0.1;
        this.maxZoom = 5;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
    }

    apply() {
        push();
        translate(width / 2, height / 2);
        scale(this.zoom);
        translate(-this.x, -this.y);
    }

    unapply() {
        pop();
    }

    screenToWorld(screenX, screenY) {
        let worldX = (screenX - width / 2) / this.zoom + this.x;
        let worldY = (screenY - height / 2) / this.zoom + this.y;
        return { x: worldX, y: worldY };
    }

    startDrag(x, y) {
        this.isDragging = true;
        this.lastMouseX = x;
        this.lastMouseY = y;
    }

    updateDrag(x, y) {
        if (this.isDragging) {
            let dx = (x - this.lastMouseX) / this.zoom;
            let dy = (y - this.lastMouseY) / this.zoom;
            this.x -= dx;
            this.y -= dy;
            this.lastMouseX = x;
            this.lastMouseY = y;
        }
    }

    endDrag() {
        this.isDragging = false;
    }

    zoomAt(x, y, factor) {
        let worldPos = this.screenToWorld(x, y);
        this.zoom *= factor;
        this.zoom = constrain(this.zoom, this.minZoom, this.maxZoom);

        // Adjust position to zoom toward mouse
        let newWorldPos = this.screenToWorld(x, y);
        this.x += worldPos.x - newWorldPos.x;
        this.y += worldPos.y - newWorldPos.y;
    }
}