// src/ui.js
import { canvas, addShape, applyDesignationStyles, GRID_SIZE, gridGroup, zoomCanvas, togglePanMode, duplicateSelected, toggleGroup, getCenterPoint, toggleSnap, toggleGridVisuals, toggleMeasurements, changeTextSize } from './canvas.js';
import { undo, redo, exportJSON, loadJSON, setHistoryCallback, customProps, saveState } from './state.js';
import { fabric } from 'fabric';

export function setupUI() {
    // --- Help Modal Logic ---
    const helpModal = document.getElementById('help-modal');
    const toggleHelp = () => helpModal.classList.toggle('active');
    document.getElementById('btn-help').addEventListener('click', toggleHelp);
    document.getElementById('btn-close-help').addEventListener('click', toggleHelp);

    // --- Shape Creation Buttons ---
    document.getElementById('btn-add-rect').addEventListener('click', () => addShape('rect'));
    document.getElementById('btn-add-circle').addEventListener('click', () => addShape('circle'));
    document.getElementById('btn-add-tri').addEventListener('click', () => addShape('triangle'));
    document.getElementById('btn-add-right-tri').addEventListener('click', () => addShape('right-triangle'));
    document.getElementById('btn-add-measure').addEventListener('click', () => addShape('measure'));

    // --- Canvas Event Hooks ---
    canvas.on('selection:created', updatePropertiesUI);
    canvas.on('selection:updated', updatePropertiesUI);
    canvas.on('selection:cleared', updatePropertiesUI);
    canvas.on('object:scaling', updateDimensionsUI);
    canvas.on('object:modified', updateDimensionsUI);
    canvas.on('object:added', updateObjectList);
    canvas.on('object:removed', updateObjectList);

    // --- Properties Panel Event Listeners ---
    const propName = document.getElementById('prop-name');
    const propColor = document.getElementById('prop-color');
    const propType = document.getElementById('prop-type');
    const propWidth = document.getElementById('prop-width');
    const propHeight = document.getElementById('prop-height');
    const propAngle = document.getElementById('prop-angle');
    const propThickness = document.getElementById('prop-thickness');
    const aspectLock = document.getElementById('prop-lock-aspect');
    const btnRotate45 = document.getElementById('btn-rotate-45');

    canvas.uniScaleTransform = !aspectLock.checked;
    aspectLock.addEventListener('change', (e) => {
        canvas.uniScaleTransform = !e.target.checked;
        canvas.requestRenderAll();
    });

    propName.addEventListener('input', (e) => updateActiveObject('customName', e.target.value));

    propColor.addEventListener('input', (e) => {
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.type !== 'activeSelection') {
            activeObj.customColor = e.target.value;
            applyDesignationStyles(activeObj, activeObj.customDesignation || 'object');
            saveState();
        }
    });

    propType.addEventListener('change', (e) => {
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.type !== 'activeSelection') {
            applyDesignationStyles(activeObj, e.target.value);
            saveState();
        }
    });

    propWidth.addEventListener('change', (e) => handleDimensionInput('width', e.target.value));
    propHeight.addEventListener('change', (e) => handleDimensionInput('height', e.target.value));

    propAngle.addEventListener('change', (e) => {
        const obj = canvas.getActiveObject();
        if(obj && obj.type !== 'activeSelection') {
            obj.rotate(parseFloat(e.target.value) || 0);
            obj.setCoords();
            canvas.requestRenderAll();
            saveState();
        }
    });

    if(btnRotate45) {
        btnRotate45.addEventListener('click', () => {
            const obj = canvas.getActiveObject();
            if(obj && obj.type !== 'activeSelection') {
                let currentAngle = obj.angle || 0;
                obj.rotate((currentAngle + 45) % 360);
                obj.setCoords();
                canvas.requestRenderAll();
                updatePropertiesUI();
                saveState();
            }
        });
    }

    propThickness.addEventListener('change', (e) => {
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.type !== 'activeSelection') {
            activeObj.customStrokeWidth = parseFloat(e.target.value);
            applyDesignationStyles(activeObj, activeObj.customDesignation || 'object');
            saveState();
        }
    });

    // --- History & File I/O ---
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');

    btnUndo.addEventListener('click', undo);
    btnRedo.addEventListener('click', redo);

    setHistoryCallback((canUndo, canRedo) => {
        btnUndo.disabled = !canUndo;
        btnRedo.disabled = !canRedo;
        updateObjectList();
    });

    document.getElementById('btn-save-json').addEventListener('click', () => {
        exportJSON(document.getElementById('project-name').value);
    });

    document.getElementById('json-upload').addEventListener('change', (e) => {
        loadJSON(e.target.files[0]);
    });

    // --- Navigation Tools ---
    document.getElementById('btn-zoom-in').addEventListener('click', () => zoomCanvas(1.2));
    document.getElementById('btn-zoom-out').addEventListener('click', () => zoomCanvas(0.8));
    document.getElementById('btn-pan').addEventListener('click', togglePanMode);

    // --- Global Toggles & Text Size ---
    const btnSnap = document.getElementById('btn-snap');
    if (btnSnap) btnSnap.addEventListener('click', toggleSnap);

    const btnGrid = document.getElementById('btn-grid');
    if (btnGrid) btnGrid.addEventListener('click', toggleGridVisuals);

    const btnMeasure = document.getElementById('btn-measure-toggle') || document.getElementById('btn-measure');
    if (btnMeasure) btnMeasure.addEventListener('click', toggleMeasurements);

    const btnTextMinus = document.getElementById('btn-text-minus');
    if (btnTextMinus) btnTextMinus.addEventListener('click', () => changeTextSize(-1));

    const btnTextPlus = document.getElementById('btn-text-plus');
    if (btnTextPlus) btnTextPlus.addEventListener('click', () => changeTextSize(1));

    // --- Utilities ---
    document.getElementById('btn-duplicate').addEventListener('click', () => {
        duplicateSelected(customProps);
        saveState();
        updateObjectList();
    });

    document.getElementById('btn-group').addEventListener('click', () => {
        toggleGroup();
        saveState();
        updatePropertiesUI();
        updateObjectList();
    });

    let clearAllTimeout;
    document.getElementById('btn-clear-all').addEventListener('click', (e) => {
        const btn = e.target;
        if (btn.innerText === "Click again to Confirm") {
            canvas.getObjects().forEach(obj => {
                if (obj.id !== 'grid_overlay') canvas.remove(obj);
            });
            canvas.discardActiveObject();
            saveState();
            btn.innerText = "Clear All Canvas";
            btn.classList.remove('warning');
            btn.classList.add('danger');
        } else {
            btn.innerText = "Click again to Confirm";
            btn.classList.remove('danger');
            btn.classList.add('warning');
            clearTimeout(clearAllTimeout);
            clearAllTimeout = setTimeout(() => {
                btn.innerText = "Clear All Canvas";
                btn.classList.remove('warning');
                btn.classList.add('danger');
            }, 3000);
        }
    });

    // --- Blueprint Image Loader ---
    document.getElementById('bg-upload').addEventListener('change', function(e) {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = function(f) {
            fabric.Image.fromURL(f.target.result, function(img) {
                const pt = getCenterPoint();
                let scale = (canvas.width * 0.4) / img.width;

                img.set({
                    left: pt.x, top: pt.y, originX: 'center', originY: 'center',
                    scaleX: scale, scaleY: scale, opacity: 0.5,
                    customName: 'Blueprint', customDesignation: 'blueprint',
                    customLocked: false
                });

                img.set({ originX: 'left', originY: 'top', left: pt.x - (img.width*scale)/2, top: pt.y - (img.height*scale)/2 });
                canvas.add(img);

                canvas.sendToBack(img);
                if (gridGroup) canvas.sendToBack(gridGroup);

                canvas.setActiveObject(img);
                saveState();
                updateObjectList();
            });
        };
        reader.readAsDataURL(file);
    });

    // --- Keyboard Shortcuts ---
    window.addEventListener('keydown', function(e) {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') {
            return;
        }

        // Delete / Backspace
        if (e.key === 'Delete' || e.key === 'Backspace') { 
            const activeObjects = canvas.getActiveObjects();
            if (activeObjects.length > 0) {
                activeObjects.forEach(obj => {
                    if (!obj.customLocked && obj.id !== 'grid_overlay') canvas.remove(obj);
                });
                canvas.discardActiveObject(); 
                canvas.requestRenderAll(); 
                saveState();
                updateObjectList();
            }
        }
        
        // Ctrl + Z (Undo)
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') { 
            e.preventDefault(); 
            undo(); 
        }
        
        // Ctrl + Y (Redo)
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') { 
            e.preventDefault(); 
            redo(); 
        }
        
        // Ctrl + D (Duplicate)
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') { 
            e.preventDefault(); 
            duplicateSelected(customProps); 
            saveState();
            updateObjectList();
        }
    });
}

