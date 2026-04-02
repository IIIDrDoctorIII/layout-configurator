// src/canvas.js
import { fabric } from 'fabric';
import { saveState } from './state.js';

export const GRID_SIZE = 20;
export const CANVAS_WIDTH = 3000;
export const CANVAS_HEIGHT = 2000;

// Global Toggles
export let isSnapping = true;
export let showGrid = true;
export let showMeasurements = true;
export let globalTextSize = 12;

// Initialize Canvas
export const canvas = new fabric.Canvas('c', { 
    backgroundColor: '#ffffff', 
    preserveObjectStacking: true, 
    selectionKey: 'shiftKey' 
});

export let gridGroup = null;

export function drawGrid() {
    // 1. Aggressively purge any rogue grids loaded from bad JSON files
    canvas.getObjects().forEach(obj => {
        if (obj.id === 'grid_overlay') canvas.remove(obj);
    });
    
    const lines = [];
    for (let i = 0; i < (CANVAS_WIDTH / GRID_SIZE); i++) {
        lines.push(new fabric.Line([i * GRID_SIZE, 0, i * GRID_SIZE, CANVAS_HEIGHT], { stroke: '#dcdde1', selectable: false, evented: false }));
    }
    for (let i = 0; i < (CANVAS_HEIGHT / GRID_SIZE); i++) {
        lines.push(new fabric.Line([0, i * GRID_SIZE, CANVAS_WIDTH, i * GRID_SIZE], { stroke: '#dcdde1', selectable: false, evented: false }));
    }
    
    gridGroup = new fabric.Group(lines, { 
        selectable: false, 
        evented: false, 
        id: 'grid_overlay', 
        visible: showGrid,
        excludeFromExport: true // <-- This prevents the grid from ever saving to JSON!
    });
    
    canvas.add(gridGroup);
    gridGroup.sendToBack();
}

export function resizeCanvas() {
    const workspace = document.getElementById('workspace');
    if (workspace) {
        canvas.setWidth(workspace.clientWidth);
        canvas.setHeight(workspace.clientHeight);
        canvas.renderAll();
    }
}

// Helper: Converts Hex colors to semi-transparent RGBA for "Zones"
export function hexToRgbA(hex, alpha) {
    let c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length === 3){ c= [c[0], c[0], c[1], c[1], c[2], c[2]]; }
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
    }
    return hex;
}

export function applyDesignationStyles(obj, designation) {
    obj.customDesignation = designation;
    
    let baseColor = obj.customColor;
    if (!baseColor) {
        baseColor = designation === 'zone' ? '#2ecc71' : designation === 'room' ? '#2c3e50' : '#3498db';
        obj.customColor = baseColor;
    }

    obj.setControlsVisibility({ tl: true, tr: true, bl: true, br: true, mt: true, mb: true, ml: true, mr: true, mtr: true });
    obj.set({ lockScalingX: false, lockScalingY: false, opacity: 1 });

    let strokeW = obj.customStrokeWidth !== undefined ? obj.customStrokeWidth : (designation === 'room' ? 4 : 2);

    switch(designation) {
        case 'zone':
            obj.set({ fill: hexToRgbA(baseColor, 0.3), stroke: baseColor, strokeWidth: strokeW, strokeUniform: true });
            break;
        case 'object':
            obj.set({ fill: baseColor, stroke: baseColor, strokeWidth: strokeW, strokeUniform: true });
            break;
        case 'room':
            obj.set({ fill: 'transparent', stroke: baseColor, strokeWidth: strokeW, strokeUniform: true });
            break;
        case 'measurement':
            obj.set({ fill: baseColor, stroke: baseColor, strokeWidth: strokeW, strokeUniform: true, lockScalingY: true });
            obj.setControlsVisibility({ tl: false, tr: false, bl: false, br: false, mt: false, mb: false });
            break;
        case 'blueprint':
            obj.set({ opacity: 0.5 });
            break;
    }
    canvas.requestRenderAll();
}

export function getCenterPoint() {
    return {
        x: (canvas.width / 2 - canvas.viewportTransform[4]) / canvas.getZoom(),
        y: (canvas.height / 2 - canvas.viewportTransform[5]) / canvas.getZoom()
    };
}

