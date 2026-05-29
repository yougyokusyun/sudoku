/**
 * 数独解题器 - UI交互逻辑
 * 依赖：sudoku-core.js（核心解题）、puzzles.js（题库）
 */
// 检查用户候选数与系统候选数是否完全一致
function isUserCandidatesMatchSystem() {
    const sysCandidates = getSystemCandidates();
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (currentBoard[i][j] === 0) {
                const userSet = userCandidates[i][j];
                const sysSet = sysCandidates[i][j];
                
                // 检查大小是否相同
                if (userSet.size !== sysSet.size) return false;
                
                // 检查每个数字是否都存在
                for (const num of userSet) {
                    if (!sysSet.has(num)) return false;
                }
            }
        }
    }
    return true;
}
// ==================== 错误计数变量 ====================
let errorCount = 0;
let isFreeMode = false;  // 自由模式：当没有任何格子可以推导时允许任意操作

// 更新错误次数显示
function updateErrorCountDisplay() {
    const errorBadge = document.getElementById('errorCountBadge');
    if (errorBadge) {
        errorBadge.innerHTML = `❌ 错误: ${errorCount}`;
        if (errorCount >= 10) {
            errorBadge.className = 'error-count-badge high';
        } else if (errorCount >= 5) {
            errorBadge.className = 'error-count-badge warning';
        } else {
            errorBadge.className = 'error-count-badge';
        }
    }
}

// 增加错误次数
function addError() {
    errorCount++;
    updateErrorCountDisplay();
    showTemporaryMessage(`操作不符合数独规则，错误次数 +1 (共 ${errorCount} 次)`, 'error');
}

// 重置错误次数
function resetErrorCount() {
    errorCount = 0;
    updateErrorCountDisplay();
}

// ==================== 推导检查函数 ====================

// 检查当前格子是否能通过数独规则唯一确定数字
// 返回：{ canDerive: boolean, value: number|null, technique: string }
function canDeriveCellValue(row, col) {
    // 如果已经有数字，返回 false
    if (currentBoard[row][col] !== 0) {
        return { canDerive: false, value: null, technique: '' };
    }
    
    // 1. 唯一候选数法（Naked Single）：检查候选数是否只有一个
    const candidates = new Set();
    for (let n = 1; n <= 9; n++) {
        if (isValidMove(row, col, n)) {
            candidates.add(n);
        }
    }
    if (candidates.size === 1) {
        const value = Array.from(candidates)[0];
        return { canDerive: true, value: value, technique: `唯一候选数法：格子 (${row+1},${col+1}) 只剩下数字 ${value}` };
    }
    
    // 2. 唯余法（Hidden Single）：检查行中该数字是否只出现在这个格子
    // 检查行
    for (let num = 1; num <= 9; num++) {
        let count = 0;
        let pos = -1;
        for (let c = 0; c < 9; c++) {
            if (currentBoard[row][c] === 0 && isValidMove(row, c, num)) {
                count++;
                pos = c;
            }
        }
        if (count === 1 && pos === col) {
            return { canDerive: true, value: num, technique: `唯余法（行）：第 ${row+1} 行中数字 ${num} 只能出现在 (${row+1},${col+1})` };
        }
    }
    
    // 检查列
    for (let num = 1; num <= 9; num++) {
        let count = 0;
        let pos = -1;
        for (let r = 0; r < 9; r++) {
            if (currentBoard[r][col] === 0 && isValidMove(r, col, num)) {
                count++;
                pos = r;
            }
        }
        if (count === 1 && pos === row) {
            return { canDerive: true, value: num, technique: `唯余法（列）：第 ${col+1} 列中数字 ${num} 只能出现在 (${row+1},${col+1})` };
        }
    }
    
    // 检查宫
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let num = 1; num <= 9; num++) {
        let count = 0;
        let posRow = -1, posCol = -1;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const r = br + i;
                const c = bc + j;
                if (currentBoard[r][c] === 0 && isValidMove(r, c, num)) {
                    count++;
                    posRow = r;
                    posCol = c;
                }
            }
        }
        if (count === 1 && posRow === row && posCol === col) {
            return { canDerive: true, value: num, technique: `唯余法（宫）：第 ${Math.floor(row/3)*3 + Math.floor(col/3) + 1} 宫中数字 ${num} 只能出现在 (${row+1},${col+1})` };
        }
    }
    
    return { canDerive: false, value: null, technique: '' };
}

// 检查整个盘面是否有任何格子可以唯一确定数字
// 返回：{ hasDerivable: boolean, row: number, col: number, value: number, technique: string }
function hasAnyDerivableCell() {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (currentBoard[i][j] === 0) {
                const result = canDeriveCellValue(i, j);
                if (result.canDerive) {
                    return {
                        hasDerivable: true,
                        row: i,
                        col: j,
                        value: result.value,
                        technique: result.technique
                    };
                }
            }
        }
    }
    return { hasDerivable: false, row: -1, col: -1, value: null, technique: '' };
}

// 检查并更新自由模式状态
function updateFreeModeStatus() {
    if (isExampleMode) return;
    
    const derivable = hasAnyDerivableCell();
    const candidatesMatch = isUserCandidatesMatchSystem();
    
    if (!derivable.hasDerivable && candidatesMatch) {
        // 没有任何格子可以推导，且候选数一致，进入自由模式
        if (!isFreeMode) {
            isFreeMode = true;
            showTemporaryMessage('当前没有任何格子可以推导，已进入自由模式，可任意填写', 'warning');
            const modeBadge = document.getElementById('modeBadge');
            if (modeBadge) {
                modeBadge.innerHTML = '✏️ 自由模式';
                modeBadge.classList.add('manual-mode');
            }
        }
    } else if (!derivable.hasDerivable && !candidatesMatch) {
        // 没有任何格子可以推导，但候选数不一致
        if (isFreeMode) {
            isFreeMode = false;
            const modeBadge = document.getElementById('modeBadge');
            if (modeBadge) {
                modeBadge.innerHTML = '✏️ 练习模式';
                modeBadge.classList.remove('manual-mode');
                modeBadge.classList.add('practice-mode');
            }
        }
        // 提示用户候选数不一致（不自动弹出，只在顶部显示）
        const modeBadge = document.getElementById('modeBadge');
        if (modeBadge && !modeBadge.innerHTML.includes('候选数')) {
            // 可以在徽章上添加标记，但不强制弹窗
        }
    } else if (derivable.hasDerivable) {
        // 有格子可以确定，退出自由模式
        if (isFreeMode) {
            isFreeMode = false;
            const modeBadge = document.getElementById('modeBadge');
            if (modeBadge) {
                modeBadge.innerHTML = '✏️ 练习模式';
                modeBadge.classList.remove('manual-mode');
                modeBadge.classList.add('practice-mode');
            }
        }
    }
}

// 练习模式专用：用户自定义候选数（独立于系统候选数）
let userCandidates = Array(9).fill().map(() => Array(9).fill().map(() => new Set()));

