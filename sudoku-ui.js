/**
 * 数独解题器 - UI交互逻辑
 * 依赖：sudoku-core.js（核心解题）、puzzles.js（题库）
 */

// ==================== UI全局变量 ====================
let showCandidates = true;
let isEditMode = false;
let selectedRow = -1, selectedCol = -1;
let stepCount = 0;
let currentSteps = [];
let nextStepInProgress = false;
let historyBoards = [];
let historyIdx = -1;

// 闪烁动画参数
const FLASH_DURATION = 800;      // 单次动画时长(ms)
const FLASH_REPEAT = 3;          // 重复次数
const TOTAL_FLASH_TIME = FLASH_DURATION * FLASH_REPEAT; // 总时长 2400ms

// ==================== 辅助函数 ====================

function showTemporaryMessage(msg, type = 'info') {
    const existing = document.querySelector('.temp-message');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.className = 'temp-message';
    div.textContent = msg;
    const bg = { 'error': '#f44336', 'warning': '#ff9800', 'info': '#2196f3', 'success': '#4caf50' }[type] || '#4caf50';
    div.style.backgroundColor = bg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 2500);
}

function cloneBoardUI(board) {
    return board.map(row => [...row]);
}

function saveToHistory() {
    let snapshot = cloneBoardUI(currentBoard);
    historyBoards = historyBoards.slice(0, historyIdx + 1);
    historyBoards.push(snapshot);
    historyIdx++;
}

// ==================== 渲染函数 ====================

function renderAllCandidates() {
    if (!showCandidates) return;
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            renderCellCandidates(i, j);
        }
    }
}

function renderCellCandidates(row, col) {
    const div = document.getElementById(`candidates-${row}-${col}`);
    if (!div) return;
    
    if (currentBoard[row][col] !== 0) {
        div.innerHTML = '';
        return;
    }
    
    div.innerHTML = '';
    const sorted = Array.from(cellCandidates[row][col]).sort((a, b) => a - b);
    sorted.forEach(num => {
        const span = document.createElement('span');
        span.className = 'candidate-note';
        span.textContent = num;
        if (isEditMode) {
            span.style.cursor = 'pointer';
            span.onclick = (e) => {
                e.stopPropagation();
                toggleCandidateNumberUI(row, col, num);
            };
        }
        div.appendChild(span);
    });
}

function updateBoardDisplay() {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const input = document.getElementById(`cell-${i}-${j}`);
            if (input) {
                const val = currentBoard[i][j];
                input.value = val === 0 ? '' : val;
                const isOriginal = originalBoard[i][j] !== 0;
                if (isOriginal) {
                    input.classList.add('original');
                    input.readOnly = true;
                } else {
                    input.classList.remove('original');
                    input.readOnly = isEditMode;
                }
            }
        }
    }
    if (showCandidates) renderAllCandidates();
}

