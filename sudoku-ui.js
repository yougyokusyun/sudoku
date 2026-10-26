/**
 * 数独解题器 - UI交互逻辑
 * 依赖：sudoku-core.js（核心解题）、puzzles.js（题库）
 */

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


// 检查用户候选数与系统候选数是否完全一致
function isUserCandidatesMatchSystem() {
    const sysCandidates = getSystemCandidates();
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (currentBoard[i][j] === 0) {
                const userSet = userCandidates[i][j];
                const sysSet = sysCandidates[i][j];
                if (userSet.size !== sysSet.size) return false;
                for (const num of userSet) {
                    if (!sysSet.has(num)) return false;
                }
            }
        }
    }
    return true;
}


// 练习模式专用：用户自定义候选数（独立于系统候选数）
let userCandidates = Array(9).fill().map(() => Array(9).fill().map(() => new Set()));

// 候选数模式：默认关闭避免干扰做题；用户可在菜单里开启
let autoCandidatesMode = false;


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
    
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            renderCellCandidates(i, j);
        }
    }
}

// 补全候选数：基于当前盘面重新计算并填充用户候选数
function fillCandidates() {
    if (isExampleMode) {
        showTemporaryMessage('教学模式下请使用"编辑候选数"功能', 'warning');
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
                    refreshCandidateCompleteness(i, j, userCandidates[i][j]);
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

// 获取系统计算的候选数
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

// 下一步提示（练习/自主答题模式）：基于"当前盘面"给出最合理的一条提示
function showNextHint() {
    if (isExampleMode) {
        showTemporaryMessage('教学模式下请使用"下一步"按钮', 'warning');
        return;
    }

    const derivable = hasAnyDerivableCell();

    if (derivable.hasDerivable) {
        showHintDialog([{
            type: 'success',
            title: '🎯 可推导的数字',
            content: '第 <b>' + (derivable.row + 1) + '</b> 行第 <b>' + (derivable.col + 1) +
                '</b> 列可以直接填入 <b>' + derivable.value + '</b>。<br>依据「' + derivable.technique + '」。'
        }]);
        return;
    }

    // 没有可直接填入的数字：给出当前盘面上最靠前的"删候选"类技巧
    const elim = (typeof findHintEliminationStep === 'function') ? findHintEliminationStep() : null;
    if (elim && elim.technique) {
        if (elim.value !== undefined && elim.value !== null) {
            // 保险分支：其实有可填数字（理论上不会走到）
            showHintDialog([{
                type: 'success',
                title: '🎯 可推导的数字',
                content: '第 <b>' + (elim.row + 1) + '</b> 行第 <b>' + (elim.col + 1) +
                    '</b> 列可以直接填入 <b>' + elim.value + '</b>。<br>依据「' + elim.technique + '」' +
                    (elim.explanation ? '：' + elim.explanation : '') + '。'
            }]);
            return;
        }
        let detail = elim.explanation || '';
        if (elim.eliminations && elim.eliminations.length) {
            detail += '<br>将删除候选：' + elim.eliminations.map(el =>
                '(' + (el.row + 1) + ',' + (el.col + 1) + ') 的 ' + el.num).join('、');
        }
        showHintDialog([{
            type: 'info',
            title: '💡 本步没有能直接确定的数字，先用技巧删候选',
            content: '建议使用「<b>' + elim.technique + '</b>」：<br>' + detail
        }]);
        return;
    }

    showHintDialog([{
        type: 'info',
        title: '🤔 暂无直接可填数字',
        content: '当前没有任何格子可以通过数独规则唯一确定数字。建议：\n1. 点击"补全候选数"查看候选数\n2. 尝试使用更高级的技巧\n3. 或进入自由模式任意填写（只要不违反基本规则）'
    }]);
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
function practiceToggleCandidate(row, col, num) {
    if (!practiceEditMode) {
        showTemporaryMessage('请先开启"编辑候选数"模式', 'warning');
        return;
    }
    
    if (currentBoard[row][col] !== 0) {
        showTemporaryMessage('该格子已有数字，无法编辑候选数', 'warning');
        return;
    }
    
    if (userCandidates[row][col].has(num)) {
        userCandidates[row][col].delete(num);
        showTemporaryMessage(`已删除候选数 ${num}`, 'info');
    } else {
        // 校验：候选数必须是该格的真实候选（不与同行/列/宫已有数字冲突）
        if (!isValidMove(row, col, num)) {
            showTemporaryMessage(`候选数 ${num} 不正确：该数字与同行/列/宫已有的数字冲突`, 'error');
            return;
        }
        userCandidates[row][col].add(num);
        showTemporaryMessage(`已添加候选数 ${num}`, 'info');
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
    refreshCandidateCompleteness(row, col, userCandidates[row][col]);
}

// 获取单个格子的系统候选数
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
let practiceEditMode = false;        // 练习模式：是否编辑候选数（false=数字输入模式，true=编辑候选数模式）
let exampleEditMode = false;         // 教学模式：是否编辑候选数

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


// ==================== 渲染函数 ====================

function renderAllCandidates() {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            renderCellCandidates(i, j);
        }
    }
}

/**
 * 候选数完整性着色：
 *   写全了（等于该格真实存在的全部候选）→ 黄色 cand-full
 *   只写了一部分                      → 绿色 cand-partial
 * 判定基准是"这一格按行/列/宫规则真实存在的全部候选数"，与当前盘面实时同步。
 */
function refreshCandidateCompleteness(row, col, shown) {
    const div = document.getElementById(`candidates-${row}-${col}`);
    if (!div) return;
    div.classList.remove('cand-full', 'cand-partial');
    if (currentBoard[row][col] !== 0) return;

    let set;
    if (shown) set = shown;
    else if (isExampleMode) set = cellCandidates[row][col];
    else if (isFreeMode) set = autoCandidatesMode ? cellCandidates[row][col] : userCandidates[row][col];
    else set = userCandidates[row][col]; // 练习模式固定读 userCandidates
    if (!set || set.size === 0) return;

    const total = getSystemCandidatesForCell(row, col).size;
    if (total === 0) return;
    div.classList.add(set.size >= total ? 'cand-full' : 'cand-partial');
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
        // 教学模式：候选数由学员一步步"写"上去，只显示已经写下的那部分；
        // 未进入教学模式时仍显示系统推算的完整候选数。
        candidatesSource = (typeof teachingMode !== 'undefined' && teachingMode
            && typeof teachShown !== 'undefined' && teachShown && teachShown[row] && teachShown[row][col])
            ? teachShown[row][col]
            : cellCandidates[row][col];
    } else if (isFreeMode) {
        // 自由模式（手工建题）：允许用户切换系统自动推算 ↔ 用户手动维护
        candidatesSource = autoCandidatesMode
            ? cellCandidates[row][col]
            : userCandidates[row][col];
    } else {
        // 练习模式：候选数固定来自 userCandidates（用户手工编辑或点"补全候选数"填入）
        // 绝不在 loadPuzzle 后自动显示系统推算的候选数
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

    refreshCandidateCompleteness(row, col, candidatesSource);
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
                    input.setAttribute('readonly', 'readonly');
                } else if (val !== 0) {
                    input.classList.remove('original');
                    input.classList.add('user-filled');
                    input.setAttribute('readonly', 'readonly');
                } else {
                    input.classList.remove('original');
                    input.classList.remove('user-filled');
                    input.setAttribute('readonly', 'readonly');
                }
            }
        }
    }
    
    document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'flex');
    renderAllCandidates();
    if (typeof syncMenuLabels === 'function') syncMenuLabels();
    if (typeof updateSidebarPanels === 'function') updateSidebarPanels();
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
            input.setAttribute('readonly', 'readonly');
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
        content: `在格子 (${row+1}, ${col+1}) 填入 ${num} 会违反以下规则：`,
        reasons: reasons,
        suggestion: '请尝试其他数字，或者先检查该行、列、宫中已有的数字。'
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


function selectCell(row, col) {
    currentSelectedRow = row;
    currentSelectedCol = col;
    
    document.querySelectorAll('.cell-container').forEach(c => {
        c.classList.remove('highlighted');
        c.classList.remove('highlight-row-col');
        c.classList.remove('highlight-box');
        c.classList.remove('highlight-same-num');
    });
    
    const container = document.getElementById(`cell-container-${row}-${col}`);
    if (container) container.classList.add('highlighted');
    
    for (let c = 0; c < 9; c++) {
        if (c === col) continue;
        const cell = document.getElementById(`cell-container-${row}-${c}`);
        if (cell) cell.classList.add('highlight-row-col');
    }
    
    for (let r = 0; r < 9; r++) {
        if (r === row) continue;
        const cell = document.getElementById(`cell-container-${r}-${col}`);
        if (cell) cell.classList.add('highlight-row-col');
    }
    
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

    // 同数字高亮：选中格子有数字时，把盘面所有相同数字的格子再叠一层更亮的高亮
    const val = currentBoard[row][col];
    if (val > 0) {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (r === row && c === col) continue;
                if (currentBoard[r][c] === val) {
                    const cell = document.getElementById(`cell-container-${r}-${c}`);
                    if (cell) cell.classList.add('highlight-same-num');
                }
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
    // 倒序显示：最新一步在最上方
    for (let idx = currentSteps.length - 1; idx >= 0; idx--) {
        const step = currentSteps[idx];
        const item = document.createElement('div');
        item.className = 'step-item';
        const text = step.value ? `填入 (${step.row + 1},${step.col + 1}) = ${step.value}` : `排除 ${step.eliminations?.length || 0} 个候选数`;
        item.innerHTML = `<div><span style="font-weight:bold;">步骤 ${idx + 1}</span> <span style="background:#e3f2fd;padding:2px 6px;border-radius:10px;font-size:11px;margin-left:6px;">${step.technique}</span></div>
            <div style="font-size:11px;color:#666;margin-top:4px;">${text}</div>`;

        // 每步都配一个按钮：点击才弹窗展示这一步是怎么推导出来的，
        // 落子时不主动展示，用户需要时自行查看。
        const deriveBtn = document.createElement('button');
        deriveBtn.type = 'button';
        deriveBtn.className = 'step-derive-btn';
        deriveBtn.textContent = '💡 查看本步提示';
        deriveBtn.onclick = (e) => {
            e.stopPropagation();
            showStepDerivation(idx);
        };
        item.appendChild(deriveBtn);

        listDiv.appendChild(item);
    }
    listDiv.scrollTop = 0;
}


// 切换编辑候选数模式（菜单驱动；教学模式不显示此入口）
function toggleEditMode() {
    if (isExampleMode) {
        exampleEditMode = !exampleEditMode;
        showTemporaryMessage(exampleEditMode
            ? '教学模式：候选数编辑模式，点击候选数可添加/删除'
            : '教学模式：数字输入模式，点击底部数字按钮填入', 'info');
        renderAllCandidates();
        syncMenuLabels();
        return;
    }

    practiceEditMode = !practiceEditMode;
    showTemporaryMessage(practiceEditMode
        ? '练习模式：候选数编辑模式，点击候选数可添加/删除'
        : '练习模式：数字输入模式，点击底部数字按钮填入', 'info');
    renderAllCandidates();
    syncMenuLabels();
}


/** 导出当前盘面到剪贴板（单行 81 数字 + 格式化行 + JSON 三种格式） */
function exportCurrentPuzzle() {
    let singleLine = '', commaLines = '', grid = [];
    for (let r = 0; r < 9; r++) {
        let rowStr = '';
        for (let c = 0; c < 9; c++) {
            const v = currentBoard[r][c];
            singleLine += v;
            rowStr += v + (c < 8 ? ',' : '');
            grid.push(v);
        }
        commaLines += rowStr + (r < 8 ? '\n' : '');
    }
    const origName = (() => {
        const sel = document.getElementById('puzzleSelector');
        if (sel && sel.value) return sel.value;
        const items = PUZZLE_LIBRARY || [];
        for (const p of items) {
            if (p.grid && arraysEqualFlat(p.grid, grid)) return p.name || p.orig || 'custom';
        }
        return 'custom';
    })();
    const json = JSON.stringify({ orig: origName, grid });

    const text =
        '## 数独题目导出\n' +
        '单行格式（81 数字，0=空格）:\n' + singleLine + '\n\n' +
        '9 行逗号分隔:\n' + commaLines + '\n\n' +
        'JSON 格式:\n' + json;

    copyToClipboard(text)
        .then(() => showTemporaryMessage('📤 已复制到剪贴板！包含单行/9行/JSON 三种格式', 'success'))
        .catch(() => showTemporaryMessage('复制失败，请手动选择文本 Ctrl+C', 'warning'));
}

/** 从剪贴板导入题目 */
async function importFromClipboard() {
    let text = '';
    try {
        text = await navigator.clipboard.readText();
    } catch (e) {
        showTemporaryMessage('浏览器拒绝读取剪贴板，请先 Ctrl+C 然后点"📝 自定义题目"粘贴', 'warning');
        return;
    }
    const grid = parsePuzzleText(text);
    if (!grid) {
        showTemporaryMessage('剪贴板内容无法识别为 9×9 数独，请检查格式', 'warning');
        return;
    }
    // 直接写入盘面
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) currentBoard[r][c] = grid[r][c];
    initCandidates();
    initUserCandidates();
    updateBoardDisplay();
    if (typeof __completionWarned !== 'undefined') __completionWarned = false;
    if (typeof isPuzzleCompleted !== 'undefined') isPuzzleCompleted = false;
    resetTimer();
    startTimer();
    historyBoards = [cloneBoardUI(currentBoard)];
    historyIdx = 0;
    if (typeof currentSteps !== 'undefined') currentSteps = [];
    if (typeof stepCount !== 'undefined') stepCount = 0;
    if (typeof updateStepsListDisplay === 'function') updateStepsListDisplay();
    saveProgress();
    // 确保练习模式（不是教学模式）
    if (typeof isExampleMode !== 'undefined' && isExampleMode && typeof exitExampleMode === 'function') {
        exitExampleMode();
    }
    const fixedCount = grid.map(r => r.join('')).join('').replace(/0/g, '').length;
    showTemporaryMessage('📥 已导入，共 ' + fixedCount + ' 个固定数字', 'success');
}