// ==================== 练习模式专用函数 ====================

// 初始化用户候选数（练习模式下默认为空）
function initUserCandidates() {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            userCandidates[i][j].clear();
        }
    }
    
    // 清空显示区域
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const div = document.getElementById(`candidates-${i}-${j}`);
            if (div) {
                div.innerHTML = '';
            }
            cellCandidates[i][j].clear();
        }
    }
}

// 同步用户候选数到显示
function syncUserCandidatesToDisplay() {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            cellCandidates[i][j].clear();
            if (currentBoard[i][j] === 0) {
                for (const num of userCandidates[i][j]) {
                    cellCandidates[i][j].add(num);
                }
            }
        }
    }
    
    if (!isExampleMode && practiceShowCandidates) {
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                renderCellCandidates(i, j);
            }
        }
    }
}

// 补全候选数：基于当前盘面重新计算并填充用户候选数
function fillCandidates() {
    if (isExampleMode) {
        showTemporaryMessage('例题模式下请使用"编辑候选数"功能', 'warning');
        return;
    }
    
    let filledCount = 0;
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            userCandidates[i][j].clear();
            if (currentBoard[i][j] === 0) {
                for (let n = 1; n <= 9; n++) {
                    if (isValidMove(i, j, n)) {
                        userCandidates[i][j].add(n);
                        filledCount++;
                    }
                }
            }
        }
    }
    
    if (!practiceShowCandidates) {
        practiceShowCandidates = true;
        const toggleMenuItem = document.querySelector('[data-action="toggle"]');
        if (toggleMenuItem) toggleMenuItem.innerHTML = '🔢 隐藏候选数';
    }
    
    document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'flex');
    
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const div = document.getElementById(`candidates-${i}-${j}`);
            if (div) {
                if (currentBoard[i][j] === 0) {
                    div.innerHTML = '';
                    const sorted = Array.from(userCandidates[i][j]).sort((a, b) => a - b);
                    const isEditable = practiceEditMode;
                    
                    sorted.forEach(num => {
                        const span = document.createElement('span');
                        span.className = 'candidate-note';
                        if (isEditable) {
                            span.classList.add('editing-mode');
                            span.style.cursor = 'pointer';
                            span.onclick = (e) => {
                                e.stopPropagation();
                                practiceToggleCandidate(i, j, num);
                            };
                        }
                        span.textContent = num;
                        div.appendChild(span);
                    });
                } else {
                    div.innerHTML = '';
                }
            }
        }
    }
    
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            cellCandidates[i][j].clear();
            for (const num of userCandidates[i][j]) {
                cellCandidates[i][j].add(num);
            }
        }
    }
    
    showTemporaryMessage(`已补全候选数，共添加 ${filledCount} 个候选数`, 'success');
}

// 获取系统计算的候选数（用于对比提示）
function getSystemCandidates() {
    const sysCandidates = Array(9).fill().map(() => Array(9).fill().map(() => new Set()));
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (currentBoard[i][j] === 0) {
                for (let n = 1; n <= 9; n++) {
                    if (isValidMove(i, j, n)) {
                        sysCandidates[i][j].add(n);
                    }
                }
            }
        }
    }
    return sysCandidates;
}

// 下一步提示
function showNextHint() {
    if (isExampleMode) {
        showTemporaryMessage('例题模式下请使用"下一步"按钮', 'warning');
        return;
    }
    
    const derivable = hasAnyDerivableCell();
    
    if (derivable.hasDerivable) {
        showHintDialog([{
            type: 'success',
            title: '🎯 可推导的数字',
            content: `${derivable.technique}，可以直接填入 ${derivable.value}。`
        }]);
    } else {
        showHintDialog([{
            type: 'info',
            title: '🤔 暂无直接可填数字',
            content: '当前没有任何格子可以通过数独规则唯一确定数字。建议：\n1. 点击"补全候选数"查看候选数\n2. 尝试使用更高级的技巧\n3. 或进入自由模式任意填写（只要不违反基本规则）'
        }]);
    }
}

// 显示提示对话框
function showHintDialog(messages) {
    const dialog = document.getElementById('hintDialog');
    const body = document.getElementById('hintDialogBody');
    
    if (!dialog || !body) return;
    
    let html = '';
    for (const msg of messages) {
        html += `
            <div style="margin-bottom: 15px; padding: 12px; border-radius: 10px; ${msg.type === 'success' ? 'background:#e8f5e9;' : 'background:#e3f2fd;'}">
                <div style="font-weight: bold; margin-bottom: 8px;">${msg.title}</div>
                <div>${msg.content}</div>
            </div>
        `;
    }
    
    body.innerHTML = html;
    dialog.style.display = 'flex';
}

// 练习模式下编辑候选数
// 练习模式下编辑候选数（用户自由编辑，不增加错误）
function practiceToggleCandidate(row, col, num) {
    if (!practiceEditMode) {
        showTemporaryMessage('请先开启"编辑候选数"模式', 'warning');
        return;
    }
    
    if (currentBoard[row][col] !== 0) {
        showTemporaryMessage('该格子已有数字，无法编辑候选数', 'warning');
        return;
    }
    
    // 编辑候选数：不增加错误，用户可自由调整
    if (userCandidates[row][col].has(num)) {
        userCandidates[row][col].delete(num);
        showTemporaryMessage(`已删除候选数 ${num}`, 'info');
    } else {
        userCandidates[row][col].add(num);
        showTemporaryMessage(`已添加候选数 ${num}`, 'info');
    }
    
    if (!practiceShowCandidates) {
        practiceShowCandidates = true;
        document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'flex');
        const toggleMenuItem = document.querySelector('[data-action="toggle"]');
        if (toggleMenuItem) toggleMenuItem.innerHTML = '🔢 隐藏候选数';
    }
    
    const div = document.getElementById(`candidates-${row}-${col}`);
    if (div) {
        div.innerHTML = '';
        const sorted = Array.from(userCandidates[row][col]).sort((a, b) => a - b);
        const isEditable = practiceEditMode;
        
        sorted.forEach(n => {
            const span = document.createElement('span');
            span.className = 'candidate-note';
            if (isEditable) {
                span.classList.add('editing-mode');
                span.style.cursor = 'pointer';
                span.onclick = (e) => {
                    e.stopPropagation();
                    practiceToggleCandidate(row, col, n);
                };
            }
            span.textContent = n;
            div.appendChild(span);
        });
    }
    
    cellCandidates[row][col].clear();
    for (const n of userCandidates[row][col]) {
        cellCandidates[row][col].add(n);
    }
    
    // 编辑候选数后，重新检查自由模式状态（但不自动退出，只是更新提示）
    updateFreeModeStatus();
}

// 获取单个格子的系统候选数（基于当前盘面排除法）
function getSystemCandidatesForCell(row, col) {
    const candidates = new Set();
    if (currentBoard[row][col] !== 0) return candidates;
    for (let n = 1; n <= 9; n++) {
        if (isValidMove(row, col, n)) {
            candidates.add(n);
        }
    }
    return candidates;
}