function createBoard() {
    const tbody = document.querySelector('#sudoku-board tbody');
    tbody.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const tr = document.createElement('tr');
        for (let j = 0; j < 9; j++) {
            const td = document.createElement('td');
            const container = document.createElement('div');
            container.className = 'cell-container';
            container.id = `cell-container-${i}-${j}`;
            
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.id = `cell-${i}-${j}`;
            input.className = 'main-number';
            input.addEventListener('click', () => selectCell(i, j));
            input.addEventListener('keydown', (e) => handleKeyDown(e, i, j));
            
            const candDiv = document.createElement('div');
            candDiv.className = 'candidates-area';
            candDiv.id = `candidates-${i}-${j}`;
            
            container.appendChild(input);
            container.appendChild(candDiv);
            td.appendChild(container);
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
}

function selectCell(row, col) {
    selectedRow = row;
    selectedCol = col;
    document.querySelectorAll('.cell-container').forEach(c => c.classList.remove('highlighted'));
    const container = document.getElementById(`cell-container-${row}-${col}`);
    if (container) container.classList.add('highlighted');
}

function highlightNewNumber(row, col) {
    const container = document.getElementById(`cell-container-${row}-${col}`);
    if (container) {
        container.style.backgroundColor = '#c8e6c9';
        container.style.animation = 'pulse 0.5s ease';
        setTimeout(() => {
            container.style.backgroundColor = '';
            container.style.animation = '';
        }, 1500);
    }
}

function addDetailedExplanation(step, stepNum) {
    const expDiv = document.getElementById('explanation-content');
    let elimHtml = '';
    if (step.eliminations && step.eliminations.length > 0) {
        elimHtml = `<div style="margin:8px 0;padding:6px 10px;background:#fff3e0;border-radius:6px;">
            <strong>🗑️ 排除:</strong> ${step.eliminations.map(e => `(${e.row + 1},${e.col + 1}):${e.num}`).join(', ')}
        </div>`;
    }
    let valHtml = step.value ? `<br>✨ 填入 (<strong>${step.row + 1},${step.col + 1}</strong>) = <strong>${step.value}</strong>` : '';
    expDiv.innerHTML = `<div class="step-explanation">
        <strong>📌 第 ${stepNum} 步 - ${step.technique}</strong><br>
        ${step.explanation || ''}${valHtml}
    </div>${elimHtml}`;
    expDiv.scrollTop = 0;
}

function updateStepsListDisplay() {
    const listDiv = document.getElementById('steps-list');
    listDiv.innerHTML = '';
    if (currentSteps.length === 0) {
        listDiv.innerHTML = '<div class="step-item">暂无解题步骤</div>';
        return;
    }
    currentSteps.forEach((step, idx) => {
        const item = document.createElement('div');
        item.className = 'step-item';
        const text = step.value ? `填入 (${step.row + 1},${step.col + 1}) = ${step.value}` : `排除 ${step.eliminations?.length || 0} 个候选数`;
        item.innerHTML = `<div><span style="font-weight:bold;">步骤 ${idx + 1}</span> <span style="background:#e3f2fd;padding:2px 6px;border-radius:10px;font-size:11px;margin-left:6px;">${step.technique}</span></div>
            <div style="font-size:11px;color:#666;margin-top:4px;">${text}</div>`;
        listDiv.appendChild(item);
    });
    listDiv.scrollTop = listDiv.scrollHeight;
}

// ==================== UI操作函数 ====================

function setCellNumberUI(row, col, num) {
    if (originalBoard[row][col] !== 0) {
        showTemporaryMessage('原始题目格子不能修改', 'warning');
        return false;
    }
    if (num !== 0 && !isValidMove(row, col, num)) {
        showTemporaryMessage(`数字 ${num} 违反数独规则`, 'error');
        return false;
    }
    saveToHistory();
    currentBoard[row][col] = num;
    updateBoardDisplay();
    initCandidates();
    showTemporaryMessage(num ? `已填入 ${num}` : '已清除', 'info');
    return true;
}

function toggleCandidateNumberUI(row, col, num) {
    if (!isEditMode) return;
    if (currentBoard[row][col] !== 0) {
        showTemporaryMessage('该格子已有数字，无法编辑候选数', 'warning');
        return;
    }
    if (cellCandidates[row][col].has(num)) {
        cellCandidates[row][col].delete(num);
        showTemporaryMessage(`已删除候选数 ${num}`, 'info');
    } else {
        if (isValidMove(row, col, num)) {
            cellCandidates[row][col].add(num);
            showTemporaryMessage(`已添加候选数 ${num}`, 'info');
        } else {
            showTemporaryMessage(`数字 ${num} 违反数独规则，不能添加为候选数`, 'warning');
        }
    }
    renderCellCandidates(row, col);
}

function handleKeyDown(e, row, col) {
    if (isEditMode) {
        if (e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            toggleCandidateNumberUI(row, col, parseInt(e.key));
        }
        return;
    }
    if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        setCellNumberUI(row, col, parseInt(e.key));
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        setCellNumberUI(row, col, 0);
    }
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('editCandidatesBtn');
    if (isEditMode) {
        btn.textContent = '✏️ 退出编辑';
        btn.classList.add('edit-mode-active');
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const input = document.getElementById(`cell-${i}-${j}`);
                if (input) input.readOnly = true;
            }
        }
        renderAllCandidates();
        showTemporaryMessage('候选数编辑模式，点击候选数可切换', 'info');
    } else {
        btn.textContent = '✏️ 编辑候选数';
        btn.classList.remove('edit-mode-active');
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const input = document.getElementById(`cell-${i}-${j}`);
                if (input && originalBoard[i][j] === 0) input.readOnly = false;
            }
        }
        if (showCandidates) renderAllCandidates();
        showTemporaryMessage('数字输入模式，直接输入数字', 'info');
    }
}