export function addShape(shapeType) {
    const pt = getCenterPoint();
    let obj;
    let defaultDesig = shapeType === 'rect' ? 'zone' : 'object'; 

    const commonProps = {
        left: pt.x, top: pt.y, 
        transparentCorners: false, cornerColor: '#e74c3c', cornerSize: 12,
        customName: `New ${shapeType}`, customDesignation: defaultDesig,
        customLocked: false
    };

    if (shapeType === 'rect') { 
        obj = new fabric.Rect({ ...commonProps, width: GRID_SIZE * 6, height: GRID_SIZE * 6 }); 
    } 
    else if (shapeType === 'circle') { 
        obj = new fabric.Circle({ ...commonProps, radius: GRID_SIZE * 2 }); 
    } 
    else if (shapeType === 'triangle') { 
        obj = new fabric.Triangle({ ...commonProps, width: GRID_SIZE * 4, height: GRID_SIZE * 4 }); 
    }
    else if (shapeType === 'right-triangle') { 
        obj = new fabric.Polygon([
            {x: 0, y: 0},
            {x: 0, y: GRID_SIZE * 4},
            {x: GRID_SIZE * 4, y: GRID_SIZE * 4}
        ], { ...commonProps }); 
    }
    else if (shapeType === 'measure') { 
        defaultDesig = 'measurement';
        obj = new fabric.Rect({ ...commonProps, width: GRID_SIZE * 5, height: 2, customName: 'Dimension', customDesignation: defaultDesig }); 
    }

    applyDesignationStyles(obj, defaultDesig);
    canvas.add(obj); 
    canvas.setActiveObject(obj);
}

// --- Toggles & Adjustments ---
export function toggleSnap() {
    isSnapping = !isSnapping;
    const btn = document.getElementById('btn-snap');
    if (btn) {
        btn.textContent = `Snap: ${isSnapping ? 'ON' : 'OFF'}`;
        btn.className = isSnapping ? 'active' : 'secondary';
    }
}

export function toggleGridVisuals() {
    showGrid = !showGrid;
    const btn = document.getElementById('btn-grid');
    if (btn) {
        btn.textContent = `Grid: ${showGrid ? 'ON' : 'OFF'}`;
        btn.className = showGrid ? 'active' : 'secondary';
    }
    if (gridGroup) {
        gridGroup.set('visible', showGrid);
        canvas.requestRenderAll();
    }
}

export function toggleMeasurements() {
    showMeasurements = !showMeasurements;
    const btn = document.getElementById('btn-measure-toggle');
    if (btn) {
        btn.textContent = `Dims: ${showMeasurements ? 'ON' : 'OFF'}`;
        btn.className = showMeasurements ? 'active' : 'secondary';
    }
    canvas.requestRenderAll();
}

export function changeTextSize(delta) {
    globalTextSize += delta;
    if (globalTextSize < 6) globalTextSize = 6;
    if (globalTextSize > 36) globalTextSize = 36;
    canvas.requestRenderAll();
}

// --- Navigation State ---
export let isPanMode = false;
let isDragging = false;
let lastPosX = 0;
let lastPosY = 0;

export function zoomCanvas(factor) {
    let zoom = canvas.getZoom() * factor;
    if (zoom > 5) zoom = 5; if (zoom < 0.2) zoom = 0.2;
    canvas.zoomToPoint({ x: canvas.width / 2, y: canvas.height / 2 }, zoom);
}

export function togglePanMode() {
    isPanMode = !isPanMode;
    const btn = document.getElementById('btn-pan');
    if (isPanMode) {
        btn.classList.add('warning'); btn.classList.remove('secondary'); btn.textContent = '1-Finger Pan: ON';
        canvas.selection = false; canvas.discardActiveObject();
        canvas.getObjects().forEach(obj => { if(obj.id !== 'grid_overlay') obj.selectable = false; });
    } else {
        btn.classList.remove('warning'); btn.classList.add('secondary'); btn.textContent = '1-Finger Pan';
        canvas.selection = true;
        canvas.getObjects().forEach(obj => { if(obj.id !== 'grid_overlay' && !obj.customLocked) obj.selectable = true; });
    }
    canvas.requestRenderAll();
}

// Mouse Wheel Zoom & Alt-Drag Pan
canvas.on('mouse:down', function(opt) { 
    if ((isPanMode || opt.e.altKey) && !opt.e.touches) { 
        isDragging = true; lastPosX = opt.e.clientX; lastPosY = opt.e.clientY; 
    } 
});
canvas.on('mouse:move', function(opt) {
    if (isDragging && !opt.e.touches) {
        let vpt = canvas.viewportTransform;
        vpt[4] += opt.e.clientX - lastPosX; vpt[5] += opt.e.clientY - lastPosY;
        canvas.requestRenderAll(); lastPosX = opt.e.clientX; lastPosY = opt.e.clientY;
    }
});
canvas.on('mouse:up', function(opt) { 
    if (isDragging && !opt.e.touches) { 
        canvas.setViewportTransform(canvas.viewportTransform); isDragging = false; 
    } 
});
canvas.on('mouse:wheel', function(opt) {
    let zoom = canvas.getZoom() * (0.999 ** opt.e.deltaY);
    if (zoom > 5) zoom = 5; if (zoom < 0.2) zoom = 0.2;
    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    opt.e.preventDefault(); opt.e.stopPropagation();
});

