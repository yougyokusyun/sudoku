/**
 * 数独解题器 - UI交互逻辑
 * 依赖：sudoku-core.js（核心解题）、puzzles.js（题库）
 */
// ==================== 错误计数变量 ====================
let errorCount = 0;
let isFreeMode = false;  // 自由模式：当无法智能解题时允许任意操作
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

// 检查是否可以自由操作（无法智能解题时）
function checkAndSetFreeMode() {
    if (isExampleMode) return;
    
    // 尝试找下一步
    const nextStep = findNextStep();
    if (!nextStep) {
        // 没有可确定的步骤，进入自由模式
        if (!isFreeMode) {
            isFreeMode = true;
            showTemporaryMessage('当前无法推导出下一步，已进入自由模式，可任意填写', 'warning');
            const modeBadge = document.getElementById('modeBadge');
            if (modeBadge) {
                modeBadge.innerHTML = '✏️ 自由模式';
                modeBadge.classList.add('manual-mode');
            }
        }
    } else {
        // 有可确定的步骤，退出自由模式
        if (isFreeMode) {
            isFreeMode = false;
            showTemporaryMessage('已恢复标准模式，请按数独规则操作', 'success');
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
            // 清空显示用的 cellCandidates
            cellCandidates[i][j].clear();
            if (currentBoard[i][j] === 0) {
                // 从 userCandidates 复制到显示用 cellCandidates
                for (const num of userCandidates[i][j]) {
                    cellCandidates[i][j].add(num);
                }
            }
        }
    }
    
    // 强制刷新所有候选数显示
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
    
    // 重新计算用户候选数（基于盘面排除法）
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
    
    // 强制刷新所有候选数显示
    if (practiceShowCandidates) {
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const div = document.getElementById(`candidates-${i}-${j}`);
                if (div && currentBoard[i][j] === 0) {
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
                } else if (div && currentBoard[i][j] !== 0) {
                    div.innerHTML = '';
                }
            }
        }
        document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'flex');
    }
    
    // 同步到显示用数组
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
    
    // 获取系统候选数
    const sysCandidates = getSystemCandidates();
    
    // 检查是否有唯一候选数的格子
    let hintFound = false;
    let hintMessages = [];
    
    // 1. 检查唯一候选数（Naked Single）
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (currentBoard[i][j] === 0 && sysCandidates[i][j].size === 1) {
                const value = Array.from(sysCandidates[i][j])[0];
                hintMessages.push({
                    type: 'success',
                    title: '🎯 唯一候选数',
                    content: `在格子 (${i+1}, ${j+1}) 中，根据排除法只剩下数字 ${value}，可以直接填入。`
                });
                hintFound = true;
                break;
            }
        }
        if (hintFound) break;
    }
    
    // 2. 检查唯余法（Hidden Single）
    if (!hintFound) {
        // 检查行
        for (let row = 0; row < 9; row++) {
            const numCount = {};
            const numPos = {};
            for (let col = 0; col < 9; col++) {
                if (currentBoard[row][col] === 0) {
                    for (const num of sysCandidates[row][col]) {
                        if (!numCount[num]) {
                            numCount[num] = 0;
                            numPos[num] = col;
                        }
                        numCount[num]++;
                    }
                }
            }
            for (let num = 1; num <= 9; num++) {
                if (numCount[num] === 1) {
                    hintMessages.push({
                        type: 'success',
                        title: '🎯 唯余法（行）',
                        content: `在第 ${row+1} 行中，数字 ${num} 只能出现在格子 (${row+1}, ${numPos[num]+1})，可以填入。`
                    });
                    hintFound = true;
                    break;
                }
            }
            if (hintFound) break;
        }
    }
    
    // 3. 检查用户候选数与系统候选数的差异
    if (!hintFound) {
        let diffFound = false;
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (currentBoard[i][j] === 0) {
                    const userSet = userCandidates[i][j];
                    const sysSet = sysCandidates[i][j];
                    
                    // 用户候选数中多出的数字
                    const extra = [];
                    for (const num of userSet) {
                        if (!sysSet.has(num)) {
                            extra.push(num);
                        }
                    }
                    
                    // 用户候选数中缺少的数字
                    const missing = [];
                    for (const num of sysSet) {
                        if (!userSet.has(num)) {
                            missing.push(num);
                        }
                    }
                    
                    if (extra.length > 0) {
                        hintMessages.push({
                            type: 'warning',
                            title: `⚠️ 候选数错误 (${i+1}, ${j+1})`,
                            content: `您的候选数 [${Array.from(userSet).sort().join(', ')}] 中，数字 ${extra.join(', ')} 不应该存在。请检查行列宫排除规则。`
                        });
                        diffFound = true;
                    }
                    
                    if (missing.length > 0 && !diffFound) {
                        hintMessages.push({
                            type: 'info',
                            title: `💡 候选数遗漏 (${i+1}, ${j+1})`,
                            content: `您的候选数 [${Array.from(userSet).sort().join(', ')}] 中，可能缺少 ${missing.join(', ')}。建议使用"补全候选数"功能。`
                        });
                        diffFound = true;
                    }
                }
            }
        }
        
        if (diffFound) {
            hintFound = true;
        }
    }
    
    // 4. 如果没有找到可填数字也没有差异，提示用户补全候选数
    if (!hintFound) {
        hintMessages.push({
            type: 'info',
            title: '🤔 暂无直接可填数字',
            content: '当前没有可以直接确定的数字。建议：\n1. 点击"补全候选数"重新计算候选数\n2. 检查是否有遗漏的排除规则\n3. 尝试使用显性数对、区块排除等高级技巧'
        });
    }
    
    // 显示提示对话框
    showHintDialog(hintMessages);
}