/** 解析多种格式的题目文本为 9×9 数组；无效返回 null */
function parsePuzzleText(text) {
    if (!text) return null;
    text = text.trim();

    // JSON 格式 {"grid":[5,3,0,...]} 或 {"orig":"xxx","grid":[...]}
    if (text.startsWith('{')) {
        try {
            const j = JSON.parse(text);
            if (Array.isArray(j.grid) && j.grid.length === 81) {
                const g = [];
                for (let r = 0; r < 9; r++) g.push(j.grid.slice(r * 9, r * 9 + 9));
                return g;
            }
        } catch (e) { /* fallthrough */ }
    }

    // 单行 81 数字（允许非数字分隔符）
    const digitsOnly = text.replace(/[^0-9]/g, '');
    if (digitsOnly.length === 81) {
        const g = [];
        for (let r = 0; r < 9; r++) {
            const row = [];
            for (let c = 0; c < 9; c++) row.push(parseInt(digitsOnly[r * 9 + c], 10));
            g.push(row);
        }
        return g;
    }

    // 9 行格式（每行 9 个数字，可用逗号/空格/竖线分隔）
    const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length >= 9) {
        const g = [];
        for (let i = 0; i < 9; i++) {
            const rowDigits = lines[i].replace(/[^0-9]/g, '');
            if (rowDigits.length !== 9) return null;
            g.push(rowDigits.split('').map(d => parseInt(d, 10)));
        }
        return g;
    }

    return null;
}

/** 简单数组相等比较（平铺） */
function arraysEqualFlat(a, b) {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        const va = Array.isArray(a[i]) ? a[i][0] : a[i];
        if (va !== b[i]) return false;
    }
    return true;
}

/** 跨浏览器的剪贴板写入 */
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); resolve(); } catch (e) { reject(e); }
        document.body.removeChild(ta);
    });
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

    const restoreBtn = () => {
        nextStepInProgress = false;
        if (btn) {
            btn.disabled = false;
            btn.textContent = '➡️ 下一步';
        }
    };

    setTimeout(async () => {
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
                restoreBtn();
                return;
            }

            // 落子前一律不弹窗展示方法，避免答案还没得到就被剧透。
            // 每一步的方法说明改为「步骤历史」里该步的按钮，用户需要时自行点开。
            // 这里先存一份"落子前"的盘面快照，供事后查看推导时复算依据（避免盘面已推进后算错）。
            if (!step.__board) step.__board = currentBoard.map(row => row.slice());
            clearStepOverlay();

            saveToHistory();

            // 教学模式：候选数标注步骤 —— 把候选数写进该格并显示出来
            if (step.teachKind === 'candidates') {
                applyStep(step);
                stepCount++;
                currentSteps.push(step);
                updateBoardDisplay();
                renderCellCandidates(step.row, step.col);
                flashAnnotatedCell(step.row, step.col);
                addDetailedExplanation(step, stepCount);
                updateStepsListDisplay();
                restoreBtn();
                return;
            }

            if (step.value) {
                applyStep(step);
                stepCount++;
                currentSteps.push(step);
                updateBoardDisplay();
                addDetailedExplanation(step, stepCount);
                updateStepsListDisplay();
                highlightNewNumber(step.row, step.col);
                checkPuzzleCompletion();
                restoreBtn();
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
                    restoreBtn();
                });
                return;
            }

            stepCount++;
            currentSteps.push(step);
            updateStepsListDisplay();
            restoreBtn();
        } catch (e) {
            console.error('[下一步] 错误:', e);
            showTemporaryMessage('推理失败', 'error');
            nextStepInProgress = false;
            if (btn) {
                btn.disabled = false;
                btn.textContent = '➡️ 下一步';
            }
        }
    }, 200);
}

// ==================== 模式切换函数 ====================

function enterExampleMode() {
    if (isExampleMode) return;
    isExampleMode = true;
    window.isManualEditMode = false;
    
    const editBtn = document.getElementById('editModeBtn');
    if (editBtn) editBtn.classList.remove('active');
    practiceEditMode = false;
    exampleEditMode = false;
    
    document.getElementById('exampleControls').style.display = 'flex';
    const pUndo = document.getElementById('practiceUndoBtn');
    if (pUndo) pUndo.style.display = 'none';

    // 教学模式下强制展开侧栏（解题过程/步骤历史是教学核心 UI）
    const __sb = document.getElementById('explanationSidebar');
    if (__sb) {
        __sb.classList.remove('collapsed');
        __sb.style.width = '360px';
        __sb.style.minWidth = '360px';
        const __t = document.getElementById('sidebarToggle');
        if (__t) __t.textContent = '◀ 折叠';
    }
    
    const gameArea = document.getElementById('gameArea');
    if (gameArea) {
        gameArea.classList.remove('practice-mode');
        gameArea.classList.add('example-mode');
    }
    
    const modeBadge = document.getElementById('modeBadge');
    if (modeBadge) {
        modeBadge.className = 'mode-badge example-mode';
        modeBadge.innerHTML = '🎓 教学模式';
    }
    
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const input = document.getElementById(`cell-${i}-${j}`);
            if (input) {
                input.setAttribute('readonly', 'readonly');
            }
        }
    }
    
    document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'flex');
    renderAllCandidates();
    if (typeof syncMenuLabels === 'function') syncMenuLabels();
    if (typeof updateSidebarPanels === 'function') updateSidebarPanels();
    if (typeof fitBoardSize === 'function') fitBoardSize();
    
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
    
    showTemporaryMessage('已进入教学模式，可以使用"下一步"智能解题', 'info');
}

function exitExampleMode() {
    if (!isExampleMode) return;
    isExampleMode = false;
    setTeachingMode(false);
    window.isManualEditMode = false;
    
    const editBtn = document.getElementById('editModeBtn');
    if (editBtn) editBtn.classList.remove('active');
    practiceEditMode = false;
    exampleEditMode = false;
    
    document.getElementById('exampleControls').style.display = 'none';
    const pUndo2 = document.getElementById('practiceUndoBtn');
    if (pUndo2) pUndo2.style.display = '';
    
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
            if (input) {
                input.setAttribute('readonly', 'readonly');
            }
        }
    }
    
    document.querySelectorAll('.candidates-area').forEach(d => d.style.display = 'flex');
    renderAllCandidates();
    if (typeof syncMenuLabels === 'function') syncMenuLabels();
    if (typeof updateSidebarPanels === 'function') updateSidebarPanels();
    
    const manualHint = document.getElementById('manualEditHint');
    if (manualHint) manualHint.remove();
    
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
            if (input && originalBoard[i][j] === 0) {
                input.setAttribute('readonly', 'readonly');
            }
        }
    }
    
    if (!exampleEditMode) {
        exampleEditMode = true;
        const editBtn = document.getElementById('editModeBtn');
        if (editBtn) editBtn.classList.add('active');
    }
    
    renderAllCandidates();
    showManualEditHint();
    showTemporaryMessage('已切换到手动编辑模式，点击底部数字按钮输入', 'info');
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
        modeBadge.innerHTML = '🎓 教学模式';
    }
    
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const input = document.getElementById(`cell-${i}-${j}`);
            if (input && originalBoard[i][j] === 0) {
                input.setAttribute('readonly', 'readonly');
            }
        }
    }
    
    exampleEditMode = false;
    const editBtn = document.getElementById('editModeBtn');
    if (editBtn) editBtn.classList.remove('active');
    
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
    const gradeSel = document.getElementById('gradeSelector');
    if (gradeSel) gradeSel.value = '';

    updateFreeModeStatus();
}

// ==================== 事件绑定 ====================

function attachEvents() {
    const editModeBtn = document.getElementById('editModeBtn');
    if (editModeBtn) {
        editModeBtn.addEventListener('click', toggleEditMode);
    }

    // 修复：题目下拉框的 change 监听原先只写在被覆盖的旧 loadPuzzleList 里，
    // 重写 loadPuzzleList 后该监听丢失，导致选择题目后盘面不加载。此处统一绑定。
    const puzzleSelector = document.getElementById('puzzleSelector');
    if (puzzleSelector) {
        puzzleSelector.addEventListener('change', (e) => {
            if (e.target.value) loadPuzzle(e.target.value);
        });
    }
    
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
            if (action === 'custom') { showCustomPuzzleDialog(); dropdownMenu.classList.remove('show'); }
            else if (action === 'teaching') { enterTeachingMode(); dropdownMenu.classList.remove('show'); }
            else if (action === 'practice') { exitExampleMode(); dropdownMenu.classList.remove('show'); }
            else if (action === 'fillCandidates') { fillCandidates(); dropdownMenu.classList.remove('show'); }
            else if (action === 'candMode') { if (typeof __applyCandMode === 'function') __applyCandMode(!autoCandidatesMode); dropdownMenu.classList.remove('show'); }
            else if (action === 'theme') { if (typeof __applyTheme === 'function') __applyTheme(!document.body.classList.contains('dark-mode')); dropdownMenu.classList.remove('show'); }
            else if (action === 'nextHint') { showNextHint(); dropdownMenu.classList.remove('show'); }
            else if (action === 'techManual') { openTechniqueManual(); dropdownMenu.classList.remove('show'); }
            else if (action === 'exportPuzzle') { exportCurrentPuzzle(); dropdownMenu.classList.remove('show'); }
            else if (action === 'importClipboard') { importFromClipboard(); dropdownMenu.classList.remove('show'); }
            // 教学专属：上一步
            else if (action === 'prevStep') { undo(); dropdownMenu.classList.remove('show'); }
        });
    }
    
    bindTechniqueLearning();

    document.getElementById('nextStepBtn')?.addEventListener('click', nextStep);
    // 独立"编辑候选数"按钮（练习模式显示，教学模式隐藏）
    document.getElementById('editCandBtn')?.addEventListener('click', toggleEditMode);
    // 旧的 undoBtn 已移入"更多操作"下拉，不再有独立按钮
    
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

    // 解题成功弹框：重新答题 / 关闭
    document.getElementById('completionDialogClose')?.addEventListener('click', hideCompletionDialog);
    document.getElementById('completionCloseBtn')?.addEventListener('click', hideCompletionDialog);
    document.getElementById('completionRestartBtn')?.addEventListener('click', () => {
        hideCompletionDialog();
        const curSel = document.getElementById('puzzleSelector').value;
        if (curSel) loadPuzzle(curSel);
    });
    
    initCustomDialogEvents();
}

// ==================== 初始化 ====================

function initUI() {
    createBoard();
    attachEvents();
    loadPuzzleList();
    createNumberPad();
    fitBoardSize();
    
    const gameArea = document.getElementById('gameArea');
    if (gameArea) gameArea.classList.add('practice-mode');
    
    updateFreeModeStatus();
}

/**
 * 棋盘尺寸自适应：
 * 取「可用宽度」与「可用高度」的较小值作为棋盘边长，
 * 其中可用高度 = 视口高 − 头部高度 − 30px 留白（数字键盘在下方时再扣掉键盘高度）。
 * 结果写入 CSS 变量 --cell-size，所有断点共用。
 */
function fitBoardSize() {
    const hdr = document.querySelector('.header-with-timer');
    const gameArea = document.getElementById('gameArea');
    const sidebar = document.getElementById('explanationSidebar');
    const pad = document.getElementById('numberPad');
    const wrap = document.querySelector('.container');
    if (!hdr || !gameArea) return;

    const wrapStyle = getComputedStyle(wrap);
    const padX = parseFloat(wrapStyle.paddingLeft) || 0;
    const padY = (parseFloat(wrapStyle.paddingTop) || 0) + (parseFloat(wrapStyle.paddingBottom) || 0);
    const vw = document.documentElement.clientWidth - padX * 2;
    const vh = window.innerHeight;

    // 头部占高（含下边距）
    const hdrH = hdr.offsetHeight + (parseFloat(getComputedStyle(hdr).marginBottom) || 0);
    let availH = vh - hdrH - padY - 30;   // 30px 固定留白
    let availW = vw;

    // 横排时侧栏在右侧，占水平空间
    if (getComputedStyle(gameArea).flexDirection === 'row' &&
        sidebar && getComputedStyle(sidebar).display !== 'none') {
        availW -= (sidebar.offsetWidth + 20);
    }

    // 数字键盘占位：横屏竖排在棋盘右侧（吃宽度），竖屏横排在棋盘下方（吃高度）
    if (pad && pad.offsetWidth > 0) {
        const padCol = getComputedStyle(pad).flexDirection === 'column';
        if (padCol) availW -= (pad.offsetWidth + 12);
        else availH -= (pad.offsetHeight + 12);
    }

    const board = Math.min(availW, availH) - 24; // 再留出棋盘边框/描边余量
    let cell = Math.floor(board / 9);
    cell = Math.max(26, Math.min(120, cell)); // 26 ~ 120px 安全区间（大屏可放大）
    document.documentElement.style.setProperty('--cell-size', cell + 'px');
}