// ==================== UI全局变量 ====================
let stepCount = 0;
let currentSteps = [];
let nextStepInProgress = false;
let historyBoards = [];
let historyIdx = -1;

const FLASH_DURATION = 800;
const FLASH_REPEAT = 3;
const TOTAL_FLASH_TIME = FLASH_DURATION * FLASH_REPEAT;

// ==================== 模式变量 ====================
let isExampleMode = false;
let practiceShowCandidates = false;
let practiceEditMode = false;
let exampleShowCandidates = true;
let exampleEditMode = false;

// ==================== 计时器变量 ====================
let timerInterval = null;
let timerSeconds = 0;
let isTimerRunning = false;
let isPuzzleCompleted = false;

// 当前选中的格子
let currentSelectedRow = -1;
let currentSelectedCol = -1;

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

// ==================== 计时器函数 ====================

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent = formatTime(timerSeconds);
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    isTimerRunning = true;
    isPuzzleCompleted = false;
    timerInterval = setInterval(() => {
        if (isTimerRunning && !isPuzzleCompleted) {
            timerSeconds++;
            updateTimerDisplay();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isTimerRunning = false;
}

function resetTimer() {
    stopTimer();
    timerSeconds = 0;
    updateTimerDisplay();
    isPuzzleCompleted = false;
}

function completeTimer() {
    if (!isPuzzleCompleted) {
        isPuzzleCompleted = true;
        isTimerRunning = false;
        if (timerInterval) clearInterval(timerInterval);
        showTemporaryMessage(`🎉 恭喜完成！用时 ${formatTime(timerSeconds)}`, 'success');
    }
}

function checkPuzzleCompletion() {
    const isFull = currentBoard.every(row => row.every(cell => cell !== 0));
    if (isFull && !isPuzzleCompleted && isTimerRunning) {
        completeTimer();
        return true;
    }
    return false;
}

// ==================== 渲染函数 ====================

function renderAllCandidates() {
    if (isExampleMode) {
        if (!exampleShowCandidates) return;
    } else {
        if (!practiceShowCandidates) return;
    }
    
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
    
    let candidatesSource;
    if (isExampleMode) {
        candidatesSource = cellCandidates[row][col];
    } else {
        candidatesSource = userCandidates[row][col];
    }
    
    const sorted = Array.from(candidatesSource).sort((a, b) => a - b);
    const isEditable = isExampleMode ? exampleEditMode : practiceEditMode;
    
    sorted.forEach(num => {
        const span = document.createElement('span');
        span.className = 'candidate-note';
        if (isEditable) {
            span.classList.add('editing-mode');
            span.style.cursor = 'pointer';
            span.onclick = (e) => {
                e.stopPropagation();
                if (isExampleMode) {
                    toggleCandidateNumberUI(row, col, num);
                } else {
                    practiceToggleCandidate(row, col, num);
                }
            };
        }
        span.textContent = num;
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
                
                if (originalBoard[i][j] !== 0) {
                    input.classList.add('original');
                    input.classList.remove('user-filled');
                    input.readOnly = true;
                } else if (val !== 0) {
                    input.classList.remove('original');
                    input.classList.add('user-filled');
                    input.readOnly = isExampleMode ? true : practiceEditMode;
                } else {
                    input.classList.remove('original');
                    input.classList.remove('user-filled');
                    input.readOnly = isExampleMode ? true : practiceEditMode;
                }
            }
        }
    }
    
    if (isExampleMode) {
        if (exampleShowCandidates) {
            document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'flex');
            renderAllCandidates();
        } else {
            document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'none');
        }
    } else {
        if (practiceShowCandidates) {
            document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'flex');
            for (let i = 0; i < 9; i++) {
                for (let j = 0; j < 9; j++) {
                    renderCellCandidates(i, j);
                }
            }
        } else {
            document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'none');
        }
    }
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
            input.addEventListener('click', (e) => {
                e.stopPropagation();
                selectCell(i, j);
            });
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

// 创建底部数字键盘（放在 game-area 内部）
function createNumberPad() {
    const existingPad = document.getElementById('numberPad');
    if (existingPad) {
        // 清空现有内容
        existingPad.innerHTML = '';
    } else {
        // 如果不存在，创建容器（但 HTML 中已经有了）
        return;
    }
    
    const pad = document.getElementById('numberPad');
    if (!pad) return;
    
    for (let i = 1; i <= 9; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = 'number-pad-btn';
        btn.addEventListener('click', () => {
            if (currentSelectedRow !== -1 && currentSelectedCol !== -1) {
                const row = currentSelectedRow;
                const col = currentSelectedCol;
                
                if (isExampleMode && !window.isManualEditMode) {
                    showTemporaryMessage('例题模式下请使用"下一步"按钮', 'warning');
                    return;
                }
                
                if (originalBoard[row][col] !== 0) {
                    showTemporaryMessage('原始题目格子不能修改', 'warning');
                    return;
                }
                
                if (isExampleMode) {
                    if (window.isManualEditMode) {
                        fillNumberToSelectedCell(i);
                    } else if (exampleEditMode) {
                        toggleCandidateNumberUI(row, col, i);
                    }
                } else {
                    if (practiceEditMode) {
                        practiceToggleCandidate(row, col, i);
                    } else {
                        fillNumberToSelectedCell(i);
                    }
                }
            } else {
                showTemporaryMessage('请先点击选择一个格子', 'warning');
            }
        });
        pad.appendChild(btn);
    }
}

// ==================== 核心验证函数 ====================

// 获取违反基本规则的错误详情
function getErrorDetail(row, col, num) {
    let reasons = [];
    
    for (let c = 0; c < 9; c++) {
        if (c !== col && currentBoard[row][c] === num) {
            reasons.push(`第 ${row+1} 行第 ${c+1} 列已经有了数字 ${num}`);
        }
    }
    
    for (let r = 0; r < 9; r++) {
        if (r !== row && currentBoard[r][col] === num) {
            reasons.push(`第 ${r+1} 行第 ${col+1} 列已经有了数字 ${num}`);
        }
    }
    
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const r = br + i;
            const c = bc + j;
            if ((r !== row || c !== col) && currentBoard[r][c] === num) {
                reasons.push(`第 ${r+1} 行第 ${c+1} 列（同一宫）已经有了数字 ${num}`);
            }
        }
    }
    
    if (reasons.length === 0) {
        reasons.push(`数字 ${num} 违反了数独规则`);
    }
    
    return {
        title: `❌ 不能填入数字 ${num}`,
        content: `在格子 (${row+1}, ${col+1}) 中，填入 ${num} 会违反以下规则：`,
        reasons: reasons,
        suggestion: '请尝试其他数字，或者先检查该行、列、宫中已有的数字。'
    };
}

