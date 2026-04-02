// src/main.js
import { drawGrid, resizeCanvas } from './canvas.js';
import { setupUI } from './ui.js';
import { saveState } from './state.js'; // <-- Import the save function

// Setup basic window resizing and initial grid
window.addEventListener('resize', resizeCanvas);

// Give the DOM a tiny fraction of a second to settle, then draw
setTimeout(() => { 
    resizeCanvas(); 
    drawGrid(true); 
    setupUI(); 
    saveState(); // <-- Capture the "empty canvas" baseline state
}, 100);