let __fitBoardTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(__fitBoardTimer);
    __fitBoardTimer = setTimeout(fitBoardSize, 120);
});

document.addEventListener('DOMContentLoaded', initUI);

/* ==========================================================================
 * 修复补丁层
 * 说明：下面用函数声明“后定义覆盖先定义”的特性，安全地重定义有缺陷的函数。
 * 覆盖内容：练习模式判定、完成校验、撤销、移动端清除、键盘导航、
 *          题目切换状态残留、进度持久化。
 * ========================================================================== */

// 与 historyBoards 平行：记录每条历史对应的"已产生智能步骤数"
let historyStepCounts = [];
// 可推导格子缓存（避免同一盘面重复做全量逻辑推演）
let __derivableCacheKey = null;
let __derivableCacheMap = null;
// 填满但非法时只提示一次
let __completionWarned = false;

function boardKeyUI() {
    let k = '';
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) k += currentBoard[i][j];
    }
    return k;
}

/** 当前盘面中"仅靠逻辑技巧即可确定"的格子集合 */
function getDerivableMap() {
    const key = boardKeyUI();
    if (__derivableCacheKey === key && __derivableCacheMap) return __derivableCacheMap;
    let map;
    try {
        map = computeDerivableCells();
    } catch (e) {
        console.warn('推导失败:', e && e.message);
        map = new Map();
    }
    __derivableCacheKey = key;
    __derivableCacheMap = map;
    return map;
}

/** 修复：原实现只认"唯一候选/唯余"，导致数对、区块等技巧被误判为不可推导 */
function canDeriveCellValue(row, col) {
    if (currentBoard[row][col] !== 0) {
        return { canDerive: false, value: null, technique: '' };
    }
    const info = getDerivableMap().get(row + ',' + col);
    if (info) {
        return {
            canDerive: true,
            value: info.value,
            technique: info.technique + (info.explanation ? '：' + info.explanation : '')
        };
    }
    return { canDerive: false, value: null, technique: '' };
}

function hasAnyDerivableCell() {
    const map = getDerivableMap();
    // 从全部可推导格子中挑"最合理"的一条：优先最基础的技法（摒除/唯一候选），
    // 同级技法再按盘面从左上到右下的阅读顺序。
    let best = null;
    let bestLv = Infinity;
    for (const info of map.values()) {
        const lv = (typeof getTechniqueLevel === 'function') ? (getTechniqueLevel(info.technique) || 9) : 9;
        if (!best || lv < bestLv || (lv === bestLv && (info.row * 9 + info.col) < (best.row * 9 + best.col))) {
            best = info;
            bestLv = lv;
        }
    }
    if (best) {
        return {
            hasDerivable: true,
            row: best.row,
            col: best.col,
            value: best.value,
            technique: best.technique + (best.explanation ? '：' + best.explanation : '')
        };
    }
    return { hasDerivable: false, row: -1, col: -1, value: null, technique: '' };
}

/**
 * 清空用户手动候选数 + 界面残留渲染。
 * 注意：cellCandidates 由 initCandidates() 单独重建，本函数不再触碰，
 * 否则会出现 initCandidates 刚重建完又被 initUserCandidates 清空的 bug。
 */
function initUserCandidates() {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            userCandidates[i][j].clear();
            const div = document.getElementById('candidates-' + i + '-' + j);
            if (div) {
                div.innerHTML = '';
                div.classList.remove('cand-full', 'cand-partial');
            }
            renderCellCandidates(i, j);
        }
    }
}

/** 落子后同步候选数：清空该格，并从同行/列/宫的其他空格中移除该数字 */
function refreshPracticeCandidates(row, col, num) {
    userCandidates[row][col].clear();
    const peers = new Set();
    for (let i = 0; i < 9; i++) {
        peers.add(row + ',' + i);
        peers.add(i + ',' + col);
    }
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) peers.add((br + i) + ',' + (bc + j));
    }
    for (const p of peers) {
        const parts = p.split(',');
        const r = parseInt(parts[0]), c2 = parseInt(parts[1]);
        if (currentBoard[r][c2] === 0) userCandidates[r][c2].delete(num);
    }
    syncUserCandidatesToDisplay();
}

function updateFreeModeStatus() {
    if (isExampleMode) return;
    const hasDerivable = getDerivableMap().size > 0;
    isFreeMode = !hasDerivable;

    const modeBadge = document.getElementById('modeBadge');
    if (!modeBadge) return;

    // 顺带展示题目的技巧等级，让难度标签有据可依
    const sel = document.getElementById('puzzleSelector');
    const puzzle = sel ? PUZZLE_LIBRARY.find(p => p.name === sel.value) : null;
    const gName = puzzle && (puzzle.grade || (/^A/.test(puzzle.name) ? 'A' : (/^C/.test(puzzle.name) ? 'C' : 'B')));
    const lvText = puzzle
        ? (' · ' + (gName ? gName + ' 级' : '') + (puzzle.level ? ' 技巧等级 ' + puzzle.level : ''))
        : '';

    if (isFreeMode) {
        modeBadge.innerHTML = '✏️ 自由模式';
        modeBadge.classList.add('manual-mode');
        modeBadge.classList.remove('practice-mode');
    } else {
        modeBadge.innerHTML = '✏️ 练习模式';
        modeBadge.classList.remove('manual-mode');
        modeBadge.classList.add('practice-mode');
    }
}

/** 整盘是否填满且完全合法（每行/列/宫恰好 1~9） */
function isBoardSolvedLegally() {
    for (let i = 0; i < 9; i++) {
        const rowSet = new Set(), colSet = new Set();
        for (let j = 0; j < 9; j++) {
            if (currentBoard[i][j] === 0 || currentBoard[j][i] === 0) return false;
            rowSet.add(currentBoard[i][j]);
            colSet.add(currentBoard[j][i]);
        }
        if (rowSet.size !== 9 || colSet.size !== 9) return false;
    }
    for (let b = 0; b < 9; b++) {
        const boxSet = new Set();
        const br = Math.floor(b / 3) * 3, bc = (b % 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) boxSet.add(currentBoard[br + i][bc + j]);
        }
        if (boxSet.size !== 9) return false;
    }
    return true;
}

/** 修复：原实现只看"是否填满"，乱填也能弹出恭喜完成 */
function checkPuzzleCompletion() {
    let isFull = true;
    for (let i = 0; i < 9 && isFull; i++) {
        for (let j = 0; j < 9; j++) {
            if (currentBoard[i][j] === 0) { isFull = false; break; }
        }
    }
    if (!isFull) return false;

    if (!isBoardSolvedLegally()) {
        if (!__completionWarned) {
            __completionWarned = true;
            showTemporaryMessage('⚠️ 盘面已填满，但存在重复数字，请检查后修改', 'warning');
        }
        return false;
    }

    if (!isPuzzleCompleted && isTimerRunning) {
        completeTimer();
        // 记录统计
        recordPuzzleCompletion();
        renderStatsPanel();
        // 练习/自由模式：弹出确认框，让用户选择重新答题或结束
        // 教学模式自己按步骤推进完成，不弹框
        if (!isExampleMode) showCompletionDialog();
        return true;
    }
    return false;
}

/** 解题成功对话框：重新答题 / 关闭后等待用户重新选题 */
function showCompletionDialog() {
    const dlg = document.getElementById('completionDialog');
    const body = document.getElementById('completionDialogBody');
    if (!dlg || !body) return;

    const stats = getStats();
    const sel = document.getElementById('puzzleSelector');
    const cur = sel ? stats[sel.value] : null;
    let html = '<div style="text-align:center;padding:8px 0;">';
    html += '<div style="font-size:15px;font-weight:600;color:#2e7d32;margin-bottom:8px;">🎉 恭喜解题成功！</div>';
    html += '<div style="font-size:13px;color:#555;">用时 <b>' + formatTime(timerSeconds) + '</b></div>';
    if (cur && cur.bestMs) {
        html += '<div style="font-size:12px;color:#888;margin-top:4px;">本题最佳 ' + formatTime(Math.floor(cur.bestMs / 1000)) + '</div>';
    }
    html += '<div style="font-size:13px;color:#444;margin-top:12px;">是否重新答题？</div>';
    html += '</div>';
    body.innerHTML = html;
    dlg.style.display = 'flex';
}

function hideCompletionDialog() {
    const dlg = document.getElementById('completionDialog');
    if (dlg) dlg.style.display = 'none';
}

const STATS_KEY = 'sudoku_stats_v1';
function getStats() {
    try { return JSON.parse(localStorage.getItem(STATS_KEY) || '{}'); } catch (e) { return {}; }
}
function saveStats(s) {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) {}
}

function recordPuzzleCompletion() {
    const sel = document.getElementById('puzzleSelector');
    const name = sel ? sel.value : '';
    if (!name) return;
    const stats = getStats();
    const prev = stats[name] || { bestMs: null, attempts: 0 };
    const elapsed = timerSeconds * 1000;
    stats[name] = {
        completed: true,
        bestMs: prev.bestMs === null ? elapsed : Math.min(prev.bestMs, elapsed),
        attempts: prev.attempts + 1,
        lastMs: elapsed,
        lastDate: new Date().toISOString().slice(0, 10)
    };
    saveStats(stats);
}

function renderStatsPanel() {
    const box = document.getElementById('stats-panel');
    if (!box) return;
    const stats = getStats();
    const totalDone = Object.keys(stats).length;
    const totalPuzzles = (typeof PUZZLE_LIBRARY !== 'undefined') ? PUZZLE_LIBRARY.length : '-';
    const sel = document.getElementById('puzzleSelector');
    const cur = sel ? stats[sel.value] : null;
    function fmt(ms) {
        if (!ms && ms !== 0) return '-';
        const s = Math.floor(ms / 1000);
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
        return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    }

    let html = '<div class="stats-summary">';
    html += '<b>📊 统计</b>';
    html += '<div style="font-size:12px;color:#666;margin-top:4px;">共完成 <b>' + totalDone + '</b> / ' + totalPuzzles + ' 题</div>';
    if (cur) {
        html += '<div style="font-size:11px;color:#444;margin-top:6px;border-top:1px solid #eee;padding-top:4px;">';
        html += '本题最佳: <b>' + fmt(cur.bestMs) + '</b>';
        if (cur.attempts > 1) html += ' · 尝试 ' + cur.attempts + ' 次';
        html += '</div>';
    }
    html += '</div>';
    box.innerHTML = html;
}

/** 修复：按历史条目精确记录步骤数，避免一次撤销连带删掉多个智能步骤 */
function saveToHistory() {
    const snapshot = cloneBoardUI(currentBoard);
    historyBoards = historyBoards.slice(0, historyIdx + 1);
    historyStepCounts = historyStepCounts.slice(0, historyIdx + 1);
    historyBoards.push(snapshot);
    historyStepCounts.push(currentSteps.length);
    historyIdx++;
}

function undo() {
    if (historyIdx <= 0) {
        showTemporaryMessage('没有更早的历史', 'warning');
        return;
    }
    historyIdx--;
    currentBoard = cloneBoardUI(historyBoards[historyIdx]);
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) originalBoard[i][j] = historyBoards[0][i][j];
    }
    initCandidates();
    if (!isExampleMode) initUserCandidates();

    const targetCount = (historyStepCounts[historyIdx] !== undefined)
        ? historyStepCounts[historyIdx]
        : currentSteps.length;
    currentSteps = currentSteps.slice(0, targetCount);
    stepCount = currentSteps.length;
    updateStepsListDisplay();
    if (currentSteps.length > 0) {
        addDetailedExplanation(currentSteps[currentSteps.length - 1], stepCount);
    } else {
        const box = document.getElementById('explanation-content');
        if (box) box.innerHTML = '<div class="step-explanation">✨ 已回到初始状态</div>';
    }

    __completionWarned = false;
    const isFull = currentBoard.every(r => r.every(c => c !== 0));
    if (!isFull && isPuzzleCompleted) {
        isPuzzleCompleted = false;
        startTimer();
    }

    __derivableCacheKey = null;
    updateBoardDisplay();
    updateFreeModeStatus();
    saveProgress();
    showTemporaryMessage('已回退到上一步', 'info');
}