// 获取当前格子无法推导的错误详情（但有其他格子可推导）
function getOtherDerivableErrorDetail(row, col, num, derivableCell) {
    return {
        title: `❌ 不能填入数字 ${num}`,
        content: `在格子 (${row+1}, ${col+1}) 中，数字 ${num} 无法通过当前盘面的数独规则推导出来。`,
        reasons: [
            `${derivableCell.technique}`,
            `请先处理这个可以确定的格子，然后再尝试填入其他格子。`
        ],
        suggestion: `请先处理格子 (${derivableCell.row+1}, ${derivableCell.col+1})，填入数字 ${derivableCell.value}。`
    };
}

// 获取当前格子推导出的正确数字提示
function getCorrectDerivableDetail(row, col, num, derivableResult) {
    return {
        title: `✅ 正确填入 ${num}`,
        content: `${derivableResult.technique}`,
        suggestion: ''
    };
}

// 显示错误提示对话框
function showErrorHintDialog(errorInfo) {
    const dialog = document.getElementById('hintDialog');
    const body = document.getElementById('hintDialogBody');
    
    if (!dialog || !body) return;
    
    let reasonsHtml = '';
    if (errorInfo.reasons && errorInfo.reasons.length > 0) {
        reasonsHtml = '<ul style="margin: 10px 0 10px 20px; line-height: 1.8;">';
        for (const reason of errorInfo.reasons) {
            reasonsHtml += `<li>${reason}</li>`;
        }
        reasonsHtml += '</ul>';
    }
    
    let suggestionHtml = '';
    if (errorInfo.suggestion) {
        suggestionHtml = `
            <div style="background: #fff3e0; padding: 12px; border-radius: 8px; margin-top: 12px;">
                <strong>📖 建议：</strong> ${errorInfo.suggestion}
            </div>
        `;
    }
    
    body.innerHTML = `
        <div style="background: #ffebee; padding: 15px; border-radius: 10px;">
            <div style="font-size: 18px; font-weight: bold; color: #c62828; margin-bottom: 10px;">${errorInfo.title}</div>
            <div style="margin-bottom: 10px;">${errorInfo.content}</div>
            ${reasonsHtml}
            ${suggestionHtml}
        </div>
    `;
    
    dialog.style.display = 'flex';
}

// 显示成功提示对话框（可选）
function showSuccessHintDialog(successInfo) {
    const dialog = document.getElementById('hintDialog');
    const body = document.getElementById('hintDialogBody');
    
    if (!dialog || !body) return;
    
    body.innerHTML = `
        <div style="background: #e8f5e9; padding: 15px; border-radius: 10px;">
            <div style="font-size: 18px; font-weight: bold; color: #2e7d32; margin-bottom: 10px;">${successInfo.title}</div>
            <div>${successInfo.content}</div>
        </div>
    `;
    
    dialog.style.display = 'flex';
    setTimeout(() => {
        dialog.style.display = 'none';
    }, 2000);
}

// ==================== 核心填入函数 ====================

// 向当前选中的格子填入数字
// 向当前选中的格子填入数字
function fillNumberToSelectedCell(num) {
    if (currentSelectedRow === -1 || currentSelectedCol === -1) {
        showTemporaryMessage('请先点击选择一个格子', 'warning');
        return;
    }
    
    const row = currentSelectedRow;
    const col = currentSelectedCol;
    
    // 原始题目格子不能修改
    if (originalBoard[row][col] !== 0) {
        showTemporaryMessage('原始题目格子不能修改', 'warning');
        return;
    }
    
    // 例题模式下且非手动编辑模式，不允许输入
    if (isExampleMode && !window.isManualEditMode) {
        showTemporaryMessage('例题模式下请使用"下一步"按钮', 'warning');
        return;
    }
    
    // 1. 首先检查是否违反基本规则（行列宫冲突）
    if (!isValidMove(row, col, num)) {
        addError();
        const errorDetail = getErrorDetail(row, col, num);
        showErrorHintDialog(errorDetail);
        return;
    }
    
    // 2. 检查当前格子是否能通过规则唯一确定
    const derivableCurrent = canDeriveCellValue(row, col);
    
    // 3. 检查整个盘面是否有任何格子可以确定
    const derivableAny = hasAnyDerivableCell();
    
    // 4. 检查用户候选数与系统候选数是否一致
    const candidatesMatch = isUserCandidatesMatchSystem();
    
    // 自由模式判断：没有任何格子可以确定，且候选数一致
    if (!derivableAny.hasDerivable && candidatesMatch) {
        // 自由模式：允许任意填入（只要不违反基本规则）
        if (!isFreeMode) {
            isFreeMode = true;
            showTemporaryMessage('当前没有任何格子可以推导，已进入自由模式，可任意填写', 'warning');
            const modeBadge = document.getElementById('modeBadge');
            if (modeBadge) {
                modeBadge.innerHTML = '✏️ 自由模式';
                modeBadge.classList.add('manual-mode');
            }
        }
        
        saveToHistory();
        currentBoard[row][col] = num;
        
        if (!isExampleMode) {
            userCandidates[row][col].clear();
            syncUserCandidatesToDisplay();
        } else {
            recalcAfterPlacement(row, col, num);
            clearDeleteRecord();
        }
        
        updateBoardDisplay();
        checkPuzzleCompletion();
        
        showTemporaryMessage(`已填入 ${num}`, 'success');
        return;
    }
    
    // 5. 如果没有可推导的格子，但候选数不一致，提示用户调整候选数
    if (!derivableAny.hasDerivable && !candidatesMatch) {
        addError();
        const errorDetail = {
            title: `❌ 不能填入数字 ${num}`,
            content: `当前盘面无法推导出任何数字，但您的候选数与系统计算的不一致。`,
            reasons: [
                `请先使用"编辑候选数"功能，将候选数调整为与系统计算一致。`,
                `或者点击"补全候选数"自动修正。`
            ],
            suggestion: '请点击"补全候选数"或手动编辑候选数。'
        };
        showErrorHintDialog(errorDetail);
        return;
    }
    
    // 6. 有格子可以确定，退出自由模式（如果之前是自由模式）
    if (isFreeMode) {
        isFreeMode = false;
        const modeBadge = document.getElementById('modeBadge');
        if (modeBadge) {
            modeBadge.innerHTML = '✏️ 练习模式';
            modeBadge.classList.remove('manual-mode');
            modeBadge.classList.add('practice-mode');
        }
        showTemporaryMessage('已恢复标准模式', 'info');
    }
    
    // 7. 检查当前格子是否能确定
    if (derivableCurrent.canDerive) {
        // 当前格子可以确定，检查填入的数字是否正确
        if (derivableCurrent.value === num) {
            // 正确填入
            saveToHistory();
            currentBoard[row][col] = num;
            
            if (!isExampleMode) {
                userCandidates[row][col].clear();
                syncUserCandidatesToDisplay();
            } else {
                recalcAfterPlacement(row, col, num);
                clearDeleteRecord();
            }
            
            updateBoardDisplay();
            checkPuzzleCompletion();
            
            showTemporaryMessage(`正确！${derivableCurrent.technique}`, 'success');
        } else {
            // 错误：当前格子应该填入其他数字
            addError();
            const errorDetail = {
                title: `❌ 不能填入数字 ${num}`,
                content: `在格子 (${row+1}, ${col+1}) 中，当前盘面无法通过逻辑推导出此值。`,
                reasons: [`根据数独规则，这个格子只能填入 ${derivableCurrent.value}。`],
                suggestion: `请填入数字 ${derivableCurrent.value}`
            };
            showErrorHintDialog(errorDetail);
        }
    } else {
        // 当前格子不能确定，但盘面有其他格子可以确定
        addError();
        const errorDetail = {
            title: `❌ 不能填入数字 ${num}`,
            content: `在格子 (${row+1}, ${col+1}) 中，当前盘面无法通过逻辑推导出此值。`,
            reasons: [`当前盘面存在其他可以确定的格子，请先处理那些格子。`],
            suggestion: `请先处理其他可以确定的格子。`
        };
        showErrorHintDialog(errorDetail);
    }
}
function selectCell(row, col) {
    currentSelectedRow = row;
    currentSelectedCol = col;
    
    document.querySelectorAll('.cell-container').forEach(c => {
        c.classList.remove('highlighted');
        c.classList.remove('highlight-row-col');
        c.classList.remove('highlight-box');
    });
    
    const container = document.getElementById(`cell-container-${row}-${col}`);
    if (container) container.classList.add('highlighted');
    
    // 高亮同一行
    for (let c = 0; c < 9; c++) {
        if (c === col) continue;
        const cell = document.getElementById(`cell-container-${row}-${c}`);
        if (cell) cell.classList.add('highlight-row-col');
    }
    
    // 高亮同一列
    for (let r = 0; r < 9; r++) {
        if (r === row) continue;
        const cell = document.getElementById(`cell-container-${r}-${col}`);
        if (cell) cell.classList.add('highlight-row-col');
    }
    
    // 高亮同一宫
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const r = boxRow + i;
            const c = boxCol + j;
            if (r === row && c === col) continue;
            const cell = document.getElementById(`cell-container-${r}-${c}`);
            if (cell) cell.classList.add('highlight-box');
        }
    }
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