// 显示提示对话框
function showHintDialog(messages) {
    const dialog = document.getElementById('hintDialog');
    const body = document.getElementById('hintDialogBody');
    
    if (!dialog || !body) return;
    
    let html = '';
    for (const msg of messages) {
        let bgClass = '';
        if (msg.type === 'success') bgClass = 'hint-success';
        else if (msg.type === 'warning') bgClass = 'hint-warning';
        else bgClass = 'hint-info';
        
        html += `
            <div class="${bgClass}" style="margin-bottom: 15px; padding: 12px; border-radius: 10px;">
                <div style="font-weight: bold; margin-bottom: 8px;">${msg.title}</div>
                <div>${msg.content}</div>
            </div>
        `;
    }
    
    body.innerHTML = html;
    dialog.style.display = 'flex';
}

// 练习模式下编辑候选数
function practiceToggleCandidate(row, col, num) {
    if (!practiceEditMode) {
        showTemporaryMessage('请先开启"编辑候选数"模式', 'warning');
        return;
    }
    
    if (currentBoard[row][col] !== 0) {
        showTemporaryMessage('该格子已有数字，无法编辑候选数', 'warning');
        return;
    }
    
    // 添加或删除候选数
    if (userCandidates[row][col].has(num)) {
        userCandidates[row][col].delete(num);
        showTemporaryMessage(`已删除候选数 ${num}`, 'info');
    } else {
        userCandidates[row][col].add(num);
        showTemporaryMessage(`已添加候选数 ${num}`, 'info');
    }
    
    // 关键：确保候选数区域可见
    if (!practiceShowCandidates) {
        practiceShowCandidates = true;
        document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'flex');
        const toggleMenuItem = document.querySelector('[data-action="toggle"]');
        if (toggleMenuItem) toggleMenuItem.innerHTML = '🔢 隐藏候选数';
    }
    
    // 刷新这个格子的显示
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
    
    // 同步到显示用数组
    cellCandidates[row][col].clear();
    for (const n of userCandidates[row][col]) {
        cellCandidates[row][col].add(n);
    }
    
    // 额外：控制台输出确认数据
    console.log(`格子(${row+1},${col+1}) 候选数:`, Array.from(userCandidates[row][col]));
}

// 获取单个格子的系统候选数（基于当前盘面）
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

// 闪烁动画参数
const FLASH_DURATION = 800;
const FLASH_REPEAT = 3;
const TOTAL_FLASH_TIME = FLASH_DURATION * FLASH_REPEAT;

// ==================== 模式变量 ====================
let isExampleMode = false;           // true=例题模式, false=练习模式

// 练习模式专用变量
let practiceShowCandidates = false;  // 练习模式：是否显示候选数（默认不显示）
let practiceEditMode = false;        // 练习模式：是否编辑候选数

// 例题模式专用变量
let exampleShowCandidates = true;    // 例题模式：是否显示候选数（默认显示）
let exampleEditMode = false;         // 例题模式：是否编辑候选数

// ==================== 计时器变量 ====================
let timerInterval = null;
let timerSeconds = 0;
let isTimerRunning = false;
let isPuzzleCompleted = false;

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
    if (timerInterval) {
        clearInterval(timerInterval);
    }
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
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        const timeStr = formatTime(timerSeconds);
        showTemporaryMessage(`🎉 恭喜完成！用时 ${timeStr}`, 'success');
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
    
    // 如果格子有数字，清空候选数区域
    if (currentBoard[row][col] !== 0) {
        div.innerHTML = '';
        return;
    }
    
    div.innerHTML = '';
    
    // 练习模式：从 userCandidates 获取候选数
    let candidatesSource;
    if (isExampleMode) {
        candidatesSource = cellCandidates[row][col];
    } else {
        candidatesSource = userCandidates[row][col];
    }
    
    const sorted = Array.from(candidatesSource).sort((a, b) => a - b);
    const isEditable = isExampleMode ? exampleEditMode : practiceEditMode;
    
    // 有候选数才添加，没有就显示空白（但不能 return，因为需要清空旧内容）
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
    
    // 根据模式控制候选数显示
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
            // 重新渲染所有候选数（确保显示用户候选数）
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
    // 清除所有高亮
    document.querySelectorAll('.cell-container').forEach(c => {
        c.classList.remove('highlighted');
        c.classList.remove('highlight-row-col');
        c.classList.remove('highlight-box');
    });
    
    // 高亮当前选中格子
    const container = document.getElementById(`cell-container-${row}-${col}`);
    if (container) container.classList.add('highlighted');
    
    // 高亮同一行的所有格子
    for (let c = 0; c < 9; c++) {
        const cell = document.getElementById(`cell-container-${row}-${c}`);
        if (cell && !(row === row && c === col)) {
            cell.classList.add('highlight-row-col');
        }
    }
    
    // 高亮同一列的所有格子
    for (let r = 0; r < 9; r++) {
        const cell = document.getElementById(`cell-container-${r}-${col}`);
        if (cell && !(r === row && col === col)) {
            cell.classList.add('highlight-row-col');
        }
    }
    
    // 高亮同一宫的所有格子
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const r = boxRow + i;
            const c = boxCol + j;
            if (r === row && c === col) continue;
            const cell = document.getElementById(`cell-container-${r}-${c}`);
            if (cell) {
                cell.classList.add('highlight-box');
            }
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