/** 重做：redoIdx++ 恢复后续历史 */
function redo() {
    if (historyIdx >= historyBoards.length - 1) {
        showTemporaryMessage('没有可重做的操作', 'warning');
        return;
    }
    historyIdx++;
    currentBoard = cloneBoardUI(historyBoards[historyIdx]);
    initCandidates();
    if (!isExampleMode) initUserCandidates();

    const targetCount = historyStepCounts[historyIdx] !== undefined
        ? historyStepCounts[historyIdx] : currentSteps.length;
    currentSteps = currentSteps.slice(0, targetCount);
    stepCount = currentSteps.length;
    updateStepsListDisplay();

    __derivableCacheKey = null;
    updateBoardDisplay();
    updateFreeModeStatus();
    saveProgress();
    showTemporaryMessage('已重做', 'info');
}

/** 修复：练习模式没有清除入口，手机无物理键盘时无法清空格子 */
function clearSelectedCell() {
    if (currentSelectedRow === -1 || currentSelectedCol === -1) {
        showTemporaryMessage('请先点击选择一个格子', 'warning');
        return;
    }
    const row = currentSelectedRow, col = currentSelectedCol;
    if (originalBoard[row][col] !== 0) {
        showTemporaryMessage('原始题目格子不能修改', 'warning');
        return;
    }
    if (currentBoard[row][col] === 0) {
        showTemporaryMessage('该格子已经是空的', 'info');
        return;
    }
    if (isExampleMode && !window.isManualEditMode) {
        showTemporaryMessage('教学模式下不能手动清除', 'warning');
        return;
    }
    saveToHistory();
    currentBoard[row][col] = 0;
    initCandidates();
    if (!isExampleMode) initUserCandidates();
    __derivableCacheKey = null;
    __completionWarned = false;
    isPuzzleCompleted = false;
    if (!isTimerRunning) startTimer();
    updateBoardDisplay();
    updateFreeModeStatus();
    saveProgress();
    showTemporaryMessage('已清除该格', 'info');
}

/**
 * 修复练习模式填数判定：
 * 1) 违反基本规则 -> 计错误；
 * 2) 与唯一解不符 -> 计错误（唯一真实的"错误"）；
 * 3) 与唯一解一致 -> 一律接受，并按所用技巧给出提示，不再用"候选数一致性"卡住用户。
 */
function fillNumberToSelectedCell(num) {
    if (currentSelectedRow === -1 || currentSelectedCol === -1) {
        showTemporaryMessage('请先点击选择一个格子', 'warning');
        return;
    }
    const row = currentSelectedRow, col = currentSelectedCol;

    if (originalBoard[row][col] !== 0) {
        showTemporaryMessage('原始题目格子不能修改', 'warning');
        return;
    }
    if (isExampleMode && !window.isManualEditMode) {
        showTemporaryMessage('教学模式下请使用"下一步"按钮', 'warning');
        return;
    }
    if (!isValidMove(row, col, num)) {
        addError();
        showErrorHintDialog(getErrorDetail(row, col, num));
        return;
    }

    let sol = null;
    try {
        sol = getReferenceSolution();
    } catch (e) {
        sol = null;
    }
    if (sol && sol[row][col] !== num) {
        addError();
        showErrorHintDialog({
            title: '❌ 不能填入数字 ' + num,
            content: '该格填 ' + num + ' 与本题的唯一解冲突，请再核对行、列、宫。',
            reasons: ['第 ' + (row + 1) + ' 行第 ' + (col + 1) + ' 列的正确答案不是 ' + num + '。'],
            suggestion: '可以点击"💡 下一步提示"获取线索。'
        });
        return;
    }

    const info = getDerivableMap().get(row + ',' + col);

    // 跳步判定（必须在 refreshPracticeCandidates 之前，后者会清空当前格 userCandidates）
    const notInUserCand = !userCandidates[row][col].has(num);
    const notDerivable = !info;

    saveToHistory();
    currentBoard[row][col] = num;

    if (!isExampleMode) {
        // 练习模式：同步 userCandidates（用户视图）+ 重建 cellCandidates（引擎内部状态）
        refreshPracticeCandidates(row, col, num);
        initCandidates();

        // 练习模式专属：跳步提示（双判定维度）
        // - 人类视角：userCandidates（用户自己维护的候选数）里没这个数 → 用户自己也没"看出来"
        // - 引擎视角：getDerivableMap 里没这格 → 连引擎都推不出
        if (notInUserCand || notDerivable) {
            let tip;
            if (notInUserCand && notDerivable) {
                tip = '⚠️ 填对了，但这格你自己没标 ' + num + ' 作候选，且当前盘面也推不出（跳步）';
            } else if (notInUserCand) {
                tip = '💡 填对了！这格你自己没标 ' + num + ' 作候选，可以检查下候选数是否遗漏';
            } else {
                tip = '💡 填对了！但当前盘面还推不出此数（跳步），可点💡看线索';
            }
            showTemporaryMessage(tip, 'info');
        }
    } else {
        recalcAfterPlacement(row, col, num);
        clearDeleteRecord();
    }

    __derivableCacheKey = null;
    updateBoardDisplay();
    checkPuzzleCompletion();
    updateFreeModeStatus();
    saveProgress();

    // 填完 9 个相同数字的庆祝：盘面已渲染好后检查，避免 DOM 还没更新
    setTimeout(() => {
        let count = 0;
        for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
            if (currentBoard[r][c] === num) count++;
        if (count === 9) {
            for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
                if (currentBoard[r][c] === num) {
                    const el = document.getElementById('cell-container-' + r + '-' + c);
                    if (el) {
                        el.classList.add('celebrate-num');
                        setTimeout(() => el.classList.remove('celebrate-num'), 1500);
                    }
                }
            }
            showTemporaryMessage('🎉 数字 ' + num + ' 全部填满啦！', 'success');
        }
    }, 10);

    if (info) {
        showTemporaryMessage('已填入 ' + num + '（依据：' + info.technique + '）', 'success');
    } else {
        // 数字本身与唯一解一致，但当前逻辑（摒除/区块/数对等已启用技法）暂时推导不出
        showTemporaryMessage('已填入 ' + num + '（注意：按当前盘面逻辑暂时推导不出这个数字，建议用"💡 下一步提示"核对依据）', 'warning');
    }
}

/** 修复：切换题目时未重置模式状态，导致徽标/侧栏/按钮互相矛盾 */
function loadPuzzle(name) {
    const puzzle = PUZZLE_LIBRARY.find(p => p.name === name);
    if (!puzzle) return;

    const grid = puzzle.grid.map(r => r.split('').map(ch => parseInt(ch)));
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            currentBoard[i][j] = grid[i][j];
            originalBoard[i][j] = grid[i][j];
        }
    }

    __derivableCacheKey = null;
    __completionWarned = false;

    initCandidates();
    initUserCandidates();
    updateBoardDisplay();

    historyBoards = [cloneBoardUI(currentBoard)];
    historyIdx = 0;
    historyStepCounts = [0];
    currentSteps = [];
    stepCount = 0;
    updateStepsListDisplay();

    const expBox = document.getElementById('explanation-content');
    if (expBox) expBox.innerHTML = '<div class="step-explanation">✨ 点击"下一步"开始智能解题</div>';

    resetTimer();
    startTimer();
    resetErrorCount();

    // 完整重置所有模式开关
    isFreeMode = false;
    isExampleMode = false;
    practiceEditMode = false;
    exampleEditMode = false;
    window.isManualEditMode = false;

    const gameArea = document.getElementById('gameArea');
    if (gameArea) {
        gameArea.classList.remove('example-mode');
        gameArea.classList.add('practice-mode');
    }
    const exampleControls = document.getElementById('exampleControls');
    if (exampleControls) exampleControls.style.display = 'none';
    const sidebar = document.getElementById('explanationSidebar');
    // 侧栏显隐由 CSS 类（game-area.practice-mode / example-mode 等）+ .collapsed 共同控制，
    // 不再用 inline style.display，避免遮挡 CSS 规则。
    if (sidebar) sidebar.style.display = '';
    const editBtn = document.getElementById('editModeBtn');
    if (editBtn) editBtn.classList.remove('active');
    const undoBtn = document.getElementById('practiceUndoBtn');
    if (undoBtn) undoBtn.style.display = '';

    const sel = document.getElementById('puzzleSelector');
    if (sel) sel.value = name;

    updateFreeModeStatus();
    saveProgress();
    showTemporaryMessage('已加载: ' + name, 'success');
    ppSyncFromSelects();
}

/** 修复：数字键盘缺少清除键 */
function createNumberPad() {
    const pad = document.getElementById('numberPad');
    if (!pad) return;
    pad.innerHTML = '';

    for (let i = 1; i <= 9; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = 'number-pad-btn';
        btn.addEventListener('click', () => {
            if (currentSelectedRow === -1 || currentSelectedCol === -1) {
                showTemporaryMessage('请先点击选择一个格子', 'warning');
                return;
            }
            const row = currentSelectedRow, col = currentSelectedCol;
            if (isExampleMode && !window.isManualEditMode) {
                showTemporaryMessage('教学模式下请使用"下一步"按钮', 'warning');
                return;
            }
            if (originalBoard[row][col] !== 0) {
                showTemporaryMessage('原始题目格子不能修改', 'warning');
                return;
            }
            if (isExampleMode) {
                if (window.isManualEditMode) fillNumberToSelectedCell(i);
                else if (exampleEditMode) toggleCandidateNumberUI(row, col, i);
            } else {
                if (practiceEditMode) practiceToggleCandidate(row, col, i);
                else fillNumberToSelectedCell(i);
            }
        });
        pad.appendChild(btn);
    }

    const del = document.createElement('button');
    del.textContent = '⌫';
    del.className = 'number-pad-btn number-pad-del';
    del.title = '清除当前格';
    del.addEventListener('click', clearSelectedCell);
    pad.appendChild(del);
}

/** 修复：增加方向键导航与统一的清除快捷键 */
function handleKeyDown(e, row, col) {
    selectCell(row, col);

    // 撤销/重做快捷键仅在教学模式生效：
    // 练习模式的错误落子已被拦截、不产生脏数据，撤销只会清掉正确的填入
    // 并连带清空用户手工编辑的候选数，因此不再提供。
    if (e.ctrlKey && isExampleMode) {
        if (e.key === 'y' || e.key === 'Y' || (e.key === 'z' && e.shiftKey)) {
            e.preventDefault(); redo(); return;
        }
        if (e.key === 'z' || e.key === 'Z') {
            e.preventDefault(); undo(); return;
        }
    }

    // Tab / 空格 跳到下一个空格（Wrap 搜索）
    if (e.key === 'Tab' || e.key === ' ') {
        e.preventDefault();
        let r = row, c = col;
        for (let i = 0; i < 81; i++) {
            c++;
            if (c >= 9) { c = 0; r++; if (r >= 9) r = 0; }
            if (currentBoard[r][c] === 0) { selectCell(r, c); const el = document.getElementById('cell-' + r + '-' + c); if (el) el.focus(); return; }
        }
        return; // 全满了
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        let r = row, c = col;
        if (e.key === 'ArrowUp') r = Math.max(0, row - 1);
        if (e.key === 'ArrowDown') r = Math.min(8, row + 1);
        if (e.key === 'ArrowLeft') c = Math.max(0, col - 1);
        if (e.key === 'ArrowRight') c = Math.min(8, col + 1);
        const el = document.getElementById('cell-' + r + '-' + c);
        if (el) {
            selectCell(r, c);
            el.focus();
        }
        return;
    }

    if (isExampleMode) {
        if (window.isManualEditMode) {
            if (e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                fillNumberToSelectedCell(parseInt(e.key));
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                clearSelectedCell();
            }
            return;
        }
        if (exampleEditMode && e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            toggleCandidateNumberUI(row, col, parseInt(e.key));
        }
        return;
    }

    if (practiceEditMode) {
        if (e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            practiceToggleCandidate(row, col, parseInt(e.key));
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            clearSelectedCell();
        }
        return;
    }

    if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        fillNumberToSelectedCell(parseInt(e.key));
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        clearSelectedCell();
    }
}

/* ==================== 进度持久化（修复刷新即丢进度） ==================== */

const PROGRESS_KEY = 'sudoku_progress_v1';

function saveProgress() {
    try {
        const sel = document.getElementById('puzzleSelector');
        localStorage.setItem(PROGRESS_KEY, JSON.stringify({
            name: sel ? sel.value : '',
            board: currentBoard,
            original: originalBoard,
            timer: timerSeconds,
            ts: Date.now()
        }));
    } catch (e) { /* 隐私模式下 localStorage 可能不可用，忽略即可 */ }
}