function handleKeyDown(e, row, col) {
    // 高亮当前操作的格子
    selectCell(row, col);
    
    // 例题模式下
    if (isExampleMode) {
        // 手动编辑模式：可以直接输入数字
        if (window.isManualEditMode) {
            if (e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                fillNumberToSelectedCell(parseInt(e.key));
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                if (originalBoard[row][col] !== 0) {
                    showTemporaryMessage('原始题目格子不能修改', 'warning');
                    return;
                }
                saveToHistory();
                currentBoard[row][col] = 0;
                if (!isExampleMode) {
                    userCandidates[row][col].clear();
                    syncUserCandidatesToDisplay();
                }
                updateBoardDisplay();
                checkPuzzleCompletion();
                showTemporaryMessage('已清除', 'info');
            }
            return;
        }
        
        // 正常例题模式：只允许编辑候选数
        if (exampleEditMode && e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            toggleCandidateNumberUI(row, col, parseInt(e.key));
        }
        return;
    }
    
    // 练习模式
    if (practiceEditMode) {
        // 候选数编辑模式：按数字键编辑候选数
        if (e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            practiceToggleCandidate(row, col, parseInt(e.key));
        }
        return;
    }
    
    // 练习模式 - 数字输入模式
    if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        fillNumberToSelectedCell(parseInt(e.key));
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (originalBoard[row][col] !== 0) {
            showTemporaryMessage('原始题目格子不能修改', 'warning');
            return;
        }
        saveToHistory();
        currentBoard[row][col] = 0;
        if (!isExampleMode) {
            userCandidates[row][col].clear();
            syncUserCandidatesToDisplay();
        }
        updateBoardDisplay();
        checkPuzzleCompletion();
        showTemporaryMessage('已清除', 'info');
    }
}

function toggleEditMode() {
    if (isExampleMode) {
        exampleEditMode = !exampleEditMode;
        const dropdownBtn = document.getElementById('candidatesDropdownBtn');
        const editMenuItem = document.querySelector('[data-action="edit"]');
        
        if (exampleEditMode) {
            if (dropdownBtn) dropdownBtn.classList.add('active');
            if (editMenuItem) editMenuItem?.classList.add('active');
            showTemporaryMessage('例题模式：候选数编辑模式，点击候选数或按数字键可添加/删除', 'info');
        } else {
            if (dropdownBtn) dropdownBtn.classList.remove('active');
            if (editMenuItem) editMenuItem?.classList.remove('active');
            showTemporaryMessage('例题模式：候选数只读模式', 'info');
        }
        renderAllCandidates();
        return;
    }
    
    practiceEditMode = !practiceEditMode;
    const dropdownBtn = document.getElementById('candidatesDropdownBtn');
    const editMenuItem = document.querySelector('[data-action="edit"]');
    
    if (practiceEditMode) {
        if (dropdownBtn) dropdownBtn.classList.add('active');
        if (editMenuItem) editMenuItem?.classList.add('active');
        // 进入候选数编辑模式：格子变为只读
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const input = document.getElementById(`cell-${i}-${j}`);
                if (input && originalBoard[i][j] === 0) input.readOnly = true;
            }
        }
        renderAllCandidates();
        showTemporaryMessage('练习模式：候选数编辑模式，点击候选数或按数字键可添加/删除', 'info');
    } else {
        if (dropdownBtn) dropdownBtn.classList.remove('active');
        if (editMenuItem) editMenuItem?.classList.remove('active');
        // 退出候选数编辑模式：格子恢复可输入
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const input = document.getElementById(`cell-${i}-${j}`);
                if (input && originalBoard[i][j] === 0) input.readOnly = false;
            }
        }
        if (practiceShowCandidates) renderAllCandidates();
        showTemporaryMessage('练习模式：数字输入模式，点击底部数字按钮或按数字键填入', 'info');
    }
}