// Mobile Touch Gestures
let touchState = { pinching: false, initialDistance: 0, initialZoom: 1, lastMidpoint: { x: 0, y: 0 } };
function getTouchDistance(touches) { return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY); }
function getTouchMidpoint(touches) { return { x: (touches[0].clientX + touches[1].clientX) / 2, y: (touches[0].clientY + touches[1].clientY) / 2 }; }

canvas.on('touchstart', function(opt) {
    if (!opt.e.touches) return;
    if (opt.e.touches.length === 2) {
        opt.e.preventDefault();
        touchState.pinching = true; touchState.initialDistance = getTouchDistance(opt.e.touches);
        touchState.initialZoom = canvas.getZoom(); touchState.lastMidpoint = getTouchMidpoint(opt.e.touches);
        canvas.selection = false;
    } else if (opt.e.touches.length === 1 && isPanMode) {
        opt.e.preventDefault(); isDragging = true;
        lastPosX = opt.e.touches[0].clientX; lastPosY = opt.e.touches[0].clientY;
    }
});

canvas.on('touchmove', function(opt) {
    if (!opt.e.touches) return;
    if (touchState.pinching && opt.e.touches.length === 2) {
        opt.e.preventDefault();
        const currentDistance = getTouchDistance(opt.e.touches); const currentMidpoint = getTouchMidpoint(opt.e.touches);
        let newZoom = touchState.initialZoom * (currentDistance / touchState.initialDistance);
        if (newZoom > 5) newZoom = 5; if (newZoom < 0.2) newZoom = 0.2;
        canvas.zoomToPoint({ x: currentMidpoint.x, y: currentMidpoint.y }, newZoom);
        let vpt = canvas.viewportTransform;
        vpt[4] += currentMidpoint.x - touchState.lastMidpoint.x; vpt[5] += currentMidpoint.y - touchState.lastMidpoint.y;
        canvas.requestRenderAll(); touchState.lastMidpoint = currentMidpoint;
    } else if (isDragging && isPanMode && opt.e.touches.length === 1) {
        opt.e.preventDefault();
        let vpt = canvas.viewportTransform;
        vpt[4] += opt.e.touches[0].clientX - lastPosX; vpt[5] += opt.e.touches[0].clientY - lastPosY;
        canvas.requestRenderAll(); lastPosX = opt.e.touches[0].clientX; lastPosY = opt.e.touches[0].clientY;
    }
});

canvas.on('touchend', function(opt) {
    if (!opt.e.touches) return;
    if (touchState.pinching && opt.e.touches.length < 2) {
        touchState.pinching = false; canvas.setViewportTransform(canvas.viewportTransform);
        if (!isPanMode) canvas.selection = true;
    }
    if (isDragging && opt.e.touches.length === 0) { isDragging = false; canvas.setViewportTransform(canvas.viewportTransform); }
});

// Utilities
export function duplicateSelected(customPropsArray) {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    activeObject.clone(function(cloned) {
        canvas.discardActiveObject();
        cloned.set({ left: cloned.left + GRID_SIZE, top: cloned.top + GRID_SIZE, evented: true });
        if (cloned.type === 'activeSelection') {
            cloned.canvas = canvas;
            cloned.forEachObject(function(obj) { canvas.add(obj); });
            cloned.setCoords();
        } else { canvas.add(cloned); }
        cloned.customName = (activeObject.customName || 'Item') + ' (Copy)';
        canvas.setActiveObject(cloned);
        canvas.requestRenderAll();
    }, customPropsArray);
}

export function toggleGroup() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    if (activeObj.type === 'activeSelection') {
        activeObj.toGroup();
        const newGroup = canvas.getActiveObject();
        newGroup.set({ customName: 'Grouped Objects', customDesignation: 'object', customLocked: false });
        canvas.requestRenderAll();
    } else if (activeObj.type === 'group' && activeObj.id !== 'grid_overlay') {
        activeObj.toActiveSelection();
        canvas.requestRenderAll();
    }
}

