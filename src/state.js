// src/state.js
import { canvas, gridGroup, applyDesignationStyles } from './canvas.js';
import { supabase } from './supabase.js';
import { getCurrentUser } from './auth.js';

let history = [];
let redoStack = [];
let isRestoring = false;
let historyCallback = null;

export const customProps = ['customName', 'customColor', 'customDesignation', 'customLocked', 'customStrokeWidth', 'id', 'selectable', 'evented', 'lockScalingX', 'lockScalingY'];

export function setHistoryCallback(cb) { historyCallback = cb; }

export function saveState() {
    if (isRestoring) return;
    const json = canvas.toJSON(customProps);
    if (history.length > 0 && history[history.length - 1] === JSON.stringify(json)) return;
    history.push(JSON.stringify(json));
    redoStack = [];
    if (history.length > 50) history.shift();
    if (historyCallback) historyCallback(history.length > 1, redoStack.length > 0);
}

export function undo() {
    if (history.length <= 1) return;
    isRestoring = true;
    redoStack.push(history.pop());
    renderState(history[history.length - 1]);
}

export function redo() {
    if (redoStack.length === 0) return;
    isRestoring = true;
    const next = redoStack.pop();
    history.push(next);
    renderState(next);
}

function renderState(stateJSON) {
    canvas.loadFromJSON(stateJSON, () => {
        canvas.getObjects().forEach(obj => {
            if (obj.id === 'grid_overlay') canvas.remove(obj);
            else {
                applyDesignationStyles(obj, obj.customDesignation || 'object');
                if (obj.customLocked) { obj.selectable = false; obj.evented = false; }
            }
        });
        if (gridGroup) canvas.sendToBack(gridGroup);
        canvas.requestRenderAll();
        isRestoring = false;
        if (historyCallback) historyCallback(history.length > 1, redoStack.length > 0);
    });
}

// --- CLOUD STORAGE LOGIC ---
export async function saveToCloud(projectName) {
    const user = await getCurrentUser();
    if (!user) {
        alert("You must be logged in to save to the cloud!");
        return;
    }

    const layoutData = canvas.toJSON(customProps);
    
    const { data, error } = await supabase
        .from('layouts')
        .upsert({ 
            name: projectName, 
            data: layoutData, 
            user_id: user.id 
        }, { onConflict: 'name, user_id' }); // Overwrite if same name/user

    if (error) {
        console.error(error);
        alert("Error saving to cloud: " + error.message);
    } else {
        alert("Layout saved successfully to the cloud!");
    }
}

export function exportJSON(projectName) {
    const json = canvas.toJSON(customProps);
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `LC-${projectName || 'Untitled'}-${new Date().getTime()}.json`;
    a.click();
}

export function loadJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        renderState(e.target.result);
        history = [e.target.result]; redoStack = []; saveState();
    };
    reader.readAsText(file);
}