function restoreProgress() {
    let raw = null;
    try { raw = localStorage.getItem(PROGRESS_KEY); } catch (e) { return; }
    if (!raw) return;

    let data = null;
    try { data = JSON.parse(raw); } catch (e) { return; }
    if (!data || !data.board || !data.original) return;

    // 与原始盘面一致（没动过）就不必恢复
    let changed = false;
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (data.board[i][j] !== data.original[i][j]) changed = true;
        }
    }
    if (!changed) return;

    const sel = document.getElementById('puzzleSelector');
    if (sel && data.name) sel.value = data.name;

    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            currentBoard[i][j] = data.board[i][j];
            originalBoard[i][j] = data.original[i][j];
        }
    }
    __derivableCacheKey = null;
    __completionWarned = false;
    initCandidates();
    initUserCandidates();
    updateBoardDisplay();

    historyBoards = [cloneBoardUI(currentBoard)];
    historyIdx = 0;
    historyStepCounts = [0];
    currentSteps = [];
    stepCount = 0;
    updateStepsListDisplay();

    timerSeconds = data.timer || 0;
    updateTimerDisplay();
    startTimer();

    updateFreeModeStatus();
    showTemporaryMessage('已恢复上次未完成的进度', 'info');
}

/* ==================== 通用：对话框可拖动 + 可调整长宽 ==================== */

/**
 * 根据当前模式控制侧栏面板显隐。
 * 教学模式：三个面板都显示（解题过程 + 步骤历史 + 统计）
 * 练习/自由模式：只显示统计面板（解题过程和步骤历史是教学专属）
 */
function updateSidebarPanels() {
    const showTeachPanels = !!isExampleMode;
    const sidebar = document.getElementById('explanationSidebar');
    if (sidebar) {
        sidebar.classList.toggle('teach-mode', showTeachPanels);
        // 练习/自由模式整条侧栏不占位，把 360px 宽度让给棋盘与数字键盘
        sidebar.style.display = showTeachPanels ? '' : 'none';
    }
    const hideAll = (el) => {
        if (!el) return;
        el.style.display = showTeachPanels ? 'block' : 'none';
        el.style.height = showTeachPanels ? 'auto' : '0';
        el.style.overflow = showTeachPanels ? 'visible' : 'hidden';
    };
    hideAll(document.querySelector('.explanation-panel'));
    hideAll(document.querySelector('.steps-history'));
    hideAll(document.getElementById('stats-panel'));
    const quickInfo = document.getElementById('sidebarQuickInfo');
    if (quickInfo) quickInfo.style.display = showTeachPanels ? '' : 'none';
}

/**
 * 同步"更多操作"菜单项文案 + 教学模式时隐藏候选数相关菜单项。
 * 教学模式（isExampleMode）下用户不需要候选数管理（教学引擎自己管理 teachShown），
 * 所以隐藏 cand-only 标记的菜单项避免误导。
 */
function syncMenuLabels() {
    const candModeItem = document.getElementById('candModeMenuItem');
    if (candModeItem) candModeItem.textContent = autoCandidatesMode ? '🔢 候选数：自动' : '✍️ 候选数：手动';

    // 独立"编辑候选数"按钮：同步文案 + active 状态 + 显隐（教学模式隐藏，练习模式显示）
    const editBtn = document.getElementById('editCandBtn');
    if (editBtn) {
        const editing = isExampleMode ? exampleEditMode : practiceEditMode;
        editBtn.textContent = editing ? '✅ 退出编辑候选数' : '✏️ 编辑候选数';
        editBtn.classList.toggle('active', editing);
        editBtn.style.display = isExampleMode ? 'none' : '';
    }

    const themeItem = document.getElementById('themeMenuItem');
    if (themeItem) themeItem.textContent = document.body.classList.contains('dark-mode') ? '☀️ 日间模式' : '🌙 夜间模式';

    // 显隐规则：
    // - cand-only：教学模式隐藏（练习/自由都显示补全候选数）
    // - teach-only：仅教学模式显示
    // - mode-only：仅自由模式显示（autoCandidatesMode 只在自由模式生效）
    const isTeach = !!isExampleMode;
    document.querySelectorAll('.cand-only').forEach(el => el.style.display = isTeach ? 'none' : '');
    document.querySelectorAll('.teach-only').forEach(el => el.style.display = isTeach ? '' : 'none');
    document.querySelectorAll('.mode-only').forEach(el => el.style.display = isFreeMode ? '' : 'none');
}

/**
 * 让一个 flex 居中对话框的 content 区域变得可拖动/可 resize。
 * 首次拖动时自动从 flex 居中切换到 absolute 自由定位，并用 getBoundingClientRect
 * 把当前视觉位置归一到 left/top 像素，避免坐标系跳变。
 * @param {HTMLElement} contentEl 对话框内部的 content 元素（被 flex 居中的那个）
 */
function makeDraggableResizeable(contentEl) {
    if (!contentEl || contentEl.__drrBound) return;
    contentEl.__drrBound = true;

    // 动态创建 resize 手柄
    const handle = document.createElement('div');
    handle.className = 'dialog-resize-handle';
    contentEl.appendChild(handle);

    const header = contentEl.querySelector(
        '.hint-dialog-header, .tech-learn-header, .custom-dialog-header'
    );

    function toFreePosition() {
        if (contentEl.classList.contains('drag-free')) return;
        const rect = contentEl.getBoundingClientRect();
        const parentRect = contentEl.parentElement.getBoundingClientRect();
        contentEl.classList.add('drag-free');
        contentEl.style.left = (rect.left - parentRect.left) + 'px';
        contentEl.style.top = (rect.top - parentRect.top) + 'px';
        contentEl.style.width = rect.width + 'px';
        contentEl.style.height = rect.height + 'px';
        contentEl.style.margin = '0';
    }

    // ——— 拖动 ———
    let dragState = null;
    if (header) {
        header.addEventListener('mousedown', (e) => {
            // 点到关闭按钮/输入框时不触发拖动
            if (e.target.closest('button, input, textarea')) return;
            e.preventDefault();
            toFreePosition();
            const rect = contentEl.getBoundingClientRect();
            dragState = {
                startX: e.clientX, startY: e.clientY,
                origLeft: rect.left, origTop: rect.top
            };
            document.body.classList.add('dragging-dialog');
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', stopDrag);
        });
    }

    function onDrag(e) {
        if (!dragState) return;
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        contentEl.style.left = (dragState.origLeft + dx) + 'px';
        contentEl.style.top = (dragState.origTop + dy) + 'px';
    }

    function stopDrag() {
        dragState = null;
        document.body.classList.remove('dragging-dialog');
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
    }

    // ——— resize ———
    let resizeState = null;
    handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toFreePosition();
        const rect = contentEl.getBoundingClientRect();
        resizeState = {
            startX: e.clientX, startY: e.clientY,
            origW: rect.width, origH: rect.height
        };
        document.body.classList.add('dragging-dialog');
        document.addEventListener('mousemove', onResize);
        document.addEventListener('mouseup', stopResize);
    });

    function onResize(e) {
        if (!resizeState) return;
        const dx = e.clientX - resizeState.startX;
        const dy = e.clientY - resizeState.startY;
        const minW = 300, minH = 200;
        contentEl.style.width = Math.max(minW, resizeState.origW + dx) + 'px';
        contentEl.style.height = Math.max(minH, resizeState.origH + dy) + 'px';
    }

    function stopResize() {
        resizeState = null;
        document.body.classList.remove('dragging-dialog');
        document.removeEventListener('mousemove', onResize);
        document.removeEventListener('mouseup', stopResize);
    }
}

/* ==================== 事件绑定（撤销按钮） ==================== */