function toggleCandidatesDisplay() {
    if (isExampleMode) {
        exampleShowCandidates = !exampleShowCandidates;
        const toggleMenuItem = document.querySelector('[data-action="toggle"]');
        if (exampleShowCandidates) {
            if (toggleMenuItem) toggleMenuItem.innerHTML = '🔢 隐藏候选数';
            document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'flex');
            renderAllCandidates();
            showTemporaryMessage('例题模式：候选数已显示', 'info');
        } else {
            if (toggleMenuItem) toggleMenuItem.innerHTML = '🔢 显示候选数';
            document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'none');
            showTemporaryMessage('例题模式：候选数已隐藏', 'info');
        }
        return;
    }
    
    practiceShowCandidates = !practiceShowCandidates;
    const toggleMenuItem = document.querySelector('[data-action="toggle"]');
    
    if (practiceShowCandidates) {
        if (toggleMenuItem) toggleMenuItem.innerHTML = '🔢 隐藏候选数';
        document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'flex');
        
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const div = document.getElementById(`candidates-${i}-${j}`);
                if (div) {
                    if (currentBoard[i][j] === 0) {
                        div.innerHTML = '';
                        const sorted = Array.from(userCandidates[i][j]).sort((a, b) => a - b);
                        const isEditable = practiceEditMode;
                        
                        sorted.forEach(num => {
                            const span = document.createElement('span');
                            span.className = 'candidate-note';
                            if (isEditable) {
                                span.classList.add('editing-mode');
                                span.style.cursor = 'pointer';
                                span.onclick = (e) => {
                                    e.stopPropagation();
                                    practiceToggleCandidate(i, j, num);
                                };
                            }
                            span.textContent = num;
                            div.appendChild(span);
                        });
                    } else {
                        div.innerHTML = '';
                    }
                }
            }
        }
        showTemporaryMessage('练习模式：候选数已显示', 'info');
    } else {
        if (toggleMenuItem) toggleMenuItem.innerHTML = '🔢 显示候选数';
        document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'none');
        showTemporaryMessage('练习模式：候选数已隐藏', 'info');
    }
}

function loadPuzzle(name) {
    const puzzle = PUZZLE_LIBRARY.find(p => p.name === name);
    if (!puzzle) return;
    
    const grid = puzzle.grid.map(row => row.split('').map(c => parseInt(c)));
    
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            currentBoard[i][j] = grid[i][j];
            originalBoard[i][j] = grid[i][j];
        }
    }
    initCandidates();
    initUserCandidates();
    
    if (!isExampleMode && !practiceShowCandidates) {
        document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'none');
    }
    updateBoardDisplay();
    
    historyBoards = [cloneBoardUI(currentBoard)];
    historyIdx = 0;
    currentSteps = [];
    stepCount = 0;
    updateStepsListDisplay();
    document.getElementById('explanation-content').innerHTML = '<div class="step-explanation">✨ 点击"下一步"开始智能解题</div>';
    
    resetTimer();
    startTimer();
    resetErrorCount();
    isFreeMode = false;
    
    const modeBadge = document.getElementById('modeBadge');
    if (modeBadge) {
        modeBadge.innerHTML = '✏️ 练习模式';
        modeBadge.classList.remove('manual-mode');
        modeBadge.classList.add('practice-mode');
    }
    
    // 更新自由模式状态
    updateFreeModeStatus();
    
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

function loadRandomPuzzle() {
    if (!PUZZLE_LIBRARY || PUZZLE_LIBRARY.length === 0) {
        showTemporaryMessage('暂无可用题目', 'warning');
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * PUZZLE_LIBRARY.length);
    const randomPuzzle = PUZZLE_LIBRARY[randomIndex];
    
    const selector = document.getElementById('puzzleSelector');
    if (selector) selector.value = randomPuzzle.name;
    
    loadPuzzle(randomPuzzle.name);
    showTemporaryMessage(`🎲 随机加载: ${randomPuzzle.name}`, 'success');
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
            currentSteps = currentSteps.slice(0, historyIdx);
            stepCount = currentSteps.length;
            updateStepsListDisplay();
            if (currentSteps.length > 0) {
                addDetailedExplanation(currentSteps[currentSteps.length - 1], stepCount);
            } else {
                document.getElementById('explanation-content').innerHTML = '<div class="step-explanation">✨ 已回到初始状态</div>';
            }
        }
        
        const isFull = currentBoard.every(row => row.every(cell => cell !== 0));
        if (!isFull && isPuzzleCompleted) {
            isPuzzleCompleted = false;
            startTimer();
        }
        
        // 更新自由模式状态
        updateFreeModeStatus();
        
        showTemporaryMessage('已回退到上一步', 'info');
    } else {
        showTemporaryMessage('没有更早的历史', 'warning');
    }
}

// ==================== 闪烁删除效果 ====================

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
        targetSpan.classList.add('flashing');
        setTimeout(() => {
            targetSpan.classList.remove('flashing');
            if (targetSpan.parentNode) targetSpan.remove();
            renderCellCandidates(row, col);
            if (callback) callback();
        }, TOTAL_FLASH_TIME);
    } else {
        if (callback) callback();
    }
}

function flashCandidatesBatch(eliminations, callback) {
    if (!eliminations || eliminations.length === 0) {
        if (callback) callback();
        return;
    }
    
    let completed = 0;
    for (const elim of eliminations) {
        flashAndRemoveCandidate(elim.row, elim.col, elim.num, () => {
            completed++;
            if (completed === eliminations.length && callback) callback();
        });
    }
}

// ==================== 下一步核心 ====================

async function nextStep() {
    if (nextStepInProgress) {
        showTemporaryMessage('正在处理中...', 'warning');
        return;
    }
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
                    showTemporaryMessage('⚠️ 当前没有找到可确定的步骤', 'warning');
                    if (isExampleMode) enableManualEditInExampleMode();
                }
                nextStepInProgress = false;
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = '➡️ 下一步';
                }
                return;
            }
            
            saveToHistory();
            
            if (step.value) {
                applyStep(step);
                stepCount++;
                currentSteps.push(step);
                updateBoardDisplay();
                addDetailedExplanation(step, stepCount);
                updateStepsListDisplay();
                highlightNewNumber(step.row, step.col);
                checkPuzzleCompletion();
                
                nextStepInProgress = false;
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = '➡️ 下一步';
                }
                return;
            }
            
            if (step.eliminations && step.eliminations.length > 0) {
                applyStep(step);
                flashCandidatesBatch(step.eliminations, () => {
                    stepCount++;
                    currentSteps.push(step);
                    addDetailedExplanation(step, stepCount);
                    updateStepsListDisplay();
                    checkPuzzleCompletion();
                    nextStepInProgress = false;
                    if (btn) {
                        btn.disabled = false;
                        btn.textContent = '➡️ 下一步';
                    }
                });
                return;
            }
            
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

// ==================== 模式切换函数 ====================

