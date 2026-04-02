// src/state.js
import { canvas, gridGroup, applyDesignationStyles } from './canvas.js';

let history = [];
let redoStack = [];
let isRestoring = false;
let historyCallback = null;

// Custom properties to preserve during JSON export/import
export const customProps = [
    'customName', 
    'customColor', 
    'customDesignation', 
    'customLocked', 
    'customStrokeWidth', 
    'id', 
    'selectable', 
    'evented',
    'lockScalingX',
    'lockScalingY'
];

export function setHistoryCallback(cb) {
    historyCallback = cb;
}

export function saveState() {
    if (isRestoring) return;
    
    // Create a snapshot of the canvas (excluding the grid)
    const json = canvas.toJSON(customProps);
    
    // Only save if the state has actually changed
    if (history.length > 0 && history[history.length - 1] === JSON.stringify(json)) {
        return;
    }

    history.push(JSON.stringify(json));
    redoStack = []; // Clear redo stack on new action
    
    if (history.length > 50) history.shift(); // Limit history size
    
    if (historyCallback) {
        historyCallback(history.length > 1, redoStack.length > 0);
    }
}

export function undo() {
    if (history.length <= 1) return;
    
    isRestoring = true;
    const currentState = history.pop();
    redoStack.push(currentState);
    
    const previousState = history[history.length - 1];
    renderState(previousState);
}

export function redo() {
    if (redoStack.length === 0) return;
    
    isRestoring = true;
    const nextState = redoStack.pop();
    history.push(nextState);
    
    renderState(nextState);
}

function renderState(stateJSON) {
    canvas.loadFromJSON(stateJSON, () => {
        // Post-load cleanup
        canvas.getObjects().forEach(obj => {
            if (obj.id === 'grid_overlay') {
                canvas.remove(obj);
            } else {
                // Re-apply visual styles based on saved designations
                applyDesignationStyles(obj, obj.customDesignation || 'object');
                // Ensure locked items stay locked
                if (obj.customLocked) {
                    obj.selectable = false;
                    obj.evented = false;
                }
            }
        });

        // Ensure the grid is always at the bottom if it exists
        if (gridGroup) {
            canvas.sendToBack(gridGroup);
        }
        
        canvas.requestRenderAll();
        isRestoring = false;
        
        if (historyCallback) {
            historyCallback(history.length > 1, redoStack.length > 0);
        }
    });
}

export function exportJSON(projectName) {
    const json = canvas.toJSON(customProps);
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LC-${projectName || 'Untitled'}-${new Date().getTime()}.json`;
    a.click();
}

export function loadJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        renderState(e.target.result);
        // Reset history for the new file
        history = [e.target.result];
        redoStack = [];
        saveState();
    };
    reader.readAsText(file);
}