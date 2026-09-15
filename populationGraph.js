// Compact, translucent rolling graph of population over the last `windowSize` generations.
class PopulationGraph {
    constructor(parent, options = {}) {
        this.windowSize = options.windowSize ?? 200;
        this.cssWidth = options.width ?? 200;
        this.cssHeight = options.height ?? 56;
        this.lineColor = options.lineColor ?? 'rgba(19, 187, 42, 0.95)';
        this.fillColor = options.fillColor ?? 'rgba(19, 187, 42, 0.15)';
        this.textColor = options.textColor ?? 'rgba(150, 150, 150, 0.95)';
        this.bgColor = options.bgColor ?? 'rgba(128, 128, 128, 0.12)';

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'pop-graph';
        this.canvas.style.width = `${this.cssWidth}px`;
        this.canvas.style.height = `${this.cssHeight}px`;
        parent.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.dpr = 0;

        this.gens = [];
        this.pops = [];
        this.dirty = true;
    }

    reset() {
        this.gens.length = 0;
        this.pops.length = 0;
        this.dirty = true;
    }

    addSample(generation, population) {
        let n = this.gens.length;

        // Generation counter was reset (clear, randomize, rule change...) -> start a fresh history
        if (n > 0 && generation < this.gens[n - 1]) {
            this.reset();
            n = 0;
        }

        if (n > 0 && generation === this.gens[n - 1]) {
            this.pops[n - 1] = population;          // e.g. painting while paused
        } else {
            this.gens.push(generation);
            this.pops.push(population);
        }

        // Drop samples that have scrolled out (keep one just outside so the line reaches the left edge)
        const cutoff = generation - this.windowSize;
        let drop = 0;
        while (drop < this.gens.length - 1 && this.gens[drop + 1] <= cutoff) drop++;
        if (drop > 0) {
            this.gens.splice(0, drop);
            this.pops.splice(0, drop);
        }

        this.dirty = true;
    }

    static formatCompact(v) {
        if (v >= 1e9) return (v / 1e9).toFixed(2) + 'G';
        if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
        if (v >= 1e4) return (v / 1e3).toFixed(1) + 'k';
        return String(Math.round(v));
    }

    draw(currentPopulation) {
        if (!this.dirty) return;
        this.dirty = false;

        const dpr = window.devicePixelRatio || 1;
        const w = this.cssWidth, h = this.cssHeight;
        if (dpr !== this.dpr) {
            this.dpr = dpr;
            this.canvas.width = Math.round(w * dpr);
            this.canvas.height = Math.round(h * dpr);
        }

        const ctx = this.ctx;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = this.bgColor;
        ctx.fillRect(0, 0, w, h);

        ctx.font = '10px monospace';
        ctx.textBaseline = 'top';
        ctx.fillStyle = this.textColor;
        ctx.textAlign = 'left';
        ctx.fillText(`Pop ${currentPopulation.toLocaleString()}`, 4, 3);

        const n = this.gens.length;
        if (n === 0) return;

        // X: fill left-to-right until the window is full, then scroll
        const latest = this.gens[n - 1];
        const xMin = Math.max(this.gens[0], latest - this.windowSize);
        const xMax = xMin + this.windowSize;

        // Y: fit the visible samples exactly (with padding) so jumps always fit
        let lo = Infinity, hi = -Infinity;
        for (let i = 0; i < n; i++) {
            if (this.gens[i] < xMin) continue;
            const p = this.pops[i];
            if (p < lo) lo = p;
            if (p > hi) hi = p;
        }
        const span = hi - lo;
        const pad = span > 0 ? span * 0.1 : Math.max(1, hi * 0.05);
        const yLo = Math.max(0, lo - pad);
        const yHi = hi + pad;

        ctx.textAlign = 'right';
        ctx.fillText(`${PopulationGraph.formatCompact(lo)}–${PopulationGraph.formatCompact(hi)}`, w - 4, 3);

        const left = 3, right = w - 3, top = 16, bottom = h - 3;
        const xs = g => left + (g - xMin) / (xMax - xMin) * (right - left);
        const ys = p => bottom - (p - yLo) / (yHi - yLo) * (bottom - top);

        ctx.save();
        ctx.beginPath();
        ctx.rect(left, top, right - left, bottom - top);
        ctx.clip();

        if (n === 1) {
            ctx.fillStyle = this.lineColor;
            ctx.beginPath();
            ctx.arc(xs(this.gens[0]), ys(this.pops[0]), 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }

        const firstX = xs(this.gens[0]);
        const lastX = xs(this.gens[n - 1]);

        // Area fill
        ctx.beginPath();
        ctx.moveTo(firstX, bottom);
        for (let i = 0; i < n; i++) ctx.lineTo(xs(this.gens[i]), ys(this.pops[i]));
        ctx.lineTo(lastX, bottom);
        ctx.closePath();
        ctx.fillStyle = this.fillColor;
        ctx.fill();

        // Line
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const x = xs(this.gens[i]), y = ys(this.pops[i]);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = this.lineColor;
        ctx.lineWidth = 1.25;
        ctx.lineJoin = 'round';
        ctx.stroke();

        ctx.restore();
    }
}