function enterExampleMode() {
    if (isExampleMode) return;
    isExampleMode = true;
    window.isManualEditMode = false;
    
    document.getElementById('exampleControls').style.display = 'flex';
    document.getElementById('explanationSidebar').style.display = 'flex';
    
    const gameArea = document.getElementById('gameArea');
    if (gameArea) {
        gameArea.classList.remove('practice-mode');
        gameArea.classList.add('example-mode');
    }
    
    const modeBadge = document.getElementById('modeBadge');
    if (modeBadge) {
        modeBadge.className = 'mode-badge example-mode';
        modeBadge.innerHTML = '📖 例题模式';
    }
    
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const input = document.getElementById(`cell-${i}-${j}`);
            if (input && originalBoard[i][j] === 0) input.readOnly = true;
        }
    }
    
    exampleShowCandidates = true;
    exampleEditMode = false;
    
    const toggleMenuItem = document.querySelector('[data-action="toggle"]');
    if (toggleMenuItem) toggleMenuItem.innerHTML = '🔢 隐藏候选数';
    
    const editMenuItem = document.querySelector('[data-action="edit"]');
    if (editMenuItem) editMenuItem.classList.remove('active');
    
    const dropdownBtn = document.getElementById('candidatesDropdownBtn');
    if (dropdownBtn) dropdownBtn.classList.remove('active');
    
    document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'flex');
    renderAllCandidates();
    
    stepCount = 0;
    currentSteps = [];
    updateStepsListDisplay();
    const explanationContent = document.getElementById('explanation-content');
    if (explanationContent) {
        explanationContent.innerHTML = '<div class="step-explanation">✨ 点击"下一步"开始智能解题</div>';
    }
    
    initCandidates();
    const manualHint = document.getElementById('manualEditHint');
    if (manualHint) manualHint.remove();
    
    showTemporaryMessage('已进入例题模式，可以使用"下一步"智能解题', 'info');
}

function exitExampleMode() {
    if (!isExampleMode) return;
    isExampleMode = false;
    window.isManualEditMode = false;
    
    document.getElementById('exampleControls').style.display = 'none';
    document.getElementById('explanationSidebar').style.display = 'none';
    
    const gameArea = document.getElementById('gameArea');
    if (gameArea) {
        gameArea.classList.remove('example-mode');
        gameArea.classList.add('practice-mode');
    }
    
    const modeBadge = document.getElementById('modeBadge');
    if (modeBadge) {
        modeBadge.className = 'mode-badge practice-mode';
        modeBadge.innerHTML = '✏️ 练习模式';
    }
    
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const input = document.getElementById(`cell-${i}-${j}`);
            if (input && originalBoard[i][j] === 0) input.readOnly = false;
        }
    }
    
    if (practiceShowCandidates) {
        document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'flex');
        renderAllCandidates();
    } else {
        document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'none');
    }
    
    const toggleMenuItem = document.querySelector('[data-action="toggle"]');
    if (toggleMenuItem) {
        toggleMenuItem.innerHTML = practiceShowCandidates ? '🔢 隐藏候选数' : '🔢 显示候选数';
    }
    
    const editMenuItem = document.querySelector('[data-action="edit"]');
    if (editMenuItem && practiceEditMode) {
        editMenuItem.classList.add('active');
        const dropdownBtn = document.getElementById('candidatesDropdownBtn');
        if (dropdownBtn) dropdownBtn.classList.add('active');
    } else if (editMenuItem) {
        editMenuItem.classList.remove('active');
        const dropdownBtn = document.getElementById('candidatesDropdownBtn');
        if (dropdownBtn) dropdownBtn.classList.remove('active');
    }
    
    const manualHint = document.getElementById('manualEditHint');
    if (manualHint) manualHint.remove();
    
    // 更新自由模式状态
    updateFreeModeStatus();
    
    showTemporaryMessage('已切换到练习模式', 'info');
}

function enableManualEditInExampleMode() {
    if (!isExampleMode) return;
    window.isManualEditMode = true;
    
    const modeBadge = document.getElementById('modeBadge');
    modeBadge.className = 'mode-badge manual-mode';
    modeBadge.innerHTML = '✏️ 手动编辑';
    
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const input = document.getElementById(`cell-${i}-${j}`);
            if (input && originalBoard[i][j] === 0) input.readOnly = false;
        }
    }
    
    if (!exampleEditMode) {
        exampleEditMode = true;
        const editMenuItem = document.querySelector('[data-action="edit"]');
        const dropdownBtn = document.getElementById('candidatesDropdownBtn');
        if (editMenuItem) editMenuItem.classList.add('active');
        if (dropdownBtn) dropdownBtn.classList.add('active');
    }
    
    if (!exampleShowCandidates) {
        exampleShowCandidates = true;
        const toggleMenuItem = document.querySelector('[data-action="toggle"]');
        if (toggleMenuItem) toggleMenuItem.innerHTML = '🔢 隐藏候选数';
        document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'flex');
    }
    renderAllCandidates();
    showManualEditHint();
    showTemporaryMessage('已切换到手动编辑模式', 'info');
}

function showManualEditHint() {
    if (document.getElementById('manualEditHint')) return;
    
    const hintDiv = document.createElement('div');
    hintDiv.id = 'manualEditHint';
    hintDiv.className = 'manual-edit-hint';
    hintDiv.innerHTML = `
        <span>✏️ 已切换到手动编辑模式</span>
        <div class="hint-buttons">
            <button id="retryAutoSolveBtn" class="hint-btn">🔄 重新尝试智能解题</button>
            <button id="exitToPracticeBtn" class="hint-btn">✏️ 切换到练习模式</button>
        </div>
    `;
    
    const gameArea = document.querySelector('.game-area');
    if (gameArea) {
        gameArea.parentNode.insertBefore(hintDiv, gameArea);
    } else {
        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(hintDiv, document.querySelector('.controls')?.nextSibling);
        }
    }
    
    document.getElementById('retryAutoSolveBtn')?.addEventListener('click', () => retryAutoSolve());
    document.getElementById('exitToPracticeBtn')?.addEventListener('click', () => {
        exitExampleMode();
        document.getElementById('manualEditHint')?.remove();
    });
}

function retryAutoSolve() {
    if (!isExampleMode) return;
    initCandidates();
    window.isManualEditMode = false;
    
    const modeBadge = document.getElementById('modeBadge');
    if (modeBadge) {
        modeBadge.className = 'mode-badge example-mode';
        modeBadge.innerHTML = '📖 例题模式';
    }
    
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const input = document.getElementById(`cell-${i}-${j}`);
            if (input && originalBoard[i][j] === 0) input.readOnly = true;
        }
    }
    
    exampleEditMode = false;
    const editMenuItem = document.querySelector('[data-action="edit"]');
    const dropdownBtn = document.getElementById('candidatesDropdownBtn');
    if (editMenuItem) editMenuItem.classList.remove('active');
    if (dropdownBtn) dropdownBtn.classList.remove('active');
    
    renderAllCandidates();
    const manualHint = document.getElementById('manualEditHint');
    if (manualHint) manualHint.remove();
    
    showTemporaryMessage('已重新尝试智能解题，请点击"下一步"继续', 'info');
}

function toggleCandidateNumberUI(row, col, num) {
    if (!isExampleMode) return;
    if (!exampleEditMode) {
        showTemporaryMessage('请先开启"编辑候选数"模式', 'warning');
        return;
    }
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
            showTemporaryMessage(`数字 ${num} 违反数独规则，不能添加`, 'warning');
        }
    }
    renderCellCandidates(row, col);
}

// ==================== 自定义题目函数 ====================

function showCustomPuzzleDialog() {
    const dialog = document.getElementById('customPuzzleDialog');
    const textarea = document.getElementById('customPuzzleInput');
    const errorDiv = document.getElementById('customPuzzleError');
    if (textarea) textarea.value = '';
    if (errorDiv) errorDiv.style.display = 'none';
    dialog.style.display = 'flex';
}