document.addEventListener('DOMContentLoaded', function () {
    // 对话框：可拖动 + 可 resize
    makeDraggableResizeable(document.getElementById('hintDialog')?.querySelector('.hint-dialog-content'));
    makeDraggableResizeable(document.getElementById('stepVizDialog')?.querySelector('.step-viz-content'));
    makeDraggableResizeable(document.getElementById('techLearnDialog')?.querySelector('.tech-learn-content'));
    makeDraggableResizeable(document.getElementById('customPuzzleDialog')?.querySelector('.custom-dialog-content'));

    // 候选数模式切换：自动 / 手动（菜单项驱动，按钮已收纳进"更多操作"）
    const CAND_MODE_KEY = 'sudoku_cand_mode_v1';
    function applyCandMode(auto) {
        autoCandidatesMode = auto;
        try { localStorage.setItem(CAND_MODE_KEY, auto ? 'auto' : 'manual'); } catch (e) {}
        renderAllCandidates();
        syncMenuLabels();
    }
    window.__applyCandMode = applyCandMode;
    const savedCandMode = (() => {
        try { return localStorage.getItem(CAND_MODE_KEY); } catch (e) { return null; }
    })();
    applyCandMode(savedCandMode === 'auto');

    // 主题切换（日间 / 夜间）
    const THEME_KEY = 'sudoku_theme_v1';
    function applyTheme(dark) {
        document.body.classList.toggle('dark-mode', dark);
        try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (e) {}
        syncMenuLabels();
    }
    window.__applyTheme = applyTheme;
    const savedTheme = (() => {
        try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
    })();
    applyTheme(savedTheme === 'dark');

    // 侧栏折叠/展开 + 拖拽调宽度
    const sidebar = document.getElementById('explanationSidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarResize = document.getElementById('sidebarResize');
    const SB_KEY = 'sudoku_sb_state_v1';
    function applySidebarState(state) {
        if (!sidebar) return;
        const collapsed = state.collapsed;
        const w = state.width || 360;
        sidebar.classList.toggle('collapsed', collapsed);
        sidebar.style.width = collapsed ? '36px' : w + 'px';
        sidebar.style.minWidth = collapsed ? '36px' : Math.min(w, 360) + 'px';
        if (sidebarToggle) sidebarToggle.textContent = collapsed ? '▶ 展开' : '◀ 折叠';
        try { localStorage.setItem(SB_KEY, JSON.stringify(state)); } catch (e) {}
    }
    const savedSB = (() => {
        try { return JSON.parse(localStorage.getItem(SB_KEY) || 'null'); } catch (e) { return null; }
    })();
    applySidebarState(savedSB || { collapsed: false, width: 360 });
    if (sidebarToggle) sidebarToggle.addEventListener('click', () => {
        const w = sidebar.style.width ? parseInt(sidebar.style.width) : 360;
        applySidebarState({ collapsed: !sidebar.classList.contains('collapsed'), width: w });
    });

    // 折叠条上的"上一步原因"快捷按钮：弹出浮层显示当前 explanation-content
    const sidebarQuickInfo = document.getElementById('sidebarQuickInfo');
    let __quickPanel = null;
    function closeQuickPanel() {
        if (__quickPanel) { __quickPanel.remove(); __quickPanel = null; }
        document.removeEventListener('mousedown', __qpOutside, true);
    }
    function __qpOutside(e) {
        if (__quickPanel && !__quickPanel.contains(e.target) && e.target !== sidebarQuickInfo) closeQuickPanel();
    }
    if (sidebarQuickInfo) sidebarQuickInfo.addEventListener('click', (e) => {
        e.stopPropagation();
        if (__quickPanel) { closeQuickPanel(); return; }
        const src = document.getElementById('explanation-content');
        const html = src ? src.innerHTML : '<div style="color:#95a5a6;">暂无步骤</div>';
        __quickPanel = document.createElement('div');
        __quickPanel.className = 'sidebar-quick-panel';
        __quickPanel.innerHTML =
            '<button class="qp-close" title="关闭">&times;</button>' +
            '<h4>📖 上一步骤原因</h4>' +
            '<div>' + html + '</div>';
        document.body.appendChild(__quickPanel);
        __quickPanel.querySelector('.qp-close').addEventListener('click', closeQuickPanel);
        setTimeout(() => document.addEventListener('mousedown', __qpOutside, true), 0);
    });

    // ——— 侧栏宽度拖拽 ———
    let sbResizeState = null;
    if (sidebarResize && sidebar) {
        sidebarResize.addEventListener('mousedown', (e) => {
            e.preventDefault();
            sbResizeState = { startX: e.clientX, origW: sidebar.getBoundingClientRect().width };
            sidebarResize.classList.add('active');
            document.body.classList.add('dragging-dialog');
            document.addEventListener('mousemove', onSbResize);
            document.addEventListener('mouseup', stopSbResize);
        });
    }
    function onSbResize(e) {
        if (!sbResizeState) return;
        const dx = e.clientX - sbResizeState.startX;
        const newW = Math.max(200, Math.min(600, sbResizeState.origW - dx)); // 向左拖变宽，向右变窄
        sidebar.style.width = newW + 'px';
        sidebar.style.minWidth = newW + 'px';
    }
    function stopSbResize() {
        if (!sidebar || !sbResizeState) return;
        const w = parseInt(sidebar.style.width) || 360;
        try { localStorage.setItem(SB_KEY, JSON.stringify({ collapsed: false, width: w })); } catch (e) {}
        sbResizeState = null;
        sidebarResize?.classList.remove('active');
        document.body.classList.remove('dragging-dialog');
        document.removeEventListener('mousemove', onSbResize);
        document.removeEventListener('mouseup', stopSbResize);
    }
    // initUI 已在前面执行完毕，这里做进度恢复
    try { restoreProgress(); } catch (e) { console.warn('恢复进度失败:', e && e.message); }
    ppSyncFromSelects();
    renderStatsPanel();
    syncMenuLabels();
    updateSidebarPanels();
    fitBoardSize();
});


/** 新的二级菜单选题器：自定义 UI + 隐藏原生 select 保留兼容 */
let __ppOutsideBound = false;
function loadPuzzleList() {
    const picker = document.getElementById('puzzlePicker');
    const panel = document.getElementById('ppPanel');
    const btn = document.getElementById('ppBtn');
    if (!picker || !panel) return;

    const GRADE_GROUPS = [
        { grade: 'D', label: 'D 级 · 入门' },
        { grade: 'C', label: 'C 级 · 基础' },
        { grade: 'B', label: 'B 级 · 进阶' },
        { grade: 'A', label: 'A 级 · 高级' }
    ];
    const groups = { D: [], C: [], B: [], A: [] };
    PUZZLE_LIBRARY.forEach(p => {
        let g = p.grade;
        if (g !== 'A' && g !== 'B' && g !== 'C' && g !== 'D') {
            g = /^A/.test(p.name) ? 'A' : (/^D/.test(p.name) ? 'D' : (/^C/.test(p.name) ? 'C' : 'B'));
        }
        groups[g].push(p);
    });

    // 同步填充隐藏的原生 select（供旧逻辑读取 value）
    const gradeSel = document.getElementById('gradeSelector');
    const puzzleSel = document.getElementById('puzzleSelector');
    if (gradeSel) {
        gradeSel.innerHTML = '<option value=""></option>';
        GRADE_GROUPS.forEach(item => {
            if ((groups[item.grade] || []).length === 0) return;
            const o = document.createElement('option');
            o.value = item.grade;
            o.textContent = item.label;
            gradeSel.appendChild(o);
        });
    }
    // 隐藏的题目 select 必须带上全部题目 option：
    // <select> 的 value 只能取已存在的 option 值，否则赋值结果为 ''，
    // 会导致「重新答题」拿不到题目名、统计记录被 if(!name) 跳过。
    if (puzzleSel) {
        puzzleSel.innerHTML = '';
        PUZZLE_LIBRARY.forEach(p => {
            const o = document.createElement('option');
            o.value = p.name;
            o.textContent = p.name;
            puzzleSel.appendChild(o);
        });
        puzzleSel.value = '';
    }

    // 构建弹出面板 HTML
    let html = '';
    GRADE_GROUPS.forEach(item => {
        const list = groups[item.grade] || [];
        if (!list.length) return;
        html += `<div class="pp-group" data-grade="${item.grade}">
            <div class="pp-group-title">
                <span>${item.label}</span>
                <span><span class="pp-count">${list.length} 题</span><span class="pp-arrow">▶</span></span>
            </div>
            <div class="pp-sublist">`;
        list.forEach(p => {
            const sub = p.orig ? p.orig : (p.level ? '技巧 Lv.' + p.level : '');
            html += `<div class="pp-item" data-grade="${item.grade}" data-name="${p.name}">
                <span>${p.name}</span>
                <span class="pp-item-sub">${sub}</span>
            </div>`;
        });
        html += `</div></div>`;
    });
    panel.innerHTML = html;

    // 点击按钮开关面板
    btn.onclick = (e) => {
        e.stopPropagation();
        const show = panel.style.display !== 'block';
        panel.style.display = show ? 'block' : 'none';
        btn.classList.toggle('active', show);
    };

    // 点击子列表选项 → 选题 → 按钮缩短显示
    panel.onclick = (e) => {
        const item = e.target.closest('.pp-item');
        if (!item) return;
        e.stopPropagation();
        const grade = item.dataset.grade;
        const name = item.dataset.name;
        // 同步隐藏原生 select
        if (gradeSel) gradeSel.value = grade;
        if (puzzleSel) puzzleSel.value = name;
        // 关闭面板 + 按钮缩短
        panel.style.display = 'none';
        btn.classList.remove('active');
        ppUpdateButton(name, grade);
        // 执行选题
        if (typeof loadPuzzle === 'function') loadPuzzle(name);
    };

    // 点击外部关闭（只绑定一次）
    if (!__ppOutsideBound) {
        __ppOutsideBound = true;
        document.addEventListener('click', (e) => {
            if (!picker.contains(e.target) && panel.style.display === 'block') {
                panel.style.display = 'none';
                btn.classList.remove('active');
            }
        });
    }

    // 初始按钮文案
    ppUpdateButton();
}

/** 更新按钮显示：选完后缩短为 "D级03" 格式 */
function ppUpdateButton(puzzleName, grade) {
    const btn = document.getElementById('ppBtn');
    if (!btn) return;
    if (puzzleName && grade) {
        // puzzleName 形如 "D级03" → 直接用；或 D级03 Master_xxx → 取第一段
        const shortName = puzzleName.split(/\s+/)[0].replace(/^([ABCD])级/, '$1');
        btn.innerHTML = `<span class="pp-grade">${grade}</span><span class="pp-name">·${shortName.replace(grade, '')}</span>`;
        btn.classList.add('has-selection');
        btn.title = '当前题目：' + puzzleName + '（点击更换）';
    } else {
        btn.innerHTML = '📚 选题 ▾';
        btn.classList.remove('has-selection');
        btn.title = '点击选择题目';
    }
}

/** 供 restoreProgress / loadPuzzle 同步按钮显示 */
function ppSyncFromSelects() {
    const gs = document.getElementById('gradeSelector');
    const ps = document.getElementById('puzzleSelector');
    if (gs && ps && ps.value) ppUpdateButton(ps.value, gs.value);
}

/** 首屏空状态提示，引导用户先选题目 */
document.addEventListener('DOMContentLoaded', function () {
    const sel = document.getElementById('puzzleSelector');
    const badge = document.getElementById('modeBadge');
    if (badge && (!sel || !sel.value)) {
        badge.innerHTML = '👋 请先选择一个题目';
        badge.className = 'mode-badge';
    }
});


/* ==========================================================================
 * 步骤可视化层
 * --------------------------------------------------------------------------
 * 职责：
 *   1. 在盘面上用 SVG 绘制链路的箭头（强链实线红、弱链虚线蓝）、节点编号、
 *      鱼形结构的基准线/覆盖线，以及被排除候选数的标记；
 *   2. 弹出一个"技法知识 + 通用逻辑 + 背景 + 操作步骤 + 易错点"的卡片；
 *   3. 该卡片只能通过「确定」按钮关闭，关闭时立刻执行该步骤，
 *      让用户可以先把链路对照盘面看明白，再决定继续。
 * ========================================================================== */

const LEVEL_TEXT = { 1: '基础', 2: '中级', 3: '高级', 4: '专家', 5: '极限' };

/** 取某格中心相对容器的坐标 */
function getCellCenter(row, col) {
    const container = document.getElementById('sudokuContainer');
    const cell = document.getElementById('cell-' + row + '-' + col);
    if (!container || !cell) return null;
    const cr = container.getBoundingClientRect();
    const er = cell.getBoundingClientRect();
    return {
        x: er.left - cr.left + er.width / 2,
        y: er.top - cr.top + er.height / 2,
        w: er.width,
        h: er.height,
        left: er.left - cr.left,
        top: er.top - cr.top
    };
}

function svgEl(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
}

/** 清空覆盖层 */
function clearStepOverlay() {
    const svg = document.getElementById('stepOverlay');
    if (!svg) return;
    const children = Array.prototype.slice.call(svg.childNodes);
    children.forEach(node => {
        if (node.nodeName && node.nodeName.toLowerCase() === 'defs') return;
        svg.removeChild(node);
    });
}

/** 两点之间的连线（带箭头），并做端点内缩避免压住节点圆圈 */
function drawArrow(svg, from, to, type, fromR, toR) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    const ux = dx / len, uy = dy / len;
    const sx = from.x + ux * fromR;
    const sy = from.y + uy * fromR;
    const ex = to.x - ux * toR;
    const ey = to.y - uy * toR;

    const line = svgEl('line', {
        x1: sx, y1: sy, x2: ex, y2: ey,
        'class': type === 'strong' ? 'link-strong' : 'link-weak',
        'marker-end': type === 'strong' ? 'url(#arrowStrong)' : 'url(#arrowWeak)'
    });
    svg.appendChild(line);
}

/** 绘制一个候选数节点：圆圈 + 数字 + 序号徽标 */
function drawNode(svg, pos, digits, order, role) {
    const r = Math.max(11, Math.min(pos.w, pos.h) * 0.26);
    const cls = 'node-circle' + (role === 'start' ? ' is-start' : role === 'end' ? ' is-end' : '');
    svg.appendChild(svgEl('circle', { cx: pos.x, cy: pos.y, r: r, 'class': cls }));

    const txt = svgEl('text', {
        x: pos.x, y: pos.y,
        'class': 'node-text',
        'font-size': Math.max(11, r * 0.95)
    });
    txt.textContent = digits.join('/');
    svg.appendChild(txt);

    if (order) {
        const bx = pos.x + r * 0.86;
        const by = pos.y - r * 0.86;
        const bgCls = 'order-bg' + (role === 'start' ? ' is-start' : role === 'end' ? ' is-end' : '');
        svg.appendChild(svgEl('circle', { cx: bx, cy: by, r: 8.5, 'class': bgCls }));
        const num = svgEl('text', { x: bx, y: by, 'class': 'node-order', 'font-size': 10.5 });
        num.textContent = order;
        svg.appendChild(num);
    }
    return r;
}

/** 绘制被排除的候选数（橙圈 + 斜杠） */
function drawTarget(svg, pos) {
    const r = Math.max(10, Math.min(pos.w, pos.h) * 0.24);
    svg.appendChild(svgEl('circle', {
        cx: pos.x, cy: pos.y, r: r, 'class': 'target-circle'
    }));
    const d = r * 0.72;
    svg.appendChild(svgEl('line', {
        x1: pos.x - d, y1: pos.y - d, x2: pos.x + d, y2: pos.y + d, 'class': 'target-x'
    }));
}

/** 绘制填数目标的绿色框 */
function drawFillMarker(svg, pos) {
    const pad = 3;
    svg.appendChild(svgEl('rect', {
        x: pos.left + pad, y: pos.top + pad,
        width: pos.w - pad * 2, height: pos.h - pad * 2,
        rx: 6, 'class': 'fill-marker'
    }));
}

/** 主入口：按 step.graph 绘制整个覆盖层 */
function drawStepOverlay(step) {
    clearStepOverlay();
    const svg = document.getElementById('stepOverlay');
    if (!svg || !step || !step.graph) return;
    const g = step.graph;

    // ---- 教学模式：候选数标注，只把目标格圈出来 ----
    if (g.kind === 'annotate') {
        const pos = getCellCenter(step.row, step.col);
        if (pos) {
            svg.appendChild(svgEl('rect', {
                x: pos.left + 3, y: pos.top + 3,
                width: pos.w - 6, height: pos.h - 6,
                rx: 7, 'class': 'annotate-marker'
            }));
        }
        return;
    }

    // ---- 链类：逐步画箭头 ----
    if (g.kind === 'chain' && g.nodes && g.nodes.length) {
        const positions = g.nodes.map(n => getCellCenter(n.row, n.col));
        // 先画线，再画节点，保证节点压在线上层
        g.links.forEach(l => {
            const from = positions[l.from], to = positions[l.to];
            if (!from || !to) return;
            drawArrow(svg, from, to, l.type, 16, 17);
        });
        g.nodes.forEach((n, i) => {
            const pos = positions[i];
            if (!pos) return;
            let role = null;
            if (i === 0) role = 'start';
            else if (i === g.nodes.length - 1) role = 'end';
            drawNode(svg, pos, n.digits, n.order || (i + 1), role);
        });
        // 排除标记
        (step.eliminations || []).forEach(e => {
            const pos = getCellCenter(e.row, e.col);
            if (pos) drawTarget(svg, pos);
        });
        return;
    }

    // ---- 鱼形结构：基准线 + 覆盖线 + 四角/交叉点 ----
    if (g.kind === 'pattern' && g.shape === 'xwing' && g.corners) {
        const first = getCellCenter(g.corners[0].row, g.corners[0].col);
        if (!first) return;
        const bandW = first.w * 0.34;

        (g.baseLines || []).forEach(line => {
            if (line.type === 'row') {
                const a = getCellCenter(line.index, 0);
                const b = getCellCenter(line.index, 8);
                if (!a || !b) return;
                svg.appendChild(svgEl('rect', {
                    x: a.left, y: a.top + (a.h - a.h * 0.55) / 2,
                    width: b.left + b.w - a.left, height: a.h * 0.55,
                    rx: 5, 'class': 'band-base'
                }));
            } else {
                const a = getCellCenter(0, line.index);
                const b = getCellCenter(8, line.index);
                if (!a || !b) return;
                svg.appendChild(svgEl('rect', {
                    x: a.left + (a.w - a.w * 0.55) / 2, y: a.top,
                    width: a.w * 0.55, height: b.top + b.h - a.top,
                    rx: 5, 'class': 'band-base'
                }));
            }
        });
        (g.coverLines || []).forEach(line => {
            if (line.type === 'col') {
                const a = getCellCenter(0, line.index);
                const b = getCellCenter(8, line.index);
                if (!a || !b) return;
                svg.appendChild(svgEl('rect', {
                    x: a.left + (a.w - a.w * 0.55) / 2, y: a.top,
                    width: a.w * 0.55, height: b.top + b.h - a.top,
                    rx: 5, 'class': 'band-cover'
                }));
            } else {
                const a = getCellCenter(line.index, 0);
                const b = getCellCenter(line.index, 8);
                if (!a || !b) return;
                svg.appendChild(svgEl('rect', {
                    x: a.left, y: a.top + (a.h - a.h * 0.55) / 2,
                    width: b.left + b.w - a.left, height: a.h * 0.55,
                    rx: 5, 'class': 'band-cover'
                }));
            }
        });
        // 四角连线
        const corners = g.corners.map(c => getCellCenter(c.row, c.col));
        for (let i = 0; i < corners.length; i++) {
            const a = corners[i], b = corners[(i + 1) % corners.length];
            if (a && b) drawArrow(svg, a, b, 'weak', 14, 14);
        }
        corners.forEach((pos, i) => {
            if (pos) drawNode(svg, pos, [g.digit], i + 1, null);
        });
        (step.eliminations || []).forEach(e => {
            const pos = getCellCenter(e.row, e.col);
            if (pos) drawTarget(svg, pos);
        });
        return;
    }

    // ---- 填数类：绿色框标记 ----
    if (g.kind === 'fill') {
        const pos = getCellCenter(step.row, step.col);
        if (pos) drawFillMarker(svg, pos);
        return;
    }

    // ---- 其它排除类：目标格标记 + 结构格 ----
    (g.nodes || []).forEach(n => {
        const pos = getCellCenter(n.row, n.col);
        if (pos) drawNode(svg, pos, n.digits, null, null);
    });
    (g.targets || []).forEach(t => {
        const pos = getCellCenter(t.row, t.col);
        if (pos) drawTarget(svg, pos);
    });
    if (step.eliminations) {
        step.eliminations.forEach(e => {
            const pos = getCellCenter(e.row, e.col);
            if (pos) drawTarget(svg, pos);
        });
    }
}

