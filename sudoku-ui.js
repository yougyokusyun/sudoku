/**
 * 数独解题器 - UI交互逻辑
 * 依赖：sudoku-core.js（核心解题）、puzzles.js（题库）
 */

// ==================== 错误计数变量 ====================
let errorCount = 0;

// 更新错误次数显示
function updateErrorCountDisplay() {
    const errorBadge = document.getElementById('errorCountBadge');
    if (errorBadge) {
        // 教学模式下盘面由引擎按逻辑推进，不存在"填错"这回事，不显示错误次数
        if (isExampleMode) {
            errorBadge.style.display = 'none';
            return;
        }
        errorBadge.style.display = '';
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

// 增加错误次数（msg 可自定义提示；教学模式下不计数，盘面由引擎按逻辑推进）
function addError(msg) {
    if (isExampleMode) return;
    errorCount++;
    updateErrorCountDisplay();
    showTemporaryMessage(msg || `操作不符合数独规则，错误次数 +1 (共 ${errorCount} 次)`, 'error');
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
        content: '当前没有任何格子可以通过数独规则唯一确定数字。建议：\n1. 点击"补全候选数"查看候选数\n2. 尝试使用更高级的技巧\n3. 或按自己的判断填写（只要不违反基本规则）'
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
// 合并面板里当前"展开查看详细说明"的步骤下标；-1 表示跟随最新一步
let viewingStepIdx = -1;

const FLASH_DURATION = 800;
const FLASH_REPEAT = 3;
const TOTAL_FLASH_TIME = FLASH_DURATION * FLASH_REPEAT;

// ==================== 模式变量 ====================
let isExampleMode = false;
let practiceEditMode = false;        // 练习模式：是否编辑候选数（false=数字输入模式，true=编辑候选数模式）
let exampleEditMode = false;         // 教学模式：是否编辑候选数
let isWatchMode = false;             // 讲解模式：自动逐步推进并朗读讲解
let watchTimer = null;               // 讲解模式的定时器句柄

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
    // 教学模式下每个候选数按"绿/黄"分层着色（见 renderCellCandidates），
    // 不再用"整格写全=黄 / 只写一部分=绿"这种整格统一着色。
    if (isExampleMode && typeof teachingMode !== 'undefined' && teachingMode) return;

    let set;
    if (shown) set = shown;
    else if (isExampleMode) set = cellCandidates[row][col];
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
    
    // 每格每个候选的着色：绿色=部分候选（有简单依据），黄色=全部候选（完整可能数）
    let greenSet = null, yellowSet = null;
    let candidatesSource;
    if (isExampleMode) {
        // 教学模式：候选数由学员一步步"写"上去，绿色/黄色分层显示；
        // 未进入教学模式时仍显示系统推算的完整候选数。
        if (typeof teachingMode !== 'undefined' && teachingMode
            && typeof greenCand !== 'undefined' && greenCand && yellowCand) {
            candidatesSource = getTeachVisibleCandidates(row, col);
            // 这一格只有两种状态：
            //   候选已写全（等于该格真实存在的全部候选）→ 全部黄色
            //   只写了一部分（学员逐个手工添加 / 绿色层推演出的部分候选）→ 全部绿色
            const fullSet = getSystemCandidatesForCell(row, col);
            const cellComplete = candidatesSource.size > 0 && fullSet.size > 0
                && candidatesSource.size >= fullSet.size;
            if (cellComplete) {
                greenSet = null;
                yellowSet = candidatesSource;
            } else {
                greenSet = candidatesSource;
                yellowSet = null;
            }
        } else {
            candidatesSource = cellCandidates[row][col];
        }
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
        if (greenSet || yellowSet) {
            // 绿色优先：同时存在于两层时按绿色显示
            if (greenSet && greenSet.has(num)) span.classList.add('cand-green');
            else span.classList.add('cand-yellow');
        }
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

/**
 * 单一步骤的完整说明 HTML。
 * 合并面板里"当前步骤"展开用它；侧栏折叠浮层也复用它。
 */
function buildStepDetailHtml(step, stepNum) {
    if (!step) {
        return '<div class="step-explanation">✨ 点击"下一步"开始智能解题</div>';
    }
    let elimHtml = '';
    if (step.eliminations && step.eliminations.length > 0) {
        elimHtml = `<div class="step-elim-box">
            <strong>🗑️ 排除:</strong> ${step.eliminations.map(e => `(${e.row + 1},${e.col + 1}):${e.num}`).join(', ')}
        </div>`;
    }
    const valHtml = step.value ? `<br>✨ 填入 (<strong>${step.row + 1},${step.col + 1}</strong>) = <strong>${step.value}</strong>` : '';
    // 外层 .step-head 已经显示「步骤 N + 技法」，这里不再重复一遍标题
    return `<div class="step-explanation">
        ${step.explanation || ''}${valHtml}
    </div>${elimHtml}`;
}

/** 历史步骤的一行摘要文字 */
function buildStepSummaryText(step) {
    if (step.value) {
        return `填入 (${step.row + 1},${step.col + 1}) = ${step.value}`;
    }
    if (step.teachKind === 'candidates') {
        const cnt = (step.cells && step.cells.length) || 1;
        return `标注候选数（${cnt} 格）`;
    }
    return `排除 ${(step.eliminations && step.eliminations.length) || 0} 个候选数`;
}

/**
 * 解题过程 + 步骤历史 已合并为同一个列表：
 * 默认"当前步骤"（最新一步）展开显示完整说明，更早的步骤只显示一行摘要；
 * 直接点击某一步即可把它的详细信息展开出来查看（不回退盘面），
 * 每一步也都带「💡 查看本步提示」按钮，点开看该步的完整推导与盘面链路。
 */
function updateStepsListDisplay() {
    const listDiv = document.getElementById('steps-list');
    if (!listDiv) return;
    listDiv.innerHTML = '';
    if (currentSteps.length === 0) {
        listDiv.innerHTML = '<div class="step-item step-empty">✨ 点击"下一步"开始智能解题</div>';
        return;
    }
    // 展开项：用户点过的那一步；未点过或下标失效时跟随最新一步
    const expandedIdx = (viewingStepIdx >= 0 && viewingStepIdx < currentSteps.length)
        ? viewingStepIdx
        : currentSteps.length - 1;
    // 倒序显示：最新一步在最上方
    for (let idx = currentSteps.length - 1; idx >= 0; idx--) {
        const step = currentSteps[idx];
        const isExpanded = (idx === expandedIdx);
        const item = document.createElement('div');
        item.className = isExpanded ? 'step-item current-step' : 'step-item history-step';
        const head = '<div class="step-head"><span class="step-no">步骤 ' + (idx + 1) +
            '</span><span class="step-tech">' + step.technique + '</span></div>';
        item.innerHTML = isExpanded
            ? head + buildStepDetailHtml(step, idx + 1)
            : head + '<div class="step-brief">' + buildStepSummaryText(step) + '</div>';

        // 点击整行：展开这一步的详细信息（纯查看，不改变解题进度）
        item.onclick = () => {
            if (viewingStepIdx === idx) return;
            viewingStepIdx = idx;
            updateStepsListDisplay();
        };

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

/** 从剪贴板读取题目 → 解析 → 填入输入框（由用户确认后更新盘面）；返回是否成功 */
async function loadClipboardIntoImportDialog() {
    const textarea = document.getElementById('customPuzzleInput');
    const errorDiv = document.getElementById('customPuzzleError');
    let text = '';
    try {
        text = await navigator.clipboard.readText();
    } catch (e) {
        showCustomError('无法读取剪贴板（浏览器未授权），请手动 Ctrl+V 粘贴到输入框');
        return false;
    }
    if (!text || !text.trim()) {
        showCustomError('剪贴板为空，请手动粘贴题目数据');
        return false;
    }
    const grid = parsePuzzleText(text);
    if (!grid) {
        showCustomError('剪贴板内容无法识别为 9×9 数独（支持 JSON / 单行 81 数字 / 9 行格式）');
        return false;
    }
    if (textarea) textarea.value = grid.map(row => row.join('')).join(',');
    if (errorDiv) errorDiv.style.display = 'none';
    return true;
}

/** 打开「导入题目」弹窗：自动尝试读取剪贴板并解析填入输入框，用户确认后更新盘面 */
async function openImportPuzzleDialog() {
    const dialog = document.getElementById('customPuzzleDialog');
    const textarea = document.getElementById('customPuzzleInput');
    const errorDiv = document.getElementById('customPuzzleError');
    if (textarea) textarea.value = '';
    if (errorDiv) errorDiv.style.display = 'none';
    dialog.style.display = 'flex';
    await loadClipboardIntoImportDialog();
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

    // 先归一化占位符：. - _ * · 都按空格（0）处理，再提取数字
    const normalized = text.replace(/[.\-_*·]/g, '0');
    const digitsOnly = normalized.replace(/[^0-9]/g, '');
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
            const rowDigits = lines[i].replace(/[.\-_*·]/g, '0').replace(/[^0-9]/g, '');
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

/**
 * 这一步是否"看不见"：只删掉了盘面上根本没画出来的候选数。
 * 这类步骤既没填数、也没改动任何已显示的候选标注，
 * 只是把后台标准候选数收窄了，不该占用一步。
 */
function isInvisibleElimination(step) {
    if (!step || step.value) return false;
    if (step.teachKind === 'candidates') return false;
    if (!step.eliminations || !step.eliminations.length) return false;
    return !step.eliminations.some(function (e) {
        const visible = getTeachVisibleCandidates(e.row, e.col);
        return visible.has(e.num);
    });
}

/**
 * 判断这一步删完候选后，是否会直接把某格变成唯一候选数。
 * 条件：该格原本恰好只有 2 个候选，且这 2 个就是它的全部候选（不是残缺标注）。
 * 必须在 applyStep 之前调用（删完候选就取不到原值了）。
 * @returns {null|{row:number,col:number,value:number,removed:number}}
 */
function findTwoCandidateFill(step) {
    if (!step || !step.eliminations || !step.eliminations.length) return null;
    for (const elim of step.eliminations) {
        const row = elim.row, col = elim.col, num = elim.num;
        if (currentBoard[row][col] !== 0) continue;
        const full = getSystemCandidatesForCell(row, col);   // 删除前的全部候选
        if (full.size !== 2 || !full.has(num)) continue;
        const rest = Array.from(full).filter(n => n !== num);
        if (rest.length !== 1) continue;
        return { row: row, col: col, value: rest[0], removed: num };
    }
    return null;
}

/**
 * 2 选 1 的格子被删掉一个候选后，把剩下的唯一候选直接填上，并单独记一步。
 * 教学/观影模式下由 nextStep 的删候选分支调用。
 */
function applyTwoCandidateFill(info) {
    const text = '(' + (info.row + 1) + ',' + (info.col + 1) + ') 原本只有 ' +
        info.removed + ' 和 ' + info.value + ' 两个候选，上一步删掉了 ' + info.removed +
        '，这一格就只剩唯一的可能 ' + info.value + '，可以直接填入。';
    const step = {
        row: info.row,
        col: info.col,
        value: info.value,
        technique: '唯一候选数法',
        eliminations: [],
        knowledge: getTechniqueKnowledge('唯一候选数法'),
        explanation: text,
        __board: currentBoard.map(row => row.slice())
    };
    saveToHistory();
    applyStep(step);
    stepCount++;
    currentSteps.push(step);
    updateBoardDisplay();
    updateStepsListDisplay();
    highlightNewNumber(info.row, info.col);
    checkPuzzleCompletion();
}

// ==================== 下一步核心 ====================

async function nextStep() {
    if (nextStepInProgress) {
        showTemporaryMessage('正在处理中...', 'warning');
        return;
    }
    nextStepInProgress = true;
    viewingStepIdx = -1;   // 推进一步后重新跟随最新步骤
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
            let step = findNextStep();

            // 只收窄后台标准候选数、盘面上看不到任何变化的一步：静默应用后继续往下找，
            // 直到找到真正有可见变化的一步（填数 / 写出候选 / 划掉已显示的候选）
            if (isExampleMode) {
                const absorbed = new Set();
                let guard = 0;
                while (step && guard++ < 60 && isInvisibleElimination(step)) {
                    const sig = step.technique + '|' + step.eliminations
                        .map(e => e.row + ',' + e.col + ',' + e.num).sort().join(';');
                    if (absorbed.has(sig)) break;   // 引擎又给出同一步：不再吞，按普通步骤展示
                    absorbed.add(sig);
                    applyStep(step);
                    step = findNextStep();
                }
            }

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

            // 教学模式：候选数标注步骤 —— 把候选数写进格子并显示出来（支持一次标一批）
            if (step.teachKind === 'candidates') {
                applyStep(step);
                stepCount++;
                currentSteps.push(step);
                updateBoardDisplay();
                const marked = (step.cells && step.cells.length)
                    ? step.cells
                    : [{ row: step.row, col: step.col }];
                marked.forEach(cell => renderCellCandidates(cell.row, cell.col));
                marked.forEach(cell => flashAnnotatedCell(cell.row, cell.col));
                updateStepsListDisplay();
                restoreBtn();
                return;
            }

            if (step.value) {
                applyStep(step);
                stepCount++;
                currentSteps.push(step);
                updateBoardDisplay();
                updateStepsListDisplay();
                highlightNewNumber(step.row, step.col);
                checkPuzzleCompletion();
                restoreBtn();
                return;
            }

            if (step.eliminations && step.eliminations.length > 0) {
                // 删候选前先判断：这一步是否会把某个"2 选 1"的格子删成唯一候选数
                const autoFill = isExampleMode ? findTwoCandidateFill(step) : null;
                applyStep(step);
                flashCandidatesBatch(step.eliminations, () => {
                    stepCount++;
                    currentSteps.push(step);
                    updateStepsListDisplay();
                    checkPuzzleCompletion();
                    if (!autoFill) { restoreBtn(); return; }
                    // 候选数闪动过程中已经看清删掉了谁，这一步就水落石出：
                    // 2 选 1 被删掉一个后只剩唯一解，直接填上，不再等用户点"下一步"
                    applyTwoCandidateFill(autoFill);
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
    
    initCandidates();
    const manualHint = document.getElementById('manualEditHint');
    if (manualHint) manualHint.remove();
    
    showTemporaryMessage('已进入教学模式，可以使用"下一步"智能解题', 'info');
}

function exitExampleMode() {
    if (!isExampleMode) return;
    stopWatchMode(true);          // 退出教学模式时停止观影循环
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
    
    // 计时器：教学模式停过，回到练习模式时继续计时
    if (typeof startTimer === 'function' && !isTimerRunning && !isPuzzleCompleted) startTimer();

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

/**
 * 教学模式下手工添加/删除单个候选数。
 * 手工添加的候选进入"绿色层"（表示这一格还没写全）；
 * 当这一格的候选等于该格真实存在的全部候选时，渲染时自动整格转为黄色。
 */
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

    const green = greenCand[row][col];
    const yellow = yellowCand[row][col];
    const visible = getTeachVisibleCandidates(row, col);

    if (visible.has(num)) {
        green.delete(num);
        yellow.delete(num);
        cellCandidates[row][col].delete(num);
        showTemporaryMessage(`已删除候选数 ${num}`, 'info');
    } else {
        if (isValidMove(row, col, num)) {
            green.add(num);
            cellCandidates[row][col].add(num);
            showTemporaryMessage(`已添加候选数 ${num}（绿色：尚未写全，写全后转黄色）`, 'info');
        } else {
            showTemporaryMessage(`数字 ${num} 违反数独规则，不能添加`, 'warning');
            return;
        }
    }

    // 同步"绿 + 黄"并集视图
    if (typeof teachShown !== 'undefined' && teachShown) {
        teachShown[row][col].clear();
        green.forEach(n => teachShown[row][col].add(n));
        yellow.forEach(n => teachShown[row][col].add(n));
    }

    renderCellCandidates(row, col);
}

// ==================== 导入题目弹窗 ====================

function initCustomDialogEvents() {
    const dialog = document.getElementById('customPuzzleDialog');
    const closeBtn = document.getElementById('customDialogClose');
    const cancelBtn = document.getElementById('cancelCustomBtn');
    const confirmBtn = document.getElementById('confirmCustomBtn');
    const loadExampleBtn = document.getElementById('loadExampleBtn');
    const pasteClipboardBtn = document.getElementById('pasteClipboardBtn');
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

    pasteClipboardBtn?.addEventListener('click', () => { loadClipboardIntoImportDialog(); });
    
    confirmBtn?.addEventListener('click', () => {
        const inputValue = textarea?.value.trim();
        if (!inputValue) { showCustomError('请输入或粘贴题目数据'); return; }
        
        // 统一用 parsePuzzleText 解析：兼容 JSON / 单行 81 数字 / 9 行 / 逗号分隔
        const grid = parsePuzzleText(inputValue);
        if (!grid) { showCustomError('无法解析为 9×9 数独，请检查格式（支持 JSON / 单行 81 数字 / 9 行格式）'); return; }
        
        const validationError = validatePuzzle(grid);
        if (validationError) { showCustomError(validationError); return; }
        
        loadCustomPuzzle(grid);
        closeDialog();
        showTemporaryMessage('📥 题目导入成功', 'success');
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
    // 导入的是"练习用题目"，若当前正处于教学 / 观影模式，先退出
    if (typeof isExampleMode !== 'undefined' && isExampleMode && typeof exitExampleMode === 'function') {
        exitExampleMode();
    }
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
    resetTimer();
    startTimer();
    resetErrorCount();
    
    const modeBadge = document.getElementById('modeBadge');
    if (modeBadge) {
        modeBadge.innerHTML = '✏️ 练习模式';
        modeBadge.classList.remove('manual-mode');
        modeBadge.classList.add('practice-mode');
    }
    
    const selector = document.getElementById('puzzleSelector');
    if (selector) selector.value = '';
    const gradeSel = document.getElementById('gradeSelector');
    if (gradeSel) gradeSel.value = '';

    updateModeBadge();
    saveProgress();
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
            if (action === 'importPuzzle') { openImportPuzzleDialog(); dropdownMenu.classList.remove('show'); }
            else if (action === 'teaching') { enterTeachingMode(); dropdownMenu.classList.remove('show'); }
            else if (action === 'watch') { toggleWatchMode(); dropdownMenu.classList.remove('show'); }
            else if (action === 'practice') { exitExampleMode(); dropdownMenu.classList.remove('show'); }
            else if (action === 'fillCandidates') { fillCandidates(); dropdownMenu.classList.remove('show'); }
            else if (action === 'theme') { if (typeof __applyTheme === 'function') __applyTheme(!document.body.classList.contains('dark-mode')); dropdownMenu.classList.remove('show'); }
            else if (action === 'fullscreen') { toggleFullscreen(); dropdownMenu.classList.remove('show'); }
            else if (action === 'nextHint') { showNextHint(); dropdownMenu.classList.remove('show'); }
            else if (action === 'techManual') { openTechniqueManual(); dropdownMenu.classList.remove('show'); }
            else if (action === 'exportPuzzle') { exportCurrentPuzzle(); dropdownMenu.classList.remove('show'); }
        });
    }
    
    // 全屏状态变化（含 Esc / F11 退出）时同步菜单文案，并重新适配棋盘尺寸
    const onFullscreenChange = () => {
        if (typeof syncMenuLabels === 'function') syncMenuLabels();
        if (typeof fitBoardSize === 'function') setTimeout(fitBoardSize, 150);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    bindTechniqueLearning();

    document.getElementById('nextStepBtn')?.addEventListener('click', nextStep);
    // 独立"编辑候选数"按钮（练习模式显示，教学模式隐藏）
    document.getElementById('editCandBtn')?.addEventListener('click', toggleEditMode);
    // 讲解模式的语音开关
    document.getElementById('voiceToggleBtn')?.addEventListener('click', () => {
        toggleNarration();
    });
    // 语音列表是异步加载的，加载完触发一次按钮状态刷新
    if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => updateNarrationButton();
    }
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
    
    updateModeBadge();
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
    // 用容器的实际内容区宽度，而不是窗口宽度：
    // 窗口宽度里还含 body 的内边距，直接相减会高估，导致棋盘超宽被挤出屏幕左侧
    const vw = wrap.clientWidth - padX * 2;
    const vh = window.innerHeight;

    // 头部占高（含下边距）
    const hdrH = hdr.offsetHeight + (parseFloat(getComputedStyle(hdr).marginBottom) || 0);
    // 横屏手机高度紧张：收紧固定留白，把高度尽量让给棋盘
    const tightH = window.matchMedia('(min-aspect-ratio: 1/1) and (max-height: 620px)').matches;
    let availH = vh - hdrH - padY - (tightH ? 10 : 30);
    let availW = vw;

    // 横排时侧栏在右侧，占水平空间（间距取实际列间距，不能写死）
    if (getComputedStyle(gameArea).flexDirection === 'row' &&
        sidebar && getComputedStyle(sidebar).display !== 'none') {
        const gap = parseFloat(getComputedStyle(gameArea).columnGap) || 0;
        availW -= (sidebar.offsetWidth + gap);
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
    const applyCell = (c) => document.documentElement.style.setProperty('--cell-size', c + 'px');
    applyCell(cell);

    // 上面的公式依赖对窗口高度的估算（手机地址栏、visualViewport 与布局视口不一致会让它偏大），
    // 也依赖对侧栏/键盘占宽的估算（会偏大），所以最后按"实测"校准一次：
    // 只量棋盘与数字键盘，越界多少就收多少、余多少就放大多少。
    // 侧栏自带滚动条，不参与这里，免得反过来把棋盘压小。
    const padRight = parseFloat(wrapStyle.paddingRight) || 0;
    const padBottom = parseFloat(wrapStyle.paddingBottom) || 0;
    const overshoot = () => {
        const els = [document.querySelector('.sudoku-container'), pad].filter(
            (el) => el && getComputedStyle(el).display !== 'none' && el.offsetHeight > 0);
        if (!els.length) return 0;
        const wr = wrap.getBoundingClientRect();
        const cBottom = wr.bottom - padBottom, cRight = wr.right - padRight;
        let over = -1e9;
        els.forEach((el) => {
            const r = el.getBoundingClientRect();
            over = Math.max(over, r.bottom - cBottom, r.right - cRight);
        });
        return over;
    };

    // 1) 估大了（会裁掉棋盘）：按实测越界量直接收回来
    const over0 = overshoot();
    if (over0 > 0) {
        cell = Math.max(26, cell - Math.ceil(over0 / 9) - 1);
        applyCell(cell);
    } else if (-over0 > 2) {
        // 2) 估小了（白白浪费空间）：把富余的宽/高（取较小者）用起来，一格 9 等分
        const grown = Math.min(120, cell + Math.floor((-over0 - 2) / 9));
        if (grown > cell) {
            applyCell(grown);
            const over2 = overshoot();
            cell = over2 > 0 ? Math.max(26, grown - Math.ceil(over2 / 9) - 1) : grown;
            applyCell(cell);
        }
    }

    // 3) 最后再兜一道：仍有越界就逐格递减，保证任何机型都不会把棋盘挤出屏幕
    for (let i = 0; i < 24 && cell > 26 && overshoot() > 0; i++) {
        cell -= 1;
        applyCell(cell);
    }

    // 4) 终极兜底：整行（侧栏 + 棋盘 + 键盘）横向溢出时继续收棋盘，
    //    直到游戏的横向滚动量为 0（下限定在 20px，避免棋盘小到看不见）
    for (let i = 0; i < 16; i++) {
        if (gameArea.scrollWidth <= gameArea.clientWidth + 1) break;
        if (cell <= 20) break;
        cell = Math.max(20, cell - 1);
        applyCell(cell);
    }
}

let __fitBoardTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(__fitBoardTimer);
    __fitBoardTimer = setTimeout(fitBoardSize, 120);
});
// 手机地址栏收起/展开只改变可见高度，不一定触发 window.resize
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        clearTimeout(__fitBoardTimer);
        __fitBoardTimer = setTimeout(fitBoardSize, 120);
    });
}

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

function updateModeBadge() {
    if (isExampleMode) return;

    const modeBadge = document.getElementById('modeBadge');
    if (!modeBadge) return;

    // 顺带展示题目的技巧等级，让难度标签有据可依
    const sel = document.getElementById('puzzleSelector');
    const puzzle = sel ? PUZZLE_LIBRARY.find(p => p.name === sel.value) : null;
    const gName = puzzle && (puzzle.grade || (/^A/.test(puzzle.name) ? 'A' : (/^C/.test(puzzle.name) ? 'C' : 'B')));
    const lvText = puzzle
        ? (' · ' + (gName ? gName + ' 级' : '') + (puzzle.level ? ' 技巧等级 ' + puzzle.level : ''))
        : '';

    modeBadge.innerHTML = '✏️ 练习模式';
    modeBadge.classList.remove('manual-mode');
    modeBadge.classList.add('practice-mode');
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
        // 练习模式：弹出确认框，让用户选择重新答题或结束
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

    let html = '<div style="text-align:center;padding:8px 0;">';
    html += '<div style="font-size:15px;font-weight:600;color:#2e7d32;margin-bottom:8px;">🎉 恭喜解题成功！</div>';
    html += '<div style="font-size:13px;color:#555;">用时 <b>' + formatTime(timerSeconds) + '</b></div>';
    html += '<div style="font-size:13px;color:#444;margin-top:12px;">是否重新答题？</div>';
    html += '</div>';
    body.innerHTML = html;
    dlg.style.display = 'flex';
}

function hideCompletionDialog() {
    const dlg = document.getElementById('completionDialog');
    if (dlg) dlg.style.display = 'none';
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
    stopWatchMode(true);   // 手动回退时停止自动播放，避免互相打架
    historyIdx--;
    currentBoard = cloneBoardUI(historyBoards[historyIdx]);
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) originalBoard[i][j] = historyBoards[0][i][j];
    }
    initCandidates();
    if (!isExampleMode) initUserCandidates();
    resetTeachProgress();   // 回退后作业过程重新从"第一遍 1—9"开始

    const targetCount = (historyStepCounts[historyIdx] !== undefined)
        ? historyStepCounts[historyIdx]
        : currentSteps.length;
    currentSteps = currentSteps.slice(0, targetCount);
    stepCount = currentSteps.length;
    updateStepsListDisplay();

    __completionWarned = false;
    const isFull = currentBoard.every(r => r.every(c => c !== 0));
    if (!isFull && isPuzzleCompleted) {
        isPuzzleCompleted = false;
        startTimer();
    }

    __derivableCacheKey = null;
    updateBoardDisplay();
    updateModeBadge();
    saveProgress();
    showTemporaryMessage('已回退到上一步', 'info');
}

/** 重做：redoIdx++ 恢复后续历史 */
function redo() {
    if (historyIdx >= historyBoards.length - 1) {
        showTemporaryMessage('没有可重做的操作', 'warning');
        return;
    }
    stopWatchMode(true);
    historyIdx++;
    currentBoard = cloneBoardUI(historyBoards[historyIdx]);
    initCandidates();
    if (!isExampleMode) initUserCandidates();
    resetTeachProgress();   // 重做后作业过程同样重新开始

    const targetCount = historyStepCounts[historyIdx] !== undefined
        ? historyStepCounts[historyIdx] : currentSteps.length;
    currentSteps = currentSteps.slice(0, targetCount);
    stepCount = currentSteps.length;
    updateStepsListDisplay();

    __derivableCacheKey = null;
    updateBoardDisplay();
    updateModeBadge();
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
    updateModeBadge();
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
    const notDerivable = !info;
    let countedError = false;

    saveToHistory();
    currentBoard[row][col] = num;

    if (!isExampleMode) {
        // 练习模式：同步 userCandidates（用户视图）+ 重建 cellCandidates（引擎内部状态）
        refreshPracticeCandidates(row, col, num);
        initCandidates();

        // 练习模式专属：只对"当前盘面推导不出来"的数字记错。
        // （用户自己的候选数记号不算依据：练习模式默认不标候选数，
        //   若按"自己没标"记错，会把每次正确填入都算成错误。）
        // 教学模式下不计数（盘面由引擎推进，不存在填错）。
        if (notDerivable) {
            countedError = true;
            addError('⚠️ ' + num + ' 在当前盘面推导不出来（跳步），错误次数 +1，共 ' + (errorCount + 1) + ' 次');
        }
    } else {
        recalcAfterPlacement(row, col, num);
        clearDeleteRecord();
    }

    __derivableCacheKey = null;
    updateBoardDisplay();
    checkPuzzleCompletion();
    updateModeBadge();
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

    if (countedError) {
        // addError 已经给出错误提示，此处不再覆盖
    } else if (info) {
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
    stopWatchMode(true);   // 换题时停止自动播放

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

    resetTimer();
    startTimer();
    resetErrorCount();

    // 完整重置所有模式开关
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

    updateModeBadge();
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
            // 教学模式下数字键盘默认不可用；但开启"编辑候选数"后允许逐个增删候选
            if (isExampleMode && !window.isManualEditMode && !exampleEditMode) {
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

    updateModeBadge();
    showTemporaryMessage('已恢复上次未完成的进度', 'info');
}

/* ==================== 通用：对话框可拖动 + 可调整长宽 ==================== */

/**
 * 根据当前模式控制侧栏面板显隐。
 * 教学模式：显示合并后的「教学面板」（解题过程 + 步骤历史同在一个列表里）
 * 练习模式：隐藏整条侧栏（教学专属）
 */
function updateSidebarPanels() {
    const showTeachPanels = !!isExampleMode;
    const sidebar = document.getElementById('explanationSidebar');
    if (sidebar) {
        sidebar.classList.toggle('teach-mode', showTeachPanels);
        // 练习模式整条侧栏不占位，把 360px 宽度让给棋盘与数字键盘
        sidebar.style.display = showTeachPanels ? '' : 'none';
    }
    // 面板显隐完全交给 CSS（.explanation-sidebar.teach-mode 控制），
    // 这里只清掉可能残留的行内样式，避免覆盖 CSS 的 flex 布局导致滚动失效
    const clearInline = (el) => {
        if (!el) return;
        el.style.display = '';
        el.style.height = '';
        el.style.overflow = '';
    };
    clearInline(document.querySelector('.explanation-panel'));
    const quickInfo = document.getElementById('sidebarQuickInfo');
    if (quickInfo) quickInfo.style.display = showTeachPanels ? '' : 'none';
}

/**
 * 同步"更多操作"菜单项文案 + 教学模式时隐藏候选数相关菜单项。
 * 教学模式（isExampleMode）下用户不需要候选数管理（教学引擎自己管理 teachShown），
 * 所以隐藏 cand-only 标记的菜单项避免误导。
 */
function syncMenuLabels() {
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

    // 显隐规则：cand-only 在教学模式隐藏（练习模式显示补全候选数）
    const isTeach = !!isExampleMode;
    document.querySelectorAll('.cand-only').forEach(el => el.style.display = isTeach ? 'none' : '');

    // 错误次数徽章：只有自主做题（练习模式）才可能出现错误，教学模式隐藏
    updateErrorCountDisplay();

    // 计时器：教学 / 讲解模式按步骤推进，不靠用户解题速度，隐藏
    const timerWrap = document.querySelector('.timer-display');
    if (timerWrap) timerWrap.style.display = isTeach ? 'none' : '';

    // 讲解模式菜单项文案
    const watchItem = document.querySelector('[data-action="watch"]');
    if (watchItem) {
        watchItem.textContent = isWatchMode ? '⏹️ 停止讲解' : '🔊 讲解模式';
    }

    // 全屏菜单项文案
    const fsItem = document.getElementById('fullscreenMenuItem');
    if (fsItem) {
        fsItem.textContent = (document.fullscreenElement || document.webkitFullscreenElement)
            ? '⛶ 退出全屏' : '⛶ 全屏';
    }
}

/** 切换全屏（整页进入/退出；不支持时给出提示） */
function toggleFullscreen() {
    const doc = document;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
        if (exit) {
            const p = exit.call(doc);
            if (p && p.catch) p.catch(() => { /* 忽略 */ });
        }
        return;
    }
    const el = doc.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) {
        showTemporaryMessage('当前浏览器不支持全屏（iPhone 上请用"添加到主屏幕"）', 'warning');
        return;
    }
    const p = req.call(el);
    if (p && p.catch) p.catch(() => showTemporaryMessage('浏览器拒绝了全屏请求', 'warning'));
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
        '.hint-dialog-header, .tech-learn-header, .custom-dialog-header, .step-viz-header'
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
        // 限制在视口内，保证标题栏始终能抓得到（不会拖丢）
        const w = contentEl.offsetWidth, h = contentEl.offsetHeight;
        const minVisible = 80;
        let left = dragState.origLeft + dx;
        let top = dragState.origTop + dy;
        left = Math.min(Math.max(left, minVisible - w), window.innerWidth - minVisible);
        top = Math.min(Math.max(top, 0), window.innerHeight - 40);
        contentEl.style.left = left + 'px';
        contentEl.style.top = top + 'px';
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
        // 侧栏宽度变化会改变棋盘可用宽度：等折叠/展开动画结束再重新适配一次
        if (typeof fitBoardSize === 'function') setTimeout(fitBoardSize, 300);
    }
    const savedSB = (() => {
        try { return JSON.parse(localStorage.getItem(SB_KEY) || 'null'); } catch (e) { return null; }
    })();
    applySidebarState(savedSB || { collapsed: false, width: 360 });
    if (sidebarToggle) sidebarToggle.addEventListener('click', () => {
        const w = sidebar.style.width ? parseInt(sidebar.style.width) : 360;
        applySidebarState({ collapsed: !sidebar.classList.contains('collapsed'), width: w });
    });

    // 折叠条上的"上一步原因"快捷按钮：弹出浮层显示当前步骤的详细说明
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
        const lastStep = currentSteps.length ? currentSteps[currentSteps.length - 1] : null;
        const html = buildStepDetailHtml(lastStep, currentSteps.length);
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
    // 逐个点名位置和数字，不再只说"可排除 N 个"
    const list = step.eliminations.map(function (e) {
        return '(' + (e.row + 1) + ',' + (e.col + 1) + ') 的 <b>' + e.num + '</b>';
    }).join('、');
    // 橙色斜杠由 drawStepOverlay 在打开弹窗时画在盘面上，这里如实说明
    return '按「<b>' + escHtml(step.technique) + '</b>」的结构，可排除 <b>' + n + '</b> 个候选数：'
        + list + '（盘面上以橙色斜杠标出）。';
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

/**
 * 从盘面快照推算某格当时的候选数。
 * 查看历史步骤时用它复算"删除前该格有哪些候选"，作为可核对的依据。
 */
function candidatesFromBoard(board, row, col) {
    if (!board || board[row][col] !== 0) return null;
    const list = [];
    for (let n = 1; n <= 9; n++) {
        if (!findBlocker(board, row, col, n)) list.push(n);
    }
    return list;
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
    // 图例只列出盘面上真正出现过的标记，避免出现"图里没有却写着有这个颜色"
    let legend = '';
    if (hasTarget) legend += '<span><i class="dg-swatch dg-target"></i>目标格</span>';
    if (hasTarget) legend += '<span><i class="dg-swatch dg-peer"></i>同行/同列/同宫</span>';
    if (nodes.size) legend += '<span><i class="dg-swatch dg-node"></i>关键格</span>';
    if (elim.size) legend += '<span><i class="dg-swatch dg-elim"></i>被排除格</span>';
    html += '<div class="dg-legend">' + legend + '</div>';
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
        html += '<ol class="kv-list">';
        // 只有真的记录了结构格，才能说"定位图中蓝色格"
        const __nodes = (step.graph && step.graph.nodes) || [];
        html += '<li>按 <b>' + escHtml(step.technique)
            + '</b> 的判定条件在盘面上找出满足结构的一组格子'
            + (__nodes.length ? '（定位图中蓝色格，共 ' + __nodes.length + ' 个）' : '') + '。</li>';
        html += '<li>这些格子之间的位置关系成立后，下列候选数在逻辑上不可能成立，遂予排除：</li></ol>';
        html += '<table class="kv-derive-table"><thead><tr>'
            + '<th>序号</th><th>位置</th><th>排除数字</th><th>依据（该格删除前后的候选数）</th></tr></thead><tbody>';
        step.eliminations.forEach((e, i) => {
            const before = candidatesFromBoard(board, e.row, e.col);
            let why;
            if (before && before.indexOf(e.num) >= 0) {
                const after = before.filter(n => n !== e.num);
                why = '删除前该格候选为 {' + before.join('、') + '}，排除 ' + e.num
                    + ' 后剩 {' + (after.length ? after.join('、') : '空') + '}'
                    + (before.length === 2 ? ' —— 只剩唯一解 ' + after[0] : '');
            } else {
                why = escHtml(step.technique) + ' 的结构成立 → 此处不可能取 ' + e.num;
            }
            html += '<tr><td>' + (i + 1) + '</td><td>(' + (e.row + 1) + ',' + (e.col + 1)
                + ')</td><td><b>' + e.num + '</b></td><td>' + why + '</td></tr>';
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

/* ==================== 技法示意图渲染（纯 SVG） ==================== */

// 图中各类高亮格的颜色与图例文字
const FIG_ROLES = {
    p: { fill: '#fdeacf', stroke: '#e67e22', label: '枢纽格' },
    d: { fill: '#d9f2e0', stroke: '#27ae60', label: '确定填入' },
    s: { fill: '#e7e1f9', stroke: '#7d5fc4', label: '强链端点' },
    g: { fill: '#dbeafb', stroke: '#2f80c9', label: '翼 / 结构格' },
    w: { fill: '#e4eef1', stroke: '#7f9aa3', label: '弱链端点' },
    f: { fill: '#fdf1cf', stroke: '#c99a0a', label: '鳍（多余格）' },
    e: { fill: '#fbd9d4', stroke: '#c0392b', label: '可排除（划掉即删）' },
    r: { fill: '#d3efec', stroke: '#199a8e', label: '空矩形的候选臂' },
    z: { fill: '#f4f7fa', stroke: '#b6c6d6', label: '空交点（该数字无候选）' },
    x: { fill: '#f0f3f7', stroke: '#c9d6e2', label: '已填数字' },
    n: { fill: '#ffffff', stroke: 'none', label: '' }
};
// 连线类型的图例（与 figLinkPath 保持一致）
const FIG_LINKS = [
    { type: 's', color: '#7d5fc4', dash: false, label: '强链（两者必有一真）' },
    { type: 'w', color: '#9aabbb', dash: true, label: '弱链（不可能同时为真）' },
    { type: 'a', color: '#2f80c9', dash: true, label: '互相可见（同行/列/宫）' },
    { type: 'c', color: '#e67e22', dash: true, label: '结论链（跨单元推出：至少一端为真）' }
];
const FIG_OX = 28, FIG_OY = 28, FIG_S = 36, FIG_BOARD = 9 * FIG_S;

/** 单格底色 + 描边 */
function figCellRect(r, c, role) {
    const X = FIG_OX + c * FIG_S, Y = FIG_OY + r * FIG_S;
    const st = FIG_ROLES[role];
    let out = '<rect x="' + X + '" y="' + Y + '" width="' + FIG_S + '" height="' + FIG_S
        + '" fill="' + ((st && role !== 'n' ? st.fill : '#ffffff')) + '"/>';
    if (st && role !== 'n') {
        out += '<rect x="' + (X + 1.2) + '" y="' + (Y + 1.2) + '" width="' + (FIG_S - 2.4) + '" height="' + (FIG_S - 2.4)
            + '" rx="2.5" fill="none" stroke="' + st.stroke + '" stroke-width="2.4"/>';
    }
    return out;
}

/** 单格里的候选数字；多候选按 1~9 的九宫位置摆放，被删的候选画上删除线 */
function figCellDigits(r, c, cands, role, strike) {
    const X = FIG_OX + c * FIG_S, Y = FIG_OY + r * FIG_S;
    const list = (cands || []).slice().sort(function (a, b) { return a - b; });
    if (!list.length) return '';   // 空交点（如空矩形）只靠底色区分，不画数字
    const fixed = (role === 'x');
    let out = '';
    if (list.length === 1) {
        const killed = (role === 'e');
        out += '<text x="' + (X + 18) + '" y="' + (Y + 25) + '" text-anchor="middle" font-size="22" font-weight="700" fill="'
            + (killed ? '#c0392b' : (fixed ? '#8fa3b8' : '#2c3e50')) + '">' + list[0] + '</text>';
        if (killed) {
            out += '<line x1="' + (X + 7) + '" y1="' + (Y + 18.5) + '" x2="' + (X + 29) + '" y2="' + (Y + 18.5)
                + '" stroke="#c0392b" stroke-width="2.2"/>';
        }
        return out;
    }
    list.forEach(function (d) {
        const dc = (d - 1) % 3, dr = Math.floor((d - 1) / 3);
        const tx = X + dc * 12 + 6, ty = Y + dr * 12 + 10;
        const k = (strike && strike.indexOf(d) !== -1);
        out += '<text x="' + tx + '" y="' + ty + '" text-anchor="middle" font-size="10.5" font-weight="'
            + (k ? '700' : '500') + '" fill="' + (k ? '#c0392b' : '#41627f') + '">' + d + '</text>';
        if (k) {
            out += '<line x1="' + (tx - 4.5) + '" y1="' + (ty - 3.4) + '" x2="' + (tx + 4.5) + '" y2="' + (ty - 3.4)
                + '" stroke="#c0392b" stroke-width="1.5"/>';
        }
    });
    return out;
}

/** 两格之间的连线：s 强链（紫实线） w 弱链（灰虚线） a 互相可见（蓝箭头） */
function figLinkPath(a, b, type) {
    const r1 = a[0] - 1, c1 = a[1] - 1, r2 = b[0] - 1, c2 = b[1] - 1;
    const x1 = FIG_OX + c1 * FIG_S + 18, y1 = FIG_OY + r1 * FIG_S + 18;
    const x2 = FIG_OX + c2 * FIG_S + 18, y2 = FIG_OY + r2 * FIG_S + 18;

    if (type === 'a') {
        return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2
            + '" stroke="#2f80c9" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#figArrow)"/>';
    }
    const strong = (type === 's');
    const conc = (type === 'c');
    const color = strong ? '#7d5fc4' : (conc ? '#e67e22' : '#9aabbb');
    const dash = strong ? '' : ' stroke-dasharray="5 4"';
    const w = strong ? 2.4 : (conc ? 2 : 1.8);
    if (r1 === r2) {
        const yb = FIG_OY + (r1 + 1) * FIG_S - 4;
        return '<path d="M ' + x1 + ' ' + y1 + ' L ' + x1 + ' ' + yb + ' L ' + x2 + ' ' + yb + ' L ' + x2 + ' ' + y2
            + '" fill="none" stroke="' + color + '" stroke-width="' + w + '"' + dash + ' stroke-linejoin="round"/>';
    }
    if (c1 === c2) {
        const xb = FIG_OX + (c1 + 1) * FIG_S - 4;
        return '<path d="M ' + x1 + ' ' + y1 + ' L ' + xb + ' ' + y1 + ' L ' + xb + ' ' + y2 + ' L ' + x2 + ' ' + y2
            + '" fill="none" stroke="' + color + '" stroke-width="' + w + '"' + dash + ' stroke-linejoin="round"/>';
    }
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2
        + '" stroke="' + color + '" stroke-width="' + w + '"' + dash + '/>';
}

/** 渲染一张技法示意图（含坐标、图例、图注） */
function buildTechFigureHtml(fig) {
    if (!fig || !fig.cells || !fig.cells.length) return '';
    let bg = '', rects = '', paths = '', texts = '';
    let r, c, i;

    for (r = 0; r < 9; r++) {
        for (c = 0; c < 9; c++) {
            bg += '<rect x="' + (FIG_OX + c * FIG_S) + '" y="' + (FIG_OY + r * FIG_S) + '" width="' + FIG_S
                + '" height="' + FIG_S + '" fill="#ffffff"/>';
        }
    }
    for (i = 1; i < 9; i++) {
        const thick = (i % 3 === 0);
        const col = thick ? '#8ea6bd' : '#e6edf4';
        const w = thick ? 2.2 : 1;
        bg += '<line x1="' + (FIG_OX + i * FIG_S) + '" y1="' + FIG_OY + '" x2="' + (FIG_OX + i * FIG_S)
            + '" y2="' + (FIG_OY + FIG_BOARD) + '" stroke="' + col + '" stroke-width="' + w + '"/>';
        bg += '<line x1="' + FIG_OX + '" y1="' + (FIG_OY + i * FIG_S) + '" x2="' + (FIG_OX + FIG_BOARD)
            + '" y2="' + (FIG_OY + i * FIG_S) + '" stroke="' + col + '" stroke-width="' + w + '"/>';
    }
    bg += '<rect x="' + FIG_OX + '" y="' + FIG_OY + '" width="' + FIG_BOARD + '" height="' + FIG_BOARD
        + '" fill="none" stroke="#5a7595" stroke-width="2.6"/>';
    for (i = 0; i < 9; i++) {
        bg += '<text x="' + (FIG_OX - 12) + '" y="' + (FIG_OY + i * FIG_S + 22)
            + '" text-anchor="middle" font-size="11" fill="#94a7ba">' + (i + 1) + '</text>';
        bg += '<text x="' + (FIG_OX + i * FIG_S + 18) + '" y="' + (FIG_OY - 10)
            + '" text-anchor="middle" font-size="11" fill="#94a7ba">' + (i + 1) + '</text>';
    }

    const roles = {};
    fig.cells.forEach(function (cell) {
        const rr = cell[0] - 1, cc = cell[1] - 1;
        const cands = cell[2] || [], role = cell[3] || 'g', strike = cell[4] || [];
        roles[role] = true;
        rects += figCellRect(rr, cc, role);
        texts += figCellDigits(rr, cc, cands, role, strike);
    });
    (fig.links || []).forEach(function (lk) {
        paths += figLinkPath(lk[0], lk[1], lk[2] || 's');
    });

    let legend = '';
    ['p', 'd', 's', 'g', 'w', 'f', 'e', 'r', 'z', 'x'].forEach(function (k) {
        if (!roles[k]) return;
        const L = FIG_ROLES[k];
        if (!L || !L.label) return;
        legend += '<span class="tech-fig-key"><i style="background:' + L.fill + ';border-color:' + L.stroke
            + '"></i>' + escHtml(L.label) + '</span>';
    });

    // 用到的连线类型也要在图例里说明，否则用户看不懂紫色/灰色/橙色的含义
    const usedLinkTypes = {};
    (fig.links || []).forEach(function (lk) { usedLinkTypes[lk[2] || 's'] = true; });
    let linkLegend = '';
    FIG_LINKS.forEach(function (L) {
        if (!usedLinkTypes[L.type]) return;
        linkLegend += '<span class="tech-fig-key"><i class="tech-fig-line" style="background:' + L.color
            + (L.dash ? ';background-image:repeating-linear-gradient(90deg,' + L.color + ' 0 4px,transparent 4px 7px)' : '')
            + '"></i>' + escHtml(L.label) + '</span>';
    });

    const svg = '<svg class="tech-fig-svg" viewBox="0 0 364 364" xmlns="http://www.w3.org/2000/svg" role="img">'
        + '<defs><marker id="figArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        + '<path d="M 0 0 L 10 5 L 0 10 z" fill="#2f80c9"/></marker></defs>'
        + bg + rects + paths + texts + '</svg>';

    return '<figure class="tech-fig">'
        + (fig.t ? '<div class="tech-fig-title">' + escHtml(fig.t) + '</div>' : '')
        + '<div class="tech-fig-canvas">' + svg + '</div>'
        + (legend ? '<div class="tech-fig-legend">' + legend + '</div>' : '')
        + (linkLegend ? '<div class="tech-fig-legend tech-fig-legend-lines">' + linkLegend + '</div>' : '')
        + (fig.cap ? '<figcaption class="tech-fig-cap">' + escHtml(fig.cap) + '</figcaption>' : '')
        + '</figure>';
}

/** 渲染「分支推演」卡片 */
function buildTechBranchesHtml(b) {
    if (!b || !b.cases || !b.cases.length) return '';
    const cards = b.cases.map(function (cs) {
        let li = '';
        (cs.steps || []).forEach(function (s) { li += '<li>' + escHtml(s) + '</li>'; });
        return '<div class="tech-branch-card">'
            + '<div class="tech-branch-head">' + escHtml(cs.label || '')
            + (cs.tag ? '<span class="tech-branch-tag">' + escHtml(cs.tag) + '</span>' : '') + '</div>'
            + (li ? '<ul class="tech-branch-steps">' + li + '</ul>' : '')
            + '</div>';
    }).join('');
    return (b.t ? '<div class="tech-branch-lead">' + escHtml(b.t) + '</div>' : '')
        + '<div class="tech-branch-wrap">' + cards + '</div>'
        + (b.note ? '<div class="tech-branch-note">' + escHtml(b.note) + '</div>' : '');
}

/** 渲染单个技法的完整教程（图文结合） */
function buildLearningHtml(item, currentKey) {
    if (!item) return '<div class="lw-hero">暂无可用的技法详解。</div>';
    const CN = ['一', '二', '三', '四', '五', '六', '七', '八'];
    let sec = 0;
    const title = function (name) {
        const s = CN[sec] || ('#' + (sec + 1));
        sec++;
        return s + '、' + name;
    };
    const key = item.__key || currentKey;
    const figs = (typeof TECHNIQUE_DIAGRAMS !== 'undefined' && key && TECHNIQUE_DIAGRAMS[key]) || [];

    let html = '<div class="lw-hero">' + escHtml(item.oneLiner || '') + '</div>';

    // 结构示意：放在最前面，先看图再看文字
    if (figs[0]) {
        html += '<div class="lw-block"><div class="lw-block-title">🔍 结构示意（横纵坐标对应正文的「第 r 行第 c 列」）</div>'
            + buildTechFigureHtml(figs[0]) + '</div>';
    }

    if (item.howToFind && item.howToFind.length) {
        html += '<div class="lw-block"><div class="lw-block-title">' + title('怎么在盘面上找到它') + '</div><ol class="lw-steps">';
        item.howToFind.forEach(function (s) { html += '<li>' + escHtml(s) + '</li>'; });
        html += '</ol></div>';
    }

    if (item.reasoning && item.reasoning.length) {
        html += '<div class="lw-block"><div class="lw-block-title">' + title('推理为什么成立（逐步证明）') + '</div><ol class="lw-steps lw-proof">';
        item.reasoning.forEach(function (s) { html += '<li>' + escHtml(s) + '</li>'; });
        html += '</ol></div>';
    }

    if (item.branches) {
        html += '<div class="lw-block"><div class="lw-block-title">' + title('分支推演（把每种可能都走一遍）') + '</div>'
            + buildTechBranchesHtml(item.branches) + '</div>';
    }

    if (item.example) {
        html += '<div class="lw-block"><div class="lw-block-title">' + title('完整实例（带行列坐标）') + '</div>'
            + '<div class="lw-example">' + escHtml(item.example) + '</div>'
            + (figs[1] ? buildTechFigureHtml(figs[1]) : '')
            + '</div>';
    }

    if (item.mistakes && item.mistakes.length) {
        html += '<div class="lw-block"><div class="lw-block-title">' + title('常见误判') + '</div><ul class="lw-warn">';
        item.mistakes.forEach(function (s) { html += '<li>' + escHtml(s) + '</li>'; });
        html += '</ul></div>';
    }

    if (item.related && item.related.length) {
        let chips = '';
        item.related.forEach(function (name) {
            const k = resolveLearningKey(name);
            if (!k) return;
            const cls = (k === currentKey || k === key) ? 'lw-chip is-current' : 'lw-chip';
            chips += '<button type="button" class="' + cls + '" data-learn-key="'
                + escHtml(k) + '">' + escHtml(name) + '</button>';
        });
        if (chips) {
            html += '<div class="lw-block"><div class="lw-block-title">' + title('关联技法（点击切换）') + '</div>'
                + '<div class="lw-chips">' + chips + '</div></div>';
        }
    }

    if (item.practiceTip) {
        html += '<div class="lw-block"><div class="lw-block-title">' + title('练习建议') + '</div>'
            + '<div class="lw-tip">' + escHtml(item.practiceTip) + '</div></div>';
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
    stopWatchMode(true);          // 重新进入教学模式时先停掉上一次的观影循环
    // 先进入教学模式的界面与状态，再叠加"按真实做题顺序"的推进方式
    enterExampleMode();
    setTeachingMode(true);
    if (typeof stopTimer === 'function') stopTimer();   // 教学模式下不需要计时器
    if (typeof updateBoardDisplay === 'function') updateBoardDisplay();
    if (typeof renderAllCandidates === 'function') renderAllCandidates();
    const badge = document.getElementById('modeBadge');
    if (badge) badge.innerHTML = '🎓 教学模式' + (badge.innerHTML.indexOf('·') >= 0
        ? badge.innerHTML.slice(badge.innerHTML.indexOf('·'))
        : '');
    if (typeof syncMenuLabels === 'function') syncMenuLabels();
    showTemporaryMessage('🎓 教学模式：先从最简单的摒除法开始，逐步升级到高级技法', 'info');
}

/* ==================== 讲解模式（自动播放 + 语音讲解教学步骤） ==================== */

const WATCH_INTERVAL = 3000;   // 无语音时每步间隔 3 秒
let narrationOn = true;        // 语音讲解开关（讲解模式默认开启）
let watchGen = 0;              // 循环代次：开始/暂停/停止/切换语音时自增，使旧回调失效

/**
 * 把一步转成语音稿。
 * 只朗读右侧「解题过程」面板里实际显示的内容：步骤号 + 技法 + 这一步的说明，
 * 以及面板里的「填入 / 排除」结论；不再额外朗读表格（盘面）里的填写细节。
 */
function buildStepNarration(step, stepNum) {
    if (!step) return '';
    const head = (stepNum ? '第 ' + stepNum + ' 步，' : '') + (step.technique || '') + '。';

    const body = String(buildStepDetailHtml(step, stepNum) || '')
        .replace(/<br\s*\/?>/gi, '，')
        .replace(/<\/(div|p|li)>/gi, '。')
        .replace(/<[^>]*>/g, '')          // 去掉标签，保留文字
        .replace(/&nbsp;/g, ' ')
        .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F]/gu, '')   // 去掉面板里的图标
        // 候选数标注类步骤会逐格列出「(1,1)→23、(1,4)→45」，这是盘面细节，不朗读
        .replace(/\(\d+\s*,\s*\d+\)\s*(?:→|->)\s*[0-9、,，;；\s]*/g, '')
        .replace(/\((\d+)\s*,\s*(\d+)\)/g, (m, r, c) => '第' + r + '行第' + c + '列')
        .replace(/\s*=\s*(?=\d)/g, '，为')
        .replace(/[:：]\s*(?=\d)/g, '的')
        .replace(/→/g, '，')
        .replace(/[,，]\s*/g, '，')
        .replace(/第\s*(\d+)\s*行\s*第\1\s*行/g, '第$1行')   // 「第 3 行 (3,2)」不要念成「第3行第3行第2列」
        .replace(/，{2,}/g, '，')
        .replace(/[：:]\s*。/g, '。')     // 枚举被过滤后可能留下「：。」的空档
        .replace(/[：:]\s*，/g, '，')
        .replace(/。\s*。/g, '。')
        .replace(/。\s*，/g, '，')
        .replace(/，\s*。/g, '。')
        .replace(/\s+/g, '')
        .trim();

    return head + body;
}

// 保住本次朗读所有语句对象的强引用：Chrome 会在朗读途中回收局部变量，
// 表现就是念到一半突然没声/断续，这是"语音卡顿"的常见原因之一
let currentUtterances = [];
let speechUnlocked = false;

/**
 * 移动端解锁语音：iOS / 部分安卓浏览器要求第一次 speak() 必须发生在用户手势的
 * 同步调用栈里，否则整段静音。这里在点击"讲解模式"的当口补一个静音短句来解锁。
 */
function unlockSpeech() {
    if (speechUnlocked || !('speechSynthesis' in window)) return;
    try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 1;
        u.rate = 1;
        u.lang = 'zh-CN';
        window.speechSynthesis.speak(u);   // 必须同步调用，不能放进 setTimeout
        speechUnlocked = true;
    } catch (e) { /* 忽略 */ }
}

/** 安卓首次 getVoices() 常返回空，需要等 voiceschanged 才拿到真实音色 */
function warmUpVoices() {
    if (!('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    try { synth.getVoices(); } catch (e) { /* 忽略 */ }
    if (typeof synth.addEventListener === 'function' && !warmUpVoices.bound) {
        warmUpVoices.bound = true;
        synth.addEventListener('voiceschanged', () => { try { synth.getVoices(); } catch (e) { /* 忽略 */ } });
    }
}

// ===== 讲解期间保持屏幕常亮（平板/手机自动锁屏会直接掐断语音）=====
let narrationWakeLock = null;

async function acquireScreenWakeLock() {
    if (narrationWakeLock || !navigator.wakeLock || typeof navigator.wakeLock.request !== 'function') return;
    try {
        narrationWakeLock = await navigator.wakeLock.request('screen');
        narrationWakeLock.addEventListener('release', () => { narrationWakeLock = null; });
    } catch (e) {
        narrationWakeLock = null;   // 系统拒绝（低电量等）时静默降级
    }
}

function releaseScreenWakeLock() {
    try { if (narrationWakeLock) narrationWakeLock.release(); } catch (e) { /* 忽略 */ }
    narrationWakeLock = null;
}

// 切到后台再回来时系统会回收 wake lock，这里补回来
document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && isWatchMode) acquireScreenWakeLock();
});

/** 挑一个中文语音：优先"自然/神经网络"音色，其次本机离线音色 */
function pickChineseVoice() {
    if (!('speechSynthesis' in window)) return null;
    const vs = window.speechSynthesis.getVoices() || [];
    const zh = vs.filter(v => /^zh/i.test(v.lang));
    if (!zh.length) return null;
    // 微软的 Natural/Online 神经网络音色听着最顺滑（接近豆包那种连贯感）；
    // 其次是本机离线音色（远端音色在网络抖动时会断续）。
    const score = (v) => {
        let s = 0;
        if (/natural|neural|online/i.test(v.name)) s += 100;
        if (v.localService) s += 10;
        if (/^zh[-_]CN|^zh[-_]Hans/i.test(v.lang)) s += 5;
        return s;
    };
    return zh.slice().sort((a, b) => score(b) - score(a))[0];
}

/**
 * 把讲解文本切成适合一次朗读的段落（尽量少切）。
 * 每多切一段，引擎就要重新起播一次，听感上就是"一顿一顿"，
 * 所以这里把相邻短句尽量合并，只有超过 80 字才另起一段。
 */
function splitNarration(text) {
    const s = String(text || '').replace(/\s+/g, ' ').trim();
    if (!s) return [];
    const LIMIT = 60;          // 一段约 10 秒：Chrome 对超过 ~15 秒的单条语音会突然中断
    const END = '。！？；!?;';
    const PAUSE = '，、,：:';

    // 1) 先按句末标点切句
    const sentences = [];
    let buf = '';
    for (let i = 0; i < s.length; i++) {
        buf += s[i];
        if (END.indexOf(s[i]) >= 0) { sentences.push(buf); buf = ''; }
    }
    if (buf) sentences.push(buf);

    // 2) 相邻短句合并，凑成不超过 LIMIT 的一段
    const out = [];
    let cur = '';
    sentences.forEach(function (sen) {
        if (cur && cur.length + sen.length > LIMIT) { out.push(cur); cur = ''; }
        cur += sen;
    });
    if (cur) out.push(cur);

    // 3) 极少数超长句再按逗号补切
    const final = [];
    out.forEach(function (p) {
        if (p.length <= LIMIT) { final.push(p); return; }
        let b = '';
        for (let i = 0; i < p.length; i++) {
            b += p[i];
            if (b.length >= 55 && PAUSE.indexOf(p[i]) >= 0) { final.push(b); b = ''; }
        }
        if (b) final.push(b);
    });
    return final;
}

/** 立即停止朗读 */
function stopNarration() {
    watchGen++;   // 让"读完再进下一步"的等待回调失效
    currentUtterances = [];
    if ('speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (e) { /* 忽略 */ }
    }
}

/**
 * 朗读一段讲解：整段文本切好的各段一次性排进播放队列，让引擎连着念，
 * 最后一段读完时回调 onEnd。若语音不可用/被关闭，则立即回调，保证推进不会被卡住。
 */
function speakNarration(text, onEnd) {
    let done = false;
    let ticker = null;
    let deadlineAt = 0;

    const finish = function () {
        if (done) return;
        done = true;
        if (ticker) { clearInterval(ticker); ticker = null; }
        if (onEnd) onEnd();
    };
    // 只要引擎还在报进度（onstart / onboundary），就把截止时间往后推，
    // 这样既不会把正在念的句子掐断，又能在引擎真的卡死时脱身
    const keepAlive = function (ms) {
        deadlineAt = Math.max(deadlineAt, Date.now() + (ms || 6000));
    };

    if (!text || !narrationOn || !('speechSynthesis' in window) ||
        typeof SpeechSynthesisUtterance === 'undefined') {
        finish();
        return;
    }

    const synth = window.speechSynthesis;
    const voice = pickChineseVoice();
    const pieces = splitNarration(text);
    if (!pieces.length) { finish(); return; }

    // 只有上一步的尾音还没播完才打断；没有残留就直接开口，少一次 cancel 就少一次爆音
    const busy = synth.speaking || synth.pending;
    if (busy) {
        try { synth.cancel(); } catch (e) { /* 忽略 */ }
    }
    try { if (synth.paused) synth.resume(); } catch (e) { /* 忽略 */ }

    const start = function () {
        if (done) return;
        if (!isWatchMode || !narrationOn) { finish(); return; }
        currentUtterances = [];
        for (let i = 0; i < pieces.length; i++) {
            const u = new SpeechSynthesisUtterance(pieces[i]);
            if (voice) u.voice = voice;
            u.lang = voice ? voice.lang : 'zh-CN';
            u.rate = 1.2;      // 比默认略快；再快中文音色会开始吞字
            u.pitch = 1;
            currentUtterances.push(u);   // 强引用，避免朗读中途被回收导致断音
            // 引擎报进度就续命（安卓上 onboundary 不一定触发，触发时就当心跳用）
            u.onstart = function () { keepAlive(8000); };
            u.onboundary = function () { keepAlive(6000); };
            // 队列交给引擎自己连着播；只有最后一段结束才算这一步讲完
            if (i === pieces.length - 1) {
                u.onend = finish;
                u.onerror = finish;
            }
            try {
                synth.speak(u);
            } catch (e) {
                finish();
                return;
            }
        }
    };
    // cancel() 之后立刻 speak() 会把开头"卡"掉：只有在打断别人时才延迟一拍。
    // 队列空闲时同步开口——iOS 要求首次 speak 在用户手势的同步栈里，异步会整段静音。
    if (busy) setTimeout(start, 150);
    else start();

    // 心跳轮询：超过截止时间仍没有任何进度 → 认为引擎卡死，放行继续下一步
    keepAlive(Math.max(9000, text.length * 280 + 4000));
    ticker = setInterval(function () {
        if (done) return;
        if (Date.now() > deadlineAt) finish();
    }, 1000);
}

/** 停止讲解：清定时器、停朗读、还原按钮与徽章（silent=true 时不弹提示） */
function stopWatchMode(silent) {
    const wasWatching = isWatchMode;
    isWatchMode = false;
    if (watchTimer) {
        clearTimeout(watchTimer);
        watchTimer = null;
    }
    stopNarration();
    releaseScreenWakeLock();
    const controls = document.getElementById('exampleControls');
    if (controls) controls.style.display = isExampleMode ? 'flex' : 'none';
    const badge = document.getElementById('modeBadge');
    if (badge && isExampleMode) {
        badge.innerHTML = '🎓 教学模式' + (badge.innerHTML.indexOf('·') >= 0
            ? badge.innerHTML.slice(badge.innerHTML.indexOf('·'))
            : '');
    }
    if (typeof syncMenuLabels === 'function') syncMenuLabels();
    updateNarrationButton();
    if (wasWatching && !silent) showTemporaryMessage('⏹️ 已停止讲解', 'info');
}

/** 讲解模式：刷新第一行的 语音开关 图标按钮 */
function updateNarrationButton() {
    const vbtn = document.getElementById('voiceToggleBtn');
    if (!vbtn) return;
    vbtn.style.display = isWatchMode ? '' : 'none';
    if (!isWatchMode) return;
    vbtn.textContent = narrationOn ? '🔊' : '🔇';
    vbtn.title = narrationOn ? '关闭语音讲解' : '开启语音讲解';
}

/** 切换语音讲解开关 */
function toggleNarration() {
    narrationOn = !narrationOn;
    if (narrationOn) {
        unlockSpeech();   // 同样要在点击的同步栈里解锁
        warmUpVoices();
        acquireScreenWakeLock();
        showTemporaryMessage('🔊 已开启语音讲解', 'info');
        // 立刻把当前这一步讲一遍
        const last = currentSteps[currentSteps.length - 1];
        if (isWatchMode && last) {
            const gen = watchGen;
            speakNarration(buildStepNarration(last, currentSteps.length), () => {
                if (gen !== watchGen || !isWatchMode) return;
                watchTimer = setTimeout(watchLoop, 700);
            });
        }
    } else {
        showTemporaryMessage('🔇 已关闭语音讲解', 'info');
        // 打断当前朗读，并让循环按固定间隔继续（否则会停在等朗读结束）
        const wasWatching = isWatchMode;
        stopNarration();
        if (watchTimer) { clearTimeout(watchTimer); watchTimer = null; }
        if (wasWatching) watchTimer = setTimeout(watchLoop, 500);
    }
    updateNarrationButton();
}

/**
 * 讲解模式主循环：推进一步 → 用语音讲解这一步 → 讲完再进下一步。
 * 关闭语音时退回固定间隔（3 秒）。
 */
async function watchLoop() {
    if (!isWatchMode) return;
    const gen = watchGen;

    // 已完成 / 没有下一步 → 收尾
    if (typeof isBoardSolvedLegally === 'function' && isBoardSolvedLegally()) {
        stopWatchMode(true);
        showTemporaryMessage('🎉 讲解结束：本题已解完', 'success');
        return;
    }
    const next = (typeof findNextStep === 'function') ? findNextStep() : null;
    if (!next) {
        stopWatchMode(true);
        showTemporaryMessage('⚠️ 讲解结束：没有更多可推导的步骤', 'warning');
        return;
    }

    await nextStep();
    // 等待上一步的动画/闪烁彻底结束
    let guard = 0;
    while (nextStepInProgress && guard++ < 100) {
        await new Promise(r => setTimeout(r, 80));
    }
    if (!isWatchMode || gen !== watchGen) return;
    updateNarrationButton();

    // 语音讲解当前这一步，读完再继续
    const last = currentSteps[currentSteps.length - 1];
    if (narrationOn && last) {
        speakNarration(buildStepNarration(last, currentSteps.length), () => {
            if (gen !== watchGen || !isWatchMode) return;
            watchTimer = setTimeout(watchLoop, 700);
        });
        return;
    }

    watchTimer = setTimeout(watchLoop, WATCH_INTERVAL);
}

/** 切换讲解模式：进入教学界面并自动逐步讲解 */
function toggleWatchMode() {
    if (isWatchMode) { stopWatchMode(false); return; }

    // 必须在点击的同步栈里解锁语音（iOS 要求），并预热音色列表（安卓首次为空）
    if (narrationOn) { unlockSpeech(); warmUpVoices(); }
    acquireScreenWakeLock();

    enterTeachingMode();
    if (typeof setTeachingMode === 'function') setTeachingMode(true);
    isWatchMode = true;
    watchGen++;

    const controls = document.getElementById('exampleControls');
    if (controls) controls.style.display = 'none';   // 讲解模式是连续播放，隐藏"下一步"
    const badge = document.getElementById('modeBadge');
    if (badge) {
        badge.innerHTML = '🔊 讲解模式' + (badge.innerHTML.indexOf('·') >= 0
            ? badge.innerHTML.slice(badge.innerHTML.indexOf('·'))
            : '');
    }
    if (typeof syncMenuLabels === 'function') syncMenuLabels();
    updateNarrationButton();
    showTemporaryMessage(narrationOn
        ? '🔊 讲解模式：自动推进一步并语音讲解这一步；点 🔊 可静音'
        : '🔊 讲解模式：自动推进一步（语音已关闭）', 'info');
    watchTimer = setTimeout(watchLoop, WATCH_INTERVAL);
}

/** 标注完成后给该格一个短促的视觉提示 */
function flashAnnotatedCell(row, col) {
    const box = document.getElementById('cell-container-' + row + '-' + col);
    if (!box) return;
    box.classList.add('annotate-flash');
    setTimeout(function () { box.classList.remove('annotate-flash'); }, 900);
}
