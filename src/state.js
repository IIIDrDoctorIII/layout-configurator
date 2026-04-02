// src/state.js
import { canvas, applyDesignationStyles, drawGrid } from './canvas.js';

// The custom properties we need Fabric to remember when saving
export const customProps = ['customName', 'customDesc', 'customDesignation', 'customColor', 'customLocked', 'customStrokeWidth', 'id'];

let stateHistory = [];
let historyIndex = -1;
let isHistoryProcessing = false;

// UI hook to update button disabled states
export let onHistoryChange = () => {};

export function setHistoryCallback(callback) {
    onHistoryChange = callback;
}

export function saveState() {
    if (isHistoryProcessing) return;
    if (historyIndex < stateHistory.length - 1) { 
        stateHistory = stateHistory.slice(0, historyIndex + 1); 
    }
    stateHistory.push(JSON.stringify(canvas.toJSON(customProps)));
    historyIndex++;
    onHistoryChange(historyIndex > 0, historyIndex < stateHistory.length - 1);
}

export function undo() {
    if (historyIndex > 0) {
        isHistoryProcessing = true;
        historyIndex--;
        canvas.loadFromJSON(stateHistory[historyIndex], function() {
            canvas.getObjects().forEach(obj => { 
                if (obj.customDesignation) applyDesignationStyles(obj, obj.customDesignation); 
            });
            drawGrid(); 
            canvas.requestRenderAll();
            isHistoryProcessing = false; 
            onHistoryChange(historyIndex > 0, historyIndex < stateHistory.length - 1);
        });
    }
}

export function redo() {
    if (historyIndex < stateHistory.length - 1) {
        isHistoryProcessing = true;
        historyIndex++;
        canvas.loadFromJSON(stateHistory[historyIndex], function() {
            canvas.getObjects().forEach(obj => { 
                if (obj.customDesignation) applyDesignationStyles(obj, obj.customDesignation); 
            });
            drawGrid(); 
            canvas.requestRenderAll();
            isHistoryProcessing = false; 
            onHistoryChange(historyIndex > 0, historyIndex < stateHistory.length - 1);
        });
    }
}

// Generates a timestamp for the filename
function generateTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const datePart = `${pad(now.getMonth() + 1)}${pad(now.getDate())}${String(now.getFullYear()).slice(-2)}`;
    const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `${datePart}-${timePart}`;
}

export function exportJSON(projectName) {
    const json = canvas.toJSON(customProps);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(json));
    const dlAnchorElem = document.createElement('a');
    
    let safeProjectName = projectName ? projectName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') : 'Untitled';
    let timestamp = generateTimestamp();
    let fileName = `LC-${safeProjectName}-${timestamp}.json`;

    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", fileName); 
    dlAnchorElem.click();
}

export function loadJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(f) { 
        canvas.loadFromJSON(f.target.result, function() { 
            canvas.getObjects().forEach(obj => { 
                if (obj.customDesignation) applyDesignationStyles(obj, obj.customDesignation); 
            });
            drawGrid(); 
            canvas.requestRenderAll(); 
            saveState(); 
        }); 
    };
    reader.readAsText(file);
}