function initCustomDialogEvents() {
    const dialog = document.getElementById('customPuzzleDialog');
    const closeBtn = document.getElementById('customDialogClose');
    const cancelBtn = document.getElementById('cancelCustomBtn');
    const confirmBtn = document.getElementById('confirmCustomBtn');
    const loadExampleBtn = document.getElementById('loadExampleBtn');
    const textarea = document.getElementById('customPuzzleInput');
    const errorDiv = document.getElementById('customPuzzleError');
    
    const closeDialog = () => dialog.style.display = 'none';
    closeBtn?.addEventListener('click', closeDialog);
    cancelBtn?.addEventListener('click', closeDialog);
    window.addEventListener('click', (e) => { if (e.target === dialog) closeDialog(); });
    
    loadExampleBtn?.addEventListener('click', () => {
        if (textarea) textarea.value = "530070000,600195000,098000060,800060003,400803001,700020006,060000280,000419005,000080079";
        if (errorDiv) errorDiv.style.display = 'none';
    });
    
    confirmBtn?.addEventListener('click', () => {
        const inputValue = textarea?.value.trim();
        if (!inputValue) { showCustomError('请输入题目数据'); return; }
        
        const parts = inputValue.split(',').map(s => s.trim());
        if (parts.length !== 9) { showCustomError(`需要输入9行数据，当前输入了 ${parts.length} 行`); return; }
        
        const grid = [];
        for (let i = 0; i < 9; i++) {
            const rowStr = parts[i];
            if (rowStr.length !== 9) { showCustomError(`第 ${i+1} 行长度不是9个字符`); return; }
            const row = [];
            for (let j = 0; j < 9; j++) {
                const char = rowStr[j];
                const num = parseInt(char, 10);
                if (isNaN(num) || num < 0 || num > 9) { showCustomError(`第 ${i+1} 行第 ${j+1} 列无效`); return; }
                row.push(num);
            }
            grid.push(row);
        }
        
        const validationError = validatePuzzle(grid);
        if (validationError) { showCustomError(validationError); return; }
        
        loadCustomPuzzle(grid);
        closeDialog();
        showTemporaryMessage('自定义题目加载成功', 'success');
    });
}

function showCustomError(message) {
    const errorDiv = document.getElementById('customPuzzleError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function validatePuzzle(grid) {
    for (let row = 0; row < 9; row++) {
        const seen = new Set();
        for (let col = 0; col < 9; col++) {
            const val = grid[row][col];
            if (val !== 0) { if (seen.has(val)) return `第 ${row+1} 行有重复的数字 ${val}`; seen.add(val); }
        }
    }
    for (let col = 0; col < 9; col++) {
        const seen = new Set();
        for (let row = 0; row < 9; row++) {
            const val = grid[row][col];
            if (val !== 0) { if (seen.has(val)) return `第 ${col+1} 列有重复的数字 ${val}`; seen.add(val); }
        }
    }
    for (let box = 0; box < 9; box++) {
        const seen = new Set();
        const br = Math.floor(box / 3) * 3, bc = (box % 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const val = grid[br + i][bc + j];
                if (val !== 0) { if (seen.has(val)) return `第 ${box+1} 宫有重复的数字 ${val}`; seen.add(val); }
            }
        }
    }
    return null;
}

function loadCustomPuzzle(grid) {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            currentBoard[i][j] = grid[i][j];
            originalBoard[i][j] = grid[i][j];
        }
    }
    initCandidates();
    initUserCandidates();
    updateBoardDisplay();
    
    historyBoards = [cloneBoardUI(currentBoard)];
    historyIdx = 0;
    currentSteps = [];
    stepCount = 0;
    updateStepsListDisplay();
    document.getElementById('explanation-content').innerHTML = '<div class="step-explanation">✨ 点击"下一步"开始智能解题</div>';
    resetTimer();
    startTimer();
    resetErrorCount();
    isFreeMode = false;
    
    const modeBadge = document.getElementById('modeBadge');
    if (modeBadge && !isExampleMode) {
        modeBadge.innerHTML = '✏️ 练习模式';
        modeBadge.classList.remove('manual-mode');
        modeBadge.classList.add('practice-mode');
    }
    
    const selector = document.getElementById('puzzleSelector');
    if (selector) selector.value = '';
    if (!isExampleMode && !practiceShowCandidates) {
        document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'none');
    }
    
    // 更新自由模式状态
    updateFreeModeStatus();
}

// ==================== 事件绑定 ====================

function attachEvents() {
    const dropdownBtn = document.getElementById('candidatesDropdownBtn');
    const dropdownMenu = document.getElementById('candidatesDropdownMenu');
    
    if (dropdownBtn && dropdownMenu) {
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
        document.addEventListener('click', () => dropdownMenu.classList.remove('show'));
        dropdownMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = e.target.getAttribute('data-action');
            if (action === 'random') { loadRandomPuzzle(); dropdownMenu.classList.remove('show'); }
            else if (action === 'custom') { showCustomPuzzleDialog(); dropdownMenu.classList.remove('show'); }
            else if (action === 'example') { enterExampleMode(); dropdownMenu.classList.remove('show'); }
            else if (action === 'practice') { exitExampleMode(); dropdownMenu.classList.remove('show'); }
            else if (action === 'fillCandidates') { fillCandidates(); dropdownMenu.classList.remove('show'); }
            else if (action === 'nextHint') { showNextHint(); dropdownMenu.classList.remove('show'); }
            else if (action === 'edit') { toggleEditMode(); dropdownMenu.classList.remove('show'); }
            else if (action === 'toggle') { toggleCandidatesDisplay(); dropdownMenu.classList.remove('show'); }
        });
    }
    
    document.getElementById('nextStepBtn')?.addEventListener('click', nextStep);
    document.getElementById('undoBtn')?.addEventListener('click', undo);
    
    document.getElementById('hintDialogClose')?.addEventListener('click', () => {
        document.getElementById('hintDialog').style.display = 'none';
    });
    document.getElementById('hintDialogOk')?.addEventListener('click', () => {
        document.getElementById('hintDialog').style.display = 'none';
    });
    window.addEventListener('click', (e) => {
        const dialog = document.getElementById('hintDialog');
        if (e.target === dialog) dialog.style.display = 'none';
    });
    
    initCustomDialogEvents();
}

// ==================== 初始化 ====================

function initUI() {
    createBoard();
    attachEvents();
    loadPuzzleList();
    createNumberPad();
    
    const gameArea = document.getElementById('gameArea');
    if (gameArea) gameArea.classList.add('practice-mode');
    const explanationSidebar = document.getElementById('explanationSidebar');
    if (explanationSidebar) explanationSidebar.style.display = 'none';
    
    // 初始化自由模式状态
    updateFreeModeStatus();
}

document.addEventListener('DOMContentLoaded', initUI);