// Text Rendering
function drawBadgeText(ctx, text, x, y, size) {
    if(!text) return;
    ctx.font = `bold ${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let textWidth = ctx.measureText(text).width;
    let padding = size * 0.2;
    
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(x - textWidth/2 - padding, y - (size/2) - padding, textWidth + (padding*2), size + (padding*2));
    
    ctx.fillStyle = '#2c3e50';
    ctx.fillText(text, x, y);
}

canvas.on('after:render', function() {
    if (!showMeasurements) return;
    const ctx = canvas.contextContainer;
    ctx.save();
    ctx.transform.apply(ctx, canvas.viewportTransform);

    let nameSize = globalTextSize;
    let dimSize = Math.max(6, globalTextSize - 1);

    canvas.getObjects().forEach(obj => {
        if (obj.id === 'grid_overlay' || obj === canvas.backgroundImage || obj.customDesignation === 'blueprint') return;
        
        let wVal = ((obj.width * obj.scaleX) / GRID_SIZE).toFixed(1);
        let hVal = obj.type === 'circle' ? ((obj.radius * 2 * obj.scaleY) / GRID_SIZE).toFixed(1) : ((obj.height * obj.scaleY) / GRID_SIZE).toFixed(1);
        
        let name = obj.customName || '';
        let center = obj.getCenterPoint(); 
        
        let physicalW = obj.width * obj.scaleX;
        let physicalH = obj.type === 'circle' ? (obj.radius * 2 * obj.scaleY) : (obj.height * obj.scaleY);

        if (obj.customDesignation === 'measurement') {
            ctx.save();
            ctx.translate(center.x, center.y);
            ctx.rotate(obj.angle * Math.PI / 180);
            
            let w = physicalW / 2;
            let arrowLen = 16;         
            let arrowHalfWidth = 6;    
            let endCapHeight = 20; 
            
            ctx.fillStyle = obj.customColor || '#3498db';
            ctx.strokeStyle = obj.customColor || '#3498db';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.moveTo(-w, -endCapHeight/2); ctx.lineTo(-w, endCapHeight/2);
            ctx.moveTo(w, -endCapHeight/2); ctx.lineTo(w, endCapHeight/2);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(-w, 0);
            ctx.lineTo(-w + arrowLen, -arrowHalfWidth);
            ctx.lineTo(-w + arrowLen, arrowHalfWidth);
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(w, 0);
            ctx.lineTo(w - arrowLen, -arrowHalfWidth);
            ctx.lineTo(w - arrowLen, arrowHalfWidth);
            ctx.fill();
            
            ctx.restore();

            drawBadgeText(ctx, `${wVal}'`, center.x, center.y - 14, dimSize);
            if (name) drawBadgeText(ctx, name, center.x, center.y + 14, dimSize); 
            
        } else {
            if (name) drawBadgeText(ctx, name, center.x, center.y, nameSize);

            ctx.fillStyle = '#c0392b'; 
            ctx.font = `${dimSize}px sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            ctx.fillText(`${wVal}'`, center.x, center.y - (physicalH/2) - 4);

            ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            ctx.fillText(`${hVal}'`, center.x - (physicalW/2) - 4, center.y);
        }
    });
    ctx.restore();
});

// --- Snap to Grid Hooks ---
canvas.on('object:moving', function(options) {
    if (!isSnapping) return;
    options.target.set({ left: Math.round(options.target.left / GRID_SIZE) * GRID_SIZE, top: Math.round(options.target.top / GRID_SIZE) * GRID_SIZE });
});

canvas.on('object:scaling', function(options) {
    if (!isSnapping) return;
    const obj = options.target;
    const locked = document.getElementById('prop-lock-aspect').checked;
    
    let baseW = obj.type === 'circle' ? obj.radius * 2 : obj.width;
    let baseH = obj.type === 'circle' ? obj.radius * 2 : obj.height;

    let newW = Math.round((baseW * obj.scaleX) / GRID_SIZE) * GRID_SIZE;
    let newH = Math.round((baseH * obj.scaleY) / GRID_SIZE) * GRID_SIZE;
    
    newW = Math.max(newW, GRID_SIZE); 
    newH = Math.max(newH, GRID_SIZE); 
    
    if (obj.customDesignation === 'measurement') {
        obj.set({ scaleX: newW / baseW, left: Math.round(obj.left / GRID_SIZE) * GRID_SIZE, top: Math.round(obj.top / GRID_SIZE) * GRID_SIZE });
        return;
    }

    if (locked) {
        let scaleX = newW / baseW;
        let scaleY = newH / baseH;
        let uniformScale = Math.abs(obj.scaleX - scaleX) > Math.abs(obj.scaleY - scaleY) ? scaleX : scaleY;
        obj.set({ scaleX: uniformScale, scaleY: uniformScale, left: Math.round(obj.left / GRID_SIZE) * GRID_SIZE, top: Math.round(obj.top / GRID_SIZE) * GRID_SIZE });
    } else {
        obj.set({ scaleX: newW / baseW, scaleY: newH / baseH, left: Math.round(obj.left / GRID_SIZE) * GRID_SIZE, top: Math.round(obj.top / GRID_SIZE) * GRID_SIZE });
    }
});

canvas.on('object:rotating', function(options) {
    if (!isSnapping) return;
    options.target.set({ angle: Math.round(options.target.angle / 45) * 45 });
});

// --- State Save Hooks ---
canvas.on('object:added', function(e) { 
    if(e.target.id !== 'grid_overlay') saveState(); 
});

canvas.on('object:modified', function(options) {
    if (options.target && options.target.id !== 'grid_overlay') {
        options.target.setCoords();
        canvas.requestRenderAll();
    }
    saveState();
});