// --- PROPERTIES PANEL LOGIC ---
function updateActiveObject(property, value) {
    const activeObj = canvas.getActiveObject();
    if (activeObj) {
        activeObj.set(property, value);
        canvas.requestRenderAll();
        updateObjectList();
        saveState();
    }
}

export function updatePropertiesUI() {
    const activeObj = canvas.getActiveObject();
    const propsPanel = document.getElementById('properties-panel');

    if (activeObj && activeObj.type !== 'activeSelection') {
        propsPanel.classList.add('active');
        document.getElementById('prop-name').value = activeObj.customName || '';
        document.getElementById('prop-type').value = activeObj.customDesignation || 'object';
        if (activeObj.customColor) document.getElementById('prop-color').value = activeObj.customColor;

        if (document.activeElement !== document.getElementById('prop-angle')) {
            document.getElementById('prop-angle').value = Math.round(activeObj.angle || 0);
        }

        const thicknessInput = document.getElementById('prop-thickness');
        if (document.activeElement !== thicknessInput) {
            thicknessInput.value = activeObj.customStrokeWidth !== undefined ? activeObj.customStrokeWidth : (activeObj.customDesignation === 'room' ? 4 : 2);
        }

        updateDimensionsUI();
    } else {
        propsPanel.classList.remove('active');
    }
}