/* ---------------- 知识卡片 HTML ---------------- */

function escHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 生成链路的文字化描述表（配合盘面箭头一起核对） */
function buildChainTable(graph) {
    if (!graph || graph.kind !== 'chain') return '';
    let html = '<table class="kv-chain-table"><thead><tr>';
    html += '<th>序号</th><th>格位置</th><th>候选数</th><th>到下一站</th></tr></thead><tbody>';

    graph.nodes.forEach((n, i) => {
        const link = graph.links[i];
        let next = '—（终点）';
        if (link) {
            const tag = link.type === 'strong'
                ? '<span class="kv-strong-tag">强链 实线</span>'
                : '<span class="kv-weak-tag">弱链 虚线</span>';
            next = '→ 第 ' + (i + 2) + ' 站 ' + tag;
        }
        let pos = '(' + (n.row + 1) + ',' + (n.col + 1) + ')';
        if (i === 0) pos += ' <b>起点</b>';
        if (i === graph.nodes.length - 1) pos += ' <b>终点</b>';
        html += '<tr><td>' + (i + 1) + '</td><td>' + pos + '</td><td>'
            + n.digits.join(' / ') + '</td><td>' + next + '</td></tr>';
    });
    html += '</tbody></table>';
    html += '<div class="kv-legend">🔴 红色实线箭头 = 强链（两端必有一真）　🔵 蓝色虚线箭头 = 弱链（两端至多一真）</div>';
    return html;
}

/** 生成排除结论说明 */
function buildElimText(step) {
    const g = step.graph || {};
    if (g.kind === 'chain') {
        const s = g.start, e = g.end;
        return '链路首尾 (<b>' + (s.row + 1) + ',' + (s.col + 1) + '</b>) 与 (<b>'
            + (e.row + 1) + ',' + (e.col + 1) + '</b>) 都是数字 <b>' + g.digit
            + '</b> 的强链端点，二者<b>至少有一端为真</b>；因此同时看得见这两格的位置上，数字 '
            + g.digit + ' 不可能成立，可以排除。';
    }
    if (g.kind === 'pattern' && g.shape === 'xwing') {
        return '两行（或两列）中数字 <b>' + g.digit + '</b> 只出现在相同的两行两列上，'
            + '四个角必然呈对角占位，因此这两列（行）在其它位置的 ' + g.digit + ' 可以排除。';
    }
    if (g.kind === 'fill') {
        return '该格只剩数字 <b>' + step.value + '</b> 可填，直接确定为 '
            + step.value + '。';
    }
    if (g.kind === 'annotate') {
        return '为 <b>(' + (step.row + 1) + ',' + (step.col + 1) + ')</b> 写上候选数 <b>'
            + (step.candidates || []).join('、')
            + '</b>：把同行、同列、同宫已经出现的数字全部划掉，剩下的就是它的候选数。'
            + '这一步只是做草稿，不填数字、也不删候选。';
    }
    const n = (step.eliminations || []).length;
    return '根据该方法的结构关系，可排除 <b>' + n + '</b> 个候选数（盘面上以橙色斜杠标出）。';
}

/** 在给定盘面上判断 (row,col) 能否填 n；不能则返回挡住它的格子及所在单元 */
function findBlocker(board, row, col, n) {
    for (let c2 = 0; c2 < 9; c2++) {
        if (c2 !== col && board[row][c2] === n) return { unit: '行', r: row, c: c2 };
    }
    for (let r2 = 0; r2 < 9; r2++) {
        if (r2 !== row && board[r2][col] === n) return { unit: '列', r: r2, c: col };
    }
    const br = Math.floor(row / 3) * 3, bc = Math.floor(col / 3) * 3;
    for (let r2 = br; r2 < br + 3; r2++) {
        for (let c2 = bc; c2 < bc + 3; c2++) {
            if ((r2 !== row || c2 !== col) && board[r2][c2] === n) {
                return { unit: '宫', r: r2, c: c2 };
            }
        }
    }
    return null;
}

/** 生成 1~9 的逐数字判定表：每个数字能否填、不能填是被哪个格子挡住 */
function buildCandidateTable(step, board) {
    let html = '<table class="kv-derive-table"><thead><tr>'
        + '<th>数字</th><th>能否填入</th><th>依据</th></tr></thead><tbody>';
    for (let n = 1; n <= 9; n++) {
        const b = findBlocker(board, step.row, step.col, n);
        const note = b
            ? '同一' + b.unit + '的 (' + (b.r + 1) + ',' + (b.c + 1) + ') 已经是 ' + n + '，则此处不能再填 ' + n
            : '同行、同列、同宫都还没出现 ' + n;
        html += '<tr>'
            + '<td><b>' + n + '</b></td>'
            + '<td class="' + (b ? 'dg-no' : 'dg-yes') + '">' + (b ? '✗ 排除' : '✓ 可填') + '</td>'
            + '<td>' + note + '</td></tr>';
    }
    html += '</tbody></table>';
    return html;
}

/** 生成 9×9 盘面定位图：标出目标格、同行/列/宫、关键格与被排除格 */
function buildMiniGrid(step, board) {
    if (!board) return '';
    const g = step.graph || {};
    const nodes = new Set();
    if (g.nodes) g.nodes.forEach(n => nodes.add(n.row + ',' + n.col));
    const elim = new Set();
    (step.eliminations || []).forEach(e => elim.add(e.row + ',' + e.col));

    const hasTarget = typeof step.row === 'number' && typeof step.col === 'number';
    const peers = new Set();
    if (hasTarget) {
        for (let i = 0; i < 9; i++) {
            peers.add(step.row + ',' + i);
            peers.add(i + ',' + step.col);
        }
        const br = Math.floor(step.row / 3) * 3, bc = Math.floor(step.col / 3) * 3;
        for (let r = br; r < br + 3; r++) {
            for (let c = bc; c < bc + 3; c++) peers.add(r + ',' + c);
        }
    }

    let html = '<div class="dg-grid">';
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const key = r + ',' + c;
            const isTarget = hasTarget && r === step.row && c === step.col;
            let cls = 'dg-cell';
            if (peers.has(key) && !isTarget) cls += ' dg-peer';
            if (nodes.has(key)) cls += ' dg-node';
            if (elim.has(key)) cls += ' dg-elim';
            if (isTarget) cls += ' dg-target';
            if (c === 2 || c === 5) cls += ' dg-rborder';
            if (r === 2 || r === 5) cls += ' dg-bborder';

            let txt = board[r][c] ? board[r][c] : '';
            if (isTarget && step.value) txt = '<b>' + step.value + '</b>';
            html += '<div class="' + cls + '">' + txt + '</div>';
        }
    }
    html += '</div>';
    html += '<div class="dg-legend">'
        + '<span><i class="dg-swatch dg-target"></i>目标格</span>'
        + '<span><i class="dg-swatch dg-peer"></i>同行/同列/同宫</span>'
        + '<span><i class="dg-swatch dg-node"></i>关键格</span>'
        + '<span><i class="dg-swatch dg-elim"></i>被排除格</span>'
        + '</div>';
    return html;
}

/**
 * 本步推导过程：把"这一步是怎么推出来的"写清楚。
 * 优先用落子前保存的盘面快照（step.__board）复算，保证事后查看时依据依然成立。
 */
function buildDerivationHtml(step) {
    const board = step.__board;
    let html = '';

    if (step.value && board) {
        let excluded = 0;
        for (let n = 1; n <= 9; n++) {
            if (n !== step.value && findBlocker(board, step.row, step.col, n)) excluded++;
        }
        html += '<div class="kv-section"><span class="kv-label kv-derive">本步推导过程（逐步）</span>';
        if (step.explanation) {
            html += '<div class="kv-text kv-preline">' + escHtml(step.explanation) + '</div>';
        }
        html += '<ol class="kv-list">';
        html += '<li>锁定目标格：第 <b>' + (step.row + 1) + '</b> 行、第 <b>' + (step.col + 1)
            + '</b> 列 → <b>(' + (step.row + 1) + ',' + (step.col + 1) + ')</b>。</li>';
        html += '<li>逐个检查数字 1~9，凡是在同行、同列或同宫已经出现过的，都不能填进这一格：</li>';
        html += '</ol>';
        html += buildCandidateTable(step, board);
        html += '<div class="kv-text">9 个数字里有 <b>' + excluded
            + '</b> 个被同单元已出现的数字排除，只剩下 <b>' + step.value + '</b> 可以填入。</div>';
        html += '<div class="kv-text">结论：<b>(' + (step.row + 1) + ',' + (step.col + 1) + ') = '
            + step.value + '</b>。</div>';
        html += '</div>';
        html += '<div class="kv-section"><span class="kv-label kv-derive">盘面定位图</span>'
            + buildMiniGrid(step, board) + '</div>';
        return html;
    }

    if (step.eliminations && step.eliminations.length) {
        html += '<div class="kv-section"><span class="kv-label kv-derive">本步推导过程（逐步）</span>';
        if (step.explanation) {
            html += '<div class="kv-text kv-preline">' + escHtml(step.explanation) + '</div>';
        }
        html += '<ol class="kv-list"><li>按 <b>' + escHtml(step.technique)
            + '</b> 的判定条件在盘面上找出满足结构的一组格子（定位图中蓝色格）。</li>';
        html += '<li>这些格子之间的位置关系成立后，下列候选数在逻辑上不可能成立，遂予排除：</li></ol>';
        html += '<table class="kv-derive-table"><thead><tr>'
            + '<th>序号</th><th>位置</th><th>排除数字</th><th>依据</th></tr></thead><tbody>';
        step.eliminations.forEach((e, i) => {
            html += '<tr><td>' + (i + 1) + '</td><td>(' + (e.row + 1) + ',' + (e.col + 1)
                + ')</td><td><b>' + e.num + '</b></td><td>' + escHtml(step.technique)
                + ' 结构成立 → 此处不可能取 ' + e.num + '</td></tr>';
        });
        html += '</tbody></table></div>';
        html += '<div class="kv-section"><span class="kv-label kv-derive">盘面定位图</span>'
            + buildMiniGrid(step, board) + '</div>';
        return html;
    }

    const cands = step.candidates || [];
    if (cands.length || step.teachKind === 'candidates') {
        html += '<div class="kv-section"><span class="kv-label kv-derive">本步推导过程（逐步）</span>';
        if (step.explanation) {
            html += '<div class="kv-text kv-preline">' + escHtml(step.explanation) + '</div>';
        }
        html += '<ol class="kv-list">';
        html += '<li>目标格：<b>(' + (step.row + 1) + ',' + (step.col + 1) + ')</b>。</li>';
        html += '<li>把同行、同列、同宫已经出现的数字全部划掉，剩下的就是它的候选数：<b>'
            + cands.join('、') + '</b>。</li>';
        html += '<li>把这 ' + cands.length + ' 个数字写进该格作为草稿（本步不填数字、也不删候选）。</li>';
        html += '</ol></div>';
        html += '<div class="kv-section"><span class="kv-label kv-derive">盘面定位图</span>'
            + buildMiniGrid(step, board) + '</div>';
    }
    return html;
}

