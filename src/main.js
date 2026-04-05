// src/main.js
import { setupUI } from './ui.js';
import { drawGrid, resizeCanvas } from './canvas.js';

window.addEventListener('load', () => {
    resizeCanvas();
    drawGrid();
    setupUI();
});

window.addEventListener('resize', resizeCanvas);