function setCellNumberUI(row, col, num) {
    // 原始题目格子不能修改
    if (originalBoard[row][col] !== 0) {
        showTemporaryMessage('原始题目格子不能修改', 'warning');
        return false;
    }
    
    // 自由模式下允许任意填入（不做校验）
    if (!isFreeMode && !isExampleMode) {
        // 1. 首先检查是否违反基本规则
        if (!isValidMove(row, col, num)) {
            addError();
            const errorDetail = getErrorDetail(row, col, num);
            showErrorHintDialog(errorDetail);
            return false;
        }
        
        // 2. 检查这个数字是否可以通过当前盘面的逻辑算法推导出来
        const canBeDerived = canDeriveNumber(row, col, num);
        if (!canBeDerived) {
            addError();
            const errorDetail = getDerivationErrorDetail(row, col, num);
            showErrorHintDialog(errorDetail);
            return false;
        }
    }
    
    // 保存历史
    saveToHistory();
    
    // 填入数字
    currentBoard[row][col] = num;
    
    // 练习模式：填入数字后，清空该格子的候选数（因为已经有数字了）
    if (!isExampleMode) {
        // 清空当前格子的候选数
        userCandidates[row][col].clear();
        
        // 注意：不自动删除同行、同列、同宫其他格子的候选数
        // 候选数由用户手动维护，系统只负责校验填入的数字是否合法
        
        syncUserCandidatesToDisplay();
    } else {
        recalcAfterPlacement(row, col, num);
        clearDeleteRecord();
    }
    
    updateBoardDisplay();
    checkPuzzleCompletion();
    checkAndSetFreeMode();
    
    showTemporaryMessage(`已填入 ${num}`, 'success');
    return true;
}

// 检查某个数字是否可以通过当前盘面的逻辑算法推导出来
function canDeriveNumber(row, col, num) {
    // 临时保存当前盘面
    const tempBoard = cloneBoardUI(currentBoard);
    
    // 方法1：检查是否可以通过唯一候选数法（Naked Single）推导
    // 计算该格子的候选数
    const candidates = new Set();
    for (let n = 1; n <= 9; n++) {
        if (isValidMove(row, col, n)) {
            candidates.add(n);
        }
    }
    // 如果只有这一个候选数，说明可以通过唯一候选数法推导
    if (candidates.size === 1 && candidates.has(num)) {
        return true;
    }
    
    // 方法2：检查是否可以通过唯余法（Hidden Single）推导
    // 检查行
    let rowCount = 0;
    for (let c = 0; c < 9; c++) {
        if (currentBoard[row][c] === 0) {
            const cellCands = new Set();
            for (let n = 1; n <= 9; n++) {
                if (isValidMove(row, c, n)) {
                    cellCands.add(n);
                }
            }
            if (cellCands.has(num)) {
                rowCount++;
            }
        }
    }
    if (rowCount === 1) {
        return true;
    }
    
    // 检查列
    let colCount = 0;
    for (let r = 0; r < 9; r++) {
        if (currentBoard[r][col] === 0) {
            const cellCands = new Set();
            for (let n = 1; n <= 9; n++) {
                if (isValidMove(r, col, n)) {
                    cellCands.add(n);
                }
            }
            if (cellCands.has(num)) {
                colCount++;
            }
        }
    }
    if (colCount === 1) {
        return true;
    }
    
    // 检查宫
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    let boxCount = 0;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const r = br + i;
            const c = bc + j;
            if (currentBoard[r][c] === 0) {
                const cellCands = new Set();
                for (let n = 1; n <= 9; n++) {
                    if (isValidMove(r, c, n)) {
                        cellCands.add(n);
                    }
                }
                if (cellCands.has(num)) {
                    boxCount++;
                }
            }
        }
    }
    if (boxCount === 1) {
        return true;
    }
    
    // 方法3：使用完整的解题算法尝试推导
    // 复制当前盘面，尝试填入这个数字，然后用算法求解
    const testBoard = cloneBoardUI(currentBoard);
    testBoard[row][col] = num;
    
    // 简单检查：填入后是否会导致无解
    // 快速检查是否有格子没有候选数
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (testBoard[i][j] === 0) {
                let hasCandidate = false;
                for (let n = 1; n <= 9; n++) {
                    if (isValidMoveWithBoard(testBoard, i, j, n)) {
                        hasCandidate = true;
                        break;
                    }
                }
                if (!hasCandidate) {
                    return false; // 填入后会导致无解
                }
            }
        }
    }
    
    return false;
}