function updateDimensionsUI() {
    const activeObj = canvas.getActiveObject();
    if (activeObj && activeObj.type !== 'activeSelection') {
        const width = (activeObj.width * activeObj.scaleX) / GRID_SIZE;
        const height = activeObj.type === 'circle' ? (activeObj.radius * 2 * activeObj.scaleY) / GRID_SIZE : (activeObj.height * activeObj.scaleY) / GRID_SIZE;

        const wInput = document.getElementById('prop-width');
        const hInput = document.getElementById('prop-height');

        if (document.activeElement !== wInput) wInput.value = width.toFixed(2);
        if (document.activeElement !== hInput) hInput.value = height.toFixed(2);
        canvas.requestRenderAll();
    }
}

function handleDimensionInput(axis, value) {
    const obj = canvas.getActiveObject();
    if(!obj || obj.type === 'activeSelection') return;

    let val = parseFloat(value);
    if(isNaN(val) || val <= 0) return;

    let targetPixelSize = val * GRID_SIZE;
    let locked = document.getElementById('prop-lock-aspect').checked;
    let baseW = obj.type === 'circle' ? obj.radius * 2 : obj.width;
    let baseH = obj.type === 'circle' ? obj.radius * 2 : obj.height;

    if (axis === 'width') {
        let newScaleX = targetPixelSize / baseW;
        if (locked && !obj.lockScalingY) obj.scaleY *= (newScaleX / obj.scaleX);
        obj.scaleX = newScaleX;
    } else if (axis === 'height') {
        if (obj.lockScalingY) return;
        let newScaleY = targetPixelSize / baseH;
        if (locked && !obj.lockScalingX) obj.scaleX *= (newScaleY / obj.scaleY);
        obj.scaleY = newScaleY;
    }

    obj.setCoords();
    canvas.requestRenderAll();
    updatePropertiesUI();
    saveState();
}

// --- OBJECT LIST (LAYERS) LOGIC ---
let draggedDomItem = null;