function loadPuzzle(name) {
    const puzzle = PUZZLE_LIBRARY.find(p => p.name === name);
    if (!puzzle) return;
    
    const grid = puzzle.grid.map(row => row.split('').map(c => parseInt(c)));
    
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const val = grid[i][j];
            currentBoard[i][j] = val;
            originalBoard[i][j] = val;
        }
    }
    initCandidates();
    updateBoardDisplay();
    
    historyBoards = [cloneBoardUI(currentBoard)];
    historyIdx = 0;
    currentSteps = [];
    stepCount = 0;
    updateStepsListDisplay();
    document.getElementById('explanation-content').innerHTML = '<div class="step-explanation">✨ 点击"下一步"开始智能解题</div>';
    showTemporaryMessage(`已加载: ${name}`, 'success');
}

function loadPuzzleList() {
    const selector = document.getElementById('puzzleSelector');
    selector.innerHTML = '<option value="">-- 选择题目 --</option>';
    for (let puzzle of PUZZLE_LIBRARY) {
        const option = document.createElement('option');
        option.value = puzzle.name;
        option.textContent = puzzle.name;
        selector.appendChild(option);
    }
    selector.addEventListener('change', (e) => {
        if (e.target.value) loadPuzzle(e.target.value);
    });
    if (PUZZLE_LIBRARY.length > 0) {
        selector.value = PUZZLE_LIBRARY[0].name;
        loadPuzzle(PUZZLE_LIBRARY[0].name);
    }
}

function undo() {
    if (historyIdx > 0) {
        historyIdx--;
        currentBoard = cloneBoardUI(historyBoards[historyIdx]);
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                originalBoard[i][j] = historyBoards[0][i][j];
            }
        }
        initCandidates();
        updateBoardDisplay();
        
        if (currentSteps.length > 0) {
            currentSteps.pop();
            stepCount = currentSteps.length;
            updateStepsListDisplay();
            if (currentSteps.length > 0) {
                addDetailedExplanation(currentSteps[currentSteps.length - 1], stepCount);
            } else {
                document.getElementById('explanation-content').innerHTML = '<div class="step-explanation">✨ 已回到初始状态</div>';
            }
        }
        showTemporaryMessage('已回退到上一步', 'info');
    } else {
        showTemporaryMessage('没有更早的历史', 'warning');
    }
}

// ==================== 闪烁删除效果 ====================

/**
 * 单个候选数闪烁并删除（完整执行3次闪烁）
 */
function flashAndRemoveCandidate(row, col, num, callback) {
    const candidatesDiv = document.getElementById(`candidates-${row}-${col}`);
    if (!candidatesDiv) {
        if (callback) callback();
        return;
    }
    
    const spans = candidatesDiv.querySelectorAll('.candidate-note');
    let targetSpan = null;
    for (const s of spans) {
        if (parseInt(s.textContent) === num) {
            targetSpan = s;
            break;
        }
    }
    
    if (targetSpan) {
        // 添加闪烁动画类（CSS动画会重复3次，共2.4秒）
        targetSpan.classList.add('flashing');
        
        // 等待完整动画结束后再删除（3次闪烁总时长）
        setTimeout(() => {
            targetSpan.classList.remove('flashing');
            if (targetSpan.parentNode) {
                targetSpan.remove();
            }
            // 刷新当前格子的候选数
            renderCellCandidates(row, col);
            if (callback) callback();
        }, TOTAL_FLASH_TIME); // 2400ms，完整执行3次闪烁
    } else {
        if (callback) callback();
    }
}