// 使用指定盘面检查移动是否有效
function isValidMoveWithBoard(board, row, col, num) {
    for (let c = 0; c < 9; c++) {
        if (board[row][c] === num) return false;
    }
    for (let r = 0; r < 9; r++) {
        if (board[r][col] === num) return false;
    }
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[br + i][bc + j] === num) return false;
        }
    }
    return true;
}
// 获取无法推导的错误详情
function getDerivationErrorDetail(row, col, num) {
    // 计算该格子真正的候选数
    const realCandidates = new Set();
    for (let n = 1; n <= 9; n++) {
        if (isValidMove(row, col, n)) {
            realCandidates.add(n);
        }
    }
    
    const possibleNumbers = Array.from(realCandidates).sort((a, b) => a - b);
    
    let reasons = [];
    reasons.push(`数字 ${num} 虽然不违反当前盘面的行列宫规则，但无法通过逻辑算法推导出来。`);
    reasons.push(`当前盘面下，该格子不能直接确定必须填入 ${num}。`);
    
    // 检查是否可以通过其他方式确定
    let hasHiddenSingle = false;
    let hiddenSingleInfo = '';
    
    // 检查行唯余
    for (let r = 0; r < 9; r++) {
        let numCount = 0;
        let numPos = -1;
        for (let c = 0; c < 9; c++) {
            if (currentBoard[r][c] === 0) {
                for (let n = 1; n <= 9; n++) {
                    if (isValidMove(r, c, n)) {
                        if (n === num) {
                            numCount++;
                            numPos = c;
                        }
                    }
                }
            }
        }
        if (numCount === 1 && numPos === col && r === row) {
            hasHiddenSingle = true;
            hiddenSingleInfo = `在第 ${row+1} 行中，数字 ${num} 只能出现在 (${row+1}, ${col+1})，所以可以填入。`;
            break;
        }
    }
    
    // 检查列唯余
    if (!hasHiddenSingle) {
        for (let c = 0; c < 9; c++) {
            let numCount = 0;
            let numPos = -1;
            for (let r = 0; r < 9; r++) {
                if (currentBoard[r][c] === 0) {
                    for (let n = 1; n <= 9; n++) {
                        if (isValidMove(r, c, n)) {
                            if (n === num) {
                                numCount++;
                                numPos = r;
                            }
                        }
                    }
                }
            }
            if (numCount === 1 && numPos === row && c === col) {
                hasHiddenSingle = true;
                hiddenSingleInfo = `在第 ${col+1} 列中，数字 ${num} 只能出现在 (${row+1}, ${col+1})，所以可以填入。`;
                break;
            }
        }
    }
    
    // 检查宫唯余
    if (!hasHiddenSingle) {
        const br = Math.floor(row / 3) * 3;
        const bc = Math.floor(col / 3) * 3;
        let numCount = 0;
        let numRow = -1, numCol = -1;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const r = br + i;
                const c = bc + j;
                if (currentBoard[r][c] === 0) {
                    for (let n = 1; n <= 9; n++) {
                        if (isValidMove(r, c, n)) {
                            if (n === num) {
                                numCount++;
                                numRow = r;
                                numCol = c;
                            }
                        }
                    }
                }
            }
        }
        if (numCount === 1 && numRow === row && numCol === col) {
            hasHiddenSingle = true;
            hiddenSingleInfo = `在第 ${Math.floor(row/3)*3 + Math.floor(col/3) + 1} 宫中，数字 ${num} 只能出现在 (${row+1}, ${col+1})，所以可以填入。`;
        }
    }
    
    return {
        title: `❌ 不能填入数字 ${num}`,
        content: `在格子 (${row+1}, ${col+1}) 中，数字 ${num} 无法通过当前盘面的逻辑推导出来。`,
        reasons: reasons,
        possibleNumbers: possibleNumbers,
        hiddenSingleInfo: hiddenSingleInfo,
        suggestion: possibleNumbers.length > 0 
            ? `该格子当前可能的候选数是：${possibleNumbers.join(', ')}。请先推导确定其中一个数字后再填入。`
            : '当前盘面可能存在问题，请检查之前填入的数字是否正确。'
    };
}
// 获取输入数字错误详细原因（基于系统候选数）
function getInputErrorDetail(row, col, num, sysCandidates) {
    let reasons = [];
    const possibleNumbers = Array.from(sysCandidates).sort((a, b) => a - b);
    
    // 检查是否因为行冲突
    for (let c = 0; c < 9; c++) {
        if (c !== col && currentBoard[row][c] === num) {
            reasons.push(`第 ${row+1} 行第 ${c+1} 列已经有了数字 ${num}`);
        }
    }
    
    // 检查是否因为列冲突
    for (let r = 0; r < 9; r++) {
        if (r !== row && currentBoard[r][col] === num) {
            reasons.push(`第 ${r+1} 行第 ${col+1} 列已经有了数字 ${num}`);
        }
    }
    
    // 检查是否因为宫冲突
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
    
    if (reasons.length === 0 && possibleNumbers.length > 0) {
        reasons.push(`根据当前盘面推理，格子 (${row+1}, ${col+1}) 只能填入：${possibleNumbers.join(', ')}`);
        reasons.push(`您输入的 ${num} 不在这个范围内`);
    } else if (possibleNumbers.length === 0) {
        reasons.push(`当前盘面下，格子 (${row+1}, ${col+1}) 没有任何可填的数字`);
        reasons.push(`这可能是因为之前的填入有误，请检查并修正`);
    }
    
    return {
        title: `❌ 不能填入数字 ${num}`,
        content: `在格子 (${row+1}, ${col+1}) 中，根据当前盘面推理，不能填入 ${num}。`,
        reasons: reasons,
        possibleNumbers: possibleNumbers,
        suggestion: possibleNumbers.length > 0 
            ? `请从推荐数字中选择：${possibleNumbers.join(', ')}` 
            : '请先检查并修正盘面中的错误。'
    };
}
// 获取冲突详细原因
function getErrorDetail(row, col, num) {
    let reasons = [];
    
    // 检查行冲突
    for (let c = 0; c < 9; c++) {
        if (c !== col && currentBoard[row][c] === num) {
            reasons.push(`第 ${row+1} 行第 ${c+1} 列已经有了数字 ${num}`);
        }
    }
    
    // 检查列冲突
    for (let r = 0; r < 9; r++) {
        if (r !== row && currentBoard[r][col] === num) {
            reasons.push(`第 ${r+1} 行第 ${col+1} 列已经有了数字 ${num}`);
        }
    }
    
    // 检查宫冲突
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
        content: `在格子 (${row+1}, ${col+1}) 填入 ${num} 会违反以下规则：`,
        reasons: reasons,
        suggestion: '请尝试其他数字，或者先检查该行、列、宫中已有的数字。'
    };
}