/** 构建完整弹窗内容 */
function buildStepVizHtml(step) {
    const k = step.knowledge || getTechniqueKnowledge(step.technique) || null;
    const g = step.graph || {};
    let html = '';

    // 结论
    html += '<div class="kv-section">';
    html += '<span class="kv-label">本步结论</span>';
    html += '<div class="kv-elim">' + buildElimText(step) + '</div>';
    html += '</div>';

    // 本步结论之后：详细推导过程 + 生成的判定表 / 盘面定位图
    html += buildDerivationHtml(step);

    // 链路明细
    if (g.kind === 'chain') {
        html += '<div class="kv-section">';
        html += '<span class="kv-label kv-chain">链路明细（对照盘面箭头）</span>';
        html += buildChainTable(g);
        html += '</div>';
    }

    if (k) {
        html += '<div class="kv-section"><span class="kv-label kv-idea">核心思想</span>'
            + '<div class="kv-text">' + escHtml(k.idea) + '</div></div>';

        html += '<div class="kv-section"><span class="kv-label kv-logic">通用推理逻辑</span>'
            + '<div class="kv-text">' + escHtml(k.logic) + '</div></div>';

        html += '<div class="kv-section"><span class="kv-label kv-bg">背景知识</span>'
            + '<div class="kv-text">' + escHtml(k.background) + '</div></div>';

        if (k.steps && k.steps.length) {
            html += '<div class="kv-section"><span class="kv-label kv-steps">操作步骤</span><ol class="kv-list">';
            k.steps.forEach(st => { html += '<li>' + escHtml(st) + '</li>'; });
            html += '</ol></div>';
        }

        if (k.pitfall) {
            html += '<div class="kv-section"><span class="kv-label kv-pitfall">易错点</span>'
                + '<div class="kv-text">' + escHtml(k.pitfall) + '</div></div>';
        }
    } else {
        html += '<div class="kv-section"><div class="kv-text">'
            + escHtml(step.explanation || '该步骤暂无详细说明。') + '</div></div>';
    }

    // 深入学习入口：命中详解库时给出可点击链接
    var __learn = getTechniqueLearning(step.technique);
    if (__learn) {
        html += '<div class=\"kv-section\"><span class=\"kv-label\" style=\"background:#2c3e50\">深入学习</span>'
            + '<button type=\"button\" class=\"kv-learn-link\" data-learn-key=\"'
            + escHtml(__learn.__key) + '\">'
            + '📖 查看「' + escHtml(__learn.name) + '」完整教程（形态识别 · 推理证明 · 完整示例 · 易错点）'
            + '<span class=\"kv-learn-arrow\">›</span></button></div>';
    }

    return html;
}

/**
 * 教学模式：按需查看历史某一步的完整推导过程。
 * 推导内容（结论 / 链路明细 / 通用推理逻辑 / 操作步骤 / 易错点 / 深入学习）
 * 由 buildStepVizHtml 生成，此处只负责在用户点击时打开，并同步盘面箭头。
 */
function showStepDerivation(idx) {
    const step = currentSteps[idx];
    if (!step) return;
    drawStepOverlay(step);
    showStepVizDialog(step);
}

/* ---------------- 弹窗控制 ---------------- */

let __pendingStep = null;
let __vizResolve = null;

function closeStepVizDialog() {
    const dlg = document.getElementById('stepVizDialog');
    if (dlg) dlg.style.display = 'none';
    clearStepOverlay();
}

/**
 * 展示可视化 + 知识卡片，返回 Promise。
 * 只有点击「确定」才会 resolve，从而保证用户先看完链路再继续。
 */
function showStepVizDialog(step) {
    return new Promise(resolve => {
        const dlg = document.getElementById('stepVizDialog');
        const title = document.getElementById('stepVizTitle');
        const levelEl = document.getElementById('stepVizLevel');
        const body = document.getElementById('stepVizBody');
        const ok = document.getElementById('stepVizOk');
        if (!dlg || !body) { resolve(); return; }

        // 若上一次弹窗的 Promise 尚未结算（例如按需查看推导时连续点开多步），
        // 先结算它，避免留下永远 pending 的 Promise。
        if (__vizResolve) {
            const prevResolve = __vizResolve;
            __vizResolve = null;
            prevResolve();
        }
        __pendingStep = step;
        __vizResolve = resolve;

        const g = step.graph || {};
        const isChain = g.kind === 'chain';
        if (title) {
            title.textContent = (isChain ? '🔗 ' : '💡 ') + (step.technique || '提示');
        }
        const lv = step.level || (step.knowledge && step.knowledge.level) || 0;
        if (levelEl) {
            levelEl.textContent = lv ? ('难度 ' + (LEVEL_TEXT[lv] || '') + ' · 等级 ' + lv) : '';
        }
        body.innerHTML = buildStepVizHtml(step);
        body.scrollTop = 0;
        dlg.style.display = 'flex';

        if (ok && !ok.__bound) {
            ok.__bound = true;
            ok.addEventListener('click', () => {
                const s = __pendingStep;
                const r = __vizResolve;
                __pendingStep = null;
                __vizResolve = null;
                closeStepVizDialog();
                if (r) r(s);
            });
        }
    });
}


/* ==================== 技法详解学习面板 ==================== */

/** 渲染单个技法的完整教程 */
function buildLearningHtml(item, currentKey) {
    if (!item) return '<div class=\"lw-hero\">暂无可用的技法详解。</div>';
    var html = '';

    html += '<div class=\"lw-hero\">' + escHtml(item.oneLiner || '') + '</div>';

    if (item.howToFind && item.howToFind.length) {
        html += '<div class=\"lw-block\"><div class=\"lw-block-title\">一、怎么在盘面上找到它</div>'
            + '<ol class=\"lw-steps\">';
        item.howToFind.forEach(function (s) { html += '<li>' + escHtml(s) + '</li>'; });
        html += '</ol></div>';
    }

    if (item.reasoning && item.reasoning.length) {
        html += '<div class=\"lw-block\"><div class=\"lw-block-title\">二、推理为什么成立（逐步证明）</div>'
            + '<ol class=\"lw-steps lw-proof\">';
        item.reasoning.forEach(function (s) { html += '<li>' + escHtml(s) + '</li>'; });
        html += '</ol></div>';
    }

    if (item.example) {
        html += '<div class=\"lw-block\"><div class=\"lw-block-title\">三、完整实例（带行列坐标）</div>'
            + '<div class=\"lw-example\">' + escHtml(item.example) + '</div></div>';
    }

    if (item.mistakes && item.mistakes.length) {
        html += '<div class=\"lw-block\"><div class=\"lw-block-title\">四、常见误判</div>'
            + '<ul class=\"lw-warn\">';
        item.mistakes.forEach(function (s) { html += '<li>' + escHtml(s) + '</li>'; });
        html += '</ul></div>';
    }

    if (item.related && item.related.length) {
        var chips = '';
        item.related.forEach(function (name) {
            var k = resolveLearningKey(name);
            if (!k) return;
            var cls = (k === currentKey) ? 'lw-chip is-current' : 'lw-chip';
            chips += '<button type=\"button\" class=\"' + cls + '\" data-learn-key=\"'
                + escHtml(k) + '\">' + escHtml(name) + '</button>';
        });
        if (chips) {
            html += '<div class=\"lw-block\"><div class=\"lw-block-title\">五、关联技法（点击切换）</div>'
                + '<div class=\"lw-chips\">' + chips + '</div></div>';
        }
    }

    if (item.practiceTip) {
        html += '<div class=\"lw-block\"><div class=\"lw-block-title\">六、练习建议</div>'
            + '<div class=\"lw-tip\">' + escHtml(item.practiceTip) + '</div></div>';
    }

    return html;
}

/** 打开某技法的详解页 */
function openTechniqueLearning(techniqueOrKey) {
    var item = getTechniqueLearning(techniqueOrKey);
    var dlg = document.getElementById('techLearnDialog');
    var body = document.getElementById('techLearnBody');
    var title = document.getElementById('techLearnTitle');
    var levelEl = document.getElementById('techLearnLevel');
    if (!dlg || !body) return;

    if (!item) {
        if (title) title.textContent = '技法详解';
        if (levelEl) levelEl.textContent = '';
        body.innerHTML = buildLearningHtml(null, null);
        dlg.style.display = 'flex';
        return;
    }

    if (title) title.textContent = '📖 ' + item.name;
    if (levelEl) {
        var lv = item.level || 0;
        levelEl.textContent = (lv ? ('难度 ' + (LEVEL_TEXT[lv] || '') + ' · ') : '')
            + (item.category || '');
    }
    body.innerHTML = buildLearningHtml(item, item.__key);
    body.scrollTop = 0;
    dlg.style.display = 'flex';
}

/** 关闭技法详解 */
function closeTechniqueLearning() {
    var dlg = document.getElementById('techLearnDialog');
    if (dlg) dlg.style.display = 'none';
}

/** 技法手册总览 */
function openTechniqueManual() {
    var keys = Object.keys(TECHNIQUE_LEARNING);
    var total = keys.length;
    var html = '<div class=\"lw-hero\">这里收录本项目求解器支持的<b>全部 ' + total + ' 种解法教程</b>，从最基础的唯一候选数法到极限难度的 ALS-XZ 与交替推理链。'
        + '每篇包含：怎么在盘面上认出它、推理为什么成立、带坐标的完整实例、常见误判、关联技法与练习建议。</div>';

    var grid = '';
    keys.slice().sort(function (a, b) {
        return (TECHNIQUE_LEARNING[a].level || 9) - (TECHNIQUE_LEARNING[b].level || 9);
    }).forEach(function (k) {
        var it = TECHNIQUE_LEARNING[k];
        grid += '<button type=\"button\" class=\"lw-manual-item\" data-learn-key=\"' + escHtml(k) + '\">'
            + '<span class=\"lw-manual-name\">' + escHtml(it.name || k) + '</span>'
            + '<span class=\"lw-manual-cat\">难度 ' + (LEVEL_TEXT[it.level] || '') + ' · '
            + escHtml(it.category || '') + '</span></button>';
    });

    html += '<div class=\"lw-block\"><div class=\"lw-block-title\">全部技法（共 '
        + keys.length + ' 项）</div><div class=\"lw-manual-grid\">' + grid + '</div></div>';

    var dlg = document.getElementById('techLearnDialog');
    var body = document.getElementById('techLearnBody');
    var title = document.getElementById('techLearnTitle');
    var levelEl = document.getElementById('techLearnLevel');
    if (!dlg || !body) return;
    if (title) title.textContent = '📚 技法手册';
    if (levelEl) levelEl.textContent = keys.length + ' 项高级解法';
    body.innerHTML = html;
    body.scrollTop = 0;
    dlg.style.display = 'flex';
}

/** 绑定学习面板事件（事件委托，兼容动态节点） */
function bindTechniqueLearning() {
    document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.closest) return;

        if (t.closest('#techLearnClose') || t.closest('#techLearnBack')) {
            closeTechniqueLearning();
            return;
        }

        var keyEl = t.closest('[data-learn-key]');
        if (keyEl && keyEl.getAttribute('data-learn-key')) {
            e.preventDefault();
            e.stopPropagation();
            openTechniqueLearning(keyEl.getAttribute('data-learn-key'));
        }
    });

    var dlg = document.getElementById('techLearnDialog');
    if (dlg) {
        dlg.addEventListener('click', function (e) {
            if (e.target === dlg) closeTechniqueLearning();
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
            var d = document.getElementById('techLearnDialog');
            if (d && d.style.display !== 'none') closeTechniqueLearning();
        }
    });
}


/* ==================== 教学模式（按真实做题顺序） ==================== */

/**
 * 进入教学模式：
 * 界面与教学模式一致，区别在推进逻辑 —— 教学引擎严格按
 *   ① 数字 1→9 逐格摒除（横/竖/宫排）
 *   ② 已写候选数的格子里找唯一候选
 *   ③ 给空格补全候选数
 *   ④ 数对/区块 → 鱼形/翼形 → 唯一矩形/链
 * 的顺序推进，每一步只做一件事。
 */
function enterTeachingMode() {
    // 先进入教学模式的界面与状态，再叠加"按真实做题顺序"的推进方式
    enterExampleMode();
    setTeachingMode(true);
    if (typeof updateBoardDisplay === 'function') updateBoardDisplay();
    if (typeof renderAllCandidates === 'function') renderAllCandidates();
    const badge = document.getElementById('modeBadge');
    if (badge) badge.innerHTML = '🎓 教学模式' + (badge.innerHTML.indexOf('·') >= 0
        ? badge.innerHTML.slice(badge.innerHTML.indexOf('·'))
        : '');
    showTemporaryMessage('🎓 教学模式：先从最简单的摒除法开始，逐步升级到高级技法', 'info');
}

/** 标注完成后给该格一个短促的视觉提示 */
function flashAnnotatedCell(row, col) {
    const box = document.getElementById('cell-container-' + row + '-' + col);
    if (!box) return;
    box.classList.add('annotate-flash');
    setTimeout(function () { box.classList.remove('annotate-flash'); }, 900);
}