export function updateObjectList() {
    const container = document.getElementById('object-list-container');
    if (!container) return;
    container.innerHTML = '';

    const objects = [...canvas.getObjects()].reverse();

    objects.forEach((obj) => {
        if (obj.id === 'grid_overlay' || obj === canvas.backgroundImage) return;

        let li = document.createElement('div');
        li.className = 'list-item';
        li.draggable = true;
        li.canvasObj = obj; 

        if(canvas.getActiveObject() === obj) {
            li.style.backgroundColor = '#dff9fb';
            li.style.borderLeft = '3px solid #3498db';
        }

        let nameSpan = document.createElement('span');
        nameSpan.innerText = obj.customName || `Unnamed ${obj.type}`;
        nameSpan.onclick = () => {
            if (!obj.customLocked) {
                canvas.setActiveObject(obj);
                canvas.requestRenderAll();
            }
        };

        let btnContainer = document.createElement('div');
        btnContainer.className = 'layer-btn-group';

        let lockBtn = document.createElement('button');
        lockBtn.innerText = obj.customLocked ? '🔒' : '🔓';
        lockBtn.className = obj.customLocked ? 'warning' : 'secondary';
        lockBtn.title = obj.customLocked ? 'Unlock Layer' : 'Lock Layer';
        lockBtn.onclick = (e) => {
            e.stopPropagation();
            obj.customLocked = !obj.customLocked;
            
            if (obj.customLocked && canvas.getActiveObject() === obj) {
                canvas.discardActiveObject();
            }
            
            applyDesignationStyles(obj, obj.customDesignation || 'object');
            saveState();
            updateObjectList();
        };

        let upBtn = document.createElement('button');
        upBtn.innerText = '▲'; upBtn.className = 'secondary';
        upBtn.onclick = (e) => {
            e.stopPropagation();
            canvas.bringForward(obj);
            canvas.requestRenderAll();
            saveState();
        };

        let downBtn = document.createElement('button');
        downBtn.innerText = '▼'; downBtn.className = 'secondary';
        downBtn.onclick = (e) => {
            e.stopPropagation();
            canvas.sendBackwards(obj);
            if (gridGroup) canvas.sendToBack(gridGroup);
            canvas.requestRenderAll();
            saveState();
        };

        let delBtn = document.createElement('button');
        delBtn.innerText = 'X'; delBtn.className = 'danger';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            canvas.remove(obj);
            canvas.discardActiveObject();
            saveState();
        };

        btnContainer.appendChild(lockBtn);
        btnContainer.appendChild(upBtn);
        btnContainer.appendChild(downBtn);
        btnContainer.appendChild(delBtn);

        li.appendChild(nameSpan);
        li.appendChild(btnContainer);

        li.addEventListener('dragstart', (e) => { 
            draggedDomItem = li; 
            setTimeout(() => li.classList.add('dragging'), 0); 
        });
        
        li.addEventListener('dragend', () => { 
            li.classList.remove('dragging'); 
            draggedDomItem = null; 
        });
        
        li.addEventListener('dragover', (e) => {
            e.preventDefault();
            if(draggedDomItem === li) return;
            const bounding = li.getBoundingClientRect();
            const offset = bounding.y + (bounding.height / 2);
            if (e.clientY - offset > 0) { 
                li.style.borderBottom = "2px solid #3498db"; li.style.borderTop = ""; 
            } else { 
                li.style.borderTop = "2px solid #3498db"; li.style.borderBottom = ""; 
            }
        });
        
        li.addEventListener('dragleave', () => { 
            li.style.borderTop = ""; li.style.borderBottom = ""; 
        });
        
        li.addEventListener('drop', (e) => {
            e.preventDefault();
            li.style.borderTop = ""; li.style.borderBottom = "";
            
            if (draggedDomItem && draggedDomItem !== li) {
                const bounding = li.getBoundingClientRect();
                const offset = bounding.y + (bounding.height / 2);
                if (e.clientY - offset > 0) { li.after(draggedDomItem); } 
                else { li.before(draggedDomItem); }

                const domItems = Array.from(container.children);
                const reversedDomItems = [...domItems].reverse();

                if (gridGroup) canvas.moveTo(gridGroup, 0);
                let currentIndex = gridGroup ? 1 : 0;

                reversedDomItems.forEach(item => {
                    if (item.canvasObj) {
                        canvas.moveTo(item.canvasObj, currentIndex);
                        currentIndex++;
                    }
                });
                
                canvas.requestRenderAll();
                saveState();
            }
        });

        container.appendChild(li);
    });
}