// 获取候选数错误详细原因
function getCandidateErrorDetail(row, col, num, sysCandidates) {
    let reasons = [];
    
    // 检查行中是否已有该数字
    for (let c = 0; c < 9; c++) {
        if (currentBoard[row][c] === num) {
            reasons.push(`第 ${row+1} 行第 ${c+1} 列已经有数字 ${num}，所以 (${row+1},${col+1}) 不能填入 ${num}`);
        }
    }
    
    // 检查列中是否已有该数字
    for (let r = 0; r < 9; r++) {
        if (currentBoard[r][col] === num) {
            reasons.push(`第 ${r+1} 行第 ${col+1} 列已经有数字 ${num}，所以 (${row+1},${col+1}) 不能填入 ${num}`);
        }
    }
    
    // 检查宫中是否已有该数字
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const r = br + i;
            const c = bc + j;
            if (currentBoard[r][c] === num) {
                reasons.push(`第 ${r+1} 行第 ${c+1} 列（同一宫）已经有数字 ${num}`);
            }
        }
    }
    
    // 显示系统推荐的候选数
    const recommended = Array.from(sysCandidates).sort((a, b) => a - b);
    
    return {
        title: `❌ 不能添加候选数 ${num}`,
        content: `在格子 (${row+1}, ${col+1}) 中，数字 ${num} 不应该作为候选数，因为：`,
        reasons: reasons,
        recommended: recommended,
        suggestion: recommended.length > 0 ? `该格子可能的候选数是：${recommended.join(', ')}。请从这些数字中选择。` : '该格子可能已经可以通过排除法确定数字，请先填写其他格子。'
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
    
    let possibleHtml = '';
    if (errorInfo.possibleNumbers && errorInfo.possibleNumbers.length > 0) {
        possibleHtml = `
            <div style="background: #e3f2fd; padding: 12px; border-radius: 8px; margin-top: 12px;">
                <strong>🔍 当前格子候选数：</strong><br>
                <span style="font-size: 18px; font-weight: bold; color: #1565c0;">${errorInfo.possibleNumbers.join('、')}</span>
            </div>
        `;
    }
    
    let hiddenSingleHtml = '';
    if (errorInfo.hiddenSingleInfo) {
        hiddenSingleHtml = `
            <div style="background: #e8f5e9; padding: 12px; border-radius: 8px; margin-top: 12px;">
                <strong>💡 提示：</strong> ${errorInfo.hiddenSingleInfo}
            </div>
        `;
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
        <div style="background: #ffebee; padding: 15px; border-radius: 10px; margin-bottom: 10px;">
            <div style="font-size: 18px; font-weight: bold; color: #c62828; margin-bottom: 10px;">${errorInfo.title}</div>
            <div style="margin-bottom: 10px;">${errorInfo.content}</div>
            ${reasonsHtml}
            ${possibleHtml}
            ${hiddenSingleHtml}
            ${suggestionHtml}
        </div>
    `;
    
    dialog.style.display = 'flex';
}
function toggleCandidateNumberUI(row, col, num) {
    // 例题模式专用
    if (!isExampleMode) return;
    
    if (!exampleEditMode) {
        showTemporaryMessage('例题模式下需要先开启"编辑候选数"才能修改', 'warning');
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
            showTemporaryMessage(`数字 ${num} 违反数独规则，不能添加为候选数`, 'warning');
        }
    }
    renderCellCandidates(row, col);
}

function handleKeyDown(e, row, col) {
    // 高亮当前操作的格子（新增）
    selectCell(row, col);
    
    // 例题模式下
    if (isExampleMode) {
        // 手动编辑模式：可以直接输入数字
        if (window.isManualEditMode) {
            if (e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                setCellNumberUI(row, col, parseInt(e.key));
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                // 清空数字
                if (originalBoard[row][col] !== 0) {
                    showTemporaryMessage('原始题目格子不能修改', 'warning');
                    return;
                }
                
                // 清空数字总是允许的
                saveToHistory();
                currentBoard[row][col] = 0;
                
                updateBoardDisplay();
                checkPuzzleCompletion();
                checkAndSetFreeMode();
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
        setCellNumberUI(row, col, parseInt(e.key));
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        // 清空数字
        if (originalBoard[row][col] !== 0) {
            showTemporaryMessage('原始题目格子不能修改', 'warning');
            return;
        }
        saveToHistory();
        currentBoard[row][col] = 0;
        
        updateBoardDisplay();
        checkPuzzleCompletion();
        showTemporaryMessage('已清除', 'info');
    }
}

function toggleEditMode() {
    if (isExampleMode) {
        // 例题模式：切换例题模式的候选数编辑状态
        exampleEditMode = !exampleEditMode;
        const dropdownBtn = document.getElementById('candidatesDropdownBtn');
        const editMenuItem = document.querySelector('[data-action="edit"]');
        
        if (exampleEditMode) {
            if (dropdownBtn) dropdownBtn.classList.add('active');
            if (editMenuItem) editMenuItem?.classList.add('active');
            showTemporaryMessage('例题模式：候选数编辑模式（可修改候选数）', 'info');
        } else {
            if (dropdownBtn) dropdownBtn.classList.remove('active');
            if (editMenuItem) editMenuItem?.classList.remove('active');
            showTemporaryMessage('例题模式：候选数只读模式', 'info');
        }
        renderAllCandidates();
        return;
    }
    
    // 练习模式
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
        showTemporaryMessage('练习模式：候选数编辑模式，点击候选数可添加/删除', 'info');
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
        showTemporaryMessage('练习模式：数字输入模式，直接输入数字', 'info');
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
    
    // 练习模式
    practiceShowCandidates = !practiceShowCandidates;
    const toggleMenuItem = document.querySelector('[data-action="toggle"]');
    
    if (practiceShowCandidates) {
        if (toggleMenuItem) toggleMenuItem.innerHTML = '🔢 隐藏候选数';
        // 显示所有候选数区域
        document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'flex');
        
        // 重新渲染所有格子的候选数
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
            const val = grid[i][j];
            currentBoard[i][j] = val;
            originalBoard[i][j] = val;
        }
    }
    initCandidates();
    
    // 初始化用户候选数
    initUserCandidates();
	// 确保候选数区域隐藏
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
    
    // 重置错误次数和自由模式
    resetErrorCount();
    isFreeMode = false;
    const modeBadge = document.getElementById('modeBadge');
    if (modeBadge) {
        modeBadge.innerHTML = '✏️ 练习模式';
        modeBadge.classList.remove('manual-mode');
        modeBadge.classList.add('practice-mode');
    }
    
    if (!isExampleMode && !practiceShowCandidates) {
        document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'none');
    }
    
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
    if (selector) {
        selector.value = randomPuzzle.name;
    }
    
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
            if (targetSpan.parentNode) {
                targetSpan.remove();
            }
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
                    showTemporaryMessage('⚠️ 当前没有找到可确定的步骤，已切换为手动编辑模式', 'warning');
                    if (isExampleMode) {
                        enableManualEditInExampleMode();
                    }
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
    
    // 重置手动编辑标志
    window.isManualEditMode = false;
    
    // 显示例题模式控制区域
    const exampleControls = document.getElementById('exampleControls');
    if (exampleControls) exampleControls.style.display = 'flex';
    
    // 显示右侧解题面板
    const explanationSidebar = document.getElementById('explanationSidebar');
    if (explanationSidebar) explanationSidebar.style.display = 'flex';
    
    // 修改 game-area 的 class 为 example-mode
    const gameArea = document.getElementById('gameArea');
    if (gameArea) {
        gameArea.classList.remove('practice-mode');
        gameArea.classList.add('example-mode');
    }
    
    // 更新模式标识徽章
    const modeBadge = document.getElementById('modeBadge');
    if (modeBadge) {
        modeBadge.className = 'mode-badge example-mode';
        modeBadge.innerHTML = '📖 例题模式';
    }
    
    // 设置格子为只读
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const input = document.getElementById(`cell-${i}-${j}`);
            if (input && originalBoard[i][j] === 0) input.readOnly = true;
        }
    }
    
    // 重置例题模式的候选数显示状态
    exampleShowCandidates = true;
    exampleEditMode = false;
    
    // 更新下拉菜单文字和样式
    const toggleMenuItem = document.querySelector('[data-action="toggle"]');
    if (toggleMenuItem) toggleMenuItem.innerHTML = '🔢 隐藏候选数';
    
    const editMenuItem = document.querySelector('[data-action="edit"]');
    if (editMenuItem) editMenuItem.classList.remove('active');
    
    const dropdownBtn = document.getElementById('candidatesDropdownBtn');
    if (dropdownBtn) dropdownBtn.classList.remove('active');
    
    // 显示候选数区域
    document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'flex');
    renderAllCandidates();
    
    // 重置解题状态
    stepCount = 0;
    currentSteps = [];
    updateStepsListDisplay();
    const explanationContent = document.getElementById('explanation-content');
    if (explanationContent) {
        explanationContent.innerHTML = '<div class="step-explanation">✨ 点击"下一步"开始智能解题</div>';
    }
    
    // 重新初始化候选数
    initCandidates();
    
    // 移除可能残留的手动编辑提示条
    const manualHint = document.getElementById('manualEditHint');
    if (manualHint) manualHint.remove();
    
    showTemporaryMessage('已进入例题模式，可以使用"下一步"智能解题', 'info');
}

function exitExampleMode() {
    if (!isExampleMode) return;
    
    isExampleMode = false;
    
    // 重置手动编辑标志
    window.isManualEditMode = false;
    
    // 隐藏例题模式控制区域
    const exampleControls = document.getElementById('exampleControls');
    if (exampleControls) exampleControls.style.display = 'none';
    
    // 隐藏右侧解题面板
    const explanationSidebar = document.getElementById('explanationSidebar');
    if (explanationSidebar) explanationSidebar.style.display = 'none';
    
    // 修改 game-area 的 class 为 practice-mode
    const gameArea = document.getElementById('gameArea');
    if (gameArea) {
        gameArea.classList.remove('example-mode');
        gameArea.classList.add('practice-mode');
    }
    
    // 更新模式标识徽章
    const modeBadge = document.getElementById('modeBadge');
    if (modeBadge) {
        modeBadge.className = 'mode-badge practice-mode';
        modeBadge.innerHTML = '✏️ 练习模式';
    }
    
    // 恢复格子的可编辑状态
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const input = document.getElementById(`cell-${i}-${j}`);
            if (input && originalBoard[i][j] === 0) input.readOnly = false;
        }
    }
    
    // 恢复练习模式的候选数显示状态（默认不显示）
    if (practiceShowCandidates) {
        document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'flex');
        renderAllCandidates();
    } else {
        document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'none');
    }
    
    // 更新下拉菜单文字
    const toggleMenuItem = document.querySelector('[data-action="toggle"]');
    if (toggleMenuItem) {
        toggleMenuItem.innerHTML = practiceShowCandidates ? '🔢 隐藏候选数' : '🔢 显示候选数';
    }
    
    // 更新编辑候选数按钮状态
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
    
    // 移除手动编辑提示条
    const manualHint = document.getElementById('manualEditHint');
    if (manualHint) manualHint.remove();
    
    showTemporaryMessage('已切换到练习模式', 'info');
}

function enableManualEditInExampleMode() {
    if (!isExampleMode) return;
    
    // 标记为手动编辑模式
    window.isManualEditMode = true;
    
    // 更新模式标识徽章
    const modeBadge = document.getElementById('modeBadge');
    modeBadge.className = 'mode-badge manual-mode';
    modeBadge.innerHTML = '✏️ 手动编辑';
    
    // 解除格子的只读状态，允许用户手动输入
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const input = document.getElementById(`cell-${i}-${j}`);
            if (input && originalBoard[i][j] === 0) {
                input.readOnly = false;
            }
        }
    }
    
    // 自动开启候选数编辑模式
    if (!exampleEditMode) {
        exampleEditMode = true;
        const editMenuItem = document.querySelector('[data-action="edit"]');
        const dropdownBtn = document.getElementById('candidatesDropdownBtn');
        if (editMenuItem) editMenuItem.classList.add('active');
        if (dropdownBtn) dropdownBtn.classList.add('active');
    }
    
    // 确保候选数显示
    if (!exampleShowCandidates) {
        exampleShowCandidates = true;
        const toggleMenuItem = document.querySelector('[data-action="toggle"]');
        if (toggleMenuItem) toggleMenuItem.innerHTML = '🔢 隐藏候选数';
        document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'flex');
    }
    renderAllCandidates();
    
    // 显示提示按钮
    showManualEditHint();
    
    showTemporaryMessage('已切换到手动编辑模式，您可以手动填写数字或编辑候选数', 'info');
}

function showManualEditHint() {
    // 检查是否已存在提示条
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
    
    // 将提示条插入到 game-area 之前
    const gameArea = document.querySelector('.game-area');
    if (gameArea) {
        gameArea.parentNode.insertBefore(hintDiv, gameArea);
    } else {
        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(hintDiv, document.querySelector('.controls')?.nextSibling);
        }
    }
    
    document.getElementById('retryAutoSolveBtn')?.addEventListener('click', () => {
        retryAutoSolve();
    });
    document.getElementById('exitToPracticeBtn')?.addEventListener('click', () => {
        exitExampleMode();
        document.getElementById('manualEditHint')?.remove();
    });
}

function retryAutoSolve() {
    if (!isExampleMode) return;
    
    // 重新初始化候选数
    initCandidates();
    
    // 重置手动编辑标志
    window.isManualEditMode = false;
    
    // 更新模式标识徽章
    const modeBadge = document.getElementById('modeBadge');
    if (modeBadge) {
        modeBadge.className = 'mode-badge example-mode';
        modeBadge.innerHTML = '📖 例题模式';
    }
    
    // 恢复格子只读状态
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const input = document.getElementById(`cell-${i}-${j}`);
            if (input && originalBoard[i][j] === 0) {
                input.readOnly = true;
            }
        }
    }
    
    // 关闭候选数编辑模式
    exampleEditMode = false;
    const editMenuItem = document.querySelector('[data-action="edit"]');
    const dropdownBtn = document.getElementById('candidatesDropdownBtn');
    if (editMenuItem) editMenuItem.classList.remove('active');
    if (dropdownBtn) dropdownBtn.classList.remove('active');
    
    renderAllCandidates();
    
    // 移除提示条
    const manualHint = document.getElementById('manualEditHint');
    if (manualHint) manualHint.remove();
    
    showTemporaryMessage('已重新尝试智能解题，请点击"下一步"继续', 'info');
}

// ==================== 事件绑定 ====================

function attachEvents() {
    // 下拉按钮事件
    const dropdownBtn = document.getElementById('candidatesDropdownBtn');
    const dropdownMenu = document.getElementById('candidatesDropdownMenu');
    
    if (dropdownBtn && dropdownMenu) {
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
        
        document.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
        });
        
        dropdownMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = e.target.getAttribute('data-action');
            
            if (action === 'random') {
                loadRandomPuzzle();
                dropdownMenu.classList.remove('show');
            } else if (action === 'custom') {
                showCustomPuzzleDialog();
                dropdownMenu.classList.remove('show');
            } else if (action === 'example') {
                enterExampleMode();
                dropdownMenu.classList.remove('show');
            } else if (action === 'practice') {
                exitExampleMode();
                dropdownMenu.classList.remove('show');
            } else if (action === 'fillCandidates') {
                fillCandidates();
                dropdownMenu.classList.remove('show');
            } else if (action === 'nextHint') {
                showNextHint();
                dropdownMenu.classList.remove('show');
            } else if (action === 'edit') {
                toggleEditMode();
                dropdownMenu.classList.remove('show');
            } else if (action === 'toggle') {
                toggleCandidatesDisplay();
                dropdownMenu.classList.remove('show');
            }
        });
    }
    
    // 例题模式按钮事件
    document.getElementById('nextStepBtn')?.addEventListener('click', nextStep);
    document.getElementById('undoBtn')?.addEventListener('click', undo);
    
    // 提示对话框关闭事件
    document.getElementById('hintDialogClose')?.addEventListener('click', () => {
        document.getElementById('hintDialog').style.display = 'none';
    });
    document.getElementById('hintDialogOk')?.addEventListener('click', () => {
        document.getElementById('hintDialog').style.display = 'none';
    });
    window.addEventListener('click', (e) => {
        const dialog = document.getElementById('hintDialog');
        if (e.target === dialog) {
            dialog.style.display = 'none';
        }
    });
    
    // 自定义题目弹窗事件
    initCustomDialogEvents();
}

// ==================== 自定义题目函数 ====================

function showCustomPuzzleDialog() {
    const dialog = document.getElementById('customPuzzleDialog');
    const textarea = document.getElementById('customPuzzleInput');
    const errorDiv = document.getElementById('customPuzzleError');
    
    // 清空之前的输入和错误
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
    
    // 关闭弹窗
    const closeDialog = () => {
        dialog.style.display = 'none';
    };
    
    closeBtn?.addEventListener('click', closeDialog);
    cancelBtn?.addEventListener('click', closeDialog);
    
    // 点击背景关闭
    window.addEventListener('click', (e) => {
        if (e.target === dialog) {
            closeDialog();
        }
    });
    
    // 加载示例
    loadExampleBtn?.addEventListener('click', () => {
        const example = "530070000,600195000,098000060,800060003,400803001,700020006,060000280,000419005,000080079";
        if (textarea) textarea.value = example;
        if (errorDiv) errorDiv.style.display = 'none';
    });
    
    // 确认加载
    confirmBtn?.addEventListener('click', () => {
        const inputValue = textarea?.value.trim();
        if (!inputValue) {
            showCustomError('请输入题目数据');
            return;
        }
        
        // 解析输入
        const parts = inputValue.split(',').map(s => s.trim());
        if (parts.length !== 9) {
            showCustomError(`需要输入9行数据，当前输入了 ${parts.length} 行`);
            return;
        }
        
        const grid = [];
        let valid = true;
        let errorMsg = '';
        
        for (let i = 0; i < 9; i++) {
            const rowStr = parts[i];
            if (rowStr.length !== 9) {
                errorMsg = `第 ${i+1} 行长度不是9个字符，当前长度：${rowStr.length}`;
                valid = false;
                break;
            }
            
            const row = [];
            for (let j = 0; j < 9; j++) {
                const char = rowStr[j];
                const num = parseInt(char, 10);
                if (isNaN(num) || num < 0 || num > 9) {
                    errorMsg = `第 ${i+1} 行第 ${j+1} 列包含无效字符：${char}，只能输入0-9的数字`;
                    valid = false;
                    break;
                }
                row.push(num);
            }
            if (!valid) break;
            grid.push(row);
        }
        
        if (!valid) {
            showCustomError(errorMsg);
            return;
        }
        
        // 验证题目是否有效（检查每行、每列、每宫是否有重复数字）
        const validationError = validatePuzzle(grid);
        if (validationError) {
            showCustomError(validationError);
            return;
        }
        
        // 加载自定义题目
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

// 验证题目有效性
function validatePuzzle(grid) {
    // 检查每行
    for (let row = 0; row < 9; row++) {
        const seen = new Set();
        for (let col = 0; col < 9; col++) {
            const val = grid[row][col];
            if (val !== 0) {
                if (seen.has(val)) {
                    return `第 ${row+1} 行有重复的数字 ${val}`;
                }
                seen.add(val);
            }
        }
    }
    
    // 检查每列
    for (let col = 0; col < 9; col++) {
        const seen = new Set();
        for (let row = 0; row < 9; row++) {
            const val = grid[row][col];
            if (val !== 0) {
                if (seen.has(val)) {
                    return `第 ${col+1} 列有重复的数字 ${val}`;
                }
                seen.add(val);
            }
        }
    }
    
    // 检查每宫
    for (let box = 0; box < 9; box++) {
        const seen = new Set();
        const br = Math.floor(box / 3) * 3;
        const bc = (box % 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const val = grid[br + i][bc + j];
                if (val !== 0) {
                    if (seen.has(val)) {
                        return `第 ${box+1} 宫有重复的数字 ${val}`;
                    }
                    seen.add(val);
                }
            }
        }
    }
    
    return null;
}

// 加载自定义题目
function loadCustomPuzzle(grid) {
    // 更新 currentBoard 和 originalBoard
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const val = grid[i][j];
            currentBoard[i][j] = val;
            originalBoard[i][j] = val;
        }
    }
    
    // 重新初始化
    initCandidates();
    initUserCandidates();
    updateBoardDisplay();
    
    // 重置历史记录
    historyBoards = [cloneBoardUI(currentBoard)];
    historyIdx = 0;
    currentSteps = [];
    stepCount = 0;
    updateStepsListDisplay();
    document.getElementById('explanation-content').innerHTML = '<div class="step-explanation">✨ 点击"下一步"开始智能解题</div>';
    
    // 重置计时器
    resetTimer();
    startTimer();
    
    // 重置错误次数和自由模式
    resetErrorCount();
    isFreeMode = false;
    
    // 更新模式标识
    const modeBadge = document.getElementById('modeBadge');
    if (modeBadge && !isExampleMode) {
        modeBadge.innerHTML = '✏️ 练习模式';
        modeBadge.classList.remove('manual-mode');
        modeBadge.classList.add('practice-mode');
    }
    
    // 更新下拉选择框（添加自定义选项或取消选中）
    const selector = document.getElementById('puzzleSelector');
    if (selector) {
        selector.value = '';
    }
    
    // 练习模式下隐藏候选数
    if (!isExampleMode && !practiceShowCandidates) {
        document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'none');
    }
}
// ==================== 初始化 ====================

function initUI() {
    createBoard();
    attachEvents();
    loadPuzzleList();
    
    // 设置初始布局为练习模式（棋盘居中，右侧面板隐藏）
    const gameArea = document.getElementById('gameArea');
    if (gameArea) {
        gameArea.classList.add('practice-mode');
    }
    const explanationSidebar = document.getElementById('explanationSidebar');
    if (explanationSidebar) {
        explanationSidebar.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', initUI);