/**
 * 批量闪烁并删除候选数
 */
function flashCandidatesBatch(eliminations, callback) {
    if (!eliminations || eliminations.length === 0) {
        if (callback) callback();
        return;
    }
    
    let completed = 0;
    for (const elim of eliminations) {
        flashAndRemoveCandidate(elim.row, elim.col, elim.num, () => {
            completed++;
            if (completed === eliminations.length) {
                if (callback) callback();
            }
        });
    }
}

// ==================== 下一步核心 ====================

async function nextStep() {
    if (nextStepInProgress) {
        showTemporaryMessage('正在处理中...', 'warning');
        return;
    }
    if (isEditMode) toggleEditMode();
    nextStepInProgress = true;
    const btn = document.getElementById('nextStepBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ 处理中...';
    }
    
    setTimeout(() => {
        try {
            const step = findNextStep();
            
            if (!step) {
                const isFull = currentBoard.every(row => row.every(v => v !== 0));
                if (isFull) {
                    showTemporaryMessage('🎉 已完成！', 'success');
                } else {
                    showTemporaryMessage('当前没有找到可确定的步骤，请尝试手动编辑', 'warning');
                }
                nextStepInProgress = false;
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = '➡️ 下一步';
                }
                return;
            }
            
            // 保存历史
            saveToHistory();
            
            // 处理填入数字
            if (step.value) {
                applyStep(step);
                stepCount++;
                currentSteps.push(step);
                updateBoardDisplay();
                addDetailedExplanation(step, stepCount);
                updateStepsListDisplay();
                highlightNewNumber(step.row, step.col);
                
                const isFull = currentBoard.every(row => row.every(v => v !== 0));
                if (isFull) showTemporaryMessage('🎉 恭喜！数独已完成！', 'success');
                
                nextStepInProgress = false;
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = '➡️ 下一步';
                }
                return;
            }
            
            // 处理排除候选数
            if (step.eliminations && step.eliminations.length > 0) {
                // 先从数据中删除
                applyStep(step);
                
                // 再执行UI闪烁删除（完整3次闪烁，共2.4秒）
                flashCandidatesBatch(step.eliminations, () => {
                    stepCount++;
                    currentSteps.push(step);
                    addDetailedExplanation(step, stepCount);
                    updateStepsListDisplay();
                    
                    const isFull = currentBoard.every(row => row.every(v => v !== 0));
                    if (isFull) showTemporaryMessage('🎉 恭喜！数独已完成！', 'success');
                    
                    nextStepInProgress = false;
                    if (btn) {
                        btn.disabled = false;
                        btn.textContent = '➡️ 下一步';
                    }
                });
                return;
            }
            
            // 其他情况
            stepCount++;
            currentSteps.push(step);
            updateStepsListDisplay();
            
            nextStepInProgress = false;
            if (btn) {
                btn.disabled = false;
                btn.textContent = '➡️ 下一步';
            }
        } catch (e) {
            console.error('[下一步] 错误:', e);
            showTemporaryMessage('推理失败', 'error');
            nextStepInProgress = false;
            if (btn) {
                btn.disabled = false;
                btn.textContent = '➡️ 下一步';
            }
        }
    }, 10);
}

// ==================== 事件绑定 ====================

function attachEvents() {
    document.getElementById('editCandidatesBtn')?.addEventListener('click', toggleEditMode);
    document.getElementById('showCandidatesBtn')?.addEventListener('click', () => {
        showCandidates = !showCandidates;
        const btn = document.getElementById('showCandidatesBtn');
        if (showCandidates) {
            btn.textContent = '🔢 隐藏候选数';
            document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'flex');
            renderAllCandidates();
        } else {
            btn.textContent = '🔢 显示候选数';
            document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'none');
        }
    });
    document.getElementById('nextStepBtn')?.addEventListener('click', nextStep);
    document.getElementById('undoBtn')?.addEventListener('click', undo);
}

// ==================== 初始化 ====================

function initUI() {
    createBoard();
    attachEvents();
    loadPuzzleList();
}

document.addEventListener('DOMContentLoaded', initUI);