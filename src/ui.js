// src/ui.js
import * as fabric from 'fabric';
import { canvas, addShape, applyDesignationStyles, GRID_SIZE, gridGroup, zoomCanvas, togglePanMode, duplicateSelected, toggleGroup, getCenterPoint, toggleSnap, toggleGridVisuals, toggleMeasurements, changeTextSize } from './canvas.js';
import { undo, redo, exportJSON, loadJSON, setHistoryCallback, customProps, saveState, saveToCloud } from './state.js';
import { signIn, signUp, signOut, onAuthStateChange } from './auth.js';

export function setupUI() {
    const authModal = document.getElementById('auth-modal');
    const authTitle = document.getElementById('auth-title');
    const authToggleText = document.getElementById('auth-toggle-text');
    const btnAuthSubmit = document.getElementById('btn-auth-submit');
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    let isSignUpMode = false;

    const toggleAuthModal = () => authModal.classList.toggle('active');
    document.getElementById('btn-open-auth').addEventListener('click', toggleAuthModal);
    document.getElementById('btn-close-auth').addEventListener('click', toggleAuthModal);

    authToggleText.addEventListener('click', () => {
        isSignUpMode = !isSignUpMode;
        authTitle.innerText = isSignUpMode ? 'Sign Up' : 'Log In';
        authToggleText.innerText = isSignUpMode ? 'Already have an account? Log In' : "Don't have an account? Sign Up";
        btnAuthSubmit.innerText = isSignUpMode ? 'Create Account' : 'Continue';
    });

    btnAuthSubmit.addEventListener('click', async () => {
        const email = authEmail.value;
        const password = authPassword.value;
        try {
            if (isSignUpMode) {
                await signUp(email, password);
                alert("Check your email for a confirmation link!");
            } else {
                await signIn(email, password);
            }
            toggleAuthModal();
        } catch (err) {
            alert(err.message);
        }
    });

    document.getElementById('btn-logout').addEventListener('click', signOut);

    onAuthStateChange((user) => {
        const statusText = document.getElementById('auth-status');
        const loggedInGroup = document.getElementById('logged-in-group');
        const loggedOutGroup = document.getElementById('logged-out-group');

        if (user) {
            statusText.innerText = `Logged in as: ${user.email}`;
            loggedInGroup.classList.remove('hidden');
            loggedOutGroup.classList.add('hidden');
        } else {
            statusText.innerText = 'Not Logged In';
            loggedInGroup.classList.add('hidden');
            loggedOutGroup.classList.remove('hidden');
        }
    });

    document.getElementById('btn-save-cloud').addEventListener('click', async () => {
        const projectName = document.getElementById('project-name').value || 'Untitled Layout';
        await saveToCloud(projectName);
    });

    const helpModal = document.getElementById('help-modal');
    const toggleHelp = () => helpModal.classList.toggle('active');
    document.getElementById('btn-help').addEventListener('click', toggleHelp);
    document.getElementById('btn-close-help').addEventListener('click', toggleHelp);

    document.getElementById('btn-add-rect').addEventListener('click', () => addShape('rect'));
    document.getElementById('btn-add-circle').addEventListener('click', () => addShape('circle'));
    document.getElementById('btn-add-tri').addEventListener('click', () => addShape('triangle'));
    document.getElementById('btn-add-right-tri').addEventListener('click', () => addShape('right-triangle'));
    document.getElementById('btn-add-measure').addEventListener('click', () => addShape('measure'));

    canvas.on('selection:created', updatePropertiesUI);
    canvas.on('selection:updated', updatePropertiesUI);
    canvas.on('selection:cleared', updatePropertiesUI);
    canvas.on('object:scaling', updateDimensionsUI);
    canvas.on('object:modified', updateDimensionsUI);
    canvas.on('object:added', updateObjectList);
    canvas.on('object:removed', updateObjectList);

    const aspectLock = document.getElementById('prop-lock-aspect');
    canvas.uniScaleTransform = !aspectLock.checked;
    aspectLock.addEventListener('change', (e) => {
        canvas.uniScaleTransform = !e.target.checked;
        canvas.requestRenderAll();
    });

    document.getElementById('prop-name').addEventListener('input', (e) => updateActiveObject('customName', e.target.value));
    document.getElementById('prop-color').addEventListener('input', (e) => {
        const obj = canvas.getActiveObject();
        if (obj && obj.type !== 'activeSelection') {
            obj.customColor = e.target.value;
            applyDesignationStyles(obj, obj.customDesignation || 'object');
            saveState();
        }
    });
    document.getElementById('prop-type').addEventListener('change', (e) => {
        const obj = canvas.getActiveObject();
        if (obj && obj.type !== 'activeSelection') {
            applyDesignationStyles(obj, e.target.value);
            saveState();
        }
    });
    document.getElementById('prop-width').addEventListener('change', (e) => handleDimensionInput('width', e.target.value));
    document.getElementById('prop-height').addEventListener('change', (e) => handleDimensionInput('height', e.target.value));
    document.getElementById('prop-angle').addEventListener('change', (e) => {
        const obj = canvas.getActiveObject();
        if(obj && obj.type !== 'activeSelection') {
            obj.rotate(parseFloat(e.target.value) || 0);
            obj.setCoords(); canvas.requestRenderAll(); saveState();
        }
    });
    document.getElementById('btn-rotate-45').addEventListener('click', () => {
        const obj = canvas.getActiveObject();
        if(obj && obj.type !== 'activeSelection') {
            obj.rotate(((obj.angle || 0) + 45) % 360);
            obj.setCoords(); canvas.requestRenderAll(); updatePropertiesUI(); saveState();
        }
    });
    document.getElementById('prop-thickness').addEventListener('change', (e) => {
        const obj = canvas.getActiveObject();
        if (obj && obj.type !== 'activeSelection') {
            obj.customStrokeWidth = parseFloat(e.target.value);
            applyDesignationStyles(obj, obj.customDesignation || 'object');
            saveState();
        }
    });

    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    btnUndo.addEventListener('click', undo);
    btnRedo.addEventListener('click', redo);
    setHistoryCallback((canUndo, canRedo) => {
        btnUndo.disabled = !canUndo;
        btnRedo.disabled = !canRedo;
        updateObjectList();
    });

    document.getElementById('btn-zoom-in').addEventListener('click', () => zoomCanvas(1.2));
    document.getElementById('btn-zoom-out').addEventListener('click', () => zoomCanvas(0.8));
    document.getElementById('btn-pan').addEventListener('click', togglePanMode);
    document.getElementById('btn-snap').addEventListener('click', toggleSnap);
    document.getElementById('btn-grid').addEventListener('click', toggleGridVisuals);
    document.getElementById('btn-measure-toggle').addEventListener('click', toggleMeasurements);
    document.getElementById('btn-text-minus').addEventListener('click', () => changeTextSize(-1));
    document.getElementById('btn-text-plus').addEventListener('click', () => changeTextSize(1));

    document.getElementById('btn-save-json').addEventListener('click', () => exportJSON(document.getElementById('project-name').value));
    document.getElementById('json-upload').addEventListener('change', (e) => loadJSON(e.target.files[0]));
    
    // V6 Fix: Modern image loading with Promises
    document.getElementById('bg-upload').addEventListener('change', function(e) {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = async function(f) {
            try {
                const img = await fabric.FabricImage.fromURL(f.target.result);
                const pt = getCenterPoint();
                let scale = (canvas.width * 0.4) / img.width;
                img.set({
                    left: pt.x, top: pt.y, originX: 'center', originY: 'center',
                    scaleX: scale, scaleY: scale, opacity: 0.5,
                    customName: 'Blueprint', customDesignation: 'blueprint', customLocked: false
                });
                img.set({ originX: 'left', originY: 'top', left: pt.x - (img.width*scale)/2, top: pt.y - (img.height*scale)/2 });
                
                canvas.add(img); 
                canvas.sendObjectToBack(img);
                if (gridGroup) canvas.sendObjectToBack(gridGroup);
                
                canvas.setActiveObject(img); 
                saveState(); 
                updateObjectList();
            } catch (err) {
                console.error("Blueprint load failed", err);
            }
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('btn-duplicate').addEventListener('click', () => { duplicateSelected(customProps); saveState(); updateObjectList(); });
    document.getElementById('btn-group').addEventListener('click', () => { toggleGroup(); saveState(); updatePropertiesUI(); updateObjectList(); });

    let clearAllTimeout;
    document.getElementById('btn-clear-all').addEventListener('click', (e) => {
        const btn = e.target;
        if (btn.innerText === "Click again to Confirm") {
            canvas.getObjects().forEach(obj => { if (obj.id !== 'grid_overlay') canvas.remove(obj); });
            canvas.discardActiveObject(); saveState();
            btn.innerText = "Clear All"; btn.classList.remove('warning'); btn.classList.add('danger');
        } else {
            btn.innerText = "Click again to Confirm"; btn.classList.remove('danger'); btn.classList.add('warning');
            clearTimeout(clearAllTimeout);
            clearAllTimeout = setTimeout(() => { btn.innerText = "Clear All"; btn.classList.remove('warning'); btn.classList.add('danger'); }, 3000);
        }
    });

    window.addEventListener('keydown', (e) => {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
        if (e.key === 'Delete' || e.key === 'Backspace') { 
            canvas.getActiveObjects().forEach(obj => { if (!obj.customLocked && obj.id !== 'grid_overlay') canvas.remove(obj); });
            canvas.discardActiveObject(); canvas.requestRenderAll(); saveState(); updateObjectList();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); duplicateSelected(customProps); saveState(); updateObjectList(); }
    });
}

function updateActiveObject(property, value) {
    const obj = canvas.getActiveObject();
    if (obj) { obj.set(property, value); canvas.requestRenderAll(); updateObjectList(); saveState(); }
}

export function updatePropertiesUI() {
    const obj = canvas.getActiveObject();
    const panel = document.getElementById('properties-panel');
    if (obj && obj.type !== 'activeSelection') {
        panel.classList.add('active');
        document.getElementById('prop-name').value = obj.customName || '';
        document.getElementById('prop-type').value = obj.customDesignation || 'object';
        if (obj.customColor) document.getElementById('prop-color').value = obj.customColor;
        if (document.activeElement !== document.getElementById('prop-angle')) document.getElementById('prop-angle').value = Math.round(obj.angle || 0);
        const thickIn = document.getElementById('prop-thickness');
        if (document.activeElement !== thickIn) thickIn.value = obj.customStrokeWidth !== undefined ? obj.customStrokeWidth : (obj.customDesignation === 'room' ? 4 : 2);
        updateDimensionsUI();
    } else { panel.classList.remove('active'); }
}

function updateDimensionsUI() {
    const obj = canvas.getActiveObject();
    if (obj && obj.type !== 'activeSelection') {
        const w = (obj.width * obj.scaleX) / GRID_SIZE;
        const h = obj.type === 'circle' ? (obj.radius * 2 * obj.scaleY) / GRID_SIZE : (obj.height * obj.scaleY) / GRID_SIZE;
        const wIn = document.getElementById('prop-width');
        const hIn = document.getElementById('prop-height');
        if (document.activeElement !== wIn) wIn.value = w.toFixed(2);
        if (document.activeElement !== hIn) hIn.value = h.toFixed(2);
    }
}

function handleDimensionInput(axis, value) {
    const obj = canvas.getActiveObject();
    if(!obj || obj.type === 'activeSelection') return;
    let val = parseFloat(value);
    if(isNaN(val) || val <= 0) return;
    let target = val * GRID_SIZE;
    let locked = document.getElementById('prop-lock-aspect').checked;
    let baseW = obj.type === 'circle' ? obj.radius * 2 : obj.width;
    let baseH = obj.type === 'circle' ? obj.radius * 2 : obj.height;
    if (axis === 'width') {
        let nSX = target / baseW;
        if (locked) obj.scaleY *= (nSX / obj.scaleX);
        obj.scaleX = nSX;
    } else {
        let nSY = target / baseH;
        if (locked) obj.scaleX *= (nSY / obj.scaleY);
        obj.scaleY = nSY;
    }
    obj.setCoords(); canvas.requestRenderAll(); updatePropertiesUI(); saveState();
}

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
        
        let name = document.createElement('span');
        name.innerText = obj.customName || `Unnamed ${obj.type}`;
        name.onclick = () => {
            if (!obj.customLocked) {
                canvas.setActiveObject(obj);
                canvas.requestRenderAll();
            }
        };
        
        let btns = document.createElement('div');
        btns.className = 'layer-btn-group';
        
        let lock = document.createElement('button');
        lock.innerText = obj.customLocked ? '🔒' : '🔓';
        lock.onclick = (e) => {
            e.stopPropagation();
            obj.customLocked = !obj.customLocked;
            if (obj.customLocked && canvas.getActiveObject() === obj) canvas.discardActiveObject();
            applyDesignationStyles(obj, obj.customDesignation || 'object');
            saveState();
            updateObjectList();
        };
        
        // V6 Fix: Modern Layer Stacking Syntax
        let up = document.createElement('button');
        up.innerText = '▲';
        up.onclick = (e) => { e.stopPropagation(); canvas.bringObjectForward(obj); canvas.requestRenderAll(); saveState(); };
        
        let down = document.createElement('button');
        down.innerText = '▼';
        down.onclick = (e) => { e.stopPropagation(); canvas.sendObjectBackwards(obj); if (gridGroup) canvas.sendObjectToBack(gridGroup); canvas.requestRenderAll(); saveState(); };
        
        let del = document.createElement('button');
        del.innerText = 'X';
        del.className = 'danger';
        del.onclick = (e) => { e.stopPropagation(); canvas.remove(obj); canvas.discardActiveObject(); saveState(); };
        
        btns.appendChild(lock); btns.appendChild(up); btns.appendChild(down); btns.appendChild(del);
        li.appendChild(name); li.appendChild(btns);
        
        li.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', objects.indexOf(obj));
            li.classList.add('dragging');
        });
        li.addEventListener('dragend', () => {
            li.classList.remove('dragging');
            document.querySelectorAll('.list-item').forEach(item => item.style.borderBottom = '1px solid #eee');
        });
        li.addEventListener('dragover', (e) => {
            e.preventDefault();
            li.style.borderBottom = '2px solid #3498db';
        });
        li.addEventListener('dragleave', () => {
            li.style.borderBottom = '1px solid #eee';
        });
        li.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggedIdx = parseInt(e.dataTransfer.getData('text/plain'));
            const targetIdx = objects.indexOf(obj);
            if (draggedIdx !== targetIdx) {
                const draggedObj = objects[draggedIdx];
                // V6 Fix: moveObjectTo
                canvas.moveObjectTo(draggedObj, objects.length - 1 - targetIdx);
                if (gridGroup) canvas.sendObjectToBack(gridGroup);
                canvas.requestRenderAll();
                saveState();
                updateObjectList();
            }
        });
        
        container.appendChild(li);
    });
}