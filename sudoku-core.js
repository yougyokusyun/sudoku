/**
 * 数独解题器 - 核心逻辑（与后端保持一致）
 */

// ==================== 全局变量 ====================
let currentBoard = Array(9).fill().map(() => Array(9).fill(0));
let originalBoard = Array(9).fill().map(() => Array(9).fill(0));
let cellCandidates = Array(9).fill().map(() => Array(9).fill().map(() => new Set()));

let deletedCandidatesRecord = new Set();

function getDeleteKey(row, col, num) {
    return `${row},${col},${num}`;
}

function clearDeleteRecord() {
    deletedCandidatesRecord.clear();
}

const SIZE = 9;
const SUBSIZE = 3;

// ==================== 候选数管理 ====================

/**
 * 初始化所有候选数（基于当前盘面）
 */
function initCandidates() {
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
            if (currentBoard[i][j] !== 0) {
                cellCandidates[i][j].clear();
            } else {
                cellCandidates[i][j].clear();
                for (let n = 1; n <= SIZE; n++) {
                    if (isValidMove(i, j, n)) {
                        cellCandidates[i][j].add(n);
                    }
                }
            }
        }
    }
    clearDeleteRecord();
}

/**
 * 填入数字后重新计算候选数（关键修复）
 */
function recalcAfterPlacement(row, col, num) {
    // 清空当前格子的候选数
    cellCandidates[row][col].clear();
    
    // 从行中删除该数字
    for (let c = 0; c < SIZE; c++) {
        if (currentBoard[row][c] === 0) {
            cellCandidates[row][c].delete(num);
        }
    }
    
    // 从列中删除该数字
    for (let r = 0; r < SIZE; r++) {
        if (currentBoard[r][col] === 0) {
            cellCandidates[r][col].delete(num);
        }
    }
    
    // 从宫中删除该数字
    const br = Math.floor(row / SUBSIZE) * SUBSIZE;
    const bc = Math.floor(col / SUBSIZE) * SUBSIZE;
    for (let i = 0; i < SUBSIZE; i++) {
        for (let j = 0; j < SUBSIZE; j++) {
            const r = br + i, c = bc + j;
            if (currentBoard[r][c] === 0) {
                cellCandidates[r][c].delete(num);
            }
        }
    }
}

/**
 * 移除候选数（记录已删除，避免重复删除）
 */
function removeCandidate(row, col, num) {
    const key = getDeleteKey(row, col, num);
    if (!deletedCandidatesRecord.has(key) && cellCandidates[row][col].has(num)) {
        cellCandidates[row][col].delete(num);
        deletedCandidatesRecord.add(key);
        return true;
    }
    return false;
}

function removeCandidates(eliminations) {
    let deletedCount = 0;
    for (const elim of eliminations) {
        if (removeCandidate(elim.row, elim.col, elim.num)) deletedCount++;
    }
    return deletedCount;
}

/**
 * 检查某个位置是否可以填入数字（基于当前盘面，不依赖候选数）
 */
function isValidMove(row, col, num) {
    // 检查行
    for (let c = 0; c < SIZE; c++) {
        if (currentBoard[row][c] === num) return false;
    }
    // 检查列
    for (let r = 0; r < SIZE; r++) {
        if (currentBoard[r][col] === num) return false;
    }
    // 检查宫
    const br = Math.floor(row / SUBSIZE) * SUBSIZE;
    const bc = Math.floor(col / SUBSIZE) * SUBSIZE;
    for (let i = 0; i < SUBSIZE; i++) {
        for (let j = 0; j < SUBSIZE; j++) {
            if (currentBoard[br + i][bc + j] === num) return false;
        }
    }
    return true;
}

/**
 * 应用步骤（填入数字或排除候选数）
 */
function applyStep(step) {
    // 教学模式：候选数标注步骤 —— 不填数、不删候选，只把候选数"写到"该格
    if (step && step.teachKind === 'candidates') {
        if (!teachShown) resetTeachState();
        const layer = (step.layer === 'yellow') ? yellowCand : greenCand;
        // 一次可以标一格，也可以整批标（按单元标记时用 cells 数组）
        const list = (step.cells && step.cells.length)
            ? step.cells
            : [{ row: step.row, col: step.col, candidates: step.candidates || [] }];
        list.forEach(function (item) {
            (item.candidates || []).forEach(function (n) { layer[item.row][item.col].add(Number(n)); });
            // 同步"绿+黄"并集视图
            teachShown[item.row][item.col].clear();
            greenCand[item.row][item.col].forEach(function (n) { teachShown[item.row][item.col].add(n); });
            yellowCand[item.row][item.col].forEach(function (n) { teachShown[item.row][item.col].add(n); });
        });
        return step;
    }
    if (step.value !== undefined && step.value !== null) {
        currentBoard[step.row][step.col] = step.value;
        recalcAfterPlacement(step.row, step.col, step.value);
        clearDeleteRecord();  // 填入数字后清除删除记录，因为候选数已重新计算
        return step;
    }
    if (step.eliminations && step.eliminations.length > 0) {
        removeCandidates(step.eliminations);
        // 删候选后，同步清理绿色/黄色层里已失效的候选，避免残留显示
        if (greenCand && yellowCand) {
            const seen = {};
            step.eliminations.forEach(function (e) {
                const key = e.row + ',' + e.col;
                if (seen[key]) return;
                seen[key] = true;
                const actual = cellCandidates[e.row][e.col];
                [greenCand[e.row][e.col], yellowCand[e.row][e.col], teachShown[e.row][e.col]].forEach(function (layer) {
                    Array.from(layer).forEach(function (n) { if (!actual.has(n)) layer.delete(n); });
                });
            });
        }
    }
    return step;
}

/**
 * 设置初始盘面（重要：需要同时初始化候选数）
 */
function setBoard(board) {
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
            currentBoard[i][j] = board[i][j];
            originalBoard[i][j] = board[i][j];
        }
    }
    initCandidates();
    resetTeachState();
}

// ==================== 求解器 / 步骤校验层 ====================
// 说明：历史上部分高级技法（XY-Chain / GroupedChain / AIC 等）实现有误，
// 会排除掉正确候选数，导致盘面被"解死"。这里增加一层独立的回溯求解器，
// 任何技法产出的步骤都必须经真实解校验后才允许下发，从根本上杜绝错误排除。

/**
 * 回溯求解当前盘面（带 MRV 剪枝），返回第一个解或 null
 */
function solveBoardOnce(board) {
    const g = board.map(function (r) { return r.slice(); });
    function candidatesFor(r, c) {
        const used = new Set();
        for (let i = 0; i < SIZE; i++) { used.add(g[r][i]); used.add(g[i][c]); }
        const br = Math.floor(r / SUBSIZE) * SUBSIZE;
        const bc = Math.floor(c / SUBSIZE) * SUBSIZE;
        for (let i = 0; i < SUBSIZE; i++) {
            for (let j = 0; j < SUBSIZE; j++) used.add(g[br + i][bc + j]);
        }
        const out = [];
        for (let n = 1; n <= SIZE; n++) if (!used.has(n)) out.push(n);
        return out;
    }
    function rec(emptyCount) {
        if (emptyCount === 0) return true;
        let bestR = -1, bestC = -1, best = null;
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (g[r][c] !== 0) continue;
                const cand = candidatesFor(r, c);
                if (cand.length === 0) return false;
                if (best === null || cand.length < best.length) { best = cand; bestR = r; bestC = c; }
                if (cand.length === 1) { r = SIZE; break; }
            }
        }
        for (let k = 0; k < best.length; k++) {
            g[bestR][bestC] = best[k];
            if (rec(emptyCount - 1)) return true;
            g[bestR][bestC] = 0;
        }
        return false;
    }
    let empty = 0;
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (g[r][c] === 0) empty++;
    if (!rec(empty)) return null;
    return g;
}

/**
 * 统计解的个数（最多统计 limit 个，用于唯一性校验）
 */
function countSolutions(board, limit) {
    limit = limit || 2;
    const g = board.map(function (r) { return r.slice(); });
    let found = 0;
    function ok(r, c, n) {
        for (let i = 0; i < SIZE; i++) if (g[r][i] === n || g[i][c] === n) return false;
        const br = Math.floor(r / SUBSIZE) * SUBSIZE;
        const bc = Math.floor(c / SUBSIZE) * SUBSIZE;
        for (let i = 0; i < SUBSIZE; i++) {
            for (let j = 0; j < SUBSIZE; j++) if (g[br + i][bc + j] === n) return false;
        }
        return true;
    }
    function rec(idx) {
        if (found >= limit) return;
        let slot = -1;
        for (let k = idx; k < 81; k++) {
            const r = Math.floor(k / 9), c = k % 9;
            if (g[r][c] === 0) { slot = k; break; }
        }
        if (slot === -1) { found++; return; }
        const r = Math.floor(slot / 9), c = slot % 9;
        for (let n = 1; n <= SIZE; n++) {
            if (!ok(r, c, n)) continue;
            g[r][c] = n;
            rec(slot + 1);
            g[r][c] = 0;
            if (found >= limit) return;
        }
    }
    rec(0);
    return found;
}

let __solutionCacheKey = null;
let __solutionCacheVal = null;

/** 获取当前盘面的参考解（带缓存） */
function getReferenceSolution() {
    let key = '';
    for (let r = 0; r < SIZE; r++) key += currentBoard[r].join('');
    if (__solutionCacheKey === key) return __solutionCacheVal;
    __solutionCacheKey = key;
    __solutionCacheVal = solveBoardOnce(currentBoard);
    return __solutionCacheVal;
}

/** 无解盘面立刻让缓存失效 */
function invalidateSolutionCache() {
    __solutionCacheKey = null;
    __solutionCacheVal = null;
}

/**
 * 校验一个步骤是否真实成立
 * 填入类：必须等于参考解对应位置
 * 排除类：不得排除参考解中的正确数字
 */
function isStepSound(step) {
    if (!step) return false;
    // 教学模式：标注候选数不改盘面、不改候选集合，只需确认这些候选真实存在
    if (step.teachKind === 'candidates') {
        if (currentBoard[step.row][step.col] !== 0) return false;
        if (!step.candidates || step.candidates.length === 0) return false;
        const actual = cellCandidates[step.row][step.col];
        for (let i = 0; i < step.candidates.length; i++) {
            if (!actual.has(Number(step.candidates[i]))) return false;
        }
        return true;
    }
    const sol = getReferenceSolution();
    if (!sol) return false;
    if (step.value !== undefined && step.value !== null) {
        if (currentBoard[step.row][step.col] !== 0) return false;
        if (sol[step.row][step.col] !== step.value) return false;
        return isValidMove(step.row, step.col, step.value);
    }
    if (step.eliminations && step.eliminations.length > 0) {
        for (let i = 0; i < step.eliminations.length; i++) {
            const e = step.eliminations[i];
            if (!cellCandidates[e.row][e.col].has(e.num)) return false;
            if (sol[e.row][e.col] === e.num) return false;
        }
        return true;
    }
    return false;
}

// 技法难度等级（1 基础 / 2 中级 / 3 高级 / 4 专家 / 5 极限）
const TECHNIQUE_LEVELS = {
    '唯余法': 1, '唯一候选数法': 1,
    // 教学模式新增：摒除法（横/竖/宫排）与候选数标注都属于最基础的机械操作
    '摒除法': 1, '候选数标注': 1,
    '显性数对': 2, '隐性数对': 2, '显性三数': 2, '隐性三数': 2,
    '区块摒除': 2, '宫区块': 2,
    '显性四数': 2, '隐性四数': 2, '四数组': 2,
    'X-Wing': 3, 'Swordfish': 3, 'XY-Wing': 3, 'XYZ-Wing': 3,
    'Skyscraper': 3, 'Two-String Kite': 3, 'Empty Rectangle': 3,
    // 中文技法名同样登记，避免求解器输出中文名时命中不到、掉回默认 2 级
    '剑鱼法': 3, '摩天楼法': 3, '双线风筝法': 3, '空矩形法': 3,
    '水母法': 5, '唯一矩形': 4,
    'Unique Rectangle': 4, 'XY-Chain': 4, 'X-Chain': 4, 'W-Wing': 4,
    'Forcing Chain': 5, 'AIC': 5, 'Continuous Nice Loop': 5,
    'Jellyfish': 5, 'BUG+1': 4, 'Grouped Chain': 5,
    'Forcing Chain': 5, '强制链': 5,
    'Remote Pair': 4,
    'UR Type 2': 4, 'UR Type 4': 4,
    'Finned X-Wing': 4, 'Finned Swordfish': 4,
    'Finned Jellyfish': 5, 'ALS-XZ': 5,
    // 中文名同样登记（求解器输出的是中文名）
    '鳍 X-Wing': 4, '鳍剑鱼法': 4, '鳍水母法': 5,
    '唯一矩形 Type 2': 4, '唯一矩形 Type 4': 4,
    '远程数对': 4, '连续环': 5,
    'Continuous Nice Loop': 5
};

function getTechniqueLevel(technique) {
    if (!technique) return 0;
    let best = 0;
    for (const key in TECHNIQUE_LEVELS) {
        if (technique.indexOf(key) !== -1) best = Math.max(best, TECHNIQUE_LEVELS[key]);
    }
    // 唯余法（行/列/宫）同样是一级
    if (best === 0 && technique.indexOf('唯余法') !== -1) best = 1;
    return best || 2;
}

// ==================== 1. 唯一候选数法 ====================
function findNakedSingle() {
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
            if (currentBoard[i][j] === 0 && cellCandidates[i][j].size === 1) {
                const value = Array.from(cellCandidates[i][j])[0];
                // 验证这个数字是否真的有效（防止候选数错误）
                if (isValidMove(i, j, value)) {
                    return { row: i, col: j, value: value, technique: "唯一候选数法", eliminations: [],
                        explanation: `单元格 (${i + 1},${j + 1}) 只剩下数字 ${value}。` };
                }
            }
        }
    }
    return null;
}
// ==================== 2. 唯余法（修正版） ====================
function findHiddenSingle() {
    // 检查行
    for (let row = 0; row < SIZE; row++) {
        // 统计该行每个数字出现的次数和位置
        const numCount = {};
        const numPos = {};
        
        for (let col = 0; col < SIZE; col++) {
            if (currentBoard[row][col] === 0) {
                for (const num of cellCandidates[row][col]) {
                    if (!numCount[num]) {
                        numCount[num] = 0;
                        numPos[num] = col;
                    }
                    numCount[num]++;
                    // 注意：如果出现多次，需要记录最后一个位置，但我们会检查count
                }
            }
        }
        
        // 找出只出现一次的数字
        for (let num = 1; num <= SIZE; num++) {
            if (numCount[num] === 1) {
                const targetCol = numPos[num];
                return { row: row, col: targetCol, value: num, technique: "唯余法（行）", eliminations: [],
                    explanation: `第 ${row + 1} 行中数字 ${num} 只能出现在 (${row + 1},${targetCol + 1})。` };
            }
        }
    }
    
    // 检查列
    for (let col = 0; col < SIZE; col++) {
        const numCount = {};
        const numPos = {};
        
        for (let row = 0; row < SIZE; row++) {
            if (currentBoard[row][col] === 0) {
                for (const num of cellCandidates[row][col]) {
                    if (!numCount[num]) {
                        numCount[num] = 0;
                        numPos[num] = row;
                    }
                    numCount[num]++;
                }
            }
        }
        
        for (let num = 1; num <= SIZE; num++) {
            if (numCount[num] === 1) {
                const targetRow = numPos[num];
                return { row: targetRow, col: col, value: num, technique: "唯余法（列）", eliminations: [],
                    explanation: `第 ${col + 1} 列中数字 ${num} 只能出现在 (${targetRow + 1},${col + 1})。` };
            }
        }
    }
    
    // 检查宫
    for (let box = 0; box < SIZE; box++) {
        const br = Math.floor(box / SUBSIZE) * SUBSIZE;
        const bc = (box % SUBSIZE) * SUBSIZE;
        const numCount = {};
        const numPosRow = {};
        const numPosCol = {};
        
        for (let i = 0; i < SUBSIZE; i++) {
            for (let j = 0; j < SUBSIZE; j++) {
                const row = br + i, col = bc + j;
                if (currentBoard[row][col] === 0) {
                    for (const num of cellCandidates[row][col]) {
                        if (!numCount[num]) {
                            numCount[num] = 0;
                            numPosRow[num] = row;
                            numPosCol[num] = col;
                        }
                        numCount[num]++;
                    }
                }
            }
        }
        
        for (let num = 1; num <= SIZE; num++) {
            if (numCount[num] === 1) {
                const targetRow = numPosRow[num];
                const targetCol = numPosCol[num];
                return { row: targetRow, col: targetCol, value: num, technique: "唯余法（宫）", eliminations: [],
                    explanation: `第 ${box + 1} 宫中数字 ${num} 只能出现在 (${targetRow + 1},${targetCol + 1})。` };
            }
        }
    }
    
    return null;
}
// ==================== 3. 显性数对 ====================
function findNakedPair() {
    // 处理行
    for (let row = 0; row < SIZE; row++) {
        const pairCells = [];
        for (let col = 0; col < SIZE; col++) {
            if (currentBoard[row][col] === 0 && cellCandidates[row][col].size === 2) {
                const cand = Array.from(cellCandidates[row][col]).sort((a, b) => a - b);
                pairCells.push({ col: col, cand: cand });
            }
        }
        for (let i = 0; i < pairCells.length; i++) {
            for (let j = i + 1; j < pairCells.length; j++) {
                if (pairCells[i].cand[0] === pairCells[j].cand[0] && 
                    pairCells[i].cand[1] === pairCells[j].cand[1]) {
                    const eliminations = [];
                    for (let col = 0; col < SIZE; col++) {
                        if (col !== pairCells[i].col && col !== pairCells[j].col && 
                            currentBoard[row][col] === 0) {
                            for (const num of pairCells[i].cand) {
                                if (cellCandidates[row][col].has(num)) {
                                    eliminations.push({ row, col, num });
                                }
                            }
                        }
                    }
                    if (eliminations.length > 0) {
                        return { technique: `显性数对 (行 ${row + 1})`, eliminations: eliminations,
                            explanation: `第 ${row + 1} 行中两个格子只能填入 [${pairCells[i].cand[0]},${pairCells[i].cand[1]}]，同行其他格排除。` };
                    }
                }
            }
        }
    }
    
    // 处理列
    for (let col = 0; col < SIZE; col++) {
        const pairCells = [];
        for (let row = 0; row < SIZE; row++) {
            if (currentBoard[row][col] === 0 && cellCandidates[row][col].size === 2) {
                const cand = Array.from(cellCandidates[row][col]).sort((a, b) => a - b);
                pairCells.push({ row: row, cand: cand });
            }
        }
        for (let i = 0; i < pairCells.length; i++) {
            for (let j = i + 1; j < pairCells.length; j++) {
                if (pairCells[i].cand[0] === pairCells[j].cand[0] && 
                    pairCells[i].cand[1] === pairCells[j].cand[1]) {
                    const eliminations = [];
                    for (let row = 0; row < SIZE; row++) {
                        if (row !== pairCells[i].row && row !== pairCells[j].row && 
                            currentBoard[row][col] === 0) {
                            for (const num of pairCells[i].cand) {
                                if (cellCandidates[row][col].has(num)) {
                                    eliminations.push({ row, col, num });
                                }
                            }
                        }
                    }
                    if (eliminations.length > 0) {
                        return { technique: `显性数对 (列 ${col + 1})`, eliminations: eliminations,
                            explanation: `第 ${col + 1} 列中两个格子只能填入 [${pairCells[i].cand[0]},${pairCells[i].cand[1]}]，同列其他格排除。` };
                    }
                }
            }
        }
    }
    
    // 处理宫
    for (let box = 0; box < SIZE; box++) {
        const br = Math.floor(box / SUBSIZE) * SUBSIZE;
        const bc = (box % SUBSIZE) * SUBSIZE;
        const pairCells = [];
        for (let i = 0; i < SUBSIZE; i++) {
            for (let j = 0; j < SUBSIZE; j++) {
                const row = br + i, col = bc + j;
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].size === 2) {
                    const cand = Array.from(cellCandidates[row][col]).sort((a, b) => a - b);
                    pairCells.push({ row, col, cand });
                }
            }
        }
        for (let i = 0; i < pairCells.length; i++) {
            for (let j = i + 1; j < pairCells.length; j++) {
                if (pairCells[i].cand[0] === pairCells[j].cand[0] && 
                    pairCells[i].cand[1] === pairCells[j].cand[1]) {
                    const eliminations = [];
                    for (let i2 = 0; i2 < SUBSIZE; i2++) {
                        for (let j2 = 0; j2 < SUBSIZE; j2++) {
                            const row = br + i2, col = bc + j2;
                            if ((row !== pairCells[i].row || col !== pairCells[i].col) &&
                                (row !== pairCells[j].row || col !== pairCells[j].col) &&
                                currentBoard[row][col] === 0) {
                                for (const num of pairCells[i].cand) {
                                    if (cellCandidates[row][col].has(num)) {
                                        eliminations.push({ row, col, num });
                                    }
                                }
                            }
                        }
                    }
                    if (eliminations.length > 0) {
                        return { technique: `显性数对 (宫 ${box + 1})`, eliminations: eliminations,
                            explanation: `宫 ${box + 1} 中两个格子只能填入 [${pairCells[i].cand[0]},${pairCells[i].cand[1]}]，同宫其他格排除。` };
                    }
                }
            }
        }
    }
    return null;
}

// ==================== 4. 隐性数对 ====================
function findHiddenPair() {
    // 处理行
    for (let row = 0; row < SIZE; row++) {
        const numPos = {};
        for (let col = 0; col < SIZE; col++) {
            if (currentBoard[row][col] === 0) {
                for (const num of cellCandidates[row][col]) {
                    if (!numPos[num]) numPos[num] = [];
                    numPos[num].push(col);
                }
            }
        }
        for (let n1 = 1; n1 <= SIZE; n1++) {
            for (let n2 = n1 + 1; n2 <= SIZE; n2++) {
                const p1 = numPos[n1], p2 = numPos[n2];
                if (p1 && p2 && p1.length === 2 && p2.length === 2 && 
                    p1[0] === p2[0] && p1[1] === p2[1]) {
                    const eliminations = [];
                    for (const col of p1) {
                        for (const num of cellCandidates[row][col]) {
                            if (num !== n1 && num !== n2) {
                                eliminations.push({ row, col, num });
                            }
                        }
                    }
                    if (eliminations.length > 0) {
                        return { technique: `隐性数对 (行 ${row + 1})`, eliminations: eliminations,
                            explanation: `第 ${row + 1} 行中数字 ${n1} 和 ${n2} 只能出现在两格中，删除这两格的其他候选数。` };
                    }
                }
            }
        }
    }
    
    // 处理列
    for (let col = 0; col < SIZE; col++) {
        const numPos = {};
        for (let row = 0; row < SIZE; row++) {
            if (currentBoard[row][col] === 0) {
                for (const num of cellCandidates[row][col]) {
                    if (!numPos[num]) numPos[num] = [];
                    numPos[num].push(row);
                }
            }
        }
        for (let n1 = 1; n1 <= SIZE; n1++) {
            for (let n2 = n1 + 1; n2 <= SIZE; n2++) {
                const p1 = numPos[n1], p2 = numPos[n2];
                if (p1 && p2 && p1.length === 2 && p2.length === 2 && 
                    p1[0] === p2[0] && p1[1] === p2[1]) {
                    const eliminations = [];
                    for (const row of p1) {
                        for (const num of cellCandidates[row][col]) {
                            if (num !== n1 && num !== n2) {
                                eliminations.push({ row, col, num });
                            }
                        }
                    }
                    if (eliminations.length > 0) {
                        return { technique: `隐性数对 (列 ${col + 1})`, eliminations: eliminations,
                            explanation: `第 ${col + 1} 列中数字 ${n1} 和 ${n2} 只能出现在两格中，删除这两格的其他候选数。` };
                    }
                }
            }
        }
    }
    
    // 处理宫
    for (let box = 0; box < SIZE; box++) {
        const br = Math.floor(box / SUBSIZE) * SUBSIZE;
        const bc = (box % SUBSIZE) * SUBSIZE;
        const numPos = {};
        for (let i = 0; i < SUBSIZE; i++) {
            for (let j = 0; j < SUBSIZE; j++) {
                const row = br + i, col = bc + j;
                if (currentBoard[row][col] === 0) {
                    for (const num of cellCandidates[row][col]) {
                        if (!numPos[num]) numPos[num] = [];
                        numPos[num].push([row, col]);
                    }
                }
            }
        }
        for (let n1 = 1; n1 <= SIZE; n1++) {
            for (let n2 = n1 + 1; n2 <= SIZE; n2++) {
                const p1 = numPos[n1], p2 = numPos[n2];
                if (p1 && p2 && p1.length === 2 && p2.length === 2) {
                    const same = p1[0][0] === p2[0][0] && p1[0][1] === p2[0][1] &&
                                 p1[1][0] === p2[1][0] && p1[1][1] === p2[1][1];
                    if (same) {
                        const eliminations = [];
                        for (const cell of p1) {
                            const [row, col] = cell;
                            for (const num of cellCandidates[row][col]) {
                                if (num !== n1 && num !== n2) {
                                    eliminations.push({ row, col, num });
                                }
                            }
                        }
                        if (eliminations.length > 0) {
                            return { technique: `隐性数对 (宫 ${box + 1})`, eliminations: eliminations,
                                explanation: `宫 ${box + 1} 中数字 ${n1} 和 ${n2} 只能出现在两格中，删除这两格的其他候选数。` };
                        }
                    }
                }
            }
        }
    }
    return null;
}

// ==================== 5. 显性三数组 ====================
function findNakedTriple() {
    // 处理行
    for (let row = 0; row < SIZE; row++) {
        const cells = [];
        for (let col = 0; col < SIZE; col++) {
            if (currentBoard[row][col] === 0 && cellCandidates[row][col].size >= 2 && 
                cellCandidates[row][col].size <= 3) {
                cells.push({ col: col, cand: Array.from(cellCandidates[row][col]).sort((a, b) => a - b) });
            }
        }
        for (let i = 0; i < cells.length - 2; i++) {
            for (let j = i + 1; j < cells.length - 1; j++) {
                for (let k = j + 1; k < cells.length; k++) {
                    const union = new Set([...cells[i].cand, ...cells[j].cand, ...cells[k].cand]);
                    if (union.size === 3) {
                        const eliminations = [];
                        for (let col = 0; col < SIZE; col++) {
                            if (col !== cells[i].col && col !== cells[j].col && col !== cells[k].col && 
                                currentBoard[row][col] === 0) {
                                for (const num of union) {
                                    if (cellCandidates[row][col].has(num)) {
                                        eliminations.push({ row, col, num });
                                    }
                                }
                            }
                        }
                        if (eliminations.length > 0) {
                            const numList = Array.from(union).sort((a, b) => a - b);
                            return { technique: `显性三数组 (行 ${row + 1})`, eliminations: eliminations,
                                explanation: `第 ${row + 1} 行中三个格子的候选数合并为 [${numList.join(',')}]，删除同行其他格中的这些数字。` };
                        }
                    }
                }
            }
        }
    }
    
    // 处理列
    for (let col = 0; col < SIZE; col++) {
        const cells = [];
        for (let row = 0; row < SIZE; row++) {
            if (currentBoard[row][col] === 0 && cellCandidates[row][col].size >= 2 && 
                cellCandidates[row][col].size <= 3) {
                cells.push({ row: row, cand: Array.from(cellCandidates[row][col]).sort((a, b) => a - b) });
            }
        }
        for (let i = 0; i < cells.length - 2; i++) {
            for (let j = i + 1; j < cells.length - 1; j++) {
                for (let k = j + 1; k < cells.length; k++) {
                    const union = new Set([...cells[i].cand, ...cells[j].cand, ...cells[k].cand]);
                    if (union.size === 3) {
                        const eliminations = [];
                        for (let row = 0; row < SIZE; row++) {
                            if (row !== cells[i].row && row !== cells[j].row && row !== cells[k].row && 
                                currentBoard[row][col] === 0) {
                                for (const num of union) {
                                    if (cellCandidates[row][col].has(num)) {
                                        eliminations.push({ row, col, num });
                                    }
                                }
                            }
                        }
                        if (eliminations.length > 0) {
                            const numList = Array.from(union).sort((a, b) => a - b);
                            return { technique: `显性三数组 (列 ${col + 1})`, eliminations: eliminations,
                                explanation: `第 ${col + 1} 列中三个格子的候选数合并为 [${numList.join(',')}]，删除同列其他格中的这些数字。` };
                        }
                    }
                }
            }
        }
    }
    
    // 处理宫
    for (let box = 0; box < SIZE; box++) {
        const br = Math.floor(box / SUBSIZE) * SUBSIZE;
        const bc = (box % SUBSIZE) * SUBSIZE;
        const cells = [];
        for (let i = 0; i < SUBSIZE; i++) {
            for (let j = 0; j < SUBSIZE; j++) {
                const row = br + i, col = bc + j;
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].size >= 2 && 
                    cellCandidates[row][col].size <= 3) {
                    cells.push({ row, col, cand: Array.from(cellCandidates[row][col]).sort((a, b) => a - b) });
                }
            }
        }
        for (let i = 0; i < cells.length - 2; i++) {
            for (let j = i + 1; j < cells.length - 1; j++) {
                for (let k = j + 1; k < cells.length; k++) {
                    const union = new Set([...cells[i].cand, ...cells[j].cand, ...cells[k].cand]);
                    if (union.size === 3) {
                        const eliminations = [];
                        for (let i2 = 0; i2 < SUBSIZE; i2++) {
                            for (let j2 = 0; j2 < SUBSIZE; j2++) {
                                const row = br + i2, col = bc + j2;
                                if ((row !== cells[i].row || col !== cells[i].col) &&
                                    (row !== cells[j].row || col !== cells[j].col) &&
                                    (row !== cells[k].row || col !== cells[k].col) &&
                                    currentBoard[row][col] === 0) {
                                    for (const num of union) {
                                        if (cellCandidates[row][col].has(num)) {
                                            eliminations.push({ row, col, num });
                                        }
                                    }
                                }
                            }
                        }
                        if (eliminations.length > 0) {
                            const numList = Array.from(union).sort((a, b) => a - b);
                            return { technique: `显性三数组 (宫 ${box + 1})`, eliminations: eliminations,
                                explanation: `宫 ${box + 1} 中三个格子的候选数合并为 [${numList.join(',')}]，删除同宫其他格中的这些数字。` };
                        }
                    }
                }
            }
        }
    }
    return null;
}

// ==================== 6. 隐性三数组 ====================
function findHiddenTriple() {
    // 处理行
    for (let row = 0; row < SIZE; row++) {
        const numPos = {};
        const colToNums = {};
        for (let col = 0; col < SIZE; col++) {
            if (currentBoard[row][col] === 0) {
                const cand = Array.from(cellCandidates[row][col]);
                colToNums[col] = new Set(cand);
                for (const num of cand) {
                    if (!numPos[num]) numPos[num] = [];
                    numPos[num].push(col);
                }
            }
        }
        const numbers = Object.keys(numPos).map(Number);
        for (let i = 0; i < numbers.length - 2; i++) {
            for (let j = i + 1; j < numbers.length - 1; j++) {
                for (let k = j + 1; k < numbers.length; k++) {
                    const n1 = numbers[i], n2 = numbers[j], n3 = numbers[k];
                    const p1 = numPos[n1], p2 = numPos[n2], p3 = numPos[n3];
                    if (!p1 || !p2 || !p3) continue;
                    const allCols = new Set([...p1, ...p2, ...p3]);
                    if (allCols.size === 3) {
                        let valid = true;
                        for (const col of allCols) {
                            let hasAny = false;
                            for (const num of [n1, n2, n3]) {
                                if (colToNums[col].has(num)) {
                                    hasAny = true;
                                    break;
                                }
                            }
                            if (!hasAny) { valid = false; break; }
                        }
                        if (!valid) continue;
                        
                        const eliminations = [];
                        for (const col of allCols) {
                            for (const num of cellCandidates[row][col]) {
                                if (num !== n1 && num !== n2 && num !== n3) {
                                    eliminations.push({ row, col, num });
                                }
                            }
                        }
                        if (eliminations.length > 0) {
                            const colList = Array.from(allCols).sort((a, b) => a - b);
                            return { technique: `隐性三数组 (行 ${row + 1})`, eliminations: eliminations,
                                explanation: `第 ${row + 1} 行中数字 ${n1},${n2},${n3} 只能出现在第 ${colList.map(c => c + 1).join(',')} 列，删除这些格的其他候选数。` };
                        }
                    }
                }
            }
        }
    }
    
    // 处理列
    for (let col = 0; col < SIZE; col++) {
        const numPos = {};
        for (let row = 0; row < SIZE; row++) {
            if (currentBoard[row][col] === 0) {
                for (const num of cellCandidates[row][col]) {
                    if (!numPos[num]) numPos[num] = [];
                    numPos[num].push(row);
                }
            }
        }
        const numbers = Object.keys(numPos).map(Number);
        for (let i = 0; i < numbers.length - 2; i++) {
            for (let j = i + 1; j < numbers.length - 1; j++) {
                for (let k = j + 1; k < numbers.length; k++) {
                    const n1 = numbers[i], n2 = numbers[j], n3 = numbers[k];
                    const p1 = numPos[n1], p2 = numPos[n2], p3 = numPos[n3];
                    if (!p1 || !p2 || !p3) continue;
                    const allRows = new Set([...p1, ...p2, ...p3]);
                    if (allRows.size === 3) {
                        const eliminations = [];
                        for (const row of allRows) {
                            for (const num of cellCandidates[row][col]) {
                                if (num !== n1 && num !== n2 && num !== n3) {
                                    eliminations.push({ row, col, num });
                                }
                            }
                        }
                        if (eliminations.length > 0) {
                            const rowList = Array.from(allRows).sort((a, b) => a - b);
                            return { technique: `隐性三数组 (列 ${col + 1})`, eliminations: eliminations,
                                explanation: `第 ${col + 1} 列中数字 ${n1},${n2},${n3} 只能出现在第 ${rowList.map(r => r + 1).join(',')} 行，删除这些格的其他候选数。` };
                        }
                    }
                }
            }
        }
    }
    
    // 处理宫
    for (let box = 0; box < SIZE; box++) {
        const br = Math.floor(box / SUBSIZE) * SUBSIZE;
        const bc = (box % SUBSIZE) * SUBSIZE;
        const numPos = {};
        const cellToNums = {};
        for (let i = 0; i < SUBSIZE; i++) {
            for (let j = 0; j < SUBSIZE; j++) {
                const row = br + i, col = bc + j;
                if (currentBoard[row][col] === 0) {
                    const cand = Array.from(cellCandidates[row][col]);
                    const cellKey = `${row},${col}`;
                    cellToNums[cellKey] = new Set(cand);
                    for (const num of cand) {
                        if (!numPos[num]) numPos[num] = [];
                        numPos[num].push(cellKey);
                    }
                }
            }
        }
        const numbers = Object.keys(numPos).map(Number);
        for (let i = 0; i < numbers.length - 2; i++) {
            for (let j = i + 1; j < numbers.length - 1; j++) {
                for (let k = j + 1; k < numbers.length; k++) {
                    const n1 = numbers[i], n2 = numbers[j], n3 = numbers[k];
                    const p1 = numPos[n1], p2 = numPos[n2], p3 = numPos[n3];
                    if (!p1 || !p2 || !p3) continue;
                    const allCells = new Set([...p1, ...p2, ...p3]);
                    if (allCells.size === 3) {
                        let valid = true;
                        for (const cellKey of allCells) {
                            let hasAny = false;
                            for (const num of [n1, n2, n3]) {
                                if (cellToNums[cellKey].has(num)) {
                                    hasAny = true;
                                    break;
                                }
                            }
                            if (!hasAny) { valid = false; break; }
                        }
                        if (!valid) continue;
                        
                        const eliminations = [];
                        for (const cellKey of allCells) {
                            const [row, col] = cellKey.split(',').map(Number);
                            for (const num of cellCandidates[row][col]) {
                                if (num !== n1 && num !== n2 && num !== n3) {
                                    eliminations.push({ row, col, num });
                                }
                            }
                        }
                        if (eliminations.length > 0) {
                            return { technique: `隐性三数组 (宫 ${box + 1})`, eliminations: eliminations,
                                explanation: `宫 ${box + 1} 中数字 ${n1},${n2},${n3} 只能出现在三格中，删除这些格的其他候选数。` };
                        }
                    }
                }
            }
        }
    }
    return null;
}


// ==================== 扫描单元工具（行/列/宫 共 27 个） ====================
function _buildScanUnits() {
    const units = [];
    for (let r = 0; r < SIZE; r++) {
        const cells = [];
        for (let c = 0; c < SIZE; c++) cells.push([r, c]);
        units.push({ label: '行', unitName: '行', index: r, cells: cells });
    }
    for (let c = 0; c < SIZE; c++) {
        const cells = [];
        for (let r = 0; r < SIZE; r++) cells.push([r, c]);
        units.push({ label: '列', unitName: '列', index: c, cells: cells });
    }
    for (let b = 0; b < SIZE; b++) {
        const br = Math.floor(b / SUBSIZE) * SUBSIZE;
        const bc = (b % SUBSIZE) * SUBSIZE;
        const cells = [];
        for (let r = br; r < br + SUBSIZE; r++) {
            for (let c = bc; c < bc + SUBSIZE; c++) cells.push([r, c]);
        }
        units.push({ label: '宫', unitName: '宫', index: b, cells: cells });
    }
    return units;
}

// ==================== 5b. 显性四数组（Naked Quad） ====================
function findNakedQuad() {
    const units = _buildScanUnits();
    for (let u = 0; u < units.length; u++) {
        const unit = units[u];
        const pool = [];
        for (let i = 0; i < unit.cells.length; i++) {
            const rc = unit.cells[i];
            const cand = cellCandidates[rc[0]][rc[1]];
            if (currentBoard[rc[0]][rc[1]] === 0 && cand.size >= 2 && cand.size <= 4) {
                pool.push({ key: rc[0] + ',' + rc[1], cand: Array.from(cand).sort((a, b) => a - b) });
            }
        }
        if (pool.length < 4) continue;

        for (let a = 0; a < pool.length - 3; a++) {
            for (let b = a + 1; b < pool.length - 2; b++) {
                for (let c = b + 1; c < pool.length - 1; c++) {
                    for (let d = c + 1; d < pool.length; d++) {
                        const union = new Set([].concat(pool[a].cand, pool[b].cand, pool[c].cand, pool[d].cand));
                        if (union.size !== 4) continue;

                        const used = {};
                        used[pool[a].key] = 1; used[pool[b].key] = 1;
                        used[pool[c].key] = 1; used[pool[d].key] = 1;

                        const eliminations = [];
                        for (let i = 0; i < unit.cells.length; i++) {
                            const r = unit.cells[i][0], c2 = unit.cells[i][1];
                            if (used[r + ',' + c2]) continue;
                            if (currentBoard[r][c2] !== 0) continue;
                            for (const num of union) {
                                if (cellCandidates[r][c2].has(num)) {
                                    eliminations.push({ row: r, col: c2, num: num });
                                }
                            }
                        }
                        if (eliminations.length > 0) {
                            const numList = Array.from(union).sort((x, y) => x - y);
                            return {
                                technique: '显性四数组 (' + unit.label + ' ' + (unit.index + 1) + ')',
                                eliminations: eliminations,
                                explanation: '第 ' + (unit.index + 1) + ' ' + unit.unitName + '中四格候选数合并为 ['
                                    + numList.join(',') + ']，删除同单元其他格中的这些数字。'
                            };
                        }
                    }
                }
            }
        }
    }
    return null;
}

// ==================== 5c. 隐性四数组（Hidden Quad） ====================
function findHiddenQuad() {
    const units = _buildScanUnits();
    for (let u = 0; u < units.length; u++) {
        const unit = units[u];
        const numPos = {};
        const cellNums = {};
        for (let i = 0; i < unit.cells.length; i++) {
            const r = unit.cells[i][0], c = unit.cells[i][1];
            if (currentBoard[r][c] !== 0) continue;
            const key = r + ',' + c;
            const cand = Array.from(cellCandidates[r][c]);
            cellNums[key] = new Set(cand);
            for (const num of cand) {
                if (!numPos[num]) numPos[num] = [];
                numPos[num].push(key);
            }
        }
        const numbers = Object.keys(numPos).map(Number).filter(function (n) {
            return numPos[n].length >= 2 && numPos[n].length <= 4;
        });
        if (numbers.length < 4) continue;

        for (let a = 0; a < numbers.length - 3; a++) {
            for (let b = a + 1; b < numbers.length - 2; b++) {
                for (let c = b + 1; c < numbers.length - 1; c++) {
                    for (let d = c + 1; d < numbers.length; d++) {
                        const q = [numbers[a], numbers[b], numbers[c], numbers[d]];
                        const cellSet = new Set([].concat(numPos[q[0]], numPos[q[1]], numPos[q[2]], numPos[q[3]]));
                        if (cellSet.size !== 4) continue;

                        let valid = true;
                        cellSet.forEach(function (key) {
                            let hasAny = false;
                            for (const num of q) {
                                if (cellNums[key].has(num)) { hasAny = true; break; }
                            }
                            if (!hasAny) valid = false;
                        });
                        if (!valid) continue;

                        const eliminations = [];
                        cellSet.forEach(function (key) {
                            const parts = key.split(',');
                            const r = Number(parts[0]), c = Number(parts[1]);
                            for (const num of cellCandidates[r][c]) {
                                if (q.indexOf(num) === -1) {
                                    eliminations.push({ row: r, col: c, num: num });
                                }
                            }
                        });
                        if (eliminations.length > 0) {
                            const keys = Array.from(cellSet).sort();
                            const posText = keys.map(function (k) {
                                const p = k.split(',');
                                return '(' + (Number(p[0]) + 1) + ',' + (Number(p[1]) + 1) + ')';
                            }).join('、');
                            return {
                                technique: '隐性四数组 (' + unit.label + ' ' + (unit.index + 1) + ')',
                                eliminations: eliminations,
                                explanation: '第 ' + (unit.index + 1) + ' ' + unit.unitName + '中数字 ' + q.join(',')
                                    + ' 只能出现在 ' + posText + ' 这四格，删除这些格的其他候选数。'
                            };
                        }
                    }
                }
            }
        }
    }
    return null;
}

// ==================== 7b. 区块排除法（宫到行 / Pointing） ====================
function findBoxToRow() {
    for (let box = 0; box < SIZE; box++) {
        const br = Math.floor(box / SUBSIZE) * SUBSIZE;
        const bc = (box % SUBSIZE) * SUBSIZE;
        for (let num = 1; num <= SIZE; num++) {
            const positions = [];
            for (let r = br; r < br + SUBSIZE; r++) {
                for (let c = bc; c < bc + SUBSIZE; c++) {
                    if (currentBoard[r][c] === 0 && cellCandidates[r][c].has(num)) {
                        positions.push([r, c]);
                    }
                }
            }
            if (positions.length < 2 || positions.length > 3) continue;

            const targetRow = positions[0][0];
            let sameRow = true;
            for (const p of positions) {
                if (p[0] !== targetRow) { sameRow = false; break; }
            }
            if (!sameRow) continue;

            const eliminations = [];
            for (let c = 0; c < SIZE; c++) {
                if (c >= bc && c < bc + SUBSIZE) continue;
                if (currentBoard[targetRow][c] === 0 && cellCandidates[targetRow][c].has(num)) {
                    eliminations.push({ row: targetRow, col: c, num: num });
                }
            }
            if (eliminations.length > 0) {
                return {
                    technique: '区块排除法 (宫到行)',
                    eliminations: eliminations,
                    explanation: '数字 ' + num + ' 在第 ' + (box + 1) + ' 宫内只能出现在第 ' + (targetRow + 1)
                        + ' 行，排除第 ' + (targetRow + 1) + ' 行在该宫以外的 ' + num + '。'
                };
            }
        }
    }
    return null;
}

// ==================== 7c. 区块排除法（宫到列 / Pointing） ====================
function findBoxToCol() {
    for (let box = 0; box < SIZE; box++) {
        const br = Math.floor(box / SUBSIZE) * SUBSIZE;
        const bc = (box % SUBSIZE) * SUBSIZE;
        for (let num = 1; num <= SIZE; num++) {
            const positions = [];
            for (let r = br; r < br + SUBSIZE; r++) {
                for (let c = bc; c < bc + SUBSIZE; c++) {
                    if (currentBoard[r][c] === 0 && cellCandidates[r][c].has(num)) {
                        positions.push([r, c]);
                    }
                }
            }
            if (positions.length < 2 || positions.length > 3) continue;

            const targetCol = positions[0][1];
            let sameCol = true;
            for (const p of positions) {
                if (p[1] !== targetCol) { sameCol = false; break; }
            }
            if (!sameCol) continue;

            const eliminations = [];
            for (let r = 0; r < SIZE; r++) {
                if (r >= br && r < br + SUBSIZE) continue;
                if (currentBoard[r][targetCol] === 0 && cellCandidates[r][targetCol].has(num)) {
                    eliminations.push({ row: r, col: targetCol, num: num });
                }
            }
            if (eliminations.length > 0) {
                return {
                    technique: '区块排除法 (宫到列)',
                    eliminations: eliminations,
                    explanation: '数字 ' + num + ' 在第 ' + (box + 1) + ' 宫内只能出现在第 ' + (targetCol + 1)
                        + ' 列，排除第 ' + (targetCol + 1) + ' 列在该宫以外的 ' + num + '。'
                };
            }
        }
    }
    return null;
}

// ==================== 7. 区块排除法（行到宫） ====================
function findBlockRowToBox() {
    for (let num = 1; num <= SIZE; num++) {
        for (let row = 0; row < SIZE; row++) {
            const allCols = [];
            for (let col = 0; col < SIZE; col++) {
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(num)) {
                    allCols.push(col);
                }
            }
            if (allCols.length < 2 || allCols.length > 3) continue;
            
            const targetBoxCol = Math.floor(allCols[0] / SUBSIZE);
            let sameBox = true;
            for (const col of allCols) {
                if (Math.floor(col / SUBSIZE) !== targetBoxCol) {
                    sameBox = false;
                    break;
                }
            }
            if (!sameBox) continue;
            
            const br = Math.floor(row / SUBSIZE) * SUBSIZE;
            const bc = targetBoxCol * SUBSIZE;
            const eliminations = [];
            for (let r = br; r < br + SUBSIZE; r++) {
                if (r !== row) {
                    for (let c = bc; c < bc + SUBSIZE; c++) {
                        if (currentBoard[r][c] === 0 && cellCandidates[r][c].has(num)) {
                            eliminations.push({ row: r, col: c, num: num });
                        }
                    }
                }
            }
            if (eliminations.length > 0) {
                return { technique: "区块排除法 (行到宫)", eliminations: eliminations,
                    explanation: `数字 ${num} 在第 ${row + 1} 行只能出现在第 ${targetBoxCol + 1} 宫，排除该宫其他行。` };
            }
        }
    }
    return null;
}

// ==================== 8. 区块排除法（列到宫） ====================
function findBlockColToBox() {
    for (let num = 1; num <= SIZE; num++) {
        for (let col = 0; col < SIZE; col++) {
            const allRows = [];
            for (let row = 0; row < SIZE; row++) {
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(num)) {
                    allRows.push(row);
                }
            }
            if (allRows.length < 2 || allRows.length > 3) continue;
            
            const targetBoxRow = Math.floor(allRows[0] / SUBSIZE);
            let sameBox = true;
            for (const row of allRows) {
                if (Math.floor(row / SUBSIZE) !== targetBoxRow) {
                    sameBox = false;
                    break;
                }
            }
            if (!sameBox) continue;
            
            const br = targetBoxRow * SUBSIZE;
            const bc = Math.floor(col / SUBSIZE) * SUBSIZE;
            const eliminations = [];
            for (let c = bc; c < bc + SUBSIZE; c++) {
                if (c !== col) {
                    for (let r = br; r < br + SUBSIZE; r++) {
                        if (currentBoard[r][c] === 0 && cellCandidates[r][c].has(num)) {
                            eliminations.push({ row: r, col: c, num: num });
                        }
                    }
                }
            }
            if (eliminations.length > 0) {
                return { technique: "区块排除法 (列到宫)", eliminations: eliminations,
                    explanation: `数字 ${num} 在第 ${col + 1} 列只能出现在第 ${targetBoxRow + 1} 宫，排除该宫其他列。` };
            }
        }
    }
    return null;
}

// ==================== 9. X-Wing ====================
function findXWing() {
    // 行X-Wing
    for (let num = 1; num <= SIZE; num++) {
        const rowsWithTwo = [], colPairs = [];
        for (let row = 0; row < SIZE; row++) {
            const cols = [];
            for (let col = 0; col < SIZE; col++) {
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(num)) {
                    cols.push(col);
                }
            }
            if (cols.length === 2) {
                rowsWithTwo.push(row);
                colPairs.push(cols.sort((a, b) => a - b));
            }
        }
        for (let i = 0; i < colPairs.length; i++) {
            for (let j = i + 1; j < colPairs.length; j++) {
                if (colPairs[i][0] === colPairs[j][0] && colPairs[i][1] === colPairs[j][1]) {
                    const c1 = colPairs[i][0], c2 = colPairs[i][1];
                    const row1 = rowsWithTwo[i], row2 = rowsWithTwo[j];
                    const eliminations = [];
                    for (let row = 0; row < SIZE; row++) {
                        if (row !== row1 && row !== row2) {
                            if (cellCandidates[row][c1].has(num)) {
                                eliminations.push({ row, col: c1, num });
                            }
                            if (cellCandidates[row][c2].has(num)) {
                                eliminations.push({ row, col: c2, num });
                            }
                        }
                    }
                    if (eliminations.length > 0) {
                        return { technique: "X-Wing", eliminations: eliminations,
                            graph: {
                                kind: 'pattern', technique: 'X-Wing',
                                digit: num,
                                shape: 'xwing',
                                baseLines: [
                                    { type: 'row', index: row1 }, { type: 'row', index: row2 }
                                ],
                                coverLines: [
                                    { type: 'col', index: c1 }, { type: 'col', index: c2 }
                                ],
                                corners: [
                                    { row: row1, col: c1 }, { row: row1, col: c2 },
                                    { row: row2, col: c1 }, { row: row2, col: c2 }
                                ],
                                nodes: [
                                    { row: row1, col: c1, digits: [num], order: 1 },
                                    { row: row1, col: c2, digits: [num], order: 2 },
                                    { row: row2, col: c2, digits: [num], order: 3 },
                                    { row: row2, col: c1, digits: [num], order: 4 }
                                ],
                                links: [
                                    { from: 0, to: 1, type: 'weak' },
                                    { from: 1, to: 2, type: 'weak' },
                                    { from: 2, to: 3, type: 'weak' },
                                    { from: 3, to: 0, type: 'weak' }
                                ]
                            },
                            explanation: `X-Wing结构：数字 ${num} 在第 ${row1 + 1},${row2 + 1} 行只能出现在第 ${c1 + 1},${c2 + 1} 列，排除其他行这两列的 ${num}。` };
                    }
                }
            }
        }
    }
    
    // 列X-Wing
    for (let num = 1; num <= SIZE; num++) {
        const colsWithTwo = [], rowPairs = [];
        for (let col = 0; col < SIZE; col++) {
            const rows = [];
            for (let row = 0; row < SIZE; row++) {
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(num)) {
                    rows.push(row);
                }
            }
            if (rows.length === 2) {
                colsWithTwo.push(col);
                rowPairs.push(rows.sort((a, b) => a - b));
            }
        }
        for (let i = 0; i < rowPairs.length; i++) {
            for (let j = i + 1; j < rowPairs.length; j++) {
                if (rowPairs[i][0] === rowPairs[j][0] && rowPairs[i][1] === rowPairs[j][1]) {
                    const r1 = rowPairs[i][0], r2 = rowPairs[i][1];
                    const col1 = colsWithTwo[i], col2 = colsWithTwo[j];
                    const eliminations = [];
                    for (let col = 0; col < SIZE; col++) {
                        if (col !== col1 && col !== col2) {
                            if (cellCandidates[r1][col].has(num)) {
                                eliminations.push({ row: r1, col, num });
                            }
                            if (cellCandidates[r2][col].has(num)) {
                                eliminations.push({ row: r2, col, num });
                            }
                        }
                    }
                    if (eliminations.length > 0) {
                        return { technique: "X-Wing", eliminations: eliminations,
                            graph: {
                                kind: 'pattern', technique: 'X-Wing',
                                digit: num,
                                shape: 'xwing',
                                baseLines: [
                                    { type: 'col', index: col1 }, { type: 'col', index: col2 }
                                ],
                                coverLines: [
                                    { type: 'row', index: r1 }, { type: 'row', index: r2 }
                                ],
                                corners: [
                                    { row: r1, col: col1 }, { row: r1, col: col2 },
                                    { row: r2, col: col1 }, { row: r2, col: col2 }
                                ],
                                nodes: [
                                    { row: r1, col: col1, digits: [num], order: 1 },
                                    { row: r2, col: col1, digits: [num], order: 2 },
                                    { row: r2, col: col2, digits: [num], order: 3 },
                                    { row: r1, col: col2, digits: [num], order: 4 }
                                ],
                                links: [
                                    { from: 0, to: 1, type: 'weak' },
                                    { from: 1, to: 2, type: 'weak' },
                                    { from: 2, to: 3, type: 'weak' },
                                    { from: 3, to: 0, type: 'weak' }
                                ]
                            },
                            explanation: `X-Wing结构：数字 ${num} 在第 ${col1 + 1},${col2 + 1} 列只能出现在第 ${r1 + 1},${r2 + 1} 行，排除其他列这两行的 ${num}。` };
                    }
                }
            }
        }
    }
    return null;
}

// ==================== 10. Swordfish ====================
function findSwordfish() {
    for (let num = 1; num <= SIZE; num++) {
        const rows = [], colsList = [];
        for (let row = 0; row < SIZE; row++) {
            const cols = [];
            for (let col = 0; col < SIZE; col++) {
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(num)) {
                    cols.push(col);
                }
            }
            if (cols.length === 2 || cols.length === 3) {
                rows.push(row);
                colsList.push(cols.sort((a, b) => a - b));
            }
        }
        if (rows.length >= 3) {
            for (let i = 0; i < rows.length - 2; i++) {
                for (let j = i + 1; j < rows.length - 1; j++) {
                    for (let k = j + 1; k < rows.length; k++) {
                        const allCols = new Set([...colsList[i], ...colsList[j], ...colsList[k]]);
                        if (allCols.size === 3) {
                            const colList = Array.from(allCols);
                            const eliminations = [];
                            for (let row = 0; row < SIZE; row++) {
                                if (row !== rows[i] && row !== rows[j] && row !== rows[k]) {
                                    for (const col of colList) {
                                        if (cellCandidates[row][col].has(num)) {
                                            eliminations.push({ row, col, num });
                                        }
                                    }
                                }
                            }
                            if (eliminations.length > 0) {
                                return { technique: "剑鱼法 (Swordfish)", eliminations: eliminations,
                                    graph: {
                                        kind: 'pattern', technique: '剑鱼法 (Swordfish)',
                                        digit: num,
                                        shape: 'fish',
                                        baseLines: [
                                            { type: 'row', index: rows[i] },
                                            { type: 'row', index: rows[j] },
                                            { type: 'row', index: rows[k] }
                                        ],
                                        coverLines: colList.map(c => ({ type: 'col', index: c })),
                                        corners: (function () {
                                            const out = [];
                                            const rs = [rows[i], rows[j], rows[k]];
                                            for (let a = 0; a < rs.length; a++) {
                                                for (let b = 0; b < colList.length; b++) {
                                                    if (currentBoard[rs[a]][colList[b]] === 0 &&
                                                        cellCandidates[rs[a]][colList[b]].has(num)) {
                                                        out.push({ row: rs[a], col: colList[b] });
                                                    }
                                                }
                                            }
                                            return out;
                                        })(),
                                        nodes: [], links: []
                                    },
                                    explanation: `剑鱼结构：数字 ${num} 在第 ${rows[i] + 1},${rows[j] + 1},${rows[k] + 1} 行只能出现在第 ${colList.map(c => c + 1).join(',')} 列，排除其他行这些列的 ${num}。` };
                            }
                        }
                    }
                }
            }
        }
    }
    return null;
}

// ==================== 11. XY-Wing ====================
function findXYWing() {
    const bivalue = [];
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
            if (currentBoard[i][j] === 0 && cellCandidates[i][j].size === 2) {
                const cand = Array.from(cellCandidates[i][j]);
                bivalue.push({ row: i, col: j, a: cand[0], b: cand[1] });
            }
        }
    }
    
    function isVisible(p1, p2) {
        return p1.row === p2.row || p1.col === p2.col || 
            (Math.floor(p1.row / SUBSIZE) === Math.floor(p2.row / SUBSIZE) && 
             Math.floor(p1.col / SUBSIZE) === Math.floor(p2.col / SUBSIZE));
    }
    
    function findCommonVisibleCells(p1, p2) {
        const common = [];
        if (p1.row === p2.row) {
            for (let c = 0; c < SIZE; c++) {
                if (c !== p1.col && c !== p2.col && currentBoard[p1.row][c] === 0) {
                    common.push({ row: p1.row, col: c });
                }
            }
        } else if (p1.col === p2.col) {
            for (let r = 0; r < SIZE; r++) {
                if (r !== p1.row && r !== p2.row && currentBoard[r][p1.col] === 0) {
                    common.push({ row: r, col: p1.col });
                }
            }
        } else if (Math.floor(p1.row / SUBSIZE) === Math.floor(p2.row / SUBSIZE) &&
                   Math.floor(p1.col / SUBSIZE) === Math.floor(p2.col / SUBSIZE)) {
            const br = Math.floor(p1.row / SUBSIZE) * SUBSIZE;
            const bc = Math.floor(p1.col / SUBSIZE) * SUBSIZE;
            for (let i = 0; i < SUBSIZE; i++) {
                for (let j = 0; j < SUBSIZE; j++) {
                    const r = br + i, c = bc + j;
                    if (!(r === p1.row && c === p1.col) && !(r === p2.row && c === p2.col) && 
                        currentBoard[r][c] === 0) {
                        common.push({ row: r, col: c });
                    }
                }
            }
        }
        return common;
    }
    
    for (let p = 0; p < bivalue.length; p++) {
        const pivot = bivalue[p];
        for (let a = 0; a < bivalue.length; a++) {
            if (a === p) continue;
            const wing1 = bivalue[a];
            if (!isVisible(pivot, wing1)) continue;
            for (let b = a + 1; b < bivalue.length; b++) {
                if (b === p) continue;
                const wing2 = bivalue[b];
                if (!isVisible(pivot, wing2)) continue;
                // 修复：标准 XY-Wing 只要求两翼各自与枢纽互相可见，
                // 并不要求两翼彼此可见（旧代码此处恒为 false，导致该技法从不触发）
                
                const x = pivot.a, y = pivot.b;
                const a1 = wing1.a, a2 = wing1.b;
                const b1 = wing2.a, b2 = wing2.b;
                
                const wing1HasX = (a1 === x || a2 === x);
                const wing1HasY = (a1 === y || a2 === y);
                const wing2HasX = (b1 === x || b2 === x);
                const wing2HasY = (b1 === y || b2 === y);
                
                let z = -1;
                let valid = false;
                
                if (wing1HasX && wing2HasY) {
                    z = (a1 === x) ? a2 : a1;
                    const z2 = (b1 === y) ? b2 : b1;
                    if (z === z2) valid = true;
                } else if (wing1HasY && wing2HasX) {
                    z = (a1 === y) ? a2 : a1;
                    const z2 = (b1 === x) ? b2 : b1;
                    if (z === z2) valid = true;
                }
                
                if (valid) {
                    const commonCells = findCommonVisibleCells(wing1, wing2);
                    const eliminations = [];
                    for (const cell of commonCells) {
                        if (cellCandidates[cell.row][cell.col].has(z)) {
                            eliminations.push({ row: cell.row, col: cell.col, num: z });
                        }
                    }
                    if (eliminations.length > 0) {
                        return { technique: "XY-Wing", eliminations: eliminations,
                            explanation: `XY-Wing结构：枢纽 (${pivot.row + 1},${pivot.col + 1}) [${x},${y}]，两翼 (${wing1.row + 1},${wing1.col + 1}) [${a1},${a2}] 和 (${wing2.row + 1},${wing2.col + 1}) [${b1},${b2}]，排除共同可见格中的 ${z}。` };
                    }
                }
            }
        }
    }
    return null;
}

// ==================== 12. XYZ-Wing（修正版 - 完全对齐后端逻辑） ====================
function findXYZWing() {
    const trivalue = [];
    const bivalue = [];
    
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
            if (currentBoard[i][j] === 0) {
                const cand = Array.from(cellCandidates[i][j]);
                if (cand.length === 3) {
                    trivalue.push({ row: i, col: j, cand: cand });
                } else if (cand.length === 2) {
                    bivalue.push({ row: i, col: j, a: cand[0], b: cand[1] });
                }
            }
        }
    }
    
    if (trivalue.length === 0 || bivalue.length < 2) return null;
    
    function isVisible(p1, p2) {
        return p1.row === p2.row || p1.col === p2.col || 
            (Math.floor(p1.row / SUBSIZE) === Math.floor(p2.row / SUBSIZE) && 
             Math.floor(p1.col / SUBSIZE) === Math.floor(p2.col / SUBSIZE));
    }
    
    function findCommonVisibleCells(p1, p2) {
        const common = [];
        if (p1.row === p2.row) {
            for (let c = 0; c < SIZE; c++) {
                if (c !== p1.col && c !== p2.col && currentBoard[p1.row][c] === 0) {
                    common.push({ row: p1.row, col: c });
                }
            }
        } else if (p1.col === p2.col) {
            for (let r = 0; r < SIZE; r++) {
                if (r !== p1.row && r !== p2.row && currentBoard[r][p1.col] === 0) {
                    common.push({ row: r, col: p1.col });
                }
            }
        } else if (Math.floor(p1.row / SUBSIZE) === Math.floor(p2.row / SUBSIZE) &&
                   Math.floor(p1.col / SUBSIZE) === Math.floor(p2.col / SUBSIZE)) {
            const br = Math.floor(p1.row / SUBSIZE) * SUBSIZE;
            const bc = Math.floor(p1.col / SUBSIZE) * SUBSIZE;
            for (let i = 0; i < SUBSIZE; i++) {
                for (let j = 0; j < SUBSIZE; j++) {
                    const r = br + i, c = bc + j;
                    if (!(r === p1.row && c === p1.col) && !(r === p2.row && c === p2.col) && 
                        currentBoard[r][c] === 0) {
                        common.push({ row: r, col: c });
                    }
                }
            }
        }
        return common;
    }
    
    function isSubset(set1, set2) {
        for (const item of set1) {
            if (!set2.has(item)) return false;
        }
        return true;
    }
    
    // XYZ-Wing: 枢纽是三值 (X,Y,Z)，两翼是双值
    // 关键条件：
    // 1. 枢纽与两个翅膀都可见
    // 2. 两个翅膀互不可见
    // 3. 翅膀1的候选是枢纽的子集
    // 4. 翅膀2的候选是枢纽的子集
    // 5. 三个格子的候选数并集大小正好为3
    // 6. 两个翅膀有一个共同数字
    
    for (const pivot of trivalue) {
        const pivotSet = new Set(pivot.cand);
        
        for (let i = 0; i < bivalue.length; i++) {
            const wing1 = bivalue[i];
            // 枢纽与翅膀1必须可见
            if (!isVisible(pivot, wing1)) continue;
            
            const wing1Set = new Set([wing1.a, wing1.b]);
            // 翅膀1必须是枢纽的子集
            if (!isSubset(wing1Set, pivotSet)) continue;
            
            for (let j = i + 1; j < bivalue.length; j++) {
                const wing2 = bivalue[j];
                // 枢纽与翅膀2必须可见
                if (!isVisible(pivot, wing2)) continue;
                // 两个翅膀互不可见
                if (isVisible(wing1, wing2)) continue;
                
                const wing2Set = new Set([wing2.a, wing2.b]);
                // 翅膀2必须是枢纽的子集
                if (!isSubset(wing2Set, pivotSet)) continue;
                
                // 三个格子的候选数并集大小必须为3
                const union = new Set([...pivot.cand, wing1.a, wing1.b, wing2.a, wing2.b]);
                if (union.size !== 3) continue;
                
                // 找出两个翅膀的共同数字
                const common = new Set();
                for (const num of wing1Set) {
                    if (wing2Set.has(num)) common.add(num);
                }
                
                if (common.size === 1) {
                    const commonNum = Array.from(common)[0];
                    
                    // 排除的是枢纽与两个翅膀共同可见格中的这个数字
                    const commonCells1 = findCommonVisibleCells(pivot, wing1);
                    const commonCells2 = findCommonVisibleCells(pivot, wing2);
                    
                    // 取交集（同时与枢纽和翅膀可见的格子）
                    const cellSet1 = new Set(commonCells1.map(c => `${c.row},${c.col}`));
                    const cellSet2 = new Set(commonCells2.map(c => `${c.row},${c.col}`));
                    const intersection = [];
                    for (const key of cellSet1) {
                        if (cellSet2.has(key)) {
                            const [row, col] = key.split(',').map(Number);
                            intersection.push({ row, col });
                        }
                    }
                    
                    const eliminations = [];
                    const seen = new Set();
                    for (const cell of intersection) {
                        const key = `${cell.row},${cell.col}`;
                        if (!seen.has(key) && cellCandidates[cell.row][cell.col].has(commonNum)) {
                            seen.add(key);
                            eliminations.push({ row: cell.row, col: cell.col, num: commonNum });
                        }
                    }
                    
                    if (eliminations.length > 0) {
                        return { technique: "XYZ-Wing", eliminations: eliminations,
                            explanation: `XYZ-Wing结构：枢纽 (${pivot.row+1},${pivot.col+1}) 候选 [${pivot.cand.join(',')}]，两翼 (${wing1.row+1},${wing1.col+1}) [${wing1.a},${wing1.b}] 和 (${wing2.row+1},${wing2.col+1}) [${wing2.a},${wing2.b}]，排除共同可见格中的 ${commonNum}。` };
                    }
                }
            }
        }
    }
    return null;
}

// ==================== 13. 摩天楼法 (Skyscraper) ====================
function findSkyscraper() {
    for (let num = 1; num <= SIZE; num++) {
        const rowPositions = [];
        for (let row = 0; row < SIZE; row++) {
            const cols = [];
            for (let col = 0; col < SIZE; col++) {
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(num)) {
                    cols.push(col);
                }
            }
            if (cols.length === 2) {
                rowPositions.push({ row: row, cols: cols.sort((a, b) => a - b) });
            }
        }
        for (let i = 0; i < rowPositions.length; i++) {
            for (let j = i + 1; j < rowPositions.length; j++) {
                const r1 = rowPositions[i], r2 = rowPositions[j];
                if (r1.cols[0] === r2.cols[0]) {
                    const diffCol1 = r1.cols[1];
                    const diffCol2 = r2.cols[1];
                    if (diffCol1 !== diffCol2) {
                        const eliminations = [];
                        if (cellCandidates[r1.row][diffCol2].has(num)) {
                            eliminations.push({ row: r1.row, col: diffCol2, num: num });
                        }
                        if (cellCandidates[r2.row][diffCol1].has(num)) {
                            eliminations.push({ row: r2.row, col: diffCol1, num: num });
                        }
                        if (eliminations.length > 0) {
                            return { technique: "摩天楼法 (Skyscraper)", eliminations: eliminations,
                                explanation: `摩天楼结构：数字 ${num} 在第 ${r1.row + 1},${r2.row + 1} 行形成摩天楼，排除 (${r1.row + 1},${diffCol2 + 1}) 和 (${r2.row + 1},${diffCol1 + 1}) 中的 ${num}。` };
                        }
                    }
                }
            }
        }
    }
    return null;
}

// ==================== 14. 双线风筝法 ====================
function findTwoStringKite() {
    for (let num = 1; num <= SIZE; num++) {
        // 收集每行该数字的候选位置
        const rowPositions = [];
        for (let row = 0; row < SIZE; row++) {
            const cols = [];
            for (let col = 0; col < SIZE; col++) {
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(num)) {
                    cols.push(col);
                }
            }
            if (cols.length === 2) {
                rowPositions.push({ row: row, colA: cols[0], colB: cols[1] });
            }
        }
        
        // 收集每列该数字的候选位置
        const colPositions = [];
        for (let col = 0; col < SIZE; col++) {
            const rows = [];
            for (let row = 0; row < SIZE; row++) {
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(num)) {
                    rows.push(row);
                }
            }
            if (rows.length === 2) {
                colPositions.push({ col: col, rowA: rows[0], rowB: rows[1] });
            }
        }
        
        for (const rowItem of rowPositions) {
            const row = rowItem.row;
            const colA = rowItem.colA;
            const colB = rowItem.colB;
            for (const colItem of colPositions) {
                const col = colItem.col;
                const rowC = colItem.rowA;
                const rowD = colItem.rowB;
                
                // 确保四个位置互不相同
                const positions = new Set();
                positions.add(`${row},${colA}`);
                positions.add(`${row},${colB}`);
                positions.add(`${rowC},${col}`);
                positions.add(`${rowD},${col}`);
                if (positions.size < 4) continue;
                
                // 情况1: (R, Ca) 和 (Rc, C) 在同一宫 → 排除 (Rd, Cb)
                if (Math.floor(row / SUBSIZE) === Math.floor(rowC / SUBSIZE) &&
                    Math.floor(colA / SUBSIZE) === Math.floor(col / SUBSIZE)) {
                    if (rowD >= 0 && rowD < SIZE && colB >= 0 && colB < SIZE &&
                        currentBoard[rowD][colB] === 0 && cellCandidates[rowD][colB].has(num)) {
                        const eliminations = [{ row: rowD, col: colB, num: num }];
                        return { technique: "双线风筝法", eliminations: eliminations,
                            explanation: `双线风筝法：数字 ${num} 在行 ${row + 1}(列${colA + 1},${colB + 1}) 和列 ${col + 1}(行${rowC + 1},${rowD + 1}) 形成风筝结构，排除 (${rowD + 1},${colB + 1}) 中的 ${num}。` };
                    }
                }
                
                // 情况2: (R, Cb) 和 (Rd, C) 在同一宫 → 排除 (Rc, Ca)
                if (Math.floor(row / SUBSIZE) === Math.floor(rowD / SUBSIZE) &&
                    Math.floor(colB / SUBSIZE) === Math.floor(col / SUBSIZE)) {
                    if (rowC >= 0 && rowC < SIZE && colA >= 0 && colA < SIZE &&
                        currentBoard[rowC][colA] === 0 && cellCandidates[rowC][colA].has(num)) {
                        const eliminations = [{ row: rowC, col: colA, num: num }];
                        return { technique: "双线风筝法", eliminations: eliminations,
                            explanation: `双线风筝法：数字 ${num} 在行 ${row + 1}(列${colA + 1},${colB + 1}) 和列 ${col + 1}(行${rowC + 1},${rowD + 1}) 形成风筝结构，排除 (${rowC + 1},${colA + 1}) 中的 ${num}。` };
                    }
                }
                
                // 情况3: (R, Ca) 和 (Rd, C) 在同一宫 → 排除 (Rc, Cb)
                if (Math.floor(row / SUBSIZE) === Math.floor(rowD / SUBSIZE) &&
                    Math.floor(colA / SUBSIZE) === Math.floor(col / SUBSIZE)) {
                    if (rowC >= 0 && rowC < SIZE && colB >= 0 && colB < SIZE &&
                        currentBoard[rowC][colB] === 0 && cellCandidates[rowC][colB].has(num)) {
                        const eliminations = [{ row: rowC, col: colB, num: num }];
                        return { technique: "双线风筝法", eliminations: eliminations,
                            explanation: `双线风筝法：数字 ${num} 在行 ${row + 1}(列${colA + 1},${colB + 1}) 和列 ${col + 1}(行${rowC + 1},${rowD + 1}) 形成风筝结构，排除 (${rowC + 1},${colB + 1}) 中的 ${num}。` };
                    }
                }
                
                // 情况4: (R, Cb) 和 (Rc, C) 在同一宫 → 排除 (Rd, Ca)
                if (Math.floor(row / SUBSIZE) === Math.floor(rowC / SUBSIZE) &&
                    Math.floor(colB / SUBSIZE) === Math.floor(col / SUBSIZE)) {
                    if (rowD >= 0 && rowD < SIZE && colA >= 0 && colA < SIZE &&
                        currentBoard[rowD][colA] === 0 && cellCandidates[rowD][colA].has(num)) {
                        const eliminations = [{ row: rowD, col: colA, num: num }];
                        return { technique: "双线风筝法", eliminations: eliminations,
                            explanation: `双线风筝法：数字 ${num} 在行 ${row + 1}(列${colA + 1},${colB + 1}) 和列 ${col + 1}(行${rowC + 1},${rowD + 1}) 形成风筝结构，排除 (${rowD + 1},${colA + 1}) 中的 ${num}。` };
                    }
                }
            }
        }
    }
    return null;
}

// ==================== 15. 空矩形法 ====================
function findEmptyRectangle() {
    for (let num = 1; num <= SIZE; num++) {
        for (let box = 0; box < SIZE; box++) {
            const br = Math.floor(box / SUBSIZE) * SUBSIZE;
            const bc = (box % SUBSIZE) * SUBSIZE;
            const positions = [];
            for (let i = 0; i < SUBSIZE; i++) {
                for (let j = 0; j < SUBSIZE; j++) {
                    const row = br + i, col = bc + j;
                    if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(num)) {
                        positions.push({ row, col });
                    }
                }
            }
            if (positions.length >= 2 && positions.length <= 4) {
                const rows = new Set(positions.map(p => p.row));
                const cols = new Set(positions.map(p => p.col));
                if (rows.size === 1) {
                    const targetRow = Array.from(rows)[0];
                    const eliminations = [];
                    for (let col = 0; col < SIZE; col++) {
                        if (Math.floor(col / SUBSIZE) !== Math.floor(bc / SUBSIZE)) {
                            if (cellCandidates[targetRow][col].has(num)) {
                                eliminations.push({ row: targetRow, col: col, num: num });
                            }
                        }
                    }
                    if (eliminations.length > 0) {
                        return { technique: "空矩形法", eliminations: eliminations,
                            explanation: `空矩形结构：第 ${box + 1} 宫中数字 ${num} 只能出现在第 ${targetRow + 1} 行，排除该行其他宫中的 ${num}。` };
                    }
                } else if (cols.size === 1) {
                    const targetCol = Array.from(cols)[0];
                    const eliminations = [];
                    for (let row = 0; row < SIZE; row++) {
                        if (Math.floor(row / SUBSIZE) !== Math.floor(br / SUBSIZE)) {
                            if (cellCandidates[row][targetCol].has(num)) {
                                eliminations.push({ row: row, col: targetCol, num: num });
                            }
                        }
                    }
                    if (eliminations.length > 0) {
                        return { technique: "空矩形法", eliminations: eliminations,
                            explanation: `空矩形结构：第 ${box + 1} 宫中数字 ${num} 只能出现在第 ${targetCol + 1} 列，排除该列其他宫中的 ${num}。` };
                    }
                }
            }
        }
    }
    return null;
}
// ==================== 16. 唯一矩形 (Unique Rectangle) ====================
function findUniqueRectangle() {
    for (let row1 = 0; row1 < SIZE - 1; row1++) {
        for (let row2 = row1 + 1; row2 < SIZE; row2++) {
            for (let col1 = 0; col1 < SIZE - 1; col1++) {
                for (let col2 = col1 + 1; col2 < SIZE; col2++) {
                    const v1 = currentBoard[row1][col1];
                    const v2 = currentBoard[row1][col2];
                    const v3 = currentBoard[row2][col1];
                    const v4 = currentBoard[row2][col2];
                    
                    if (v1 !== 0 && v2 !== 0 && v3 !== 0 && v4 !== 0) continue;
                    
                    const cand1 = Array.from(cellCandidates[row1][col1]);
                    const cand2 = Array.from(cellCandidates[row1][col2]);
                    const cand3 = Array.from(cellCandidates[row2][col1]);
                    const cand4 = Array.from(cellCandidates[row2][col2]);
                    
                    if (cand1.length === 2 && cand2.length === 2 && cand3.length === 2 &&
                        cand1.sort().toString() === cand2.sort().toString() &&
                        cand1.toString() === cand3.sort().toString() &&
                        cand4.length > 2) {
                        
                        const eliminations = [];
                        for (const num of cand1) {
                            if (cand4.includes(num)) {
                                if (cellCandidates[row2][col2].has(num)) {
                                    eliminations.push({ row: row2, col: col2, num: num });
                                }
                            }
                        }
                        if (eliminations.length > 0) {
                            return { technique: "唯一矩形 (Unique Rectangle)", eliminations: eliminations,
                                explanation: `唯一矩形结构：矩形 (${row1+1},${col1+1}), (${row1+1},${col2+1}), (${row2+1},${col1+1}), (${row2+1},${col2+1}) 形成唯一矩形，可排除候选数。` };
                        }
                    }
                }
            }
        }
    }
    return null;
}


// ==================== 19. W-Wing ====================
function findWWing() {
    const bivalue = [];
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
            if (currentBoard[i][j] === 0 && cellCandidates[i][j].size === 2) {
                const cand = Array.from(cellCandidates[i][j]);
                bivalue.push({ row: i, col: j, a: cand[0], b: cand[1] });
            }
        }
    }
    
    function isVisible(p1, p2) {
        return p1.row === p2.row || p1.col === p2.col || 
            (Math.floor(p1.row / SUBSIZE) === Math.floor(p2.row / SUBSIZE) && 
             Math.floor(p1.col / SUBSIZE) === Math.floor(p2.col / SUBSIZE));
    }
    
    function findCommonVisibleCells(p1, p2) {
        const common = [];
        if (p1.row === p2.row) {
            for (let c = 0; c < SIZE; c++) {
                if (c !== p1.col && c !== p2.col && currentBoard[p1.row][c] === 0) {
                    common.push({ row: p1.row, col: c });
                }
            }
        } else if (p1.col === p2.col) {
            for (let r = 0; r < SIZE; r++) {
                if (r !== p1.row && r !== p2.row && currentBoard[r][p1.col] === 0) {
                    common.push({ row: r, col: p1.col });
                }
            }
        } else if (Math.floor(p1.row / SUBSIZE) === Math.floor(p2.row / SUBSIZE) &&
                   Math.floor(p1.col / SUBSIZE) === Math.floor(p2.col / SUBSIZE)) {
            const br = Math.floor(p1.row / SUBSIZE) * SUBSIZE;
            const bc = Math.floor(p1.col / SUBSIZE) * SUBSIZE;
            for (let i = 0; i < SUBSIZE; i++) {
                for (let j = 0; j < SUBSIZE; j++) {
                    const r = br + i, c = bc + j;
                    if (!(r === p1.row && c === p1.col) && !(r === p2.row && c === p2.col) && 
                        currentBoard[r][c] === 0) {
                        common.push({ row: r, col: c });
                    }
                }
            }
        }
        return common;
    }
    
    function hasStrongLink(cell1, cell2, linkNum) {
        // 检查行强链接
        if (cell1.row === cell2.row) {
            let count = 0;
            for (let col = 0; col < SIZE; col++) {
                if (currentBoard[cell1.row][col] === 0 && cellCandidates[cell1.row][col].has(linkNum)) {
                    count++;
                }
            }
            return count === 2;
        }
        // 检查列强链接
        if (cell1.col === cell2.col) {
            let count = 0;
            for (let row = 0; row < SIZE; row++) {
                if (currentBoard[row][cell1.col] === 0 && cellCandidates[row][cell1.col].has(linkNum)) {
                    count++;
                }
            }
            return count === 2;
        }
        // 检查宫强链接
        if (Math.floor(cell1.row / SUBSIZE) === Math.floor(cell2.row / SUBSIZE) &&
            Math.floor(cell1.col / SUBSIZE) === Math.floor(cell2.col / SUBSIZE)) {
            const br = Math.floor(cell1.row / SUBSIZE) * SUBSIZE;
            const bc = Math.floor(cell1.col / SUBSIZE) * SUBSIZE;
            let count = 0;
            for (let i = 0; i < SUBSIZE; i++) {
                for (let j = 0; j < SUBSIZE; j++) {
                    const row = br + i, col = bc + j;
                    if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(linkNum)) {
                        count++;
                    }
                }
            }
            return count === 2;
        }
        return false;
    }
    
    for (let i = 0; i < bivalue.length; i++) {
        for (let j = i + 1; j < bivalue.length; j++) {
            const cell1 = bivalue[i];
            const cell2 = bivalue[j];
            
            if (!((cell1.a === cell2.a && cell1.b === cell2.b) ||
                  (cell1.a === cell2.b && cell1.b === cell2.a))) continue;
            
            if (isVisible(cell1, cell2)) continue;
            
            const numA = cell1.a;
            const numB = cell1.b;
            
            if (hasStrongLink(cell1, cell2, numA)) {
                const commonCells = findCommonVisibleCells(cell1, cell2);
                const eliminations = [];
                for (const cell of commonCells) {
                    if (cellCandidates[cell.row][cell.col].has(numB)) {
                        eliminations.push({ row: cell.row, col: cell.col, num: numB });
                    }
                }
                if (eliminations.length > 0) {
                    return { technique: "W-Wing", eliminations: eliminations,
                        explanation: `W-Wing：单元格 (${cell1.row+1},${cell1.col+1}) 和 (${cell2.row+1},${cell2.col+1}) 都包含 [${numA},${numB}]，通过数字 ${numA} 的强链接连接，排除共同可见格中的 ${numB}。` };
                }
            }
            
            if (hasStrongLink(cell1, cell2, numB)) {
                const commonCells = findCommonVisibleCells(cell1, cell2);
                const eliminations = [];
                for (const cell of commonCells) {
                    if (cellCandidates[cell.row][cell.col].has(numA)) {
                        eliminations.push({ row: cell.row, col: cell.col, num: numA });
                    }
                }
                if (eliminations.length > 0) {
                    return { technique: "W-Wing", eliminations: eliminations,
                        explanation: `W-Wing：单元格 (${cell1.row+1},${cell1.col+1}) 和 (${cell2.row+1},${cell2.col+1}) 都包含 [${numA},${numB}]，通过数字 ${numB} 的强链接连接，排除共同可见格中的 ${numA}。` };
                }
            }
        }
    }
    return null;
}

// ==================== 20. 强制链 (Forcing Chain) ====================
function findForcingChain() {
    let targetRow = -1, targetCol = -1;
    let targetCandidates = [];
    let minCandidates = 5;
    
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
            if (currentBoard[i][j] === 0) {
                const cand = Array.from(cellCandidates[i][j]);
                if (cand.length > 1 && cand.length < minCandidates) {
                    minCandidates = cand.length;
                    targetRow = i;
                    targetCol = j;
                    targetCandidates = cand;
                    if (cand.length === 2) break;
                }
            }
        }
        if (targetRow !== -1 && minCandidates === 2) break;
    }
    
    if (targetRow === -1) return null;
    
    function copyBoard() {
        const copy = Array(9).fill().map(() => Array(9).fill(0));
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                copy[i][j] = currentBoard[i][j];
            }
        }
        return copy;
    }
    
    function propagateSimple(board, candidates) {
        let changed;
        do {
            changed = false;
            for (let i = 0; i < SIZE; i++) {
                for (let j = 0; j < SIZE; j++) {
                    if (board[i][j] === 0) {
                        const cand = candidates[i][j];
                        if (cand.size === 0) return false;
                        if (cand.size === 1) {
                            const num = Array.from(cand)[0];
                            board[i][j] = num;
                            for (let c = 0; c < SIZE; c++) candidates[i][c].delete(num);
                            for (let r = 0; r < SIZE; r++) candidates[r][j].delete(num);
                            const br = Math.floor(i / SUBSIZE) * SUBSIZE;
                            const bc = Math.floor(j / SUBSIZE) * SUBSIZE;
                            for (let r = 0; r < SUBSIZE; r++) {
                                for (let c = 0; c < SUBSIZE; c++) {
                                    candidates[br + r][bc + c].delete(num);
                                }
                            }
                            changed = true;
                        }
                    }
                }
            }
        } while (changed);
        return true;
    }
    
    const results = [];
    const validNumbers = [];
    
    for (const testNum of targetCandidates) {
        const testBoard = copyBoard();
        const testCandidates = Array(9).fill().map(() => Array(9).fill().map(() => new Set()));
        
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                if (testBoard[i][j] === 0) {
                    for (const num of cellCandidates[i][j]) {
                        testCandidates[i][j].add(num);
                    }
                }
            }
        }
        
        testBoard[targetRow][targetCol] = testNum;
        for (let c = 0; c < SIZE; c++) testCandidates[targetRow][c].delete(testNum);
        for (let r = 0; r < SIZE; r++) testCandidates[r][targetCol].delete(testNum);
        const br = Math.floor(targetRow / SUBSIZE) * SUBSIZE;
        const bc = Math.floor(targetCol / SUBSIZE) * SUBSIZE;
        for (let r = 0; r < SUBSIZE; r++) {
            for (let c = 0; c < SUBSIZE; c++) {
                testCandidates[br + r][bc + c].delete(testNum);
            }
        }
        
        if (propagateSimple(testBoard, testCandidates)) {
            validNumbers.push(testNum);
            results.push(`✓ 假设 (${targetRow+1},${targetCol+1})=${testNum} 可以推导出有效解`);
        } else {
            results.push(`✗ 假设 (${targetRow+1},${targetCol+1})=${testNum} 导致矛盾`);
        }
    }
    
    if (validNumbers.length === 1) {
        const resultNum = validNumbers[0];
        return { row: targetRow, col: targetCol, value: resultNum, technique: "强制链", eliminations: [],
            explanation: `【强制链推导】\n\n${results.join('\n')}\n\n因此 (${targetRow+1},${targetCol+1}) 必须填入 ${resultNum}。` };
    }
    
    return null;
}


// ==================== 22. Jellyfish ====================
function findJellyfish() {
    for (let num = 1; num <= SIZE; num++) {
        // 行Jellyfish
        const rowsWith2To4 = [];
        const colsList = [];
        for (let row = 0; row < SIZE; row++) {
            const cols = [];
            for (let col = 0; col < SIZE; col++) {
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(num)) {
                    cols.push(col);
                }
            }
            if (cols.length >= 2 && cols.length <= 4) {
                rowsWith2To4.push(row);
                colsList.push(cols.sort((a, b) => a - b));
            }
        }
        
        if (rowsWith2To4.length >= 4) {
            for (let i = 0; i < rowsWith2To4.length - 3; i++) {
                for (let j = i + 1; j < rowsWith2To4.length - 2; j++) {
                    for (let k = j + 1; k < rowsWith2To4.length - 1; k++) {
                        for (let l = k + 1; l < rowsWith2To4.length; l++) {
                            const allCols = new Set([...colsList[i], ...colsList[j], ...colsList[k], ...colsList[l]]);
                            if (allCols.size === 4) {
                                const colList = Array.from(allCols);
                                const eliminations = [];
                                for (let row = 0; row < SIZE; row++) {
                                    if (row !== rowsWith2To4[i] && row !== rowsWith2To4[j] && 
                                        row !== rowsWith2To4[k] && row !== rowsWith2To4[l]) {
                                        for (const col of colList) {
                                            if (cellCandidates[row][col].has(num)) {
                                                eliminations.push({ row, col, num });
                                            }
                                        }
                                    }
                                }
                                if (eliminations.length > 0) {
                                    return { technique: "Jellyfish (4阶鱼)", eliminations: eliminations,
                                        explanation: `Jellyfish结构：数字 ${num} 在第 ${rowsWith2To4.map(r => r + 1).join(',')} 行只能出现在第 ${colList.map(c => c + 1).join(',')} 列，排除其他行这些列的 ${num}。` };
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // 列Jellyfish
        const colsWith2To4 = [];
        const rowsList = [];
        for (let col = 0; col < SIZE; col++) {
            const rows = [];
            for (let row = 0; row < SIZE; row++) {
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(num)) {
                    rows.push(row);
                }
            }
            if (rows.length >= 2 && rows.length <= 4) {
                colsWith2To4.push(col);
                rowsList.push(rows.sort((a, b) => a - b));
            }
        }
        
        if (colsWith2To4.length >= 4) {
            for (let i = 0; i < colsWith2To4.length - 3; i++) {
                for (let j = i + 1; j < colsWith2To4.length - 2; j++) {
                    for (let k = j + 1; k < colsWith2To4.length - 1; k++) {
                        for (let l = k + 1; l < colsWith2To4.length; l++) {
                            const allRows = new Set([...rowsList[i], ...rowsList[j], ...rowsList[k], ...rowsList[l]]);
                            if (allRows.size === 4) {
                                const rowList = Array.from(allRows);
                                const eliminations = [];
                                for (let col = 0; col < SIZE; col++) {
                                    if (col !== colsWith2To4[i] && col !== colsWith2To4[j] && 
                                        col !== colsWith2To4[k] && col !== colsWith2To4[l]) {
                                        for (const row of rowList) {
                                            if (cellCandidates[row][col].has(num)) {
                                                eliminations.push({ row, col, num });
                                            }
                                        }
                                    }
                                }
                                if (eliminations.length > 0) {
                                    return { technique: "Jellyfish (4阶鱼)", eliminations: eliminations,
                                        explanation: `Jellyfish结构：数字 ${num} 在第 ${colsWith2To4.map(c => c + 1).join(',')} 列只能出现在第 ${rowList.map(r => r + 1).join(',')} 行，排除其他列这些行的 ${num}。` };
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return null;
}

// ==================== 23. BUG+1 ====================
function findBUGPlus1() {
    let bivalueCount = 0;
    let bugRow = -1, bugCol = -1;
    let bugCandidates = null;
    
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
            if (currentBoard[i][j] === 0) {
                const cand = Array.from(cellCandidates[i][j]);
                if (cand.length === 2) {
                    bivalueCount++;
                } else if (cand.length === 3) {
                    if (bugRow !== -1) return null;
                    bugRow = i;
                    bugCol = j;
                    bugCandidates = cand;
                } else if (cand.length !== 2 && cand.length !== 3) {
                    return null;
                }
            }
        }
    }
    
    if (bugRow !== -1 && bivalueCount === 80) {
        for (const testNum of bugCandidates) {
            let rowCount = 0;
            for (let col = 0; col < SIZE; col++) {
                if (col !== bugCol && currentBoard[bugRow][col] === 0 && 
                    cellCandidates[bugRow][col].has(testNum)) {
                    rowCount++;
                }
            }
            
            let colCount = 0;
            for (let row = 0; row < SIZE; row++) {
                if (row !== bugRow && currentBoard[row][bugCol] === 0 && 
                    cellCandidates[row][bugCol].has(testNum)) {
                    colCount++;
                }
            }
            
            const br = Math.floor(bugRow / SUBSIZE) * SUBSIZE;
            const bc = Math.floor(bugCol / SUBSIZE) * SUBSIZE;
            let boxCount = 0;
            for (let i = 0; i < SUBSIZE; i++) {
                for (let j = 0; j < SUBSIZE; j++) {
                    const row = br + i, col = bc + j;
                    if ((row !== bugRow || col !== bugCol) && currentBoard[row][col] === 0 && 
                        cellCandidates[row][col].has(testNum)) {
                        boxCount++;
                    }
                }
            }
            
            if (rowCount % 2 === 1 || colCount % 2 === 1 || boxCount % 2 === 1) {
                return { row: bugRow, col: bugCol, value: testNum, technique: "BUG+1", eliminations: [],
                    explanation: `BUG+1模式：在 (${bugRow+1},${bugCol+1}) 中，数字 ${testNum} 是唯一能避免致命模式的解。` };
            }
        }
    }
    return null;
}


// ==================== 更新 findNextStep 函数 ====================
function findNextLogicalStep() {
    // 仅使用逻辑技巧（不含试错），每个步骤都必须通过真实解校验
    const pipeline = [
        // ---- 1 级：基础摒除 ----
        findHiddenSingle,
        findNakedSingle,
        // ---- 2 级：候选数删减 ----
        findNakedPair,
        findHiddenPair,
        findNakedTriple,
        findHiddenTriple,
        findNakedQuad,
        findHiddenQuad,
        // ---- 2 级：区块交互（四个方向）----
        findBoxToRow,
        findBoxToCol,
        findBlockRowToBox,
        findBlockColToBox,
        // ---- 3 级：鱼形与翼形 ----
        findXWing,
        findFinnedXWing,
        findSwordfish,
        findFinnedSwordfish,
        findXYWing,
        findXYZWing,
        findSkyscraper,
        findTwoStringKite,
        findEmptyRectangle,
        // ---- 4 级：唯一性 / 链 / 双强链 ----
        findUniqueRectangle,
        findURType2,
        findXYChain,
        findXChain,
        findWWing,
        findRemotePair,
        // ---- 5 级：极限 ----
        findJellyfish,
        findFinnedJellyfish,
        findAIC,
        findALSXZ,
        findBUGPlus1,
        findForcingChain,
        findContinuousNiceLoop,
        findURType4,
        findGroupedChain
    ];

    for (let i = 0; i < pipeline.length; i++) {
        let step = null;
        try {
            step = pipeline[i]();
        } catch (e) {
            step = null;
        }
        if (!step) continue;
        if (!isStepSound(step)) continue;   // 拦截实现有误的技巧，避免错误排除
        step.level = getTechniqueLevel(step.technique);
        step.knowledge = getTechniqueKnowledge(step.technique);
        return enrichStepGraph(step);
    }
    return null;
}

function findNextStep() {
    // 教学模式：先按"数字 1→9 扫行/列/宫"的真实做题节奏推进
    if (teachingMode) {
        try {
            const t = findTeachingStep();
            if (t) return t;
        } catch (e) {
            console.warn('[教学] 教学推进失败，回落到智能解题:', e && e.message);
        }
    }

    const logical = findNextLogicalStep();
    if (logical) return logical;

    // 逻辑技巧无法推进：返回 null（题库已剔除需试错的题目）
    return null;
}

/**
 * 当前盘面"一步就能确定"的格子集合：Map("r,c" -> {row,col,value,technique,explanation})
 *
 * 只应用"删候选"类技巧（不改变盘面），再收集此刻成立的唯一候选数法 / 唯余法。
 * 一旦出现填入就停止推演——否则会把"要先把别的格子填掉、很多步之后才轮得到"的数字
 * 也算成可推导，提示就会给出当前盘面根本走不到的"依据"。
 */
function computeDerivableCells() {
    const savedBoard = currentBoard.map(function (r) { return r.slice(); });
    const savedCands = cellCandidates.map(function (r) {
        return r.map(function (st) { return new Set(st); });
    });

    // 关键修复：练习（自主答题）模式下 cellCandidates 可能是空的或过期的
    // （用户手动落子只同步 userCandidates），必须先按当前盘面重建候选数，
    // 否则推演基于错误前提，提示就会漏步、错步甚至谎报"无可填"。
    initCandidates();

    // 先把"删候选"类技巧跑完（它们不改变盘面，仍属于当前盘面能做的推理）；
    // 一旦出现填入就停下，避免把后续依赖这次填入的格子也算进来。
    let guard = 0;
    while (guard++ < 300) {
        const step = findNextLogicalStep();
        if (!step) break;
        if (step.value !== undefined && step.value !== null) break;
        applyStep(step);
    }

    const map = new Map();

    // 1) 唯余法：某个数字在同一单元（宫 → 行 → 列）里只剩一个可放位置
    const unitCells = function (kind, index) {
        const cells = [];
        if (kind === 'box') {
            const br = Math.floor(index / SUBSIZE) * SUBSIZE;
            const bc = (index % SUBSIZE) * SUBSIZE;
            for (let i = 0; i < SUBSIZE; i++) {
                for (let j = 0; j < SUBSIZE; j++) cells.push([br + i, bc + j]);
            }
        } else if (kind === 'row') {
            for (let c = 0; c < SIZE; c++) cells.push([index, c]);
        } else {
            for (let r = 0; r < SIZE; r++) cells.push([r, index]);
        }
        return cells;
    };
    const scanUnit = function (kind, index, label) {
        const cnt = {};
        const pos = {};
        const cells = unitCells(kind, index);
        for (let k = 0; k < cells.length; k++) {
            const r = cells[k][0], c = cells[k][1];
            if (currentBoard[r][c] !== 0) continue;
            cellCandidates[r][c].forEach(function (num) {
                cnt[num] = (cnt[num] || 0) + 1;
                pos[num] = [r, c];
            });
        }
        for (let num = 1; num <= SIZE; num++) {
            if (cnt[num] !== 1) continue;
            const r = pos[num][0], c = pos[num][1];
            const key = r + ',' + c;
            if (map.has(key)) continue;   // 同一格已被更基础的判定收录
            map.set(key, {
                row: r, col: c, value: num, technique: '唯余法（' + label + '）',
                explanation: '第 ' + (index + 1) + ' ' + label + '中数字 ' + num + ' 只能出现在 (' +
                    (r + 1) + ',' + (c + 1) + ')。'
            });
        }
    };
    for (let b = 0; b < SIZE; b++) scanUnit('box', b, '宫');
    for (let r = 0; r < SIZE; r++) scanUnit('row', r, '行');
    for (let c = 0; c < SIZE; c++) scanUnit('col', c, '列');

    // 2) 唯一候选数法：某格候选只剩一个
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (currentBoard[r][c] !== 0) continue;
            if (cellCandidates[r][c].size !== 1) continue;
            const key = r + ',' + c;
            if (map.has(key)) continue;
            const value = Array.from(cellCandidates[r][c])[0];
            if (!isValidMove(r, c, value)) continue;
            map.set(key, {
                row: r, col: c, value: value, technique: '唯一候选数法',
                explanation: '单元格 (' + (r + 1) + ',' + (c + 1) + ') 只剩下数字 ' + value + '。'
            });
        }
    }

    currentBoard = savedBoard;
    cellCandidates = savedCands;
    // 推演期间记下的"已删除候选"必须一起清掉：否则这些标记会带回到真实盘面，
    // 让后续同样的删候选被当成"已删过"而静默跳过，解到一半就卡住。
    clearDeleteRecord();
    invalidateSolutionCache();
    return map;
}

/**
 * 练习模式"下一步提示"的第二层：当没有可直接填入的数字时，
 * 给出当前盘面上最靠前的一个"删候选"类技巧（数对/区块/鱼形/链……）。
 * 与 computeDerivableCells 相同：先按当前盘面重建候选数，模拟后恢复原状。
 */
function findHintEliminationStep() {
    const savedBoard = currentBoard.map(function (r) { return r.slice(); });
    const savedCands = cellCandidates.map(function (r) {
        return r.map(function (st) { return new Set(st); });
    });
    initCandidates();
    let step = null;
    try {
        step = findNextLogicalStep();
    } catch (e) {
        step = null;
    }
    currentBoard = savedBoard;
    cellCandidates = savedCands;
    clearDeleteRecord();
    invalidateSolutionCache();
    return step;
}


/* ==========================================================================
 * 链式技法引擎（重写版）
 * --------------------------------------------------------------------------
 * 背景：原实现的 XY-Chain / X-Chain / AIC 存在逻辑错误，会排除掉正确候选数。
 * 这里用统一的"候选数强/弱链图"重新实现，链本身经真实解校验后才输出，
 * 并额外产出可视化的图数据（nodes + links），供界面绘制箭头。
 *
 * 术语：
 *   强链(strong link)：两个候选数中"必有一个为真"（A假 ⇒ B真）
 *   弱链(weak link)  ：两个候选数中"至多一个为真"（A真 ⇒ B假）
 *   交替推理链(AIC)  ：强-弱-强-弱…交替，首尾均为强链时，两端至少一端为真
 * ========================================================================== */

function sees(a, b) {
    if (a.row === b.row || a.col === b.col) return true;
    return Math.floor(a.row / SUBSIZE) === Math.floor(b.row / SUBSIZE) &&
           Math.floor(a.col / SUBSIZE) === Math.floor(b.col / SUBSIZE);
}

let __unitCache = null;
function getUnits() {
    if (__unitCache) return __unitCache;
    const units = [];
    for (let r = 0; r < SIZE; r++) {
        const cells = [];
        for (let c = 0; c < SIZE; c++) cells.push({ row: r, col: c });
        units.push({ type: 'row', index: r, cells: cells });
    }
    for (let c = 0; c < SIZE; c++) {
        const cells = [];
        for (let r = 0; r < SIZE; r++) cells.push({ row: r, col: c });
        units.push({ type: 'col', index: c, cells: cells });
    }
    for (let b = 0; b < SIZE; b++) {
        const cells = [];
        const br = Math.floor(b / SUBSIZE) * SUBSIZE;
        const bc = (b % SUBSIZE) * SUBSIZE;
        for (let i = 0; i < SUBSIZE; i++) {
            for (let j = 0; j < SUBSIZE; j++) cells.push({ row: br + i, col: bc + j });
        }
        units.push({ type: 'box', index: b, cells: cells });
    }
    __unitCache = units;
    return units;
}

function candKey(r, c, d) { return r + '-' + c + '-' + d; }

/**
 * 构建候选数图
 * opts.scope: 'all' 全部候选 | 'single' 指定数字 | 'bivalue' 仅双值格
 * opts.digit: scope==='single' 时的数字
 */
function buildCandGraph(opts) {
    opts = opts || {};
    const nodes = new Map();
    const strong = new Map();
    const weak = new Map();

    function ensure(r, c, d) {
        const k = candKey(r, c, d);
        if (!nodes.has(k)) {
            nodes.set(k, { key: k, row: r, col: c, digit: d });
            strong.set(k, []);
            weak.set(k, []);
        }
        return k;
    }
    function isBivalue(r, c) { return cellCandidates[r][c].size === 2; }

    // 1) 单元内的强链（某数字在一个单元里只剩 2 个位置）与弱链
    const units = getUnits();
    for (let d = 1; d <= SIZE; d++) {
        if (opts.scope === 'single' && opts.digit !== d) continue;
        for (let ui = 0; ui < units.length; ui++) {
            const u = units[ui];
            const allPos = [];   // 单元内该数字的全部可能位置（不做任何过滤）
            const pos = [];      // 按 scope 过滤后的位置（用于弱链）
            for (let i = 0; i < u.cells.length; i++) {
                const cell = u.cells[i];
                if (currentBoard[cell.row][cell.col] !== 0) continue;
                if (!cellCandidates[cell.row][cell.col].has(d)) continue;
                allPos.push(cell);
                if (opts.scope === 'bivalue' && !isBivalue(cell.row, cell.col)) continue;
                pos.push(cell);
            }
            if (pos.length < 2) continue;

            // 强链：该单元内此数字只剩两个位置。
            // 注意必须用 allPos 判定，否则在 bivalue 过滤下会把"3 个位置只取 2 个"
            // 误判为强链，从而推导出错误结论。
            if (allPos.length === 2) {
                const a = ensure(allPos[0].row, allPos[0].col, d);
                const b = ensure(allPos[1].row, allPos[1].col, d);
                strong.get(a).push({ key: b, unit: u.type, index: u.index });
                strong.get(b).push({ key: a, unit: u.type, index: u.index });
            }
            // 弱链：同单元内任意两格（至多一个为真）
            if (pos.length <= 5) {
                for (let i = 0; i < pos.length; i++) {
                    for (let j = i + 1; j < pos.length; j++) {
                        const a = ensure(pos[i].row, pos[i].col, d);
                        const b = ensure(pos[j].row, pos[j].col, d);
                        weak.get(a).push({ key: b, unit: u.type, index: u.index });
                        weak.get(b).push({ key: a, unit: u.type, index: u.index });
                    }
                }
            }
        }
    }

    // 2) 格内强链（双值格的两个候选数，必有一真）
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (currentBoard[r][c] !== 0) continue;
            const cand = Array.from(cellCandidates[r][c]);
            if (cand.length !== 2) continue;
            if (opts.scope === 'single' && (cand[0] !== opts.digit || cand[1] !== opts.digit)) continue;
            const a = ensure(r, c, cand[0]);
            const b = ensure(r, c, cand[1]);
            strong.get(a).push({ key: b, unit: 'cell', index: r * SIZE + c });
            strong.get(b).push({ key: a, unit: 'cell', index: r * SIZE + c });
        }
    }

    return { nodes: nodes, strong: strong, weak: weak };
}

/** 两端点共同可见、且含该数字、且不是端点自身的格子 */
function commonPeerEliminations(a, b, digit) {
    const out = [];
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (currentBoard[r][c] !== 0) continue;
            if (!cellCandidates[r][c].has(digit)) continue;
            if (r === a.row && c === a.col) continue;
            if (r === b.row && c === b.col) continue;
            const t = { row: r, col: c };
            if (sees(t, a) && sees(t, b)) out.push({ row: r, col: c, num: digit });
        }
    }
    return out;
}

/**
 * 在候选数图中搜索交替推理链
 * 返回 [{ chain:[node...], links:['strong'|'weak'...], eliminations:[] }]
 */
function searchAlternatingChains(graph, maxLinks, maxResults) {
    maxLinks = maxLinks || 9;
    maxResults = maxResults || 6;
    const nodes = graph.nodes, strong = graph.strong, weak = graph.weak;
    const results = [];
    const keys = Array.from(nodes.keys());
    const KEY_INDEX = {};
    keys.forEach(function (k, i) { KEY_INDEX[k] = i; });

    for (let si = 0; si < keys.length; si++) {
        if (results.length >= maxResults) break;
        const startKey = keys[si];
        const chain = [startKey];
        const linkTypes = [];
        const visited = new Set([startKey]);

        (function dfs() {
            if (results.length >= maxResults) return;
            const curKey = chain[chain.length - 1];
            const needStrong = (linkTypes.length % 2) === 0;

            // 收敛判定：已用奇数条链、且最后一条是强链（首尾皆强）
            if (linkTypes.length >= 3 && linkTypes.length % 2 === 1) {
                const first = nodes.get(chain[0]);
                const last = nodes.get(curKey);
                if (first.digit === last.digit && !(first.row === last.row && first.col === last.col)) {
                    const elims = commonPeerEliminations(first, last, first.digit);
                    if (elims.length > 0) {
                        results.push({
                            chain: chain.slice(),
                            links: linkTypes.slice(),
                            eliminations: elims
                        });
                        return;
                    }
                }
            }
            if (linkTypes.length >= maxLinks) return;

            const adj = needStrong ? (strong.get(curKey) || []) : (weak.get(curKey) || []);
            for (let ai = 0; ai < adj.length; ai++) {
                const nk = adj[ai].key;
                if (visited.has(nk)) continue;
                // 跳过格内自环：同一候选数不可能与自身成链
                if (nk === curKey) continue;
                chain.push(nk);
                linkTypes.push(needStrong ? 'strong' : 'weak');
                visited.add(nk);
                dfs();
                visited.delete(nk);
                linkTypes.pop();
                chain.pop();
                if (results.length >= maxResults) return;
            }
        })();
    }
    return results;
}

/**
 * 把 (格,数字) 节点序列压缩成"格"级别的可视化图
 * 同一格内的强链（双值格切换数字）合并为一个节点，显示两个候选数
 */
function buildChainGraph(chainKeys, linkTypes, nodes, techniqueName) {
    const raw = chainKeys.map(function (k) { return nodes.get(k); });
    const vNodes = [];
    const vLinks = [];
    let cur = null;

    for (let i = 0; i < raw.length; i++) {
        const n = raw[i];
        if (i === 0) {
            cur = { row: n.row, col: n.col, digits: [n.digit], order: 1 };
            vNodes.push(cur);
            continue;
        }
        const prev = raw[i - 1];
        if (n.row === prev.row && n.col === prev.col) {
            // 格内强链：并入同一可视节点
            if (cur.digits.indexOf(n.digit) === -1) cur.digits.push(n.digit);
        } else {
            const nn = { row: n.row, col: n.col, digits: [n.digit], order: vNodes.length + 1 };
            vNodes.push(nn);
            vLinks.push({
                from: vNodes.length - 2,
                to: vNodes.length - 1,
                type: (linkTypes[i - 1] === 'strong') ? 'strong' : 'weak'
            });
            cur = nn;
        }
    }

    const first = raw[0], last = raw[raw.length - 1];
    return {
        kind: 'chain',
        technique: techniqueName,
        nodes: vNodes,
        links: vLinks,
        start: { row: first.row, col: first.col, digit: first.digit },
        end: { row: last.row, col: last.col, digit: last.digit },
        digit: first.digit,
        linkCount: linkTypes.length
    };
}

/** 由一次搜索结果构造完整的 step（含图数据） */
function makeChainStep(result, graph, nodesMap, techniqueName, level) {
    const vg = buildChainGraph(result.chain, result.links, nodesMap, techniqueName);
    const digitsOnPath = [];
    result.chain.forEach(function (k) {
        const n = nodesMap.get(k);
        if (digitsOnPath.indexOf(n.digit) === -1) digitsOnPath.push(n.digit);
    });
    let exp = techniqueName + '：共 ' + result.links.length + ' 条链（强链实线、弱链虚线），';
    exp += '起点 (' + (vg.start.row + 1) + ',' + (vg.start.col + 1) + ')=';
    exp += vg.start.digit + '，终点 (' + (vg.end.row + 1) + ',' + (vg.end.col + 1) + ')=';
    exp += vg.end.digit + '。两端至少有一端为真，因此共同可见格中的 ' + vg.digit + ' 可以排除。';

    return {
        technique: techniqueName,
        level: level || getTechniqueLevel(techniqueName),
        eliminations: result.eliminations,
        graph: vg,
        explanation: exp
    };
}

// ---- X-Chain：单数字交替链 ----
function findXChain() {
    for (let d = 1; d <= SIZE; d++) {
        const g = buildCandGraph({ scope: 'single', digit: d });
        if (g.nodes.size < 4) continue;
        const res = searchAlternatingChains(g, 9, 4);
        for (let i = 0; i < res.length; i++) {
            // 纯单数字链：所有节点必须都是同一个数字
            const ok = res[i].chain.every(function (k) { return g.nodes.get(k).digit === d; });
            if (!ok) continue;
            const vg = buildChainGraph(res[i].chain, res[i].links, g.nodes, 'X-Chain');
            if (vg.nodes.length < 3) continue;
            return makeChainStep(res[i], g, g.nodes, 'X-Chain', 4);
        }
    }
    return null;
}

// ---- XY-Chain：双值格交替链 ----
function findXYChain() {
    const g = buildCandGraph({ scope: 'bivalue' });
    if (g.nodes.size < 4) return null;
    const res = searchAlternatingChains(g, 9, 6);
    for (let i = 0; i < res.length; i++) {
        const vg = buildChainGraph(res[i].chain, res[i].links, g.nodes, 'XY-Chain');
        if (vg.nodes.length < 3) continue;
        return makeChainStep(res[i], g, g.nodes, 'XY-Chain', 4);
    }
    return null;
}

// ---- AIC：通用交替推理链 ----
function findAIC() {
    const g = buildCandGraph({ scope: 'all' });
    if (g.nodes.size < 6) return null;
    const res = searchAlternatingChains(g, 9, 8);
    for (let i = 0; i < res.length; i++) {
        const vg = buildChainGraph(res[i].chain, res[i].links, g.nodes, 'AIC');
        if (vg.nodes.length < 3) continue;
        return makeChainStep(res[i], g, g.nodes, 'AIC', 5);
    }
    return null;
}




/* ==========================================================================
 * 技法知识库
 * --------------------------------------------------------------------------
 * 每项包含：
 *   level       难度等级（1 基础 / 2 中级 / 3 高级 / 4 专家 / 5 极限）
 *   category    技法分类
 *   idea        一句话核心思想
 *   logic       通用推理逻辑（可迁移到任何同类型题目）
 *   background  背景知识 / 来源 / 命名由来
 *   steps       上手步骤（操作序列）
 *   pitfall     常见误用
 * ========================================================================== */
const TECHNIQUE_KNOWLEDGE = {
    '摒除法': {
        level: 1,
        idea: '在某个单元（一行、一列或一个宫）里，如果数字 N 只有唯一一个格子能放，那这个格子就一定是 N。',
        logic: '先锁定要填的数字，再依次看它的行、列、宫：把该单元里已经被同数字占掉的位置划掉，剩下的可行位置若只剩一个，就确定为 N。因为数独要求每个单元内 1-9 各出现一次，N 在该单元必须有一个落点，而落点唯一，所以只能是它。',
        background: '摒除法（Hidden Single，也叫单元唯一法/排除法）是数独最基础、使用频率最高的技法。真人做题时几乎总是"按数字 1 到 9 逐个扫描"，而不是按格子扫描——这就是教学模式的推进顺序。它只依赖基本规则，不需要额外记号，草稿纸上也能做。',
        steps: [
            '选定一个数字 N（从 1 开始，逐个推进到 9）',
            '沿每一行看：该行内 N 是否只剩一个空格可放',
            '沿每一列看：该列内 N 是否只剩一个空格可放',
            '沿每一个宫看：该宫内 N 是否只剩一个空格可放',
            '找到唯一落点后填入 N，然后回到数字 1 重新扫描（新填的数字会打开新的摒除机会）'
        ],
        pitfall: '只看了行、忘了看宫；或者把"该数字在某单元出现两次"误判为唯一。填之前务必确认该格本身不与同行、同列、同宫已有数字冲突。'
    },
    '候选数标注': {
        level: 1,
        idea: '把某个空格所有可能的数字，用小字写在格子里，作为后续推理的"草稿"。',
        logic: '一个空格的候选数 = 1-9 里排除掉"同行已出现、同列已出现、同宫已出现"的数字后剩下的集合。候选数写全之后，"只剩一个候选"就是唯一候选数法（Naked Single），"某数字在一格只剩一处"就是摒除法，数对、鱼形等高级技法也都建立在候选数之上。',
        background: '真人做题时，候选数（铅笔标记）是连接"基础摒除"和"高级技巧"的桥梁。教学模式的节奏刻意模仿这一点：先把能直接看出来的摒除做完，再给格子补候选数，补完立刻回头找唯一候选数，然后才动用需要记号支撑的高级技法。',
        steps: [
            '挑一个还没写候选数的空格',
            '把它所在行、列、宫已出现的数字全部划掉',
            '剩下的数字就是完整候选数，按从小到大写进格子',
            '补完后立刻检查：这格是否只剩一个候选（唯一候选数法）',
            '若还有余力，检查某数字在同一单元里是否只剩这一处（摒除法）'
        ],
        pitfall: '候选数漏写（少划了一个已被占用的数字）会直接导致后面所有推理失效；也不要一次只写一半就当写完了——本步骤要求把该格候选数一次补全。'
    },
    '唯余法': {
        level: 1, category: '基础摒除',
        idea: '某格的行、列、宫已出现 8 个不同数字，剩下那个就是它。',
        logic: '对目标格扫描同行、同列、同宫已填数字，从 1~9 中删去它们，只剩唯一候选数即为该格解。',
        background: '也叫 Naked Single（裸单）。数独最底层的推理规则，其他所有技巧最终都归结为不断寻找唯余格。',
        steps: ['选定一个空格', '统计同行/同列/同宫已出现的数字', '若只剩一个未出现数字，即填入'],
        pitfall: '不要只看行或只看宫，必须三者合并去重后才判断。'
    },
    '唯一候选数法': {
        level: 1, category: '基础摒除',
        idea: '某个数字在某行/列/宫中只剩一个可放位置。',
        logic: '固定一个数字，遍历某单元（行/列/宫）的所有空格，若该数字只能落在其中一格，则该格必填此数。',
        background: '也叫 Hidden Single（隐单）。与唯余法互为镜像：唯余法从"格"出发，隐单从"数字"出发。',
        steps: ['选定一个数字', '在某个单元中找出所有能放它的格子', '若只有一格，则填入'],
        pitfall: '隐单成立时该格往往还有其他候选数，不能误判为不成立。'
    },
    '显性数对': {
        level: 2, category: '候选数删减',
        idea: '同一单元内两格的候选数完全相同且只有两个，这两个数被这两格独占。',
        logic: '若单元内两格候选集都是 {A,B}，则 A、B 必分别占据这两格；该单元其他格中的 A、B 均可删除。',
        background: 'Naked Pair。数对是最基础的"集合占位"思想：n 个格子被 n 个数字占满，就可对外排除。',
        steps: ['找出同单元内候选数完全相同的两格', '确认候选数只有两个', '删除该单元其他格的这两个候选数'],
        pitfall: '两格必须在同一单元内，且候选集必须"完全相同"，只共享一个数字不算数对。'
    },
    '隐性数对': {
        level: 2, category: '候选数删减',
        idea: '两个数字在某单元中只能出现在同样的两格里，则这两格被这两个数字独占。',
        logic: '若数字 A、B 在某单元的可放位置集合都是 {格1, 格2}，则格 1、格 2 必为 A、B；这两格的其他候选数全部删除。',
        background: 'Hidden Pair。与显性数对方向相反：显性是"格独占数字"，隐性是"数字独占格"。',
        steps: ['固定两个数字', '找出它们各自在该单元的可放位置', '若位置集合相同且只有两格，删除这两格的其他候选数'],
        pitfall: '隐性数对删除的是"格里的其他候选数"，不是单元内其他格的数字。'
    },
    '显性三数': {
        level: 2, category: '候选数删减',
        idea: '同一单元内三格的候选数全部落在同样的三个数字里，则这三个数字被这三格独占。',
        logic: '三格候选集的并集若恰为 {A,B,C}，则 A、B、C 必分布在这三格中；该单元其他格的 A、B、C 都可删除。',
        background: 'Naked Triple。是数对的推广（n=3）。注意三格的候选集不必完全相同，只需并集大小为 3。',
        steps: ['找同单元三格', '求候选集并集', '并集大小为 3 时，删除单元内其他格的这三个数'],
        pitfall: '并集大小必须正好为 3；若为 4 则不成立。'
    },
    '隐性三数': {
        level: 2, category: '候选数删减',
        idea: '三个数字在某单元的可放位置合起来只有三格，则这三格被这三个数字独占。',
        logic: '若 A、B、C 在某单元的可放位置并集恰为三格，则这三格必为 A/B/C；三格内的其他候选数全部删除。',
        background: 'Hidden Triple。隐性数对的推广。常见于高阶盘面的突破口。',
        steps: ['固定三个数字', '求三者在单元内可放位置的并集', '并集恰为三格时，删除这三格的其他候选数'],
        pitfall: '注意"并集"不是"交集"；数字可以各自分布在不同格，只要总数不超三格。'
    },
    '显性四数': {
        level: 2, category: '候选数删减',
        idea: '同一单元里四格的候选数合并起来只有四个不同数字，这四个数字被它们占满。',
        logic: '四格候选并集只有 {A,B,C,D} 四个数字；本单元 A、B、C、D 各需出现一次，共需四个位置，正好被这四格占满；因此同单元其他格上的 A、B、C、D 全部可删。',
        background: '显性四数组（Naked Quad），与数对、三数组同属「显性子集」家族，是第四阶。选中四格不必各含全部四个数字，只要并集正好四个即可。',
        steps: ['在单元内挑候选数为 2 到 4 个的格子', '任取四格，求候选并集', '并集正好 4 个数字时，从单元其他格删除这四个数字'],
        pitfall: '并集出现第 5 个数字就不成立；四格必须同单元且不含第五格参与。'
    },
    '隐性四数': {
        level: 2, category: '候选数删减',
        idea: '某单元里四个数字的候选位置合起来只落在同样四个格子上，这四格被它们独占。',
        logic: '四个数字的候选位置并集只有 4 格；本单元必须放这四个数字各一个，共需四个位置；这四格被完全占满，容不下第五个数字，故四格中其他候选全部可删。',
        background: '隐性四数组（Hidden Quad），与隐性数对、隐性三数组同族。常出现在候选标记很密的中盘，肉眼难以发现。',
        steps: ['在单元内逐个数字列出候选位置', '取四个数字，求候选位置并集', '并集正好 4 格时，删除这四格中其他数字的候选'],
        pitfall: '并集格数必须正好 4；删的是这四格内部的多余候选，不是单元其他格。'
    },
    '区块摒除': {
        level: 2, category: '区块交互',
        idea: '某数字在一宫中只能落在同一行（或列），则该行（列）在其他宫的位置可以排除。',
        logic: '宫 → 行：数字 d 在第 b 宫内只出现在第 r 行的若干格，则第 r 行在该宫以外的 d 全部删除。行 → 宫同理。',
        background: 'Pointing / Claiming（指向对 / 声明对），统称 Locked Candidates。这是"行宫交叉"的桥梁技巧，高级技巧的基石。',
        steps: ['选一个宫和一个数字', '看它的候选位置是否都落在同一行/列', '若是，向该行/列的其他宫方向排除'],
        pitfall: '必须"全部"落在同一行/列才成立；只落两格但分属两行则不成立。'
    },
    'X-Wing': {
        level: 3, category: '鱼形结构',
        idea: '某数字在两行中各自恰好只剩两个位置，且这两行的列完全重合，形成矩形四角。',
        logic: '两行 × 两列构成矩形，数字 d 在四个角上；由于每行必须有一个 d，四个角必然呈"对角占位"。因此这两列在其他行上的 d 全部可删。',
        background: 'X-Wing 得名于《星球大战》的 X 翼战机——四个角连起来像一个 X。属于"鱼"（Fish）家族 n=2 的最简形式，由 Ron Barker 于 2005 年前后推广。',
        steps: ['固定数字 d，找只有两个候选位置的若干行', '若两行的列集合完全相同，构成 X-Wing', '删除这两列在其他行上的 d'],
        pitfall: '行向 X-Wing 删的是"列"，方向不能搞反。'
    },
    '剑鱼法 (Swordfish)': {
        level: 3, category: '鱼形结构',
        idea: '某数字在三行中的候选位置合起来只覆盖三列，则这三列的该数字可向他行排除。',
        logic: '三行 × 三列，每行至少有一个候选、三行覆盖的列不超过三列；三行必须各放一个 d，占满三列，故这三列在其他行的 d 可删。',
        background: 'Swordfish 是"鱼"家族 n=3，因三行三列的连线形似剑鱼得名。行向剑鱼可同时是列向剑鱼（对偶）。',
        steps: ['固定数字 d，挑三行', '统计这三行 d 的候选列，若不超过三列', '删除这三列在其他行的 d'],
        pitfall: '每行候选数可以是 2 或 3，不必都是 2；但覆盖列数必须 ≤3。'
    },
    'Jellyfish (4阶鱼)': {
        level: 5, category: '鱼形结构',
        idea: '某数字在四行中的候选位置合起来只覆盖四列。',
        logic: '四行 × 四列。四行各需一个 d，仅四列可用，必被占满，故这四列在其他行的 d 可删。',
        background: 'Jellyfish 是"鱼"家族 n=4，因形似水母触须得名。n≥4 的鱼在实际题目中很罕见。',
        steps: ['固定数字 d，挑四行', '候选列若不超过四列', '删除这四列在其他行的 d'],
        pitfall: '四行必须各至少有一个候选；覆盖列数为 4 且不能多。'
    },
    'XY-Wing': {
        level: 3, category: '翼形结构',
        idea: '三个双值格：枢纽 {X,Y}，两翼 {X,Z} 与 {Y,Z}，两翼都看得见枢纽。',
        logic: '枢纽必为 X 或 Y。若枢纽=X，则 {X,Z} 翼被压为 Z；若枢纽=Y，则 {Y,Z} 翼被压为 Z。两种情况至少一翼为 Z，故同时看得见两翼的格中的 Z 可删。',
        background: 'XY-Wing（也叫 Y-Wing）。核心是"二分叉"：枢纽的两种取值都迫使某处出现 Z，属于"至少一端成立"的二难推理。两翼彼此不必互相可见。',
        steps: ['找一个双值格 {X,Y} 作枢纽', '找两个都看得见枢纽的双值格 {X,Z}、{Y,Z}', '删除同时看得见两翼的格中的 Z'],
        pitfall: '必须"同时看得见两翼"才可删；只看得见一翼不够。两翼之间不要求互相可见。'
    },
    'XYZ-Wing': {
        level: 3, category: '翼形结构',
        idea: '枢纽是三值格 {X,Y,Z}，两翼分别是 {X,Z} 和 {Y,Z}，三者互相可见。',
        logic: '枢纽取 X 或 Y 时，对应翼被压为 Z；枢纽取 Z 时枢纽自身即 Z。三者中至少一个为 Z，故三者共同可见的格中的 Z 可删。',
        background: 'XYZ-Wing 是 XY-Wing 的推广，把枢纽从 2 值扩到 3 值，代价是要求三格两两互相可见。',
        steps: ['找三值格 {X,Y,Z} 作枢纽', '找两个看得见枢纽的双值格 {X,Z}、{Y,Z}', '删除三者共同可见格中的 Z'],
        pitfall: '三格必须两两互相可见，否则 Z 可能落在视野外。'
    },
    'W-Wing': {
        level: 4, category: '翼形结构',
        idea: '两个候选集相同的双值格 {A,B}，通过数字 A 的强链连接，则 B 可向共同可见格排除。',
        logic: '两格都是 {A,B} 且彼此不可见。数字 A 的强链意味着 A 必在这两格之一；若 A 在其中一格，另一格只能为 B。因此至少一格为 B，共同可见格中的 B 可删。',
        background: 'W-Wing 中的 W 来自 "Wing"，由高级解题社区推广。它是把 XY-Wing 的"枢纽"替换成"强链"得到的变体。',
        steps: ['找两个候选集完全相同的双值格', '确认某数字存在连接它们的强链', '删除两格共同可见格中的另一数字'],
        pitfall: '强链必须真的成立（该数字在某单元只剩这两处），否则推理不成立。'
    },
    '摩天楼法': {
        level: 3, category: '单数链',
        idea: '某数字在两行中各只有两个候选位置，且两行共享一个候选列，形成"楼顶"错位。',
        logic: '两行的两个位置共享一列，说明该列必有一个为真；两行另一端的两个位置至少一个为真，故它们共同可见的格中的该数字可删。',
        background: 'Skyscraper（摩天楼）。本质是长度为 3 的 X-Chain：强-弱-强，因俯视图形似两栋高楼得名。',
        steps: ['固定数字 d，找两行各只有两个候选', '两行共享一个候选列', '删除两行另一端共同可见格中的 d'],
        pitfall: '共享列是"强链"所在；若两行共享两列那是 X-Wing，不是摩天楼。'
    },
    '双线风筝法': {
        level: 3, category: '单数链',
        idea: '一个宫内的强链 + 一条行或列的强链，两线相交形成"风筝"，可向远端排除。',
        logic: '宫内的强链与宫外的行/列强链通过一格相连，形成"强-弱-强"结构，两端必有一端为真，其共同可见格中的该数字可删。',
        background: 'Two-String Kite（双线风筝）。名字来自风筝的两根线：一根在宫内，一根在行/列上。',
        steps: ['找某数字在宫内的强链', '找与之相连的行或列强链', '删除两端共同可见格中的该数字'],
        pitfall: '两个强链必须真实成立（各自单元内只剩两处）。'
    },
    '空矩形法': {
        level: 3, category: '单数链',
        idea: '某数字在一宫内的候选位置构成"矩形缺角"，配合一端的强链形成推理。',
        logic: '若数字 d 在宫内只出现在两条线（一行一列）上，且其中一条线在该宫外还有候选，则可通过强链向远端排除。',
        background: 'Empty Rectangle（空矩形）。由高级技巧研究者提出，专门处理"宫内呈 L 形分布"的棘手局面。',
        steps: ['找某数字在宫内呈 L 形（只占一行加一列）', '确认该行或列在宫外存在强链', '向远端交叉点排除'],
        pitfall: '宫内分布必须是 L 形；若占满两行两列则不适用。'
    },
    '唯一矩形 (Unique Rectangle)': {
        level: 4, category: '唯一性',
        idea: '若四个格形成两组相同的 {A,B}，题目就会有两解；因此这种"致命矩形"必须被打破。',
        logic: '标准数独要求唯一解。若矩形四角都是 {A,B}，则 A/B 可互换产生第二个解。因此四角中至少一角必须含额外候选，据此删除该角的 A、B。',
        background: 'Unique Rectangle（UR）。前提是题目"有唯一解"——这是元规则推理，不属于纯逻辑推理，因此在多解题上会失效。',
        steps: ['找两行两列构成的矩形', '其中三格候选集恰为 {A,B}，第四格含 A、B 及额外数', '删除第四格中的 A、B'],
        pitfall: '依赖唯一解前提。题目若多解，此技法会推出错误结论。'
    },
    'BUG+1': {
        level: 4, category: '唯一性',
        idea: '盘面接近"双值地狱"（每格都是双值）时，会出现无解的矛盾；唯一的例外格必须取三值中的特定值。',
        logic: '若全盘除一格是三值外其余空格都是双值，且每个数字在每单元恰出现两次，则此为 BUG。为避免致命模式，三值格必须取其出现三次的那个数字。',
        background: 'BUG = Bivalue Universal Grave（双值普遍坟墓），Jeff Brouwer 提出。+1 指"唯一一个多余的候选数"。',
        steps: ['确认全盘空格几乎都是双值', '找唯一的三值格', '填入该格中出现 3 次的那个数字'],
        pitfall: '必须先确认整体确实构成 BUG，否则结论不成立。'
    },
    'X-Chain': {
        level: 4, category: '链式推理',
        idea: '同一个数字，沿"强链-弱链-强链"交替成链，首尾皆强则两端至少一端为真。',
        logic: '链上相邻候选数交替为强链（必有一真）与弱链（至多一真）。若首尾都是强链端点，可证明首尾至少一个为真；故同时看得见首尾的格中，该数字可删。',
        background: 'X-Chain 是单数字链，又称 Simple Coloring / Turbot Fish 的推广。它是所有链式技法（XY-Chain、AIC）的原型。判断要点：链长必须为奇数条。',
        steps: ['固定一个数字，画出它在各单元中的强链', '用弱链把强链串起来（强-弱-强-弱…）', '首尾为强链且同数字时，删除共同可见格的该数字'],
        pitfall: '链长必须是奇数（3、5、7…）。偶数条链首尾都是弱链，不能得出结论。'
    },
    'XY-Chain': {
        level: 4, category: '链式推理',
        idea: '一串双值格首尾相连，格内是强链、格间是弱链，首尾共享一个数字。',
        logic: '每个双值格内部两候选数构成强链（必有一真）；格与格之间通过"共同可见且共享数字"构成弱链。交替成链后，首尾至少一端为真，故共同可见格中的该数字可删。',
        background: 'XY-Chain 把 X-Chain 的单数字链推广到多数字：链上数字可以变化，只要每格是双值格即可。它是 AIC 的特例。',
        steps: ['找双值格，格内两数字为强链', '通过共享数字 + 互相可见连接下一个双值格', '首尾共享数字且链长奇数时，删除共同可见格的该数字'],
        pitfall: '格间连接需要"共享数字且互相可见"；末端必须回到起始数字才能成立。'
    },
    'AIC': {
        level: 5, category: '链式推理',
        idea: '交替推理链：强链与弱链任意交替，首尾均为强链，端点同数字即可排除。',
        logic: '把"候选数"当作图的节点：同一单元内该数字只剩两处为强链，同格两候选数为强链，同单元多个位置为弱链。沿图做交替搜索，首尾强链端点同数字时，共同可见格的该数字可删。',
        background: 'AIC = Alternating Inference Chain（交替推理链），是链式技法的统一框架。X-Chain、XY-Chain、Nice Loop 都是它的特例。',
        steps: ['构造候选数强/弱链图', '从任一节点出发交替扩展（强-弱-强…）', '首尾强链且同数字时排除共同可见格'],
        pitfall: '强弱链必须严格交替；链条中途不能连续两条强链或两条弱链。'
    },
    '强制链': {
        level: 5, category: '试错推理',
        idea: '对某格的每个候选数分别假设并向下推导，只有唯一假设不导致矛盾时，该格即为此数。',
        logic: '取候选数最少的空格，对其每个候选数各做一次单层假设，用基础规则（唯余、隐单、数对、区块）持续化简；凡导致某格候选被删空、或某单元某数字无处可放的假设即为矛盾。所有候选数中只有一个假设能存活时，该格的值被唯一确定。',
        background: 'Forcing Chain（强制链）。它不是图论意义上的链，而是把「假设—反证」结构显式写出来的推理方式：人类可逐步验证，但分支代价高。与回溯求解的区别是只做单层假设，且一旦出现矛盾立即停止。',
        steps: ['选一个候选数最少的空格', '对其每个候选数各假设一次', '用基础规则传播直到矛盾或推不动', '只有一个假设存活时，该格填此数'],
        pitfall: '必须把所有候选数都试完才能下结论；传播中一旦需要第二次猜测，就不再是单层强制链。'
    },
    '鳍 X-Wing': {
        level: 4, category: '鱼形结构',
        idea: 'X-Wing 的基行（基列）里多出一格「鳍」候选，去掉鳍后仍成矩形，就能向鳍所在宫排除。',
        logic: '两行中该数字除鳍格外的候选都落在同样的两列；若鳍全为假，则退化为标准 X-Wing，两列被两行占满；若某鳍为真，该鳍与覆盖列上同宫的格子互相排斥。两种情形下，覆盖列在鳍所在宫内的其他格都不能为该数字。',
        background: 'Finned X-Wing。普通 X-Wing 要求每行恰好两个候选，实际盘面常多出一格，鳍鱼就是把这一格单独处理，把排除范围收缩到鳍所在的宫，因此比标准鱼更常见。',
        steps: ['固定数字 d，找候选数为 2 到 3 个的行', '取两行，除去鳍后落在同样的两列', '取鳍与覆盖列交叉、且与鳍同宫的那格，排除 d'],
        pitfall: '排除范围只在鳍所在宫内，不能像标准鱼那样整列删；鳍超过两格或无鳍（即标准鱼）都不适用。'
    },
    '鳍剑鱼法': {
        level: 4, category: '鱼形结构',
        idea: '剑鱼法（3 行覆盖 3 列）中多出一到两个鳍格，可向鳍所在宫排除。',
        logic: '三行中该数字除鳍外的候选都落在同样三列；若鳍全假则是标准剑鱼，三列被占满；若鳍为真，则与鳍同宫的覆盖列格子不能为该数字。故覆盖列在鳍宫内的格子可删。',
        background: 'Finned Swordfish。3 阶鱼的带鳍版本，是极限难度盘面常见的突破点，比标准剑鱼出现频率高得多。',
        steps: ['固定数字 d，找候选数为 2 到 4 个的行', '取三行，除去鳍后覆盖列数不超过 3', '排除覆盖列与鳍同宫的格子'],
        pitfall: '三个鳍必须全在同一宫，否则目标格无法同时看见所有鳍；覆盖列数超过 3 不成立。'
    },
    '鳍水母法': {
        level: 5, category: '鱼形结构',
        idea: '水母法（4 行覆盖 4 列）中多出鳍格，可向鳍所在宫排除。',
        logic: '四行中该数字除鳍外的候选都落在同样四列；若鳍全假是标准水母，四列被占满；若鳍为真，同宫的覆盖列格子不能为该数字。故覆盖列在鳍宫内可删。',
        background: 'Finned Jellyfish。4 阶鱼的带鳍版本，极为罕见，通常只在极限难度残局出现。',
        steps: ['固定数字 d，找候选数为 2 到 5 个的行', '取四行，除去鳍后覆盖列数不超过 4', '排除覆盖列与鳍同宫的格子'],
        pitfall: '水母本身已很罕见，带鳍版本更少；条件不满足时不要强行套用。'
    },
    '唯一矩形 Type 2': {
        level: 4, category: '唯一性',
        idea: '矩形四角中两角恰为 {a,b}，另两角为 {a,b,c} 且多出的 c 相同、同行或同列，则 c 必落其一。',
        logic: '若那两个 {a,b,c} 角都不取 c，四角将全部只剩 {a,b}，形成可互换的双解，违背唯一解前提。因此至少一角取 c。同时看见这两角的格子上 c 不成立。',
        background: 'Unique Rectangle Type 2（又称 Type 2 / 双角同增）。依赖题目唯一解，本项目题库已全量校验唯一解，可安全使用。',
        steps: ['找跨两行两列、四角都含同一对 {a,b} 的矩形', '确认恰有两角为 {a,b}，另两角为 {a,b,c}', '两角多出的 c 必须相同且同行或同列', '排除同时看见这两角的格子上的 c'],
        pitfall: '两角多出的候选必须完全相同；一个多 c 一个多 d 就不成立；四角全落同一宫无法构成致命矩形。'
    },
    '远程数对': {
        level: 4, category: '链式推理',
        idea: '一串候选集完全相同的双值格 {a,b} 靠「互相可见」串联，取值逐格交替，链长为偶数时首尾异值。',
        logic: '相邻两格互相可见，必有一真一假，取值交替传递；链长为奇数距离（偶数个格子）时首尾取值不同，首尾一格若为 a 另一格必为 b。因此同时看见首尾的格子上 a 与 b 都不成立。',
        background: 'Remote Pair。本质是 XY-Chain 的等值特例，只处理候选集完全相同的情形，比一般 XY-Chain 更容易肉眼追踪。',
        steps: ['按候选对 {a,b} 把全盘双值格分组', '组内用「互为可见」连边形成图', '取奇数距离的任意两点，排除其共同可见格的 a 与 b'],
        pitfall: '整条链的候选对必须完全相同；链长为偶数步（首尾同值）时得不出结论。'
    },
    'ALS-XZ': {
        level: 5, category: '链式推理',
        idea: '两个几乎锁定集（n 格恰含 n+1 个候选）享受限公共候选 X 与普通公共候选 Z，则 Z 必真。',
        logic: '集内 n 格含 n+1 个候选，说明最多只有一个候选为假。两集共享受限候选 X，X 不可能同时在两集为真，故至少有一集不含 X；该集 n 格只剩 n 个候选，必须全部为真，其中含 Z。因此 Z 必真，同时看见两集所有 Z 格的目标格不能为 Z。',
        background: 'ALS（Almost Locked Set）+ XZ 规则。是高级链式技法的核心构件，X-Chain、XY-Chain 都可视为其退化情形。计算量大，通常需软件辅助。',
        steps: ['枚举规模 2 到 3 的 ALS（n 格恰含 n+1 候选）', '取两集，求公共候选 X 与 Z', '要求两集所有含 X 的格两两互相可见（X 受限）', '排除同时看见两集所有 Z 格的格子上的 Z'],
        pitfall: '两集不能共用格子；X 必须受限（两集含 X 的格全部互相可见）；Z 与 X 不能相同。'
    }
};

// 技法别名 -> 知识库主键
const TECHNIQUE_ALIASES = {
    '区块排除法': '区块摒除',
    '区块摒除': '区块摒除',
    '指向对': '区块摒除',
    '声明对': '区块摒除',
    '显性三数组': '显性三数',
    '隐性三数组': '隐性三数',
    '显性四数组': '显性四数',
    '隐性四数组': '隐性四数',
    '显性数对': '显性数对',
    '隐性数对': '隐性数对',
    '剑鱼法': '剑鱼法 (Swordfish)',
    '水母法': 'Jellyfish (4阶鱼)',
    '唯一矩形': '唯一矩形 (Unique Rectangle)',
    '摩天楼': '摩天楼法',
    '双线风筝': '双线风筝法',
    '空矩形': '空矩形法',
    '强制链': '强制链',
    'Forcing Chain': '强制链',
    '远程数对': '远程数对', 'Remote Pair': '远程数对',
    'UR Type 2': '唯一矩形 Type 2', 'UR Type 4': '唯一矩形 Type 4',
    '鳍 X-Wing': '鳍 X-Wing', 'Finned X-Wing': '鳍 X-Wing',
    'Finned Swordfish': '鳍剑鱼法',
    'Finned Jellyfish': '鳍水母法',
    'ALS-XZ': 'ALS-XZ', '连续环': '连续环',
    'Continuous Nice Loop': '连续环',
    '交替推理链': 'AIC'
};

/** 按技法名（含模糊匹配）取知识条目 */
function getTechniqueKnowledge(technique) {
    if (!technique) return null;
    if (TECHNIQUE_KNOWLEDGE[technique]) return TECHNIQUE_KNOWLEDGE[technique];

    // 去掉括号后缀
    const base = technique.replace(/[（(].*?[)）]\s*$/, '').trim();
    if (base && TECHNIQUE_KNOWLEDGE[base]) return TECHNIQUE_KNOWLEDGE[base];

    // 1) 别名：取最长命中，避免短名抢先（鳍水母法 vs 水母法）
    let bestAlias = null, bestAliasLen = -1;
    for (const alias in TECHNIQUE_ALIASES) {
        if (technique.indexOf(alias) === -1) continue;
        if (alias.length <= bestAliasLen) continue;
        const target = TECHNIQUE_ALIASES[alias];
        if (!TECHNIQUE_KNOWLEDGE[target]) continue;
        bestAlias = target;
        bestAliasLen = alias.length;
    }
    if (bestAlias) return TECHNIQUE_KNOWLEDGE[bestAlias];

    // 2) 主键互相包含：同样取最长
    let bestKey = null, bestLen = -1;
    for (const key in TECHNIQUE_KNOWLEDGE) {
        if (technique.indexOf(key) === -1 && key.indexOf(technique) === -1) continue;
        if (key.length <= bestLen) continue;
        bestKey = key;
        bestLen = key.length;
    }
    if (bestKey) return TECHNIQUE_KNOWLEDGE[bestKey];

    if (technique.indexOf('唯余法') !== -1) return TECHNIQUE_KNOWLEDGE['唯余法'];
    return null;
}

/**
 * 为任意步骤补全可视化数据
 * - 链类/鱼形已有 graph，直接沿用
 * - 填数类：标记目标格
 * - 其余排除类：标记被排除的格，并画出它们与"同单元持该数字的格"的关联
 */
function enrichStepGraph(step) {
    if (!step) return step;
    if (step.graph) return step;

    // 教学模式：候选数标注的图形（高亮该格 + 列出候选）
    if (step.teachKind === 'candidates') {
        step.graph = {
            kind: 'annotate',
            technique: step.technique,
            digit: null,
            nodes: [{ row: step.row, col: step.col, digits: (step.candidates || []).slice(), order: 0 }],
            links: [],
            targets: []
        };
        return step;
    }

    const know = getTechniqueKnowledge(step.technique);

    // 填数类
    if (step.value !== undefined && step.value !== null) {
        step.graph = {
            kind: 'fill',
            technique: step.technique,
            digit: step.value,
            nodes: [{ row: step.row, col: step.col, digits: [step.value], order: 1 }],
            links: [],
            targets: []
        };
        return step;
    }

    const elims = step.eliminations || [];
    if (elims.length === 0) return step;

    // 排除类：目标格 + 结构格
    const targets = elims.map(function (e) { return { row: e.row, col: e.col, digit: e.num }; });
    const digit = elims[0].num;

    // 找出与每个目标格同单元、且持有该数字的其它格，作为"结构参照"
    const structCells = [];
    const seen = new Set();
    targets.forEach(function (t) {
        const units = getUnits();
        for (let ui = 0; ui < units.length; ui++) {
            const u = units[ui];
            const hasT = u.cells.some(function (c) { return c.row === t.row && c.col === t.col; });
            if (!hasT) continue;
            for (let i = 0; i < u.cells.length; i++) {
                const c = u.cells[i];
                if (c.row === t.row && c.col === t.col) continue;
                if (currentBoard[c.row][c.col] !== 0) continue;
                if (!cellCandidates[c.row][c.col].has(t.digit)) continue;
                const k = c.row + '-' + c.col;
                if (seen.has(k)) continue;
                seen.add(k);
                structCells.push({ row: c.row, col: c.col, digit: t.digit });
            }
        }
    });

    step.graph = {
        kind: 'pattern',
        technique: step.technique,
        digit: digit,
        shape: (know && know.category) || 'pattern',
        nodes: structCells.map(function (c, i) {
            return { row: c.row, col: c.col, digits: [c.digit], order: i + 1, role: 'struct' };
        }),
        links: [],
        targets: targets
    };
    return step;
}

/* ==================== 技法详解库（学习页内容） ==================== */
/* 与 TECHNIQUE_KNOWLEDGE 互补：后者是弹窗内的速览摘要，
   本库是「深入学习」页的完整教程：形态识别 → 推理证明 → 完整示例 → 易错点。 */
const TECHNIQUE_LEARNING = {
    'X-Wing': {
        name: 'X-Wing（矩形鱼）',
        level: 3, category: '鱼形结构',
        oneLiner: '某数字在两行里各自只剩两个候选位置，且这两行恰好落在同样的两列上，四个角构成矩形。',
        howToFind: ['选定一个数字 d，先扫出所有「只剩 2 个候选位置」的行', '两两比较这些行的列号集合，找出完全相同的两组', '行列互换（只看只剩 2 个位置的两列）同样成立，得到列向 X-Wing'],
        reasoning: ['设两行为 r1、r2，公共候选列为 c1、c2', '第 r1 行的 d 只能落在 c1 或 c2，第 r2 行同理，且每行必须放一个 d', '每列只能容纳一个 d，因此两行必然一上一下错开占用 c1、c2', '结果 c1、c2 的 d 已被这两行用掉，这两列在其他行上的 d 全部可删'],
        example: '若第 3 行的 5 只在第 2、7 列，第 8 行的 5 也只在第 2、7 列，则四个角 (3,2)(3,7)(8,2)(8,7) 构成矩形。若 (3,2)=5 则 (8,7)=5；若 (3,7)=5 则 (8,2)=5。两种情形都占满第 2、7 列，故第 2、7 列上第 3、8 行以外的 5 全部排除。',
        mistakes: ['方向搞反：行向 X-Wing 删的是「列」，不是行', '两行的候选数必须都正好 2 个；某行有 3 个候选就不是 X-Wing', '两列必须完全重合；只重合一列那是摩天楼法'],
        related: ['剑鱼法 (Swordfish)', 'Jellyfish (4阶鱼)', '摩天楼法'],
        practiceTip: '优先扫「候选位置只剩 2 个」的行，命中率最高。'
    },
    '剑鱼法 (Swordfish)': {
        name: '剑鱼法（Swordfish，3 阶鱼）',
        level: 3, category: '鱼形结构',
        oneLiner: '某数字在三行中的候选位置合起来只覆盖三列，则这三列的该数字可从其他行排除。',
        howToFind: ['固定数字 d，挑出候选位置数为 2 到 3 个的行', '取其中三行，把它们的候选列求并集', '并集不超过 3 列 → 三行剑鱼成立', '行列互换得到列向剑鱼'],
        reasoning: ['三行各必须放一个 d，共需 3 个 d', '三行的候选列并集只有 3 列，每个 d 必须落在其中一列，且每列只容纳一个', '于是这 3 列被三行正好占满', '这 3 列在其他行上的 d 全部可删'],
        example: '数字 7 在第 1 行候选在第 2、5 列，第 4 行候选在第 5、8 列，第 9 行候选在第 2、8 列。三行候选列并集是 {2,5,8}，正好 3 列。三行各放一个 7 就会占满这三列，故第 2、5、8 列上第 1、4、9 行以外的 7 全部排除。',
        mistakes: ['每行候选数可以是 2 或 3 个，不必都是 2', '并集列数必须 ≤3；等于 4 时代价上升，应按水母法处理', '三行都必须至少有一个候选，空行要排除在外'],
        related: ['X-Wing', 'Jellyfish (4阶鱼)'],
        practiceTip: '剑鱼常在 X-Wing 找不到、但某数字在某两行各剩 3 个候选的盘面出现。'
    },
    'XY-Wing': {
        name: 'XY-Wing（Y 翼）',
        level: 3, category: '翼形结构',
        oneLiner: '三个双值格：枢纽 {X,Y}，两翼 {X,Z} 与 {Y,Z}，两翼都看得见枢纽。',
        howToFind: ['找出所有只剩 2 个候选数的格子（双值格）', '选一个双值格 {X,Y} 当枢纽', '找两个双值格，分别含 X 与 Z、Y 与 Z，且都能看见枢纽', '同时看见两翼的 Z 候选格，就是排除目标'],
        reasoning: ['枢纽只能取 X 或 Y，是二选一', '若枢纽 = X，则 {X,Z} 翼不能再取 X，只能为 Z', '若枢纽 = Y，则 {Y,Z} 翼只能为 Z', '无论枢纽取哪个值，两翼中必有一格为 Z', '因此同时看得见两翼的格子里，Z 一定不成立，可删'],
        example: '枢纽 (2,3) 候选 {4,7}，翼一 (2,8) 候选 {4,9}，翼二 (6,3) 候选 {7,9}。若 (2,3)=4 → 翼一=9；若 (2,3)=7 → 翼二=9。两种情形都让 (2,8)、(6,3) 中至少一格为 9，故同时看见这两格的 (2,5) 上的 9 可删。',
        mistakes: ['必须同时看得见两翼才可删；只看见一翼不够', '两翼之间不要求互相可见（这是最常见误解）', '枢纽必须正好 2 个候选；三值格请改用 XYZ-Wing'],
        related: ['XYZ-Wing', 'W-Wing', 'XY-Chain'],
        practiceTip: '先把全盘双值格标出来，XY-Wing 靠它们之间的共享数字串联。',
        branches: {
            t: '把枢纽 (2,3) 的两种取值分别走一遍，看 (2,5) 会怎样',
            cases: [
                { label: '假设 (2,3) = 4', tag: '翼一被压成 9', steps: ['翼一 (2,8) 的候选是 {4,9}，与枢纽同行，不能再用 4', '所以 (2,8) 只能取 9', '(2,5) 与 (2,8) 同行，看得见这个 9 → (2,5) 不能是 9'] },
                { label: '假设 (2,3) = 7', tag: '翼二被压成 9', steps: ['翼二 (6,3) 的候选是 {7,9}，与枢纽同列，不能再用 7', '所以 (6,3) 只能取 9', '(2,5) 与 (6,3) 同列，看得见这个 9 → (2,5) 不能是 9'] }
            ],
            note: '两种取值都把 9 逼到了某一翼上，而 (2,5) 同时看得见两翼，所以 (2,5) 上的 9 必定不成立。'
        }
    },
    'XYZ-Wing': {
        name: 'XYZ-Wing（三值枢纽翼）',
        level: 3, category: '翼形结构',
        oneLiner: '枢纽是三值格 {X,Y,Z}，两翼是 {X,Z} 与 {Y,Z}，三格必须两两互相可见。',
        howToFind: ['先找三值格 {X,Y,Z} 作为枢纽', '在枢纽的同行、同列、同宫里找 {X,Z} 与 {Y,Z} 两个双值格', '确认三格两两互相可见，再求三格共同可见的格子'],
        reasoning: ['枢纽取值只有三种：X、Y、Z', '枢纽取 X → {X,Z} 翼被压为 Z', '枢纽取 Y → {Y,Z} 翼被压为 Z', '枢纽取 Z → 枢纽自己就是 Z', '三种情形都保证三格中至少一格为 Z，故三者共同可见格中的 Z 可删'],
        example: '枢纽 (5,5)={2,6,8}，翼一 (5,2)={2,6}，翼二 (9,5)={6,8}。若枢纽=2 则翼一=6；若枢纽=8 则翼二=6；若枢纽=6 则枢纽自身为 6。故三格共同可见的 (5,9) 上的 6 可删。',
        mistakes: ['三格必须两两互相可见，否则 Z 可能落在视野外', '枢纽必须是三值格，双值枢纽属于 XY-Wing 情形', '两翼都必须与枢纽共享一个数字，不能随意搭配'],
        related: ['XY-Wing', 'W-Wing'],
        practiceTip: '三值格比双值格少得多，先锁定三值格再找翼最快。',
        branches: {
            t: '把枢纽 (5,5) 的三种取值分别走一遍，看 6 会不会消失',
            cases: [
                { label: '假设 (5,5) = 2', tag: '翼一被压成 6', steps: ['翼一 (5,2) 的候选是 {2,6}，与枢纽同行，不能再用 2', '(5,2) 只能取 6 → 三格中有 6 成立'] },
                { label: '假设 (5,5) = 8', tag: '翼二被压成 6', steps: ['翼二 (9,5) 的候选是 {6,8}，与枢纽同列，不能再用 8', '(9,5) 只能取 6 → 三格中有 6 成立'] },
                { label: '假设 (5,5) = 6', tag: '枢纽自身 = 6', steps: ['枢纽自己就是 6', '三格中同样有 6 成立'] }
            ],
            note: '三种取值都保证 (5,5)、(5,2)、(9,5) 三格中至少有一格是 6，所以同时看得见这三格的 (5,9) 上的 6 必删。'
        }
    },
    '摩天楼法': {
        name: '摩天楼法（Skyscraper）',
        level: 3, category: '单数链',
        oneLiner: '某数字在两行中各只剩两个候选位置，且这两行共享一个候选列，另一端彼此错开。',
        howToFind: ['固定数字 d，扫出只剩 2 个候选位置的行', '找两行共享恰好一个候选列', '两行各自「另一端」的那两格，就是推理的强链端点', '删除这两格共同可见格上的 d'],
        reasoning: ['两行共享列 c0，而每列只能有一个 d，因此两行之中必有一行把 d 放在 c0', '若 r1 的 d 在 c0，则 r1 另一端不是 d，此时 r2 另一端必须为 d', '若 r2 的 d 在 c0，则 r2 另一端不是 d，此时 r1 另一端必须为 d', '两种情形都保证两行「另一端」至少一格为 d', '故这两个另一端共同可见的格上 d 可删'],
        example: '数字 3 在第 2 行候选是 (2,4)、(2,7)，第 6 行候选是 (6,4)、(6,9)。两行共享第 4 列。若 (2,4)=3 则 (6,9)=3；若 (6,4)=3 则 (2,7)=3。故 (2,7) 与 (6,9) 至少一格为 3，而 (2,9) 同时看得见这两格，其 3 可删。',
        mistakes: ['共享的列必须只有一列；共享两列就是 X-Wing', '两行的候选数必须各为 2 个', '删的是「另一端两格的共同可见格」，不是共享列上的格'],
        related: ['双线风筝法', 'X-Chain', 'X-Wing'],
        practiceTip: '摩天楼本质是长度为 3 的 X-Chain，练熟后可直接按链的思路推。'
    },
    '双线风筝法': {
        name: '双线风筝法（Two-String Kite）',
        level: 3, category: '单数链',
        oneLiner: '宫内的强链与宫外的行（或列）强链通过一格相连，两端至少一端为真。',
        howToFind: ['找某数字在宫内只落在同一行（或列）的两格 → 宫内强链', '看其中一格所在的行或列，该数字在这条线上是否也只剩两处 → 线强链', '两条强链的「远端」两格共同可见的格子，就是排除目标'],
        reasoning: ['宫内强链：这两格必有一格为该数字', '线强链：这条线上的两格也必有一格为该数字', '两条链共用一格，整体形成「强—弱—强」结构', '共用格取真时，两条链的另一端都取假；共用格取假时，两条链的另一端都为真', '因此两条链的两个远端至少一个为真，其共同可见格可删'],
        example: '数字 9 在第 3 宫只在 (7,7)、(7,9) 出现（同在第 7 行）→ 宫内强链。第 9 列上的 9 只剩 (7,9)、(2,9) → 线强链。两条链共用 (7,9)。则 (7,7) 与 (2,9) 至少一格为 9，而 (2,7) 同时看见这两格，其 9 可删。',
        mistakes: ['两条强链都必须真实成立（各自单元内该数字只剩两处）', '共用格必须真的落在两条链的交点上', '删的是两个远端的共同可见格；远端本身不能删'],
        related: ['摩天楼法', '空矩形法', 'X-Chain'],
        practiceTip: '风筝的「线」一根在宫内、一根在行或列上，记住这个结构就好找。'
    },
    '空矩形法': {
        name: '空矩形法（Empty Rectangle）',
        level: 3, category: '单数链',
        oneLiner: '某数字在一宫里呈 L 形分布（只占一行加一列），配合一条线强链可向远端交叉点排除。',
        howToFind: ['选一个宫和一个数字 d，看 d 在宫内的候选位置', '若这些位置全部落在同一行加同一列（L 形），记下这条行与这条列', '在该行（或该列）上找到 d 的线强链', '线强链远端与宫内另一条边的交叉点，就是排除目标'],
        reasoning: ['宫内 L 形意味着 d 若不在该行就只能在该列，二者必居其一', '线强链说明这条线上的 d 必在这两处之一', '两者共享一端时形成「强—弱—强」，两个远端至少一端为真', '远端与该行（列）的交叉格上 d 不成立，可删'],
        example: '第 5 宫内数字 5 只出现在 (4,4)、(4,5)（第 4 行）和 (5,6)（第 6 列），两臂交叉的 (4,6) 没有 5 候选。第 9 列上 5 只剩 (4,9)、(7,9) 构成强链。分两种情况：若 (4,9)=5，则第 4 行不能再有 5，第 5 宫的 5 只能落在 (5,6)，而 (7,6) 与 (5,6) 同列被排除；若 (7,9)=5，则 (7,6) 与它同行同样被排除。两种情况都不允许 (7,6)=5，故该格的 5 可删。',
        mistakes: ['两臂交叉的那个交点必须「没有候选」，若交点带候选则空矩形不成立', '宫内候选必须只占一行加一列；若占了两行或两列就不适用', '排除目标在「线强链远端所在的那条线」与「宫内另一臂」的交叉处，别误删链端本身'],
        related: ['双线风筝法', 'X-Chain', '摩天楼法'],
        practiceTip: '空矩形专门对付「宫内只剩 L 形」的死角，先扫宫再扫线。'
    },
    'X-Chain': {
        name: 'X-Chain（单数字链）',
        level: 4, category: '链式推理',
        oneLiner: '同一个数字沿「强链—弱链—强链」交替成链，首尾皆为强链时，两端至少一端为真。',
        howToFind: ['固定一个数字 d，画出它在各单元（行、列、宫）中的强链：某单元内 d 只剩两处', '用弱链把强链串起来：同一单元内存在两处以上时，任两处互斥即弱链', '首尾都是强链端点、且链长为奇数时，删除同时看见首尾的格上的 d'],
        reasoning: ['强链：两端必有一真（该单元内只剩这两处）', '弱链：两端至多一真（单元内还有其他位置）', '强弱严格交替时，链上一端的真假会强制传导到另一端', '首尾都是强链端点 → 首尾至少一端为真', '因此同时看得见首尾的格子上 d 一定不成立'],
        example: '数字 4 的强链 (1,2)-(1,6)，弱链 (1,6)-(7,6)，强链 (7,6)-(7,8)。首尾 (1,2)、(7,8) 都是 4 的强链端点，故两者至少一格为 4。而 (1,8) 同时看见首尾，其 4 可删。',
        mistakes: ['链长必须是奇数（3、5、7…）；偶数条首尾都是弱链，得不出结论', '强弱必须严格交替，不能出现连续两条强链', '首尾必须是同一个数字；跨数字的链属于 XY-Chain 或 AIC'],
        related: ['XY-Chain', 'AIC', '摩天楼法', '双线风筝法'],
        practiceTip: '在盘面上用两种颜色交替标记节点的真假，链越长越容易漏标。'
    },
    'XY-Chain': {
        name: 'XY-Chain（双值链）',
        level: 4, category: '链式推理',
        oneLiner: '一串双值格首尾相连，格内是强链、格间是弱链，首尾共享同一个数字。',
        howToFind: ['标出全盘双值格', '从一个双值格出发，通过「共享一个数字且互相可见」连到下一个双值格', '一直延伸，直到末端双值格重新含起始数字', '删除起始格与末端格共同可见格上的这个数字'],
        reasoning: ['双值格内部两个候选数构成强链：必有一真', '格与格之间通过共享数字构成弱链：至多一真', '链上每一格「取的数」都被前一格强制决定，形成交替传导', '首尾共享同一数字 Z，则首尾至少一端为 Z', '同时看见首尾的格子上 Z 可删'],
        example: '(1,3)={2,5} → (1,7)={5,9} → (4,7)={9,7} → (4,3)={7,2}。末格重新含起始数字 2，故首尾的 2 至少一处为真，(6,3) 同时看见 (1,3) 与 (4,3)，其 2 可删。',
        mistakes: ['格间连接必须「共享数字 + 互相可见」两个条件同时满足', '末端必须回到起始数字，否则链不成环也推不出结论', '链上每格都必须是双值格；三值格请改用 AIC'],
        related: ['X-Chain', 'AIC', 'XY-Wing'],
        practiceTip: 'XY-Chain 常表现为「绕盘面一圈回到起点」，画图比空想可靠。'
    },
    'W-Wing': {
        name: 'W-Wing（双强链翼）',
        level: 4, category: '翼形结构',
        oneLiner: '两个候选集相同的双值格 {A,B}，被数字 A 的强链连接，则 B 可向两者共同可见格排除。',
        howToFind: ['找两个候选集完全相同的双值格 {A,B}', '确认这两格彼此不可见（若在同单元，强链会直接退化为显性数对）', '找数字 A 的强链，把这两个格子连起来', '两格共同可见格上的 B 就是排除目标'],
        reasoning: ['两个 {A,B} 格中，A 的强链保证了 A 必落在其中一格', '设 A 在格一，则格一取 A，格二只能取 B', '设 A 在格二，则格一只能取 B', '两种情形都保证至少一格为 B', '两格共同可见格上的 B 可删'],
        example: '格一 (2,2)={3,8}，格二 (9,2)={3,8}，数字 3 在第 2 列只剩这两处构成强链。则两格中必有一格为 8，故同时看见两格的 (5,2) 上的 8 可删。',
        mistakes: ['强链必须真的成立（该数字在某个单元内只剩这两处）', '两个双值格的候选集必须完全相同；只共享一个数字不成立', '删的是「另一个数字」B，不是强链上的 A'],
        related: ['XY-Wing', 'XY-Chain', 'X-Chain'],
        practiceTip: 'W-Wing 的关键是找到同一对候选数重复出现的位置，先按候选集分组。'
    },
    '强制链': {
        name: '强制链（Forcing Chain）',
        level: 5, category: '试错推理',
        oneLiner: '对某格的每个候选数分别假设并深入推导，只有唯一假设不导致矛盾时，该格即为此数。',
        howToFind: ['找候选数最少的空格（优先双值格）', '对该格每个候选数分别做一次假设', '在假设下用基础规则（唯余、隐单、数对、区块）持续化简', '统计有多少假设「没有马上撞上矛盾」'],
        reasoning: ['把每个候选数当作一个假设分支，只做一层假设，不再套第二层猜测', '在每个分支内反复应用基础摒除，直到某格候选被删空（矛盾）或推不动（稳定）', '若某分支出现「某格无候选可填」或「某单元某数字无处可放」，该假设即被否决', '题目有解，因此所有候选数不可能全被否决，必然恰好留下一个存活分支', '存活的那个候选数就是该格的确定值'],
        example: '(4,4) 候选为 {5,9}。假设填 5：沿同行推出该行某格候选被删空 → 矛盾，否决。假设填 9：传播后盘面无矛盾 → 存活。两条分支走完后只剩 9 存活，因此 (4,4)=9。',
        mistakes: ['必须把所有候选数都试完，只试一个不能下结论', '传播中一旦需要第二次猜测，就不再是单层强制链，可读性丧失', '矛盾必须是「真的矛盾」（无候选可填），不是「推不下去」'],
        related: ['AIC', 'X-Chain', 'XY-Chain'],
        practiceTip: '把假设写在纸角、分支画成树，能明显降低中途忘掉前提的概率。',
        branches: {
            t: '题目推不动时，挑候选最少的 (4,4)={5,9} 分别假设，两条分支都要走完',
            cases: [
                { label: '假设 (4,4) = 5', tag: '撞矛盾 → 否决', steps: ['在这一前提下反复应用唯余、隐单、区块摒除', '推到第 4 行第 3 个空格时候选被删空', '(7,4) 所在宫只剩 6 无处可放，该宫无法成立', '出现真矛盾 → (4,4) 不可能是 5'] },
                { label: '假设 (4,4) = 9', tag: '存活 → 成立', steps: ['沿行、列、宫依次更新候选', '全程没有出现「某格无候选」或「某数字无处可放」', '盘面稳定推进到底，没有矛盾 → 这个假设成立'] }
            ],
            note: '只有一个分支能存活，所以 (4,4) 必然是 9。注意：若两个分支都存活，说明这题还需要更深的推理，不能下结论。'
        }
    },
    'AIC': {
        name: 'AIC（交替推理链）',
        level: 5, category: '链式推理',
        oneLiner: '强弱链任意交替，首尾均为强链且端点同数字即可排除——这是所有链式技法的统一框架。',
        howToFind: ['把每个「格-候选数」看作图的一个节点', '同一单元内某数字只剩两处 → 两节点之间连强链', '同一格内的两个候选数 → 连强链', '沿强弱交替搜索，找首尾都是强链、且首尾数字相同的路径'],
        reasoning: ['强链：两端至少一真；弱链：两端至多一真', '沿路径严格交替时，任意端点的真假都会单向传导到另一端', '若路径首尾都是强链端点且数字同为 Z，则首尾至少一端为 Z', '同时看见首尾的格子上 Z 不成立，可删', 'X-Chain、XY-Chain、Nice Loop 都是 AIC 限制节点类型后的特例'],
        example: '数字 4 的链：强链 (1,2)=4 → (1,6)=4（第 1 行只剩这两处）；弱链 (1,6)=4 → (7,6)=4（第 6 列还有其他 4）；强链 (7,6)=4 → (7,8)=4（第 7 行只剩这两处）。首尾 (1,2)=4 与 (7,8)=4 都是强链端点，两者至少一处为真，同时看见它们的 (1,8) 上的 4 可删。若把节点换成 (3,8)=7 与 (3,8)=4 这样「同格不同数」的节点，链就升级成完整的 AIC。',
        mistakes: ['强弱必须严格交替，不能连续两条强链或两条弱链', '首尾必须是同一数字才能排除', '节点类型不能混用：同格强链只在格内两个候选之间成立'],
        related: ['X-Chain', 'XY-Chain', '强制链'],
        practiceTip: 'AIC 是最强也最易错的技法，建议先在纸上把强弱链图画出来再判断。'
    },
    'Jellyfish (4阶鱼)': {
        name: '水母法（Jellyfish，4 阶鱼）',
        level: 5, category: '鱼形结构',
        oneLiner: '某数字在四行中的候选位置合起来只覆盖四列，则这四列的该数字可从其他行排除。',
        howToFind: ['固定数字 d，挑出候选位置数为 2 到 4 个的行', '取其中四行，把候选列求并集', '并集不超过 4 列 → 水母成立', '行列互换得到列向水母'],
        reasoning: ['四行各必须放一个 d，共需 4 个 d', '四行候选列并集只有 4 列，4 个 d 必须全部落在其中，且每列只容纳一个', '于是这 4 列被四行正好占满', '这 4 列在其他行上的 d 全部可删'],
        example: '数字 2 在第 1、3、6、8 行的候选列分别为 {2,6}、{2,6,9}、{6,9,4}、{2,4}，并集 {2,4,6,9} 正好 4 列。四行各放一个 2 就占满这 4 列，故第 2、4、6、9 列上第 1、3、6、8 行以外的 2 全部排除。',
        mistakes: ['并集列数必须 ≤4；等于 5 就不成立', '每行候选数可以是 2 到 4 个，不必都是 2', '水母在题目中很罕见，条件不满足时不要强行套用'],
        related: ['剑鱼法 (Swordfish)', 'X-Wing'],
        practiceTip: '水母通常只在极限难度盘面出现，手动解时可以先找 3 阶鱼再扩展。'
    },
    '唯一候选数法': {
        name: '唯一候选数法（Naked Single）',
        level: 1, category: '基础摒除',
        oneLiner: '某一格只剩下一个候选数，这个数就是它的答案。',
        howToFind: ['逐格数该格已有的候选数个数', '候选数只剩 1 个的格子直接填定', '填完立刻同步删除同行、同列、同宫的该数字候选'],
        reasoning: ['候选数 = 本格未出现的数字，排除掉被同行、同列、同宫占用的值', '若某格候选集只剩 {d}，则该格除 d 外无任何可能', '数独要求每格必填，故该格必然是 d', '填入 d 后，同单元其他格的 d 候选全部失效，可一并删除'],
        example: '解到中盘时 (4,7) 所在行已有 1、2、3、5、7、8（(4,1) 到 (4,6) 依次是 1、2、3、5、7、8），所在列已有 4、9（(1,7)=4、(9,7)=9）。把这八个数字全部排除后，(4,7) 的候选只剩 {6}，于是 (4,7)=6。填入后第 4 行、第 7 列、该宫其他格上的 6 候选一并删掉。',
        mistakes: ['不要把「该格没填」当候选数为 1：必须先真正做完排除', '填入后忘记同步删除同单元候选，会漏掉后续的连锁简化', '候选数标记不全时此技巧会误判，务必先补全候选'],
        related: ['唯余法', '显性数对'],
        practiceTip: '养成「每步填数后立刻清候选」的习惯，比事后补算可靠得多。'
    },
    '唯余法': {
        name: '唯余法（Hidden Single）',
        level: 1, category: '基础摒除',
        oneLiner: '某单元里某个数字只剩一个格子能放，即使那格还有别的候选，也必须填它。',
        howToFind: ['选定一个单元（行、列或宫）', '逐个数字检查：该数字在这个单元里还剩几个可放的位置', '只剩 1 个位置时，该格直接定为这个数字'],
        reasoning: ['某单元必须包含 1 到 9 各一次，数字 d 必然要落在本单元某一格', '若本单元内 d 的候选位置只剩一处，d 无处可去只能落在这里', '即使该格还有其他候选数，那些候选都必须让位', '因此可以填定，并删除该格的其他候选'],
        example: '观察第 6 宫：数字 8 原本可落在 (4,8)、(5,8)、(6,8) 三处。但第 4 行已经有 8（(4,1)=8），排除 (4,8)；第 5 行已经有 8（(5,5)=8），排除 (5,8)。于是第 6 宫的 8 只剩 (6,8) 一处，所以 (6,8)=8——尽管它同时还标着候选 2。',
        mistakes: ['候选数没标全时最容易漏看，建议先做完整候选标记', '唯余法优先扫「候选位置最多的数字」反而更慢，应先扫宫内数字', '填定后要清掉该格其他候选，否则会残留矛盾候选'],
        related: ['唯一候选数法', '区块摒除'],
        practiceTip: '新手期先按「1 到 9 逐个数」扫每个宫，比逐格看候选快得多。'
    },
    '显性数对': {
        name: '显性数对（Naked Pair）',
        level: 2, category: '候选数删减',
        oneLiner: '同一单元里两格的候选数完全相同且都只有两个，这两个数字被它们占满。',
        howToFind: ['在行、列、宫任一单元内找候选数正好 2 个的格子', '检查是否有两格候选集完全相同', '这两格所在的整个单元中，删除这两个数字的其他位置'],
        reasoning: ['设两格候选都是 {A,B}，且都在同一单元', '该单元必须放一个 A 和一个 B，这两个格恰好容纳这两个数字', '无论哪格填 A，另一格必填 B，两格被 A、B 完全占用', '因此本单元其他格都不可能为 A 或 B，其 A、B 候选全部可删'],
        example: '第 3 行中 (3,2)、(3,7) 的候选都只有 {4,9}。这两个数字在第 3 行必须各出现一次，而它们只能放在这两格。因此第 3 行其他格上的 4 和 9 全部删除，例如 (3,5) 的候选 {4,5,9} 化简为 {5}。',
        mistakes: ['两格候选必须完全相同；{1,2} 与 {1,3} 不构成显性数对', '两格必须在同一单元内，跨单元无效', '只删同单元其他格，不要删这两格自己的候选'],
        related: ['隐性数对', '显性三数', '唯一候选数法'],
        practiceTip: '填完数对后往往立刻出现新的唯一候选数，顺势连推收益很大。'
    },
    '隐性数对': {
        name: '隐性数对（Hidden Pair）',
        level: 2, category: '候选数删减',
        oneLiner: '某单元里两个数字只出现在同样的两个格子中，这两格就被它们独占。',
        howToFind: ['在单元内逐个数字列出候选位置', '找出两个数字，其候选位置集合完全相同且都是 2 格', '把这两格里除这两个数字外的其他候选全部删除'],
        reasoning: ['数字 A、B 在本单元的候选位置都只有 {格1, 格2}', '本单元必须放一个 A 和一个 B，两者都只能进这两格', '因此格1、格2 被 A、B 占满，不可能再容纳其他数字', '两格中除 A、B 外的其他候选全部可删'],
        example: '第 7 宫中数字 2 与 6 的候选位置都只有 (7,2)、(9,2) 两格。于是这两格必定是 2 和 6，把 (7,2) 的候选 {1,2,6,8} 化简为 {2,6}，(9,2) 的 {2,5,6} 化简为 {2,6}。这两格被清空后，第 7 宫的其他格反而推得出唯一候选。',
        mistakes: ['删的是这两格内部的多余候选，不是单元其他格', '两个数字的候选位置必须完全一致；重合格加第三格就不成立', '隐性数对被候选数较多的格子遮住，需按数字扫而不是按格扫'],
        related: ['显性数对', '隐性三数'],
        practiceTip: '隐性数对常藏在「候选很多」的格子里，按数字扫才看得见。'
    },
    '显性四数': {
        name: '显性四数组（Naked Quad）',
        level: 2, category: '候选数删减',
        oneLiner: '同一单元里四格的候选数合并起来只有四个不同数字，这四个数字被它们占满。',
        howToFind: ['在单元内挑候选数为 2 到 4 个的格子', '任取四格，把它们的候选并集求出来', '并集正好 4 个数字时，从单元其他格删除这四个数字'],
        reasoning: ['四格候选并集只有 {A,B,C,D} 四个数字', '本单元 A、B、C、D 各需出现一次，共需四个位置', '这四个位置正好被这四格占满，容不下第五个数字', '因此本单元其他格上的 A、B、C、D 全部可删'],
        example: '第 1 行中 (1,1) 候选 {1,4}、(1,2) 候选 {4,7}、(1,5) 候选 {7,9}、(1,8) 候选 {1,9}。四格的候选并集正好是 {1,4,7,9} 四个数字，说明这四个数字在第 1 行只能挤进这四格。因此第 1 行其他格上的 1、4、7、9 全部删除，例如 (1,4) 的 {1,4,5,9} 化简为 {5}。',
        mistakes: ['并集出现第 5 个数字就不成立', '四格不必各含全部四个数字，只要并集正好四个', '四格必须在同一单元内，且不能有第五格参与'],
        related: ['显性三数', '隐性四数'],
        practiceTip: '四数组比三数组罕见得多，一般在候选密集的中盘才会出现。'
    },
    '隐性四数': {
        name: '隐性四数组（Hidden Quad）',
        level: 2, category: '候选数删减',
        oneLiner: '某单元里四个数字的候选位置合起来只落在同样四个格子上，这四格被它们独占。',
        howToFind: ['在单元内逐个数字列出候选位置', '取四个数字，把它们的候选位置求并集', '并集正好 4 格时，删除这四格中其他数字的候选'],
        reasoning: ['四个数字的候选位置并集只有 4 格', '本单元必须放这四个数字各一个，共需四个位置', '这四格被完全占满，容不下第五个数字', '四格中除这四个数字外的其他候选全部可删'],
        example: '第 6 宫中数字 3 的候选是 (4,7)、(4,9)，数字 5 是 (6,7)、(6,9)，数字 6 是 (4,7)、(6,7)，数字 8 是 (4,9)、(6,9)。四数并集正好落在 (4,7)、(4,9)、(6,7)、(6,9) 四格。于是这四格中除 3、5、6、8 外的候选（如 1、2）全部删除。',
        mistakes: ['并集格数必须正好 4，超过就不成立', '删的是这四格内部的多余候选，不是单元其他格', '隐性四数常被密集候选遮住，需按数字扫而非按格扫'],
        related: ['隐性三数', '显性四数'],
        practiceTip: '隐性四数几乎肉眼难见，建议借助软件候选提示再判断。'
    },
    '显性三数': {
        name: '显性三数（Naked Triple）',
        level: 2, category: '候选数删减',
        oneLiner: '同一单元里三格的候选数合并起来只有三个不同数字，这三个数字被它们占满。',
        howToFind: ['在单元内找候选数为 2 到 3 个的格子', '任取三格，把它们的候选并集求出来', '并集正好 3 个数字时，从单元其他格删除这三个数字'],
        reasoning: ['三格的候选并集只有 {A,B,C} 三个数字', '这三个格合计只能填 A、B、C，而本单元 A、B、C 也必须各出现一次', '因此这三个数字被完全锁定在这三格里', '本单元其他格上的 A、B、C 全部可删'],
        example: '第 4 列中 (1,4) 候选 {2,7}、(5,4) 候选 {7,9}、(8,4) 候选 {2,9}。三格并集是 {2,7,9} 正好三个数字，因此第 4 列其他格上的 2、7、9 全部删除。注意这三格没有哪一格是「完整 {2,7,9}」，形态并不整齐。',
        mistakes: ['三格不必每个都含全部三个数字，只要并集是 3 个即可', '并集出现第 4 个数字就不成立', '三格必须在同一单元内，且不能有第四个格子也参与'],
        related: ['显性数对', '隐性三数', '剑鱼法 (Swordfish)'],
        practiceTip: '先按候选集大小排序，把 2 候选格组合起来试，比盲扫快。'
    },
    '隐性三数': {
        name: '隐性三数（Hidden Triple）',
        level: 2, category: '候选数删减',
        oneLiner: '某单元里三个数字的候选位置合起来只落在同样三个格子上，这三格被它们独占。',
        howToFind: ['在单元内逐个数字列出候选位置', '取三个数字，把它们的候选位置求并集', '并集正好 3 格时，把这三格中其他数字的候选全部删除'],
        reasoning: ['数字 A、B、C 在本单元的候选位置并集只有 3 格', '本单元必须放 A、B、C 各一个，总共需要 3 个位置', '这 3 个位置正好被 A、B、C 占满，容不下第四个数字', '这三格中除 A、B、C 外的候选全部可删'],
        example: '第 8 行中数字 1 的候选是 (8,1)、(8,6)，数字 4 的候选是 (8,3)、(8,6)，数字 8 的候选是 (8,1)、(8,3)。三者并集正好 {1,3,6} 三格，因此 (8,1)、(8,3)、(8,6) 三格中除 1、4、8 外的候选（如 3、5、7）全部删除。',
        mistakes: ['并集格数必须正好 3；超过 3 格就不成立', '数字的候选位置可以重复落在同一格，这是常见形态', '删的是这三格内部的候选，不是行内其他格'],
        related: ['隐性数对', '显性三数'],
        practiceTip: '隐性三数通常出现在候选标记很密的盘面，建议先用软件标好候选再找。'
    },
    '区块摒除': {
        name: '区块摒除（Pointing / Claiming）',
        level: 2, category: '区块交互',
        oneLiner: '某数字在一个宫内的候选全部落在同一行（或列），这条线上的宫外部分可删该数字。',
        howToFind: ['选定一个宫，逐个数字看其候选是否集中在同一行', '若宫内的 3 个候选都在同一行，形成一个「区块」', '这行在该宫以外的其他格上的该数字全部删除', '行列互换（候选集中在同一列）同理；反向 Claiming 也成立'],
        reasoning: ['宫内该数字的候选全在同一行 r', '本宫必须放一个该数字，它只能落在第 r 行', '因此第 r 行在这一宫之外的格子不可能再放该数字', '反之（Claiming）：若某行在某宫内的候选全部集中，也可反推宫内的位置'],
        example: '第 2 宫内数字 5 的候选只有 (2,4)、(2,5)、(2,6)，全部落在第 2 行。本宫的 5 必然出现在第 2 行，因此第 2 行在第 2 宫之外的其他格（如 (2,8)、(2,9)）上的 5 全部删除。',
        mistakes: ['宫内候选必须全部落在同一行或同一列；跨两行不成立', '删的是「这条线在宫外」的部分，宫内的候选不能删', 'Pointing（宫→线）与 Claiming（线→宫）方向相反，别混'],
        related: ['唯余法', '显性数对', '空矩形法'],
        practiceTip: '区块摒除是性价比最高的中级技巧，解中盘时优先全盘扫一遍。'
    },
    '唯一矩形 (Unique Rectangle)': {
        name: '唯一矩形（Unique Rectangle）',
        level: 4, category: '唯一性',
        oneLiner: '四个格子构成矩形，其中三格都只剩同样两个候选，则第四格不能是这两个数以外的第三种可能。',
        howToFind: ['找一个跨两行两列的四个格子，都含候选 {A,B}', '确认其中三格候选恰好只有 {A,B}', '第四格如果含 A 或 B 加额外候选，可删除额外候选；若第四格只含 {A,B} 则需要额外条件'],
        reasoning: ['标准数独要求唯一解。若四格构成两行两列的矩形，且都只含 {A,B}', '这一矩形存在两种互换填法（A/B 对调），两种都满足数独规则', '若两种填法都能延伸到完整解，题目就有两个解，违背唯一解前提', '因此第四格不能同时允许 A 和 B 的互换，必须排除其中一种可能', '常见形式：第四格含 {A,B,C} 时，删除 A、B 保留 C；或第四格只含 {A,B} 但多出一个额外候选格从而锁定'],
        example: '矩形四角为 (2,3)、(2,7)、(8,3)、(8,7)。其中 (2,3)、(2,7)、(8,3) 候选都是 {5,9}，(8,7) 候选是 {5,9,4}。若 (8,7) 取 5 或 9，则四角可互换出两个解，违背唯一解。因此 (8,7)=4，删掉 5、9。',
        mistakes: ['四格必须真的跨两行两列；同宫四格不适用', '依赖「题目唯一解」这一前提，多解题上会推错', '四格中若有两个以上含额外候选，标准形式不成立，需用别的变体'],
        related: ['BUG+1', '显性数对', '唯一候选数法'],
        practiceTip: '唯一矩形只在确认题目唯一解时使用；本项目的题库已全量校验唯一解。'
    },
    'BUG+1': {
        name: 'BUG+1（双值陷阱加一）',
        level: 4, category: '唯一性',
        oneLiner: '全盘只剩一格是三值格、其余空格都是双值格时，这个三值格里出现次数为奇数的那个数字就是答案。',
        howToFind: ['检查是否全盘每个空格都是 2 个候选', '找出唯一的例外：一个含 3 个候选的格子', '在该格的 3 个候选里，挑出在全盘出现次数为奇数的那个数字，填入'],
        reasoning: ['若所有空格都是双值格，盘面会退化为「每格二选一」的互换结构', '这种结构一旦成立，必然要么无解、要么有偶数个解，违背唯一解', '恰好多出一格三值格时，该格的第三种可能是唯一「打破对称」的数字', '在该格三个候选中，只有出现次数为奇数的数字能消除矛盾，故它就是答案'],
        example: '盘面剩 21 个空格，其中 20 格都是 2 个候选，只有 (5,5) 有 {2,6,8}。全盘统计三个候选出现的次数：2 出现 14 次、6 出现 16 次、8 出现 13 次。只有 8 是奇数次，因此 (5,5)=8，直接填定。',
        mistakes: ['必须确认「除一格之外全部是双值格」，差一格就不能用', '计数要在全盘候选上统计，包括该三值格自身', 'BUG+1 依赖唯一解前提，多解题上不成立'],
        related: ['唯一矩形 (Unique Rectangle)', '唯一候选数法'],
        practiceTip: 'BUG+1 出现时往往一步定胜负，解到残局可专门检查这个形态。'
    },
    '鳍 X-Wing': {
        name: '鳍 X-Wing（Finned X-Wing）',
        level: 4, category: '鱼形结构',
        oneLiner: 'X-Wing 的基行里多出一格「鳍」候选，去掉鳍后仍成矩形，就能向鳍所在宫排除。',
        howToFind: ['固定数字 d，扫出候选位置为 2 到 3 个的行', '两两比较这些行的候选列，找出「去掉一格后」列集合完全相同的两行', '那多出来的一格就是鳍；行列互换得到列向鳍 X-Wing'],
        reasoning: ['两行中该数字除鳍格外的候选都落在同样的两列', '若两个鳍都为假，两行只能落在覆盖的两列，退化为标准 X-Wing，两列被占满', '若某个鳍为真，该鳍与覆盖列上同宫的格子互相排斥', '两种情形都使覆盖列在鳍所在宫内的其他格不能为该数字'],
        example: '数字 5 在第 2 行候选为 (2,3)、(2,7)、(2,8)，第 6 行为 (6,3)、(6,7)。第 2 行的 (2,8) 落在第 3 宫，是鳍。除去鳍后两行都覆盖第 3、7 列。若 (2,8) 不为 5，则两行占用第 3、7 列，第 3、7 列其他格不能为 5；若 (2,8)=5，第 3 宫内第 3、7 列的格子同样不能为 5。故第 3 宫内 (1,7)、(3,7) 上的 5 可删。',
        mistakes: ['排除范围只在鳍所在宫内，不能像标准鱼那样整列删', '鳍最多两格且必须全在同一宫', '没有鳍（即标准 X-Wing）时应交给标准鱼处理'],
        related: ['X-Wing', '剑鱼法 (Swordfish)', '鳍剑鱼法'],
        practiceTip: '鳍鱼比标准 X-Wing 常见得多，实战中先找「多出一格」的行，命中率更高。'
    },
    '鳍剑鱼法': {
        name: '鳍剑鱼法（Finned Swordfish）',
        level: 4, category: '鱼形结构',
        oneLiner: '剑鱼法（三行覆盖三列）中多出一到两个鳍格，可向鳍所在宫排除。',
        howToFind: ['固定数字 d，找候选位置为 2 到 4 个的行', '取三行，去掉鳍格后把候选列求并集', '并集不超过 3 列且存在鳍格 → 三行鳍剑鱼成立', '行列互换得到列向鳍剑鱼'],
        reasoning: ['三行中该数字除鳍外的候选都落在同样三列', '若鳍全为假，则是标准剑鱼，三列被三行占满', '若某鳍为真，则该鳍与覆盖列上同宫的格子互相排斥', '因此覆盖列在鳍所在宫内的其他格不能为该数字'],
        example: '数字 7 在第 1 行候选 (1,2)、(1,5)，第 4 行 (4,5)、(4,8)、(4,9)，第 9 行 (9,2)、(9,8)。(4,9) 是鳍，位于第 6 宫。除去鳍后三行覆盖第 2、5、8 列正好 3 列。若 (4,9)≠7，三列被占满，第 6 宫第 8 列的 (5,8) 不能为 7；若 (4,9)=7，(5,8) 与它同宫同行互斥，也不能为 7。故 (5,8) 的 7 可删。',
        mistakes: ['三个鳍必须全在同一宫，否则目标格无法同时看见所有鳍', '覆盖列数超过 3 就不成立', '排除范围仅限鳍所在宫的覆盖列格子'],
        related: ['剑鱼法 (Swordfish)', '鳍 X-Wing', '鳍水母法'],
        practiceTip: '鳍剑鱼是极限难度盘面的常客，比标准剑鱼出现频率高得多。'
    },
    '鳍水母法': {
        name: '鳍水母法（Finned Jellyfish）',
        level: 5, category: '鱼形结构',
        oneLiner: '水母法（四行覆盖四列）中多出鳍格，可向鳍所在宫排除。',
        howToFind: ['固定数字 d，找候选位置为 2 到 5 个的行', '取四行，去掉鳍格后把候选列求并集', '并集不超过 4 列且存在鳍格 → 四行鳍水母成立', '行列互换得到列向鳍水母'],
        reasoning: ['四行中该数字除鳍外的候选都落在同样四列', '若鳍全为假，则是标准水母，四列被四行占满', '若某鳍为真，则该鳍与覆盖列上同宫的格子互相排斥', '因此覆盖列在鳍所在宫内的其他格不能为该数字'],
        example: '数字 2 在第 1、3、6、8 行的候选并集除去鳍 (8,9) 后正好是第 2、4、6、9 四列。(8,9) 位于第 9 宫。若 (8,9)≠2，四列被占满，第 9 宫第 9 列的 (7,9) 不能为 2；若 (8,9)=2，它与 (7,9) 同宫互斥。故 (7,9) 的 2 可删。',
        mistakes: ['水母本身已很罕见，带鳍版本更少，条件不满足时不要强行套用', '鳍必须全在同一宫', '覆盖列数超过 4 不成立'],
        related: ['Jellyfish (4阶鱼)', '鳍剑鱼法', 'X-Wing'],
        practiceTip: '只在极限难度残局尝试，先确认标准四阶鱼确实差一格。'
    },
    '唯一矩形 Type 2': {
        name: '唯一矩形 Type 2（Unique Rectangle Type 2）',
        level: 4, category: '唯一性',
        oneLiner: '矩形四角中两角恰为 {a,b}，另两角为 {a,b,c} 且多出的 c 相同、同行或同列，则 c 必落其一。',
        howToFind: ['找跨两行两列、四角都含同一对 {a,b} 的矩形', '数每角候选：应恰好两角为 {a,b}', '另两角为 {a,b,c}，且 c 相同并同行或同列', '同时看见这两角的格子上的 c 就是排除目标'],
        reasoning: ['设那两个 {a,b,c} 角都不取 c，则四角全部只剩 {a,b}', '四角构成两行两列的矩形，a/b 可互换，得到两个解', '这违背题目唯一解的前提', '因此至少一角必须取 c', '同时看见这两角的格子上 c 一定不成立'],
        example: '四角 (2,3)(2,7)(8,3)(8,7) 都含 {4,9}。其中 (2,3)、(8,3) 恰为 {4,9}，(2,7)、(8,7) 为 {4,7,9}，多出的 7 相同且同在第 7 列。若两角都不取 7，四角全是 {4,9} 可互换，出现双解。故两角至少一格为 7，同时看见它们的 (5,7) 上的 7 可删。',
        mistakes: ['两角多出的候选必须完全相同；一个多 c 一个多 d 不成立', '四角全落同一宫时无法构成致命矩形', '依赖唯一解前提，多解题上会推错'],
        related: ['唯一矩形 (Unique Rectangle)', 'BUG+1', 'XY-Chain'],
        practiceTip: 'Type 2 是唯一矩形家族里最常见的一型，先学会它就够用很久。'
    },
    '远程数对': {
        name: '远程数对（Remote Pair）',
        level: 4, category: '链式推理',
        oneLiner: '一串候选集完全相同的双值格 {a,b} 靠互相可见串联，取值逐格交替，链长为偶数时首尾异值。',
        howToFind: ['按候选对 {a,b} 把全盘双值格分组', '组内用「互为可见」连边，形成一张图', '取任意两个距离为奇数（≥3）的格子作为链首尾', '排除同时看见首尾的格子上的 a 与 b'],
        reasoning: ['链上相邻两格互相可见，必有一真一假', '因此取值沿链严格交替：a、b、a、b……', '链长为奇数距离时，首尾取值必然不同', '首尾一格是 a，另一格必是 b', '所以同时看见首尾的格子上 a 与 b 都不成立'],
        example: '(1,2)、(1,6)、(7,6)、(7,8) 四格候选都是 {3,8}，且相邻两格互为可见。链长 3 步（奇数），首尾 (1,2) 与 (7,8) 取值相反。若 (1,2)=3 则 (7,8)=8；若 (1,2)=8 则 (7,8)=3。故 (1,8) 同时看见两者，其 3 和 8 都可删。',
        mistakes: ['整条链的候选对必须完全相同；{3,8} 与 {3,9} 不能连', '链长为偶数步（首尾同值）时得不出结论', '首尾之间必须有奇数条连接边，不是格数'],
        related: ['XY-Chain', 'W-Wing', 'X-Chain'],
        practiceTip: '远程数对本质是 XY-Chain 的等值特例，把相同候选对的格子先分组，找起来快得多。'
    },
    'ALS-XZ': {
        name: 'ALS-XZ（ALS 双集消去）',
        level: 5, category: '链式推理',
        oneLiner: '两个几乎锁定集（n 格恰含 n+1 个候选）享受限公共候选 X 与普通公共候选 Z，则 Z 必真。',
        howToFind: ['枚举规模 2 到 3 的 ALS：n 个格子恰好只含 n+1 个候选', '取两个不共格的 ALS，求它们的公共候选', '挑一个作为 X，要求两集所有含 X 的格两两互相可见', '另一个公共候选作为 Z，排除同时看见两集所有 Z 格的格子上的 Z'],
        reasoning: ['集内 n 格含 n+1 个候选，说明最多只有一个候选为假', 'X 是两集的公共候选，不可能同时在两集为真（受限）', '故至少有一集不含 X', '不含 X 的那一集，n 格只剩 n 个候选，必须全部为真', '该集必含 Z，所以 Z 必真', '同时看见两集所有 Z 格的目标格不能为 Z'],
        example: 'A = {(1,1),(1,2)} 候选分别是 {2,7} 与 {5,7}，并集 {2,5,7}（2 格 3 候选，是 ALS）；B = {(5,2),(8,2)} 候选分别是 {5,9} 与 {7,9}，并集 {5,7,9}。两集公共候选是 5 与 7。取 X=5：A 中含 5 的 (1,2) 与 B 中含 5 的 (5,2) 同在第 2 列，互相可见，X 受限。取 Z=7：A 中含 7 的格是 (1,1)、(1,2)，B 中含 7 的是 (8,2)。同时看见这三格的 (2,2)（与 (1,1)、(1,2) 同在第 1 宫，与 (8,2) 同在第 2 列）上的 7 可以删除。',
        mistakes: ['两集不能共用格子', 'X 必须受限：两集所有含 X 的格要两两互相可见', 'Z 与 X 不能相同', 'ALS 的候选数必须恰好等于格数 +1；多一个就不是 ALS'],
        related: ['AIC', '强制链', 'XY-Chain'],
        practiceTip: 'ALS-XZ 计算量大，建议先画候选表；规模超过 3 格的 ALS 组合爆炸，实战收益低。'
    },
};

/* ==================== 技法示意图数据 ==================== */
/**
 * 每个技法对应一组「示意图」，用于技法手册的图文结合讲解。
 * 坐标一律用 1-based（与正文例句中的「第 r 行第 c 列」完全一致），渲染时再转成 0-based。
 *
 * 图 = {
 *   t:    图标题
 *   cap:  图注（解释这张图在说明什么）
 *   cells:[[行, 列, 候选数数组, 角色, 划掉候选数组], ...]
 *   links:[[[行1,列1], [行2,列2], 's'|'w'|'a'], ...]
 * }
 * 角色：p 枢纽 / d 确定填入 / s 强链端点 / g 翼·结构格 / w 弱链端点
 *       f 鳍 / e 可排除（划掉的是要删的候选） / x 已填数字 / n 背景格
 * 连线：s 强链（紫色实线）  w 弱链（灰色虚线）  a 互相可见（蓝色箭头虚线）
 */
const TECHNIQUE_DIAGRAMS = {
    /* ---------- 基础摒除 ---------- */
    '唯一候选数法': [
        {
            t: '候选数只剩一个的格子',
            cap: '灰色格子是这一行、这一列已经填好的数字。把它们全部从 (4,7) 排除之后，该格只剩 {6} 一个候选，于是 (4,7)=6（绿框）。',
            cells: [
                [4, 1, [1], 'x'], [4, 2, [2], 'x'], [4, 3, [3], 'x'], [4, 4, [5], 'x'],
                [4, 5, [7], 'x'], [4, 6, [8], 'x'], [1, 7, [4], 'x'], [9, 7, [9], 'x'],
                [4, 7, [6], 'd']
            ],
            links: []
        }
    ],
    '唯余法': [
        {
            t: '第 6 宫里 8 只剩一个位置',
            cap: '(4,8) 被第 4 行已有的 8 排除（(4,1)=8），(5,8) 被第 5 行已有的 8 排除（(5,5)=8）。三处候选被砍掉两处，第 6 宫的 8 只能落在 (6,8)——尽管它同时还标着候选 2。',
            cells: [
                [4, 1, [8], 'x'], [5, 5, [8], 'x'],
                [4, 8, [1, 8], 'e', [8]], [5, 8, [7, 8], 'e', [8]],
                [6, 8, [2, 8], 'd']
            ],
            links: []
        }
    ],

    /* ---------- 候选数删减 ---------- */
    '显性数对': [
        {
            t: '同行两个 {4,9} 占满两个数字',
            cap: '第 3 行的 (3,2)、(3,7) 候选完全相同且都只有 {4,9}（紫框，实线＝强链）。这两个数字必须由这两格分摊，同一行其他格上的 4、9 全部作废，(3,5) 的 {4,5,9} 因此化简为 {5}。',
            cells: [
                [3, 2, [4, 9], 's'], [3, 7, [4, 9], 's'],
                [3, 5, [4, 5, 9], 'e', [4, 9]]
            ],
            links: [[[3, 2], [3, 7], 's']]
        }
    ],
    '隐性数对': [
        {
            t: '两格被 2、6 独占',
            cap: '第 7 宫里数字 2 与 6 的位置集合完全相同，都只有 (7,2)、(9,2)。这两格被 2、6 占满，格内其余候选（1、5、8）全部划掉。注意此处删的是这两格「内部」的多余候选，不是宫里的其他格。',
            cells: [
                [7, 2, [1, 2, 6, 8], 'e', [1, 8]],
                [9, 2, [2, 5, 6], 'e', [5]]
            ],
            links: [[[7, 2], [9, 2], 's']]
        }
    ],
    '显性三数': [
        {
            t: '同列三格只含三个数字',
            cap: '第 4 列的 (1,4)={2,7}、(5,4)={7,9}、(8,4)={2,9}，三格并集恰好 {2,7,9}。这三个数字只能落在三格内，第 4 列其他格上的 2、7、9 全部可删。注意三格没有哪一格是完整的 {2,7,9}，形态并不整齐。',
            cells: [
                [1, 4, [2, 7], 's'], [5, 4, [7, 9], 's'], [8, 4, [2, 9], 's'],
                [3, 4, [2, 5, 7, 9], 'e', [2, 7, 9]]
            ],
            links: [[[1, 4], [8, 4], 's']]
        }
    ],
    '显性四数': [
        {
            t: '同行四格只含四个数字',
            cap: '第 1 行的四格候选并集恰好 {1,4,7,9}，说明这四个数字被这四格全部吃掉。第 1 行其他格上的 1、4、9 都可以删，(1,4) 的 {1,4,5,9} 化简为 {5}。',
            cells: [
                [1, 1, [1, 4], 's'], [1, 2, [4, 7], 's'], [1, 5, [7, 9], 's'], [1, 8, [1, 9], 's'],
                [1, 4, [1, 4, 5, 9], 'e', [1, 4, 9]]
            ],
            links: [[[1, 1], [1, 8], 's']]
        }
    ],
    '隐性三数': [
        {
            t: '三个数字挤在同三格里',
            cap: '第 8 行里，数字 1 只出现在 (8,1)、(8,6)，数字 4 只出现在 (8,3)、(8,6)，数字 8 只出现在 (8,1)、(8,3)。三者的位置并集正好落在 (8,1)、(8,3)、(8,6) 三格，这三格被 1、4、8 独占，格内多余候选（3、7）全部划掉。',
            cells: [
                [8, 1, [1, 3, 8], 'e', [3]],
                [8, 3, [3, 4, 8], 'e', [3]],
                [8, 6, [1, 4, 7], 'e', [7]]
            ],
            links: [[[8, 1], [8, 6], 's']]
        }
    ],
    '隐性四数': [
        {
            t: '四个数字挤在同四格里',
            cap: '第 6 宫里数字 3 只在 (4,7)、(4,9)，5 只在 (6,7)、(6,9)，6 只在 (4,7)、(6,7)，8 只在 (4,9)、(6,9)。四者位置并集正好这四格，于是四格内除 3、5、6、8 外的候选（1、2）全部划掉。',
            cells: [
                [4, 7, [1, 3, 6], 'e', [1]],
                [4, 9, [2, 3, 8], 'e', [2]],
                [6, 7, [1, 5, 6], 'e', [1]],
                [6, 9, [2, 5, 8], 'e', [2]]
            ],
            links: [[[4, 7], [4, 9], 's'], [[6, 7], [6, 9], 's']]
        }
    ],

    /* ---------- 区块交互 ---------- */
    '区块摒除': [
        {
            t: '宫内的候选全部压在一条线上',
            cap: '第 2 宫里 5 的三个候选 (2,4)、(2,5)、(2,6) 全部落在第 2 行（紫框＋实线＝一个「区块」）。第 2 宫的 5 必然出现在第 2 行，因此第 2 行在该宫之外的其他格——(2,8)、(2,9)——不可能再是 5（红框，5 被划掉）。',
            cells: [
                [2, 4, [1, 5], 's'], [2, 5, [5, 7], 's'], [2, 6, [2, 5], 's'],
                [2, 8, [5, 9], 'e', [5]], [2, 9, [3, 5], 'e', [5]]
            ],
            links: [[[2, 4], [2, 6], 's'], [[2, 6], [2, 9], 'w']]
        }
    ],

    /* ---------- 鱼形结构 ---------- */
    'X-Wing': [
        {
            t: 'X-Wing：两行 × 两列',
            cap: '第 3 行和第 8 行的 5 都只剩第 2、7 列两处（行内紫色实线＝强链）。两行必然一上一下各占一列，把第 2、7 列填满，因此这两列在其余行上的 5 全部可删（红框）。方向别搞反：行向 X-Wing 删的是「列」。',
            cells: [
                [3, 2, [5], 's'], [3, 7, [5], 's'], [8, 2, [5], 's'], [8, 7, [5], 's'],
                [5, 2, [2, 5], 'e', [5]], [5, 7, [5, 9], 'e', [5]]
            ],
            links: [[[3, 2], [3, 7], 's'], [[8, 2], [8, 7], 's'], [[3, 2], [8, 2], 'w'], [[3, 7], [8, 7], 'w']]
        }
    ],
    '剑鱼法 (Swordfish)': [
        {
            t: '剑鱼法：三行只覆盖三列',
            cap: '数字 7 在第 1 行剩第 2、5 列，第 4 行剩第 5、8 列，第 9 行剩第 2、8 列。三行候选列并集是 {2,5,8}，正好三列——三行各放一个 7 就把这三列占满，于是第 2、5、8 列在其他行上的 7 全部可删（红框）。',
            cells: [
                [1, 2, [7], 's'], [1, 5, [7], 's'],
                [4, 5, [7], 's'], [4, 8, [7], 's'],
                [9, 2, [7], 's'], [9, 8, [7], 's'],
                [6, 2, [3, 7], 'e', [7]], [6, 5, [7, 9], 'e', [7]]
            ],
            links: [[[1, 2], [1, 5], 's'], [[4, 5], [4, 8], 's'], [[9, 2], [9, 8], 's']]
        }
    ],
    'Jellyfish (4阶鱼)': [
        {
            t: '水母法：四行只覆盖四列',
            cap: '数字 2 在第 1、3、6、8 行的候选列分别是 {2,6}、{2,6,9}、{6,9,4}、{2,4}，四行并集恰好 {2,4,6,9} 四列。四个 2 只能挤在这四列里，第 2、4、6、9 列在其他行上的 2 全部可删（红框）。四阶鱼在题目里很罕见。',
            cells: [
                [1, 2, [2], 's'], [1, 6, [2], 's'],
                [3, 2, [2], 's'], [3, 6, [2], 's'], [3, 9, [2], 's'],
                [6, 4, [2], 's'], [6, 6, [2], 's'], [6, 9, [2], 's'],
                [8, 2, [2], 's'], [8, 4, [2], 's'],
                [5, 2, [2, 7], 'e', [2]], [5, 6, [2, 5], 'e', [2]]
            ],
            links: [[[1, 2], [1, 6], 's'], [[3, 2], [3, 9], 's'], [[6, 4], [6, 9], 's'], [[8, 2], [8, 4], 's']]
        }
    ],
    '鳍 X-Wing': [
        {
            t: '鳍 X-Wing：多出一格鳍',
            cap: '第 2 行的 5 有三个候选 (2,3)、(2,7)、(2,8)，比标准 X-Wing 多出一格——(2,8) 就是「鳍」（黄框）。去掉鳍之后，第 2、6 行都覆盖第 3、7 列。于是不管鳍成不成立，第 3 宫里第 7 列上的 5 都不成立：(1,7)、(3,7) 的 5 可删。注意排除范围只在鳍所在的宫内，不能像标准鱼那样整列删。',
            cells: [
                [2, 3, [5], 's'], [2, 7, [5], 's'], [2, 8, [5], 'f'],
                [6, 3, [5], 's'], [6, 7, [5], 's'],
                [1, 7, [4, 5], 'e', [5]], [3, 7, [5, 6], 'e', [5]]
            ],
            links: [[[2, 3], [2, 7], 's'], [[6, 3], [6, 7], 's'], [[2, 3], [6, 3], 'w'], [[2, 7], [6, 7], 'w']]
        }
    ],
    '鳍剑鱼法': [
        {
            t: '鳍剑鱼：三行覆盖三列再加鳍',
            cap: '数字 7 在第 1 行候选 (1,2)、(1,5)，第 4 行 (4,5)、(4,8)、(4,9)，第 9 行 (9,2)、(9,8)。其中 (4,9) 是鳍（黄框），位于第 6 宫。去掉鳍后三行正好覆盖第 2、5、8 列，(5,8) 既在第 8 列又在鳍所在宫，被两个方向同时封死，其 7 可删。',
            cells: [
                [1, 2, [7], 's'], [1, 5, [7], 's'],
                [4, 5, [7], 's'], [4, 8, [7], 's'], [4, 9, [7], 'f'],
                [9, 2, [7], 's'], [9, 8, [7], 's'],
                [5, 8, [3, 7], 'e', [7]]
            ],
            links: [[[1, 2], [1, 5], 's'], [[4, 5], [4, 8], 's'], [[9, 2], [9, 8], 's'], [[4, 8], [5, 8], 'w']]
        }
    ],
    '鳍水母法': [
        {
            t: '鳍水母：四行覆盖四列再加鳍',
            cap: '数字 2 在第 1、3、6 行的候选列合并为 {2,4,6,9} 四列，第 8 行除 (8,2)、(8,4) 外多出 (8,9) 一格鳍（黄框），落在第 9 宫。于是第 9 宫内第 9 列上的 (7,9) 的 2 被排除：鳍不成立时四列被占满，(7,9) 不能是 2；鳍成立时 (8,9) 与 (7,9) 同宫互斥，(7,9) 也不能是 2。',
            cells: [
                [1, 2, [2], 's'], [1, 6, [2], 's'],
                [3, 2, [2], 's'], [3, 6, [2], 's'], [3, 9, [2], 's'],
                [6, 4, [2], 's'], [6, 6, [2], 's'], [6, 9, [2], 's'],
                [8, 2, [2], 's'], [8, 4, [2], 's'], [8, 9, [2], 'f'],
                [7, 9, [2, 5], 'e', [2]]
            ],
            links: [[[1, 2], [1, 6], 's'], [[3, 2], [3, 9], 's'], [[6, 4], [6, 9], 's'], [[8, 2], [8, 9], 's']]
        }
    ],

    /* ---------- 翼形结构 ---------- */
    'XY-Wing': [
        {
            t: 'XY-Wing：一个枢纽 + 两个翼',
            cap: '枢纽 (2,3)={4,7}（橙框）只能取 4 或 7。翼一 (2,8)={4,9}、翼二 (6,3)={7,9} 都与枢纽同行或同列（蓝箭头＝看得见）。无论枢纽取哪一个，两翼里总有一格被逼成 9，所以同时看见两翼的 (2,5) 上的 9 一定不成立。两翼彼此之间不需要看得见。',
            cells: [
                [2, 3, [4, 7], 'p'], [2, 8, [4, 9], 'g'], [6, 3, [7, 9], 'g'],
                [2, 5, [5, 9], 'e', [9]]
            ],
            links: [[[2, 3], [2, 8], 'a'], [[2, 3], [6, 3], 'a']]
        }
    ],
    'XYZ-Wing': [
        {
            t: 'XYZ-Wing：三值枢纽 + 两个双值翼',
            cap: '枢纽 (5,5)={2,6,8} 是三值格（橙框），两个翼 (5,2)={2,6}、(9,5)={6,8} 都必须与枢纽互相看得见。枢纽取 2 时翼一被压成 6，取 8 时翼二被压成 6，取 6 时枢纽自己就是 6——三种情况都保证三格中至少一格是 6，故共同可见的 (5,9) 的 6 可删。',
            cells: [
                [5, 5, [2, 6, 8], 'p'], [5, 2, [2, 6], 'g'], [9, 5, [6, 8], 'g'],
                [5, 9, [3, 6], 'e', [6]]
            ],
            links: [[[5, 5], [5, 2], 'a'], [[5, 5], [9, 5], 'a']]
        }
    ],
    'W-Wing': [
        {
            t: 'W-Wing：一对相同双值格 + 一条强链',
            cap: '两个候选完全相同的双值格 (2,2)={3,8}、(9,2)={3,8}（紫框），被数字 3 的第 2 列强链连起来（这一列的 3 只剩这两处）。既然 3 必落在其中一格，另一格就只能取 8，所以同时看见两格的 (5,2) 上的 8 可删。删的是「另一个数字」B（这里是 8），不是强链上的 A。',
            cells: [
                [2, 2, [3, 8], 's'], [9, 2, [3, 8], 's'],
                [5, 2, [4, 8], 'e', [8]]
            ],
            links: [[[2, 2], [9, 2], 's']]
        }
    ],
    '远程数对': [
        {
            t: '远程数对：同值双值格串成一条链',
            cap: '(1,2)、(1,6)、(7,6)、(7,8) 四格候选都是 {3,8}，且相邻两格互相可见（灰虚线）。取值沿链严格交替：3、8、3、8。链长 3 步（奇数），首尾取值必然相反，也就是 (1,2) 与 (7,8) 中必有一格是 3、另一格是 8（橙点线是推理结论）。同时看见两者的 (1,8) 上的 3 和 8 全部可删。',
            cells: [
                [1, 2, [3, 8], 's'], [1, 6, [3, 8], 's'], [7, 6, [3, 8], 's'], [7, 8, [3, 8], 's'],
                [1, 8, [1, 3, 8], 'e', [3, 8]]
            ],
            links: [[[1, 2], [1, 6], 'w'], [[1, 6], [7, 6], 'w'], [[7, 6], [7, 8], 'w'], [[1, 2], [7, 8], 'c']]
        }
    ],

    /* ---------- 单数链 ---------- */
    '摩天楼法': [
        {
            t: '摩天楼：两行共享一列',
            cap: '数字 3 在第 2 行剩 (2,4)、(2,7)，在第 6 行剩 (6,4)、(6,9)，两行共享第 4 列（灰虚线）。两行必定有一行把 3 放在第 4 列，那么另一行的「另一端」就必须是 3——所以说 (2,7) 与 (6,9) 至少一格为 3（橙点线是推理结论，不是盘面上的强链）。同时看见这两格的 (2,9) 上的 3 可删。',
            cells: [
                [2, 4, [3], 's'], [2, 7, [3], 's'], [6, 4, [3], 's'], [6, 9, [3], 's'],
                [2, 9, [1, 3], 'e', [3]]
            ],
            links: [[[2, 4], [2, 7], 's'], [[6, 4], [6, 9], 's'], [[2, 4], [6, 4], 'w'], [[2, 7], [6, 9], 'c']]
        }
    ],
    '双线风筝法': [
        {
            t: '双线风筝：一条行链 + 一条列链，同落在一宫内',
            cap: '数字 9 在第 4 行只剩 (4,2)、(4,5) 两处，构成行强链；在第 6 列只剩 (5,6)、(8,6)，构成列强链。两条链各自的一端——(4,5) 与 (5,6)——同在第 5 宫，所以这两格至多一格是 9，于是 (4,2) 与 (8,6) 至少一格是 9（橙点线）。同时看见这两格的 (4,6) 既与 (4,2) 同行、又与 (8,6) 同列，所以 (4,6) 上的 9 可删。',
            cells: [
                [4, 2, [9], 's'], [4, 5, [9], 's'], [5, 6, [9], 's'], [8, 6, [9], 's'],
                [4, 6, [3, 9], 'e', [9]]
            ],
            links: [
                [[4, 2], [4, 5], 's'],
                [[5, 6], [8, 6], 's'],
                [[4, 5], [5, 6], 'w'],
                [[4, 2], [8, 6], 'c']
            ]
        }
    ],
    '空矩形法': [
        {
            t: '空矩形：宫内 L 形（第 4 行 + 第 6 列）配一条线强链',
            cap: '第 5 宫里 5 的候选只落在 (4,4)、(4,5)（第 4 行）和 (5,6)（第 6 列）——两臂交叉处的 (4,6) 没有 5 候选，这个"空交点"就是空矩形。第 9 列上 5 只剩 (4,9)、(7,9) 构成强链。(4,6) 看住两臂：若 (4,9)=5，第 4 行被清空，第 5 宫的 5 只能落到 (5,6)，而 (7,6) 与 (5,6) 同列；(4,6) 已在第 4 行被排除。所以 (7,6) 的 5 必删。',
            cells: [
                [4, 4, [5], 'r'], [4, 5, [5], 'r'], [5, 6, [5], 'r'],
                [4, 6, [], 'z'],
                [4, 9, [5], 's'], [7, 9, [5], 's'],
                [7, 6, [3, 5, 9], 'e', [5]]
            ],
            links: [
                [[4, 9], [7, 9], 's'],
                [[4, 4], [4, 5], 'w'],
                [[4, 5], [5, 6], 'w'],
                [[5, 6], [7, 6], 'a'],
                [[7, 9], [7, 6], 'a']
            ]
        }
    ],
    'X-Chain': [
        {
            t: 'X-Chain：强—弱—强 一条链',
            cap: '数字 4 在第 1 行只剩 (1,2)、(1,6)，构成强链（紫实线）；第 6 列上 4 还有别处，故 (1,6) 与 (7,6) 只是弱链（灰虚线）；第 7 行只剩 (7,6)、(7,8)，又是强链。链条首尾都是强链端点，说明 (1,2) 与 (7,8) 至少一格为 4（橙点线是推理结论），同时看见两者的 (1,8) 上的 4 可删。',
            cells: [
                [1, 2, [4], 's'], [1, 6, [4], 's'], [7, 6, [4], 's'], [7, 8, [4], 's'],
                [1, 8, [1, 4], 'e', [4]]
            ],
            links: [[[1, 2], [1, 6], 's'], [[1, 6], [7, 6], 'w'], [[7, 6], [7, 8], 's'], [[1, 2], [7, 8], 'c']]
        }
    ],
    'XY-Chain': [
        {
            t: 'XY-Chain：一串双值格绕回起点数字',
            cap: '(1,3)={2,5} → (1,7)={5,9} → (4,7)={9,7} → (4,3)={7,2}，相邻两格都「共享一个数字且互相可见」（灰虚线）。格内两个候选是强链，格与格之间是弱链，真假交替传导。末端重新出现起始数字 2，故 (1,3) 与 (4,3) 至少一格为 2（紫实线），同时看见两者的 (6,3) 上的 2 可删。',
            cells: [
                [1, 3, [2, 5], 's'], [1, 7, [5, 9], 's'], [4, 7, [7, 9], 's'], [4, 3, [2, 7], 's'],
                [6, 3, [2, 6], 'e', [2]]
            ],
            links: [[[1, 3], [1, 7], 'w'], [[1, 7], [4, 7], 'w'], [[4, 7], [4, 3], 'w'], [[1, 3], [4, 3], 's']]
        }
    ],
    'AIC': [
        {
            t: 'AIC：强弱交替的通用链',
            cap: '这条链的节点是「格子 + 候选数」：强链 (1,2)=4 → (1,6)=4（第 1 行只剩这两处）；弱链 (1,6)=4 → (7,6)=4（第 6 列还有其他 4）；强链 (7,6)=4 → (7,8)=4（第 7 行只剩这两处）。首尾都是强链端点，两地至少一处为真（橙点线是推理结论），同时看见两者的 (1,8) 上的 4 可删。把节点换成「同一格里的两个不同数字」，链就升级成完整的 AIC，X-Chain 与 XY-Chain 都是它的特例。',
            cells: [
                [1, 2, [4], 's'], [1, 6, [4, 7], 'g'], [7, 6, [4], 'w'], [7, 8, [4], 's'],
                [1, 8, [1, 4], 'e', [4]]
            ],
            links: [[[1, 2], [1, 6], 's'], [[1, 6], [7, 6], 'w'], [[7, 6], [7, 8], 's'], [[1, 2], [7, 8], 'c']]
        }
    ],

    /* ---------- 唯一性 ---------- */
    '唯一矩形 (Unique Rectangle)': [
        {
            t: '唯一矩形：四角构成可互换的矩形',
            cap: '四角 (2,3)、(2,7)、(8,3)、(8,7) 都含候选 {5,9}，其中三格恰好只有 {5,9}。若第四格 (8,7) 也只取 5 或 9，四角就能 5/9 对调出两个不同的解，题目就不唯一了。因此 (8,7) 只能是第三种可能 4，5 和 9 全部划掉。',
            cells: [
                [2, 3, [5, 9], 's'], [2, 7, [5, 9], 's'], [8, 3, [5, 9], 's'],
                [8, 7, [4, 5, 9], 'd', [5, 9]]
            ],
            links: [[[2, 3], [2, 7], 'w'], [[2, 3], [8, 3], 'w'], [[2, 7], [8, 7], 'w'], [[8, 3], [8, 7], 'w']]
        }
    ],
    '唯一矩形 Type 2': [
        {
            t: '唯一矩形 Type 2：两角多出同一个数字',
            cap: '四角都含 {4,9}，其中 (2,3)、(8,3) 恰好只有 {4,9}；另两角 (2,7)、(8,7) 多出了同一个数字 7，并且都落在第 7 列上。若这两角都不取 7，四角就退化成 {4,9} 的可互换矩形，出现双解。所以两角至少一格为 7（紫实线），同时看见它们的 (5,7) 上的 7 可删。',
            cells: [
                [2, 3, [4, 9], 's'], [8, 3, [4, 9], 's'],
                [2, 7, [4, 7, 9], 's'], [8, 7, [4, 7, 9], 's'],
                [5, 7, [2, 7], 'e', [7]]
            ],
            links: [[[2, 7], [8, 7], 's'], [[2, 3], [2, 7], 'w'], [[8, 3], [8, 7], 'w']]
        }
    ],
    'BUG+1': [
        {
            t: 'BUG+1：全盘双值格里的唯一例外',
            cap: '当全盘空格几乎都是双值格（灰蓝）、只多出一格三值格时，这一格就是打破对称的钥匙。(5,5) 的候选是 {2,6,8}，其中只有 8 在全盘出现奇数次，所以 (5,5)=8，2 和 6 划掉。差一格双值都不能用这个技法。',
            cells: [
                [4, 4, [1, 2], 'g'], [4, 6, [2, 3], 'g'], [6, 4, [3, 4], 'g'], [6, 6, [4, 5], 'g'],
                [5, 5, [2, 6, 8], 'd', [2, 6]]
            ],
            links: []
        }
    ],

    /* ---------- 试错 / 高级链 ---------- */
    '强制链': [
        {
            t: '强制链：对同一格逐个假设',
            cap: '选一个候选最少的格子 (4,4)={5,9}，把两种取值各推一遍。只有「9」这一支能一路推到底不撞矛盾，因此 (4,4)=9。关键是「两个分支都得走完」——只试一支不能下结论。',
            cells: [[4, 4, [5, 9], 'p']],
            links: []
        }
    ],
    'ALS-XZ': [
        {
            t: 'ALS-XZ：两个几乎锁定集共享 X 与 Z',
            cap: 'A = {(1,1),(1,2)} 两格共 3 个候选 {2,5,7}（灰蓝）；B = {(5,2),(8,2)} 两格共 3 个候选 {5,7,9}（灰蓝）。两集共享候选 5 与 7。取 X=5：(1,2) 与 (5,2) 同在第 2 列互相可见，X 被「受限」，两集不可能都含 5。取 Z=7：至少有一集不含 5，那么那一集的两格必须填满它的 3 个候选，必然含 7。同时看见两集所有 7 格的 (2,2)（(1,1)、(1,2) 同宫，(8,2) 同列），其 7 可删。',
            cells: [
                [1, 1, [2, 7], 'g'], [1, 2, [5, 7], 's'],
                [5, 2, [5, 9], 's'], [8, 2, [7, 9], 'g'],
                [2, 2, [4, 7], 'e', [7]]
            ],
            links: [[[1, 2], [5, 2], 's'], [[8, 2], [5, 2], 'w'], [[2, 2], [8, 2], 'a']]
        }
    ]
};

/** 把任意技法名（含带括号后缀/别名）解析到详解库主键 */
function resolveLearningKey(technique) {
    if (!technique) return null;
    if (TECHNIQUE_LEARNING[technique]) return technique;

    // 去掉括号后缀（如「鳍水母法 (Finned Jellyfish)」→「鳍水母法」）
    const base = technique.replace(/[（(].*?[)）]\s*$/, '').trim();
    if (base && TECHNIQUE_LEARNING[base]) return base;

    // 别名匹配：取「最长命中别名」，避免短名抢先（鳍水母法 vs 水母法）
    let bestAlias = null, bestAliasLen = -1;
    for (const alias in TECHNIQUE_ALIASES) {
        if (technique.indexOf(alias) === -1) continue;
        if (alias.length <= bestAliasLen) continue;
        const t = TECHNIQUE_ALIASES[alias];
        if (!TECHNIQUE_LEARNING[t]) continue;
        bestAlias = t;
        bestAliasLen = alias.length;
    }
    if (bestAlias) return bestAlias;

    // 主键互相包含：同样取最长
    let bestKey = null, bestLen = -1;
    for (const key in TECHNIQUE_LEARNING) {
        if (technique.indexOf(key) === -1 && key.indexOf(technique) === -1) continue;
        if (key.length <= bestLen) continue;
        bestKey = key;
        bestLen = key.length;
    }
    return bestKey;
}

/** 取技法详解，附带可用于渲染的 __key */
function getTechniqueLearning(technique) {
    const key = resolveLearningKey(technique);
    if (!key) return null;
    const item = TECHNIQUE_LEARNING[key];
    if (!item) return null;
    const out = Object.assign({ __key: key }, item);
    if (!out.name) out.name = key;
    return out;
}

/** 该技法是否有详解页 */
function hasTechniqueLearning(technique) {
    return resolveLearningKey(technique) !== null;
}

// ============================================================================
// 补充高级技法（Remote Pair / Finned Fish / UR Type 2 & 4 / ALS-XZ / Nice Loop）
// 说明：本段追加在文件末尾，同名函数声明会覆盖前面的空桩实现。
// ============================================================================

/** 判断两格是否互为「可见」（同行、同列或同宫） */
function _isPeer(r1, c1, r2, c2) {
    if (r1 === r2 && c1 === c2) return false;
    if (r1 === r2) return true;
    if (c1 === c2) return true;
    return Math.floor(r1 / SUBSIZE) === Math.floor(r2 / SUBSIZE)
        && Math.floor(c1 / SUBSIZE) === Math.floor(c2 / SUBSIZE);
}

/** 两格的共同可见格（不含自身） */
function _commonPeersOf(r1, c1, r2, c2) {
    const out = [];
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (r === r1 && c === c1) continue;
            if (r === r2 && c === c2) continue;
            if (_isPeer(r, c, r1, c1) && _isPeer(r, c, r2, c2)) out.push([r, c]);
        }
    }
    return out;
}

// ---------------------------------------------------------------------------
// 远程数对（Remote Pair）
// 全链双值格候选集完全相同 {a,b}，相邻格互为可见 → 取值严格交替；
// 链长为偶数时首尾异值，故同时看见首尾的格既不能是 a 也不能是 b。
// ---------------------------------------------------------------------------
function findRemotePair() {
    const biv = [];
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (currentBoard[r][c] !== 0) continue;
            if (cellCandidates[r][c].size !== 2) continue;
            const arr = Array.from(cellCandidates[r][c]).sort(function (x, y) { return x - y; });
            biv.push({ r: r, c: c, key: r + ',' + c, a: arr[0], b: arr[1], pair: arr[0] + '-' + arr[1] });
        }
    }

    const groups = {};
    biv.forEach(function (x) {
        if (!groups[x.pair]) groups[x.pair] = [];
        groups[x.pair].push(x);
    });

    for (const pk in groups) {
        const cells = groups[pk];
        if (cells.length < 3) continue;

        const adj = [];
        for (let i = 0; i < cells.length; i++) adj.push([]);
        for (let i = 0; i < cells.length; i++) {
            for (let j = i + 1; j < cells.length; j++) {
                if (_isPeer(cells[i].r, cells[i].c, cells[j].r, cells[j].c)) {
                    adj[i].push(j);
                    adj[j].push(i);
                }
            }
        }

        const a = cells[0].a, b = cells[0].b;

        for (let s = 0; s < cells.length; s++) {
            const dist = [];
            for (let i = 0; i < cells.length; i++) dist.push(-1);
            dist[s] = 0;
            const queue = [s];
            while (queue.length) {
                const u = queue.shift();
                for (const v of adj[u]) {
                    if (dist[v] < 0) { dist[v] = dist[u] + 1; queue.push(v); }
                }
            }
            for (let e = 0; e < cells.length; e++) {
                if (e === s) continue;
                // 需要奇数距离且 >= 3（距离 1 即显性数对，已在别处处理）
                if (dist[e] < 3 || dist[e] % 2 === 0) continue;

                const peers = _commonPeersOf(cells[s].r, cells[s].c, cells[e].r, cells[e].c);
                const eliminations = [];
                for (const p of peers) {
                    const r = p[0], c = p[1];
                    if (currentBoard[r][c] !== 0) continue;
                    if (cells[s].r === r && cells[s].c === c) continue;
                    if (cells[e].r === r && cells[e].c === c) continue;
                    if (cellCandidates[r][c].has(a)) eliminations.push({ row: r, col: c, num: a });
                    if (cellCandidates[r][c].has(b)) eliminations.push({ row: r, col: c, num: b });
                }
                if (eliminations.length > 0) {
                    return {
                        technique: '远程数对 (Remote Pair)',
                        eliminations: eliminations,
                        explanation: '由 ' + (dist[e] + 1) + ' 个候选为 {' + a + ',' + b + '} 的格子串成远程数对链：('
                            + (cells[s].r + 1) + ',' + (cells[s].c + 1) + ') → ('
                            + (cells[e].r + 1) + ',' + (cells[e].c + 1) + ')。链长为偶数，首尾取值必然不同，'
                            + '故同时看见这两格的格子上 ' + a + ' 与 ' + b + ' 都不成立。'
                    };
                }
            }
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// 鳍鱼（Finned X-Wing / Swordfish / Jellyfish）
// 基组（size 条行或列）中除鳍之外的候选全部落在 size 条覆盖列（或行）内；
// 若鳍全部为假，则退化为普通鱼，覆盖线内的数字被基组占满；
// 若某鳍为真，则与鳍同宫的覆盖线格子不能再放该数字。两种情形都能排除。
// ---------------------------------------------------------------------------
function _findFinnedFish(digit, size, name, baseIsRow) {
    const pos = [];
    for (let u = 0; u < SIZE; u++) {
        const arr = [];
        for (let v = 0; v < SIZE; v++) {
            const r = baseIsRow ? u : v;
            const c = baseIsRow ? v : u;
            if (currentBoard[r][c] === 0 && cellCandidates[r][c].has(digit)) arr.push(v);
        }
        pos.push(arr);
    }

    // 基单元剪枝：候选数必须在 1..size+1 之间
    const basePool = [];
    for (let u = 0; u < SIZE; u++) {
        if (pos[u].length >= 1 && pos[u].length <= size + 1) basePool.push(u);
    }
    if (basePool.length < size) return null;

    const baseCombos = [];
    (function rec(start, cur) {
        if (cur.length === size) { baseCombos.push(cur.slice()); return; }
        for (let i = start; i < basePool.length; i++) {
            cur.push(basePool[i]);
            rec(i + 1, cur);
            cur.pop();
        }
    })(0, []);

    for (const base of baseCombos) {
        const union = new Set();
        base.forEach(function (u) { pos[u].forEach(function (v) { union.add(v); }); });
        const unionArr = Array.from(union).sort(function (x, y) { return x - y; });
        if (unionArr.length < size) continue;
        if (unionArr.length > size + 1) continue;

        const coverCombos = [];
        (function rec(start, cur) {
            if (cur.length === size) { coverCombos.push(cur.slice()); return; }
            for (let i = start; i < unionArr.length; i++) {
                cur.push(unionArr[i]);
                rec(i + 1, cur);
                cur.pop();
            }
        })(0, []);

        for (const cover of coverCombos) {
            const coverSet = new Set(cover);
            const fins = [];
            let ok = true;

            for (const u of base) {
                const outside = pos[u].filter(function (v) { return !coverSet.has(v); });
                if (outside.length === 0) continue;
                if (outside.length === 1) { fins.push({ u: u, v: outside[0] }); }
                else { ok = false; break; }
            }
            if (!ok) continue;
            if (fins.length === 0) continue;   // 无鳍属普通鱼，由既有实现处理
            if (fins.length > 2) continue;

            // 所有鳍必须落在同一宫，目标格才能同时看见它们
            const boxes = new Set();
            for (const f of fins) {
                const r = baseIsRow ? f.u : f.v;
                const c = baseIsRow ? f.v : f.u;
                boxes.add(Math.floor(r / SUBSIZE) * SUBSIZE + Math.floor(c / SUBSIZE));
            }
            if (boxes.size !== 1) continue;
            const finBox = Array.from(boxes)[0];

            const baseSet = new Set(base);
            const eliminations = [];
            for (const v of cover) {
                for (let u = 0; u < SIZE; u++) {
                    if (baseSet.has(u)) continue;
                    const r = baseIsRow ? u : v;
                    const c = baseIsRow ? v : u;
                    if (currentBoard[r][c] !== 0) continue;
                    const b = Math.floor(r / SUBSIZE) * SUBSIZE + Math.floor(c / SUBSIZE);
                    if (b !== finBox) continue;
                    if (cellCandidates[r][c].has(digit)) {
                        eliminations.push({ row: r, col: c, num: digit });
                    }
                }
            }
            if (eliminations.length > 0) {
                const baseText = base.map(function (u) { return u + 1; }).join('、');
                const coverText = cover.map(function (v) { return v + 1; }).join('、');
                const finText = fins.map(function (f) {
                    const r = baseIsRow ? f.u : f.v;
                    const c = baseIsRow ? f.v : f.u;
                    return '(' + (r + 1) + ',' + (c + 1) + ')';
                }).join('、');
                return {
                    technique: name,
                    eliminations: eliminations,
                    explanation: '数字 ' + digit + ' 在' + (baseIsRow ? '第 ' + baseText + ' 行' : '第 ' + baseText + ' 列')
                        + '中除鳍格 ' + finText + ' 外，全部落在' + (baseIsRow ? '第 ' + coverText + ' 列' : '第 ' + coverText + ' 行')
                        + '。若鳍全为假即为标准鱼形，覆盖线被基组占满；若鳍为真，则与鳍同宫的覆盖线格子不能再放 '
                        + digit + '。两种情形都能排除。'
                };
            }
        }
    }
    return null;
}

function findFinnedXWing() {
    for (let d = 1; d <= SIZE; d++) {
        let s = _findFinnedFish(d, 2, '鳍 X-Wing (Finned X-Wing)', true);
        if (s) return s;
        s = _findFinnedFish(d, 2, '鳍 X-Wing (Finned X-Wing)', false);
        if (s) return s;
    }
    return null;
}

function findFinnedSwordfish() {
    for (let d = 1; d <= SIZE; d++) {
        let s = _findFinnedFish(d, 3, '鳍剑鱼法 (Finned Swordfish)', true);
        if (s) return s;
        s = _findFinnedFish(d, 3, '鳍剑鱼法 (Finned Swordfish)', false);
        if (s) return s;
    }
    return null;
}

function findFinnedJellyfish() {
    for (let d = 1; d <= SIZE; d++) {
        let s = _findFinnedFish(d, 4, '鳍水母法 (Finned Jellyfish)', true);
        if (s) return s;
        s = _findFinnedFish(d, 4, '鳍水母法 (Finned Jellyfish)', false);
        if (s) return s;
    }
    return null;
}

// ---------------------------------------------------------------------------
// 唯一矩形 公共：枚举矩形四角
// ---------------------------------------------------------------------------
function _urRectangles() {
    const out = [];
    for (let r1 = 0; r1 < SIZE; r1++) {
        for (let r2 = r1 + 1; r2 < SIZE; r2++) {
            for (let c1 = 0; c1 < SIZE; c1++) {
                for (let c2 = c1 + 1; c2 < SIZE; c2++) {
                    // 四角全落同一宫时不可能构成致命矩形
                    if (Math.floor(r1 / SUBSIZE) === Math.floor(r2 / SUBSIZE)
                        && Math.floor(c1 / SUBSIZE) === Math.floor(c2 / SUBSIZE)) continue;

                    const corners = [[r1, c1], [r1, c2], [r2, c1], [r2, c2]];
                    let full = true;
                    for (const p of corners) {
                        if (currentBoard[p[0]][p[1]] !== 0) { full = false; break; }
                        if (cellCandidates[p[0]][p[1]].size < 2) { full = false; break; }
                    }
                    if (!full) continue;

                    // 四角共有的候选（至少两枚）
                    let common = null;
                    for (const p of corners) {
                        const set = cellCandidates[p[0]][p[1]];
                        if (common === null) { common = new Set(set); }
                        else {
                            const next = new Set();
                            common.forEach(function (x) { if (set.has(x)) next.add(x); });
                            common = next;
                        }
                    }
                    if (!common || common.size < 2) continue;

                    out.push({ r1: r1, r2: r2, c1: c1, c2: c2, corners: corners, common: Array.from(common).sort(function (a, b) { return a - b; }) });
                }
            }
        }
    }
    return out;
}

// ---------------------------------------------------------------------------
// 唯一矩形 Type 2
// 两角恰为 {a,b}，另两角为 {a,b,c} 且多出的 c 相同、位于同一行或同一列；
// 则 c 必落在其中一角，同时看见这两角的格子不能为 c。
// ---------------------------------------------------------------------------
function findURType2() {
    const rects = _urRectangles();
    for (const rect of rects) {
        for (let i = 0; i < rect.common.length; i++) {
            for (let j = i + 1; j < rect.common.length; j++) {
                const a = rect.common[i], b = rect.common[j];

                const exact = [];
                const extra = [];
                for (const p of rect.corners) {
                    const cand = cellCandidates[p[0]][p[1]];
                    if (!cand.has(a) || !cand.has(b)) continue;
                    const others = [];
                    cand.forEach(function (x) { if (x !== a && x !== b) others.push(x); });
                    if (cand.size === 2) exact.push(p);
                    else extra.push({ p: p, others: others });
                }
                if (exact.length !== 2 || extra.length !== 2) continue;

                // 两个额外角都必须只多出同一个候选
                if (extra[0].others.length !== 1 || extra[1].others.length !== 1) continue;
                const cc = extra[0].others[0];
                if (extra[1].others[0] !== cc) continue;

                // 两个额外角必须同行或同列
                const p1 = extra[0].p, p2 = extra[1].p;
                if (p1[0] !== p2[0] && p1[1] !== p2[1]) continue;

                const peers = _commonPeersOf(p1[0], p1[1], p2[0], p2[1]);
                const eliminations = [];
                for (const q of peers) {
                    const r = q[0], c = q[1];
                    if (currentBoard[r][c] !== 0) continue;
                    // 排除四角本身
                    let isCorner = false;
                    for (const p of rect.corners) {
                        if (p[0] === r && p[1] === c) { isCorner = true; break; }
                    }
                    if (isCorner) continue;
                    if (cellCandidates[r][c].has(cc)) eliminations.push({ row: r, col: c, num: cc });
                }
                if (eliminations.length > 0) {
                    return {
                        technique: '唯一矩形 Type 2 (Unique Rectangle Type 2)',
                        eliminations: eliminations,
                        explanation: '四角 (' + (rect.r1 + 1) + ',' + (rect.c1 + 1) + ')(' + (rect.r1 + 1) + ',' + (rect.c2 + 1)
                            + ')(' + (rect.r2 + 1) + ',' + (rect.c1 + 1) + ')(' + (rect.r2 + 1) + ',' + (rect.c2 + 1)
                            + ') 中两角恰为 {' + a + ',' + b + '}，另两角为 {' + a + ',' + b + ',' + cc + '}。为避开可互换的致命矩形，'
                            + cc + ' 必须落在后两角之一，故同时看见这两角的格子上 ' + cc + ' 不成立。'
                    };
                }
            }
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// 唯一矩形 Type 4
// 若在某条行（或列）上，基准数字 a 只剩矩形内的两格可放，
// 则这两格不能取 b —— 否则四角将退化为可互换的双解形态。
// ---------------------------------------------------------------------------
function findURType4() {
    // UR Type 4 需额外前提（两角在链上的受限关系），本实现缺少该前提，
    // 实测误删正确答案 1976 处（约占 44%），故停用。
    // 同类推理已由 UR Type 2、XY-Chain、AIC 覆盖。
    return null;
}

// ---------------------------------------------------------------------------
// ALS-XZ（ALS 双集消去）
// 两个 ALS（n 格恰含 n+1 个候选）共享受限公共候选 X 与普通公共候选 Z。
// X 不可能同时落在两集 → 至少一集不含 X → 该集其余候选全真，其中含 Z。
// 故 Z 必真，同时看见两集所有 Z 格的目标格不能为 Z。
// ---------------------------------------------------------------------------
function _buildALSList() {
    const units = _buildScanUnits();
    const list = [];
    const MAX_SIZE = 3;

    for (let ui = 0; ui < units.length; ui++) {
        const unit = units[ui];
        const cells = [];
        for (const p of unit.cells) {
            if (currentBoard[p[0]][p[1]] !== 0) continue;
            if (cellCandidates[p[0]][p[1]].size >= 2 && cellCandidates[p[0]][p[1]].size <= MAX_SIZE + 1) {
                cells.push(p);
            }
        }
        if (cells.length < 2) continue;

        for (let size = 2; size <= MAX_SIZE; size++) {
            const combos = [];
            (function rec(start, cur) {
                if (cur.length === size) { combos.push(cur.slice()); return; }
                for (let i = start; i < cells.length; i++) {
                    cur.push(cells[i]);
                    rec(i + 1, cur);
                    cur.pop();
                }
            })(0, []);

            for (const combo of combos) {
                const cand = new Set();
                let ok = true;
                for (const p of combo) {
                    cellCandidates[p[0]][p[1]].forEach(function (x) { cand.add(x); });
                    if (cand.size > size + 1) { ok = false; break; }
                }
                if (!ok) continue;
                if (cand.size !== size + 1) continue;
                list.push({ cells: combo, cand: cand, unit: ui });
                if (list.length > 320) return list;
            }
        }
    }
    return list;
}

function findALSXZ() {
    const alsList = _buildALSList();
    if (alsList.length < 2) return null;

    const keyOf = function (p) { return p[0] + ',' + p[1]; };

    for (let i = 0; i < alsList.length; i++) {
        for (let j = i + 1; j < alsList.length; j++) {
            const A = alsList[i], B = alsList[j];
            // 两集不能共用格子
            const cellSet = {};
            for (const p of A.cells) cellSet[keyOf(p)] = (cellSet[keyOf(p)] || 0) + 1;
            for (const p of B.cells) cellSet[keyOf(p)] = (cellSet[keyOf(p)] || 0) + 1;
            let overlap = false;
            for (const k in cellSet) { if (cellSet[k] > 1) { overlap = true; break; } }
            if (overlap) continue;

            // 公共候选
            const common = [];
            A.cand.forEach(function (x) { if (B.cand.has(x)) common.push(x); });
            if (common.length < 2) continue;

            for (const X of common) {
                // X 的受限性：A 中所有含 X 的格，与 B 中所有含 X 的格，两两互为可见
                const ax = A.cells.filter(function (p) { return cellCandidates[p[0]][p[1]].has(X); });
                const bx = B.cells.filter(function (p) { return cellCandidates[p[0]][p[1]].has(X); });
                if (ax.length === 0 || bx.length === 0) continue;
                let restricted = true;
                for (const p of ax) {
                    for (const q of bx) {
                        if (!_isPeer(p[0], p[1], q[0], q[1])) { restricted = false; break; }
                    }
                    if (!restricted) break;
                }
                if (!restricted) continue;

                for (const Z of common) {
                    if (Z === X) continue;

                    const az = A.cells.filter(function (p) { return cellCandidates[p[0]][p[1]].has(Z); });
                    const bz = B.cells.filter(function (p) { return cellCandidates[p[0]][p[1]].has(Z); });
                    if (az.length === 0 || bz.length === 0) continue;

                    const eliminations = [];
                    for (let r = 0; r < SIZE; r++) {
                        for (let c = 0; c < SIZE; c++) {
                            if (currentBoard[r][c] !== 0) continue;
                            if (!cellCandidates[r][c].has(Z)) continue;
                            const k = r + ',' + c;
                            if (cellSet[k]) continue;   // 目标不在两集内
                            let seesAll = true;
                            for (const p of az) {
                                if (!_isPeer(r, c, p[0], p[1])) { seesAll = false; break; }
                            }
                            if (seesAll) {
                                for (const q of bz) {
                                    if (!_isPeer(r, c, q[0], q[1])) { seesAll = false; break; }
                                }
                            }
                            if (seesAll) eliminations.push({ row: r, col: c, num: Z });
                        }
                    }
                    if (eliminations.length > 0) {
                        return {
                            technique: 'ALS-XZ (ALS 双集消去)',
                            eliminations: eliminations,
                            explanation: '两个 ALS 集：A = {' + A.cells.map(function (p) { return '(' + (p[0] + 1) + ',' + (p[1] + 1) + ')'; }).join('')
                                + '} 候选 {' + Array.from(A.cand).sort().join(',') + '}；B = {' + B.cells.map(function (p) { return '(' + (p[0] + 1) + ',' + (p[1] + 1) + ')'; }).join('')
                                + '} 候选 {' + Array.from(B.cand).sort().join(',') + '}。受限公共候选 ' + X
                                + ' 不可能同时落在 A 与 B，故至少一集不含 ' + X + '，该集其余候选全真，其中包含 ' + Z
                                + '。因此 ' + Z + ' 必真，同时看见两集所有 ' + Z + ' 格的格子上 ' + Z + ' 不成立。'
                        };
                    }
                }
            }
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// 连续环（Continuous Nice Loop）
// 沿「强弱交替」在候选图上找到闭合环。环上每条弱链都升级为强链：
//   · 同格两候选之间的弱链 → 该格必取其一，其余候选可删；
//   · 同单元同数字两格之间的弱链 → 该数字必落其上，单元内其他格可删。
// ---------------------------------------------------------------------------
function findContinuousNiceLoop() {
    // 连续环要求「强弱严格交替且闭合」，本实现在实测中会误删正确答案
    // （232 处），不满足健全性要求，故停用；同类推理已由 AIC / X-Chain 覆盖。
    return null;
}

/** 分组链：暂未提供可靠实现，保持停用（返回 null 不会误导求解） */
function findGroupedChain() { return null; }


/* ==========================================================================
 * 教学模式（Teaching Mode）—— 按真实做题顺序推进
 * --------------------------------------------------------------------------
 * 与"智能解题"的区别：智能解题每一步都直接挑当前最高效的技法；教学模式则
 * 模拟真人解题，严格按固定顺序、且每一步只做一件事：
 *
 *   ① 基础摒除（横竖宫排）：从数字 1 开始，对每个数字依次扫「行 → 列 → 宫」，
 *      某个单元里该数字只剩一个可行位置时填入。9 个数字全部扫完、再也填不出
 *      任何格子，才进入下一阶段。
 *   ② 唯一候选数：只看"学员已经写下候选数"的格子（真人只在有记号的格子上
 *      看唯一候选），若只剩一个候选就填。
 *   ③ 候选数标注：挑一个还没写候选数的空格，把它的候选数一次补全。
 *      补完回到 ② 反复推进 —— 这正是真人"先理候选、再找唯一"的节奏。
 *   ④ 候选数删减（数对/三数/四数/区块）与高级技法（鱼形/翼形/唯一矩形/链），
 *      交由 findNextLogicalStep 按技法等级从低到高兜底。
 *
 * 每一步要么填一个真实数字，要么写出一格候选数，绝不会"一步填多格"。
 * ========================================================================== */

/** 是否处于教学模式 */
let teachingMode = false;
/**
 * 学员"已经写下"的候选数，分两层（见《九宫数独求解程序完整逻辑》第九节）：
 *   greenCand[r][c]  绿色 = 部分候选，只标有简单逻辑依据的候选（唯一候选、区块锁定、共轭对……）
 *   yellowCand[r][c] 黄色 = 全部候选，该格完整的可能数（绿色推不动时才标）
 * teachShown 是历史名称，保留为"绿+黄并集"的只读视图，供既有 UI 代码兼容。
 */
let teachShown = null;
let greenCand = null;
let yellowCand = null;

/** 绿色候选上限：完整候选数 <= 该值才值得标绿色（第十三节 绿色候选上限 = 3） */
const GREEN_CAND_LIMIT = 3;

function makeCandidateMatrix() {
    const m = [];
    for (let r = 0; r < SIZE; r++) {
        const row = [];
        for (let c = 0; c < SIZE; c++) row.push(new Set());
        m.push(row);
    }
    return m;
}

/** 取某格当前可见候选（绿 ∪ 黄），返回新 Set，避免外部误改内部状态 */
function getTeachVisibleCandidates(r, c) {
    const out = new Set();
    if (!greenCand || !yellowCand) return out;
    greenCand[r][c].forEach(function (n) { out.add(n); });
    yellowCand[r][c].forEach(function (n) { out.add(n); });
    return out;
}

/**
 * 教学模式"作业过程"参数（《九宫数独求解程序逻辑说明（模拟人做题）》第十四节，可调优）
 *   thresholdA     阈值A：阶段内填出多少个数才值得触发"快速补扫 1—9"
 *   thresholdB     阈值B：空格数少于多少时才整批标注候选数（否则只标注最有希望的格子）
 *   rescanLimit    补扫上限：连续补扫最多几轮
 *   noProgressLimit 无进展阈值：连续多少轮无进展才触发补扫
 */
const TEACH_CFG = {
    thresholdA: 3,
    thresholdB: 40,
    rescanLimit: 2,
    noProgressLimit: 2
};

/** 作业过程推进状态：一次点击只推进一步，阶段/游标跨点击保留 */
let teachPlan = null;

function resetTeachProgress() {
    teachPlan = {
        stage: 'PASS1',     // PASS1 第一遍 1—9 | RESCAN 快速补扫 | MAIN 主循环（阶段A→H）
        num: 1,             // PASS1 / RESCAN 正在处理的数字（1—9，>9 表示本轮已扫完）
        unit: 0,            // 该数字已扫到第几个单元（0—26：9 行 + 9 列 + 9 宫）
        round: 0,           // 该数字第几轮扫描：0=首轮，1=排除后回扫
        unitList: null,     // 单元顺序缓存（行→列→宫）
        pendingLocal: null, // 落子后挂起的局部检查（等该数字的标绿/排除做完再补做）
        filled: 0,          // 本阶段/本轮填出的数量（阈值A 判定）
        rescanRounds: 0,    // 已连续补扫轮数
        rescanReturn: null, // 补扫结束后回到哪个阶段
        noProgress: 0,      // 连续无进展轮数
        rescanUsed: false,  // 阶段F 的无进展补扫是否已用过（有进展后重置）
        local: false,       // 是否处于"落子后的局部检查"
        anchor: null,       // 上一次落子位置 {row,col}，局部检查的范围
        resume: null        // 局部检查结束后回到哪个阶段
    };
    return teachPlan;
}

function resetTeachState() {
    teachShown = makeCandidateMatrix();
    greenCand = makeCandidateMatrix();
    yellowCand = makeCandidateMatrix();
    resetTeachProgress();
    return teachShown;
}

/** 开关教学模式 */
function setTeachingMode(on) {
    teachingMode = !!on;
    resetTeachState();
    return teachingMode;
}

/** 已填格清空记号；候选数被排除后同步从记号里删除（保持记号永远真实） */
function syncTeachShown() {
    if (!teachShown) { resetTeachState(); return; }
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (currentBoard[r][c] !== 0) {
                greenCand[r][c].clear();
                yellowCand[r][c].clear();
                teachShown[r][c].clear();
                continue;
            }
            const actual = cellCandidates[r][c];
            [greenCand[r][c], yellowCand[r][c]].forEach(function (layer) {
                Array.from(layer).forEach(function (n) {
                    if (!actual.has(n)) layer.delete(n);   // 候选失效只清理该格
                });
            });
            // 重建"绿+黄"并集视图
            teachShown[r][c].clear();
            greenCand[r][c].forEach(function (n) { teachShown[r][c].add(n); });
            yellowCand[r][c].forEach(function (n) { teachShown[r][c].add(n); });
        }
    }
}

/**
 * 取某个单元（宫/行/列）的 9 个坐标，顺序为从上到下、从左到右。
 */
function teachUnitCells(kind, index) {
    const cells = [];
    if (kind === 'box') {
        const br = Math.floor(index / SUBSIZE) * SUBSIZE;
        const bc = (index % SUBSIZE) * SUBSIZE;
        for (let i = 0; i < SUBSIZE; i++) {
            for (let j = 0; j < SUBSIZE; j++) cells.push([br + i, bc + j]);
        }
    } else if (kind === 'row') {
        for (let c = 0; c < SIZE; c++) cells.push([index, c]);
    } else {
        for (let r = 0; r < SIZE; r++) cells.push([r, index]);
    }
    return cells;
}

/**
 * 教学落子步：落子后转入"局部检查"（三向检查 + 受影响区域唯一位置），
 * 不触发全盘 1—9 补扫；并累加本阶段填出数，供阈值A 判定。
 * knowledgeKey 用技法短名（如"摒除法"），因为技法知识库按短名索引。
 *
 * deferLocal=true：先挂起局部检查，等该数字的"标锁定绿色 + 立即排除"做完再补做。
 * 按数字 1—9 作业时用它，保证「填精确位置」和「标行列位置」是同一个数字的同一步处理，
 * 不会被局部连填打断成"先把 1—9 都填一遍、最后才标记"。
 */
function teachPlaceStep(row, col, value, technique, explanation, resumeStage, knowledgeKey, deferLocal) {
    const step = {
        row: row, col: col, value: value,
        technique: technique,
        eliminations: [],
        knowledge: getTechniqueKnowledge(knowledgeKey || technique),
        explanation: explanation
    };
    if (!isStepSound(step)) return null;
    step.level = getTechniqueLevel(technique);
    teachPlan.filled++;
    teachPlan.noProgress = 0;      // 填出数字即视为有进展
    teachPlan.rescanUsed = false;  // 有进展后重置补扫机会，允许日后再补扫
    if (deferLocal) {
        teachPlan.local = false;
        teachPlan.pendingLocal = {
            anchor: { row: row, col: col },
            resume: resumeStage || teachPlan.stage
        };
    } else {
        teachPlan.local = true;
        teachPlan.anchor = { row: row, col: col };
        teachPlan.resume = resumeStage || teachPlan.stage;
    }
    return enrichStepGraph(step);
}

/**
 * 扫描单个单元：先看"只剩一个空格"，再看"某数字只剩一个位置"。
 * 阶段A（宫→行→列找唯一）、阶段C（宫内/行/列唯一）、局部检查三者共用。
 */
function teachScanUnit(kind, index, resumeStage) {
    const name = kind === 'box' ? '宫' : (kind === 'row' ? '行' : '列');
    const cells = teachUnitCells(kind, index);

    // 三向检查：该单元只剩一个空格 → 只能填剩下的那个数
    let empty = 0, er = -1, ec = -1;
    for (let k = 0; k < cells.length; k++) {
        const r = cells[k][0], c = cells[k][1];
        if (currentBoard[r][c] === 0) { empty++; er = r; ec = c; }
    }
    if (empty === 1 && cellCandidates[er][ec].size === 1) {
        const v = Array.from(cellCandidates[er][ec])[0];
        const step = teachPlaceStep(er, ec, v, '摒除法（' + name + '）',
            '第 ' + (index + 1) + ' ' + name + '里只剩 (' + (er + 1) + ',' + (ec + 1) +
            ') 一个空格，只能填 ' + v + '。', resumeStage, '摒除法');
        if (step) return step;
    }

    // 局部影响检查：某数字在本单元里只剩一个候选位置
    for (let d = 1; d <= SIZE; d++) {
        let cnt = 0, rr = -1, cc = -1, blocked = false;
        for (let k = 0; k < cells.length; k++) {
            const r = cells[k][0], c = cells[k][1];
            const v = currentBoard[r][c];
            if (v === d) { blocked = true; break; }
            if (v !== 0) continue;
            if (!cellCandidates[r][c].has(d)) continue;
            cnt++; rr = r; cc = c;
            if (cnt > 1) break;
        }
        if (blocked || cnt !== 1) continue;
        const step = teachPlaceStep(rr, cc, d, '摒除法（' + name + '）',
            '第 ' + (index + 1) + ' ' + name + '里，数字 ' + d + ' 只剩 (' + (rr + 1) + ',' + (cc + 1) +
            ') 这一个位置可放。', resumeStage, '摒除法');
        if (step) return step;
    }
    return null;
}

/** 阶段A：按 宫 → 行 → 列 的顺序找唯一 */
function teachUnitUniqueScan(resumeStage) {
    for (let b = 0; b < SIZE; b++) { const s = teachScanUnit('box', b, resumeStage); if (s) return s; }
    for (let r = 0; r < SIZE; r++) { const s = teachScanUnit('row', r, resumeStage); if (s) return s; }
    for (let c = 0; c < SIZE; c++) { const s = teachScanUnit('col', c, resumeStage); if (s) return s; }
    return null;
}

/**
 * 局部检查：落子后只检查该行、该列、该宫（三向检查 + 受影响区域的唯一位置检查）。
 * 绝不触发全盘 1—9 补扫。
 */
function teachLocalScan(anchor, resumeStage) {
    if (!anchor) return null;
    const boxIndex = Math.floor(anchor.row / SUBSIZE) * SUBSIZE + Math.floor(anchor.col / SUBSIZE);
    const units = [
        { kind: 'box', index: boxIndex },
        { kind: 'row', index: anchor.row },
        { kind: 'col', index: anchor.col }
    ];
    for (let u = 0; u < units.length; u++) {
        const step = teachScanUnit(units[u].kind, units[u].index, resumeStage);
        if (step) return step;
    }
    return null;
}

/**
 * 标完锁定类绿色后立即做宫外/宫内排除（该数字的一次批量排除）。
 */
function teachDigitEliminationStep(d) {
    const G = teachBuildGreen({ num: d, low: false, lock: true, pair: false });
    const elims = teachGreenEliminations(G);
    if (!elims.length) return null;
    const step = {
        technique: '区块排除法',
        eliminations: elims,
        knowledge: getTechniqueKnowledge('区块排除法'),
        explanation: '数字 ' + d + ' 出现了区块锁定：它在某个宫里只能落在同一行（或同一列），' +
            '或者在某行（列）里只能落在同一个宫。本次划掉 ' +
            elims.map(function (e) { return '(' + (e.row + 1) + ',' + (e.col + 1) + ') 的 ' + e.num; }).join('、') + '。'
    };
    if (!isStepSound(step)) return null;
    step.level = getTechniqueLevel(step.technique);
    return enrichStepGraph(step);
}

/**
 * 第一遍 / 快速补扫：数字 1→9 逐个处理，数字与单元游标跨点击保留。
 *
 * 处理某个数字时，按单元逐个扫描（行 1—9 → 列 1—9 → 宫 1—9），每个单元里同时判断：
 *   ① 这个数字在该单元只剩一个位置 → 直接填值；
 *   ② 这个数字在该单元里只落在同一宫/同一行/同一列（含共轭对）→ 直接标绿，标完立即排除。
 * 填值与标记是交织的：扫到一个单元就把它能做的做完，不会"先把 1—9 全填一遍、最后才标记"。
 * 全部单元扫完后，统一做一次区块排除；排除完再回扫一遍，产生唯一就填。
 */
function teachScanDigits(from, stage) {
    const st = teachPlan;
    const units = teachDigitUnits();
    for (let d = from; d <= SIZE; d++) {
        if (st.num !== d) { st.num = d; st.unit = 0; st.round = 0; }

        while (st.round < 2) {
            while (st.unit < units.length) {
                const u = units[st.unit];
                const step = teachDigitUnitScan(d, u.kind, u.index, stage);
                if (step) return step;
                st.unit++;
            }
            // 全部单元扫完 → 标完立即做区块排除
            if (st.round === 0) {
                const elimStep = teachDigitEliminationStep(d);
                if (elimStep) { st.round = 1; st.unit = 0; return elimStep; }
            }
            st.round = 2;
        }

        // 该数字处理完 → 补做落子后的局部检查
        const pending = st.pendingLocal;
        st.pendingLocal = null;
        st.unit = 0;
        st.round = 0;
        if (pending) {
            const localStep = teachLocalScan(pending.anchor, pending.resume);
            if (localStep) return localStep;
        }
        st.num = d + 1;
    }
    return null;
}

/** 单元扫描顺序：行 1—9 → 列 1—9 → 宫 1—9（缓存一份，避免每次重建） */
function teachDigitUnits() {
    if (!teachPlan.unitList) {
        const list = [];
        for (let r = 0; r < SIZE; r++) list.push({ kind: 'row', index: r });
        for (let c = 0; c < SIZE; c++) list.push({ kind: 'col', index: c });
        for (let b = 0; b < SIZE; b++) list.push({ kind: 'box', index: b });
        teachPlan.unitList = list;
    }
    return teachPlan.unitList;
}

/**
 * 处理单个单元（行/列/宫）里的数字 d，一次只产出一个动作：
 *   唯一位置 → 落子步；有未标注的锁定类候选 → 标绿步；都没有 → null（该单元处理完）。
 */
function teachDigitUnitScan(d, kind, index, stage) {
    const name = kind === 'box' ? '宫' : (kind === 'row' ? '行' : '列');
    const label = '第 ' + (index + 1) + ' ' + name;
    const cells = teachUnitCells(kind, index);

    // ① 唯一位置 → 直接填值
    let count = 0, onlyR = -1, onlyC = -1;
    for (let k = 0; k < cells.length; k++) {
        const r = cells[k][0], c = cells[k][1];
        if (currentBoard[r][c] !== 0) continue;
        if (!cellCandidates[r][c].has(d)) continue;
        count++;
        onlyR = r; onlyC = c;
        if (count > 1) break;
    }
    if (count === 1 && isValidMove(onlyR, onlyC, d)) {
        const step = teachPlaceStep(onlyR, onlyC, d, '摒除法（' + name + '）',
            label + '里，数字 ' + d + ' 只剩 (' + (onlyR + 1) + ',' + (onlyC + 1) + ') 这一个位置可放。',
            stage, '摒除法', true);
        if (step) return step;
    }

    // ② 只确定在某一行/某一列/某一宫 → 直接标绿（基础阶段只标四种锁定，不标跨宫共轭对）
    const G = teachBuildGreen({ num: d, low: false, lock: true, pair: false });

    // 只标"属于本单元这一条锁定关系"的格子。不能把本单元里所有绿色的格子一把抓：
    // 同一行里可能有两个候选落在不同的宫（各自被别的宫锁列/列锁宫标绿），
    // 那不是"这一行的这个数锁定在同一宫"，基础阶段不该这样连带标记。
    const boxOf = function (p) { return Math.floor(p[0] / SUBSIZE) * SUBSIZE + Math.floor(p[1] / SUBSIZE); };
    let target = null;
    let why = '';
    if (kind === 'row' && G.lockRowBox[index][d] >= 0) {
        const g = G.lockRowBox[index][d];
        target = cells.filter(function (p) { return boxOf(p) === g; });
        why = '第 ' + (index + 1) + ' 行里，数字 ' + d + ' 只能落在第 ' + (g + 1) +
            ' 宫内，所以这些格子只可能填 ' + d + '（行锁宫）。';
    } else if (kind === 'col' && G.lockColBox[index][d] >= 0) {
        const g = G.lockColBox[index][d];
        target = cells.filter(function (p) { return boxOf(p) === g; });
        why = '第 ' + (index + 1) + ' 列里，数字 ' + d + ' 只能落在第 ' + (g + 1) +
            ' 宫内，所以这些格子只可能填 ' + d + '（列锁宫）。';
    } else if (kind === 'box' && G.lockBoxRow[index][d] >= 0) {
        const rr = G.lockBoxRow[index][d];
        target = cells.filter(function (p) { return p[0] === rr; });
        why = '第 ' + (index + 1) + ' 宫里，数字 ' + d + ' 只能落在第 ' + (rr + 1) +
            ' 行，所以这些格子只可能填 ' + d + '（宫锁行）。';
    } else if (kind === 'box' && G.lockBoxCol[index][d] >= 0) {
        const cc = G.lockBoxCol[index][d];
        target = cells.filter(function (p) { return p[1] === cc; });
        why = '第 ' + (index + 1) + ' 宫里，数字 ' + d + ' 只能落在第 ' + (cc + 1) +
            ' 列，所以这些格子只可能填 ' + d + '（宫锁列）。';
    }

    const batch = [];
    if (target) {
        for (let k = 0; k < target.length; k++) {
            const r = target[k][0], c = target[k][1];
            if (currentBoard[r][c] !== 0) continue;
            if (!cellCandidates[r][c].has(d)) continue;
            if (greenCand[r][c].has(d)) continue;   // 已经标过
            batch.push({ row: r, col: c, candidates: [d] });
        }
    }
    if (batch.length) {
        const where = batch.map(function (x) { return '(' + (x.row + 1) + ',' + (x.col + 1) + ')'; }).join('、');
        const step = {
            teachKind: 'candidates', layer: 'green',
            row: batch[0].row, col: batch[0].col,
            cells: batch, candidates: [d],
            technique: '绿色候选标注',
            eliminations: [],
            knowledge: getTechniqueKnowledge('候选数标注'),
            explanation: '处理数字 ' + d + '，' + why + '标记 ' + where + '，共 ' + batch.length + ' 格。'
        };
        if (isStepSound(step)) {
            step.level = getTechniqueLevel(step.technique);
            return enrichStepGraph(step);
        }
    }
    return null;
}

/**
 * 计算"绿色部分候选"（第七节）。绿色只包含有简单逻辑依据的候选，不是每格完整候选：
 *   来源1 完整候选 <= 绿色候选上限 的空格（这些格子绿色即完整候选，full=true）
 *   来源2 宫内某数锁定在同一行/同一列（宫锁行 / 宫锁列）
 *   来源3 某行/列某数锁定在同一宫（行锁宫 / 列锁宫）
 *   来源4 共轭对（某区域内某数只出现在两个空格）
 *
 * opts：
 *   num   只处理某一个数字（0 或省略 = 全部 1—9），用于"按数字 1—9 处理时顺手标锁定类绿色"
 *   low   是否计算来源1（候选少类），默认 true
 *   lock  是否计算来源2/3（四种锁定），默认 true
 *   pair  是否计算来源4（共轭对）。按数字 1—9 作业时传 false：
 *         共轭对如果跨了两个宫，说明"这个数在某宫还没锁定"，基础阶段不标，留到卡住后再补。
 *
 * 纯派生数据：每次按需重算，不做持久化，避免填数后状态过期。
 */
function teachBuildGreen(opts) {
    opts = opts || {};
    const onlyNum = opts.num || 0;
    const wantLow = opts.low !== false;
    const wantLock = opts.lock !== false;
    const wantPair = opts.pair !== false;
    const nStart = onlyNum ? onlyNum : 1;
    const nEnd = onlyNum ? onlyNum : SIZE;

    const green = makeCandidateMatrix();
    const full = [];
    for (let r = 0; r < SIZE; r++) {
        const row = [];
        for (let c = 0; c < SIZE; c++) row.push(false);
        full.push(row);
    }

    // 来源1：候选少的空格（只有它能保证"绿色 == 完整候选"）
    if (wantLow) {
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (currentBoard[r][c] !== 0) continue;
                const base = cellCandidates[r][c];
                if (base.size >= 1 && base.size <= GREEN_CAND_LIMIT) {
                    base.forEach(function (n) { green[r][c].add(n); });
                    full[r][c] = true;   // 该格绿色 == 完整候选，可用于"唯一候选直接填数"
                }
            }
        }
    }

    // 某单元内数字 num 的全部候选位置
    function positionsOf(cells, num) {
        const pos = [];
        for (let k = 0; k < cells.length; k++) {
            const r = cells[k][0], c = cells[k][1];
            if (currentBoard[r][c] === 0 && cellCandidates[r][c].has(num)) pos.push([r, c]);
        }
        return pos;
    }

    const lockBoxRow = [], lockBoxCol = [], lockRowBox = [], lockColBox = [];
    for (let g = 0; g < SIZE; g++) { lockBoxRow.push(new Array(SIZE + 1).fill(-1)); lockBoxCol.push(new Array(SIZE + 1).fill(-1)); }
    for (let i = 0; i < SIZE; i++) { lockRowBox.push(new Array(SIZE + 1).fill(-1)); lockColBox.push(new Array(SIZE + 1).fill(-1)); }

    if (wantLock) {
        const boxOf = function (p) { return Math.floor(p[0] / SUBSIZE) * SUBSIZE + Math.floor(p[1] / SUBSIZE); };

        // 来源2：宫锁行 / 宫锁列
        for (let b = 0; b < SIZE; b++) {
            const cells = teachUnitCells('box', b);
            for (let num = nStart; num <= nEnd; num++) {
                const pos = positionsOf(cells, num);
                if (pos.length < 2) continue;
                const sameRow = pos.every(function (p) { return p[0] === pos[0][0]; });
                const sameCol = pos.every(function (p) { return p[1] === pos[0][1]; });
                if (sameRow) {
                    for (let k = 0; k < pos.length; k++) green[pos[k][0]][pos[k][1]].add(num);
                    lockBoxRow[b][num] = pos[0][0];
                }
                if (sameCol) {
                    for (let k = 0; k < pos.length; k++) green[pos[k][0]][pos[k][1]].add(num);
                    lockBoxCol[b][num] = pos[0][1];
                }
            }
        }

        // 来源3：行锁宫 / 列锁宫
        for (let r = 0; r < SIZE; r++) {
            const cells = teachUnitCells('row', r);
            for (let num = nStart; num <= nEnd; num++) {
                const pos = positionsOf(cells, num);
                if (pos.length < 2) continue;
                if (pos.every(function (p) { return boxOf(p) === boxOf(pos[0]); })) {
                    for (let k = 0; k < pos.length; k++) green[pos[k][0]][pos[k][1]].add(num);
                    lockRowBox[r][num] = boxOf(pos[0]);
                }
            }
        }
        for (let c = 0; c < SIZE; c++) {
            const cells = teachUnitCells('col', c);
            for (let num = nStart; num <= nEnd; num++) {
                const pos = positionsOf(cells, num);
                if (pos.length < 2) continue;
                if (pos.every(function (p) { return boxOf(p) === boxOf(pos[0]); })) {
                    for (let k = 0; k < pos.length; k++) green[pos[k][0]][pos[k][1]].add(num);
                    lockColBox[c][num] = boxOf(pos[0]);
                }
            }
        }

        // 来源4：共轭对（某区域内某数只出现在两个空格）
        if (wantPair) {
            const allUnits = [];
            for (let b = 0; b < SIZE; b++) allUnits.push(teachUnitCells('box', b));
            for (let r = 0; r < SIZE; r++) allUnits.push(teachUnitCells('row', r));
            for (let c = 0; c < SIZE; c++) allUnits.push(teachUnitCells('col', c));
            for (let u = 0; u < allUnits.length; u++) {
                for (let num = nStart; num <= nEnd; num++) {
                    const pos = positionsOf(allUnits[u], num);
                    if (pos.length === 2) {
                        green[pos[0][0]][pos[0][1]].add(num);
                        green[pos[1][0]][pos[1][1]].add(num);
                    }
                }
            }
        }
    }

    return {
        green: green, full: full,
        lockBoxRow: lockBoxRow, lockBoxCol: lockBoxCol,
        lockRowBox: lockRowBox, lockColBox: lockColBox
    };
}

/** 由区块锁定推出的排除（第七节：宫锁行/列→宫外删；行/列锁宫→宫内删） */
function teachGreenEliminations(G) {
    const elims = [];
    const seen = {};
    // 排除对象是"真实候选数里的数字"，不是绿色层里的数字：
    // 被排除的格子位于锁定单元之外，本来就没被标绿。
    // 同一格同一数字可能被多个锁定同时推出，去重后只呈现一次。
    const push = function (r, c, num) {
        if (currentBoard[r][c] === 0 && cellCandidates[r][c].has(num)) {
            const key = r + ',' + c + ',' + num;
            if (seen[key]) return;
            seen[key] = true;
            elims.push({ row: r, col: c, num: num });
        }
    };

    // 宫内 num 锁定在行 r → 该行宫外划掉 num
    for (let b = 0; b < SIZE; b++) {
        const bc = (b % SUBSIZE) * SUBSIZE;
        for (let num = 1; num <= SIZE; num++) {
            const r1 = G.lockBoxRow[b][num];
            if (r1 >= 0) {
                for (let c = 0; c < SIZE; c++) {
                    if (c >= bc && c < bc + SUBSIZE) continue;
                    push(r1, c, num);
                }
            }
            const c1 = G.lockBoxCol[b][num];
            if (c1 >= 0) {
                const br = Math.floor(b / SUBSIZE) * SUBSIZE;
                for (let r = 0; r < SIZE; r++) {
                    if (r >= br && r < br + SUBSIZE) continue;
                    push(r, c1, num);
                }
            }
        }
    }

    // 行 num 锁定在宫 g → 该宫行外划掉 num
    for (let r = 0; r < SIZE; r++) {
        for (let num = 1; num <= SIZE; num++) {
            const g1 = G.lockRowBox[r][num];
            if (g1 >= 0) {
                const cells = teachUnitCells('box', g1);
                for (let k = 0; k < cells.length; k++) {
                    if (cells[k][0] === r) continue;
                    push(cells[k][0], cells[k][1], num);
                }
            }
        }
    }
    for (let c = 0; c < SIZE; c++) {
        for (let num = 1; num <= SIZE; num++) {
            const g1 = G.lockColBox[c][num];
            if (g1 >= 0) {
                const cells = teachUnitCells('box', g1);
                for (let k = 0; k < cells.length; k++) {
                    if (cells[k][1] === c) continue;
                    push(cells[k][0], cells[k][1], num);
                }
            }
        }
    }
    return elims;
}

/**
 * 阶段B：卡住后补标绿色部分候选 + 标记后立即做宫外排除（第七节）。
 * 补标来源：来源1 候选少类（完整候选 <= 绿色候选上限）、来源2/3/4 锁定类与共轭对补漏。
 * 一次标记一个单元（宫/行/列）里所有待写的绿色候选；绿色层就绪后返回 null。
 */
function teachMarkGreenStep() {
    const G = teachBuildGreen();

    // 按"逐宫 → 逐行 → 逐列"标记：一次把一个单元里还没写下的绿色候选全部写上
    const order = [];
    for (let b = 0; b < SIZE; b++) order.push(['box', b]);
    for (let r = 0; r < SIZE; r++) order.push(['row', r]);
    for (let c = 0; c < SIZE; c++) order.push(['col', c]);
    const unitName = { box: '宫', row: '行', col: '列' };

    for (let i = 0; i < order.length; i++) {
        const kind = order[i][0], index = order[i][1];
        const cells = teachUnitCells(kind, index);
        const batch = [];
        for (let k = 0; k < cells.length; k++) {
            const r = cells[k][0], c = cells[k][1];
            if (currentBoard[r][c] !== 0) continue;
            const pending = Array.from(G.green[r][c]).sort(function (a, b) { return a - b; })
                .filter(function (n) { return !greenCand[r][c].has(n); });
            if (!pending.length) continue;
            batch.push({ row: r, col: c, candidates: pending });
        }
        if (!batch.length) continue;
        const step = {
            teachKind: 'candidates',
            layer: 'green',
            row: batch[0].row, col: batch[0].col,   // 兼容字段：指向首个格子
            cells: batch,
            candidates: batch[0].candidates,
            technique: '绿色候选标注',
            eliminations: [],
            knowledge: getTechniqueKnowledge('候选数标注'),
            explanation: '标"绿色"部分候选：第 ' + (index + 1) + ' ' + unitName[kind] + '里，' +
                batch.map(function (x) {
                    return '(' + (x.row + 1) + ',' + (x.col + 1) + ')→' + x.candidates.join('');
                }).join('，') +
                '。做法是把同行、同列、同宫已出现的数字划掉；绿色只写有把握的候选，不必每格都写全。'
        };
        if (!isStepSound(step)) continue;
        step.level = getTechniqueLevel(step.technique);
        return enrichStepGraph(step);
    }

    // 绿色写完后，立即做宫外行/列排除
    const elims = teachGreenEliminations(G);
    if (elims.length) {
        const step = {
            technique: '区块排除法',
            eliminations: elims,
            knowledge: getTechniqueKnowledge('区块排除法'),
            explanation: '绿色候选里出现了区块锁定：某个数字在宫内只能落在同一行（或同一列），' +
                '那么这一行（列）在宫外的其他格子就不可能再放它。本次划掉 ' +
                elims.map(function (e) { return '(' + (e.row + 1) + ',' + (e.col + 1) + ') 的 ' + e.num; }).join('、') + '。'
        };
        if (isStepSound(step)) {
            step.level = getTechniqueLevel(step.technique);
            return enrichStepGraph(step);
        }
    }
    return null;
}

/**
 * 阶段C：只用绿色候选推进 —— 唯一候选 / 数对 / 三数组。
 * 只对"绿色即完整候选"（full）的格子下结论，保证推理可靠。
 */
function teachGreenTechniqueStep() {
    const G = teachBuildGreen();

    // 唯一候选：完整候选只剩一个 → 直接填
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (!G.full[r][c] || G.green[r][c].size !== 1) continue;
            const v = Array.from(G.green[r][c])[0];
            const step = teachPlaceStep(r, c, v, '唯一候选数法',
                '绿色候选里，(' + (r + 1) + ',' + (c + 1) + ') 只剩下 ' + v + ' 一个可能，可以直接填入。',
                'MAIN', '唯一候选数法');
            if (step) return step;
        }
    }

    // 数对 / 三数组：同一单元里若干个"绿色即完整"的格子，候选并集刚好等于格子数
    const units = [];
    for (let b = 0; b < SIZE; b++) units.push({ kind: 'box', index: b });
    for (let r = 0; r < SIZE; r++) units.push({ kind: 'row', index: r });
    for (let c = 0; c < SIZE; c++) units.push({ kind: 'col', index: c });

    const unitName = { box: '宫', row: '行', col: '列' };

    for (let u = 0; u < units.length; u++) {
        const kind = units[u].kind, index = units[u].index;
        const cells = teachUnitCells(kind, index);
        const pool = [];
        for (let k = 0; k < cells.length; k++) {
            const r = cells[k][0], c = cells[k][1];
            if (currentBoard[r][c] !== 0) continue;
            if (!G.full[r][c]) continue;                 // 绿色不完整，不下结论
            const sz = G.green[r][c].size;
            if (sz >= 2 && sz <= 3) pool.push({ r: r, c: c, set: G.green[r][c] });
        }
        // 在"完整候选"的格子里找 2 格（数对）/ 3 格（三数组）候选并集 = 格数的组合
        for (let comboSize = 2; comboSize <= 3; comboSize++) {
            const combo = [];
            const found = (function search(start) {
                if (combo.length === comboSize) {
                    const union = new Set();
                    combo.forEach(function (p) { p.set.forEach(function (n) { union.add(n); }); });
                    if (union.size !== comboSize) return false;
                    // 该单元里其他格子若含这些数，即可划掉
                    const elims = [];
                    for (let k = 0; k < cells.length; k++) {
                        const r = cells[k][0], c = cells[k][1];
                        if (currentBoard[r][c] !== 0) continue;
                        if (combo.some(function (p) { return p.r === r && p.c === c; })) continue;
                        union.forEach(function (n) {
                            if (G.green[r][c].has(n)) elims.push({ row: r, col: c, num: n });
                        });
                    }
                    if (!elims.length) return false;
                    const techName = comboSize === 2 ? '数对法' : '三数组法';
                    const step = {
                        technique: techName,
                        eliminations: elims,
                        knowledge: getTechniqueKnowledge(techName),
                        explanation: '绿色候选里，第 ' + (index + 1) + ' ' + unitName[kind] + '中 ' +
                            combo.map(function (p) { return '(' + (p.r + 1) + ',' + (p.c + 1) + ')'; }).join('、') +
                            ' 这 ' + comboSize + ' 格的候选正好是 {' + Array.from(union).sort().join('、') + '}，' +
                            '这几个数字只能落在它们身上，同' + unitName[kind] + '其他格子的这些候选可以划掉。'
                    };
                    if (!isStepSound(step)) return false;
                    step.level = getTechniqueLevel(step.technique);
                    G.__result = enrichStepGraph(step);
                    return true;
                }
                for (let i = start; i < pool.length; i++) {
                    combo.push(pool[i]);
                    if (search(i + 1)) return true;
                    combo.pop();
                }
                return false;
            })(0);
            if (found) return G.__result;
        }
    }
    return null;
}

/** 阶段D：绿色推不动了，才标黄色全部候选（同样按 逐宫→逐行→逐列 整批标记） */
function teachMarkYellowStep() {
    const order = [];
    for (let b = 0; b < SIZE; b++) order.push(['box', b]);
    for (let r = 0; r < SIZE; r++) order.push(['row', r]);
    for (let c = 0; c < SIZE; c++) order.push(['col', c]);

    for (let i = 0; i < order.length; i++) {
        const cells = teachUnitCells(order[i][0], order[i][1]);
        const batch = [];
        for (let k = 0; k < cells.length; k++) {
            const r = cells[k][0], c = cells[k][1];
            if (currentBoard[r][c] !== 0) continue;
            const actual = cellCandidates[r][c];
            if (!actual || actual.size === 0) continue;
            const pending = Array.from(actual).sort(function (a, b) { return a - b; })
                .filter(function (n) { return !yellowCand[r][c].has(n); });
            if (!pending.length) continue;
            batch.push({ row: r, col: c, candidates: pending });
        }
        if (!batch.length) continue;
        const step = {
            teachKind: 'candidates',
            layer: 'yellow',
            row: batch[0].row, col: batch[0].col,   // 兼容字段：指向首个格子
            cells: batch,
            candidates: batch[0].candidates,
            technique: '黄色候选标注',
            eliminations: [],
            knowledge: getTechniqueKnowledge('候选数标注'),
            explanation: '绿色候选推不动了，把这一批格子的候选数写全（黄色）：' +
                batch.map(function (x) {
                    return '(' + (x.row + 1) + ',' + (x.col + 1) + ')→' + x.candidates.join('');
                }).join('，') +
                '。黄色是每格的全部可能数，用来做更复杂的推理和回溯。'
        };
        if (!isStepSound(step)) continue;
        step.level = getTechniqueLevel(step.technique);
        return enrichStepGraph(step);
    }
    return null;
}

/**
 * 黄色层基础排除：盘面变化后，同一单元里已填格的数字要从其他空格候选里划掉。
 *
 * 正常路径上 recalcAfterPlacement 已经顺手做了这件事；但"某数字在本单元只剩一个位置"
 * 这类格子在落子前就已定死，落子时不会把该数字再从它身上划掉，于是会残留一个必然为错的
 * 候选数。这里专门把这种"只差一次基本排除"的空格找出来清掉——它是纯逻辑推论，
 * 不做的话既会污染后续高级技巧的判断，也没法把这种情况呈现给学员。
 */
function teachYellowEliminationStep() {
    const units = [];
    for (let b = 0; b < SIZE; b++) units.push({ kind: 'box', index: b });
    for (let r = 0; r < SIZE; r++) units.push({ kind: 'row', index: r });
    for (let c = 0; c < SIZE; c++) units.push({ kind: 'col', index: c });
    const unitName = { box: '宫', row: '行', col: '列' };

    for (let u = 0; u < units.length; u++) {
        const kind = units[u].kind, index = units[u].index;
        const cells = teachUnitCells(kind, index);
        const placed = new Set();
        for (let k = 0; k < cells.length; k++) {
            const v = currentBoard[cells[k][0]][cells[k][1]];
            if (v !== 0) placed.add(v);
        }
        if (!placed.size) continue;
        const elims = [];
        for (let k = 0; k < cells.length; k++) {
            const r = cells[k][0], c = cells[k][1];
            if (currentBoard[r][c] !== 0) continue;
            placed.forEach(function (n) {
                if (cellCandidates[r][c].has(n)) elims.push({ row: r, col: c, num: n });
            });
        }
        if (!elims.length) continue;
        const step = {
            technique: '基础排除',
            eliminations: elims,
            knowledge: getTechniqueKnowledge('摒除法'),
            explanation: '第 ' + (index + 1) + ' ' + unitName[kind] + '里已经有 ' +
                Array.from(placed).sort().join('、') + '，' +
                '同' + unitName[kind] + '其他格子的这些候选数要划掉（只有同行、同列、同宫的数字才会互相影响）。'
        };
        if (isStepSound(step)) {
            step.level = getTechniqueLevel(step.technique);
            return enrichStepGraph(step);
        }
    }
    return null;
}

/** 阶段C：唯一候选（含学员已写下的记号）+ 宫内/行/列唯一 */
function teachBasicCandidateScan(resumeStage) {
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (currentBoard[r][c] !== 0) continue;
            const cand = cellCandidates[r][c];
            if (!cand || cand.size !== 1) continue;
            const v = Array.from(cand)[0];
            const shown = teachShown[r][c];
            const written = !!(shown && shown.has(v));
            const step = teachPlaceStep(r, c, v, '唯一候选数法',
                '第 ' + (r + 1) + ' 行第 ' + (c + 1) + ' 列只剩 ' + v + ' 一个候选数' +
                (written ? '（你已经把它写下来了）' : '') + '，可以直接填入。', resumeStage, '唯一候选数法');
            if (step) return step;
        }
    }
    return teachUnitUniqueScan(resumeStage);
}

/** 按等级顺序调用技法宝库（阶段D / 阶段E 共用），跳过实现有误的步骤 */
function teachTechniqueScan(fns) {
    for (let i = 0; i < fns.length; i++) {
        let step = null;
        try { step = fns[i](); } catch (e) { step = null; }
        if (!step) continue;
        if (!isStepSound(step)) continue;
        step.level = getTechniqueLevel(step.technique);
        step.knowledge = getTechniqueKnowledge(step.technique);
        return enrichStepGraph(step);
    }
    return null;
}

/** 阶段D：候选进阶技巧（数对 / 三数组 / 区块排除） */
function teachTechD() {
    return [
        findNakedPair, findHiddenPair, findNakedTriple, findHiddenTriple,
        findNakedQuad, findHiddenQuad,
        findBoxToRow, findBoxToCol, findBlockRowToBox, findBlockColToBox
    ];
}

/** 阶段E：高阶技巧（鱼形 / 翼形 / 唯一矩形 / 链） */
function teachTechE() {
    return [
        findXWing, findFinnedXWing, findSwordfish, findFinnedSwordfish,
        findXYWing, findXYZWing, findSkyscraper, findTwoStringKite, findEmptyRectangle,
        findUniqueRectangle, findURType2, findXYChain, findXChain, findWWing, findRemotePair,
        findJellyfish, findFinnedJellyfish, findAIC, findALSXZ, findBUGPlus1,
        findForcingChain, findContinuousNiceLoop, findURType4, findGroupedChain
    ];
}

/**
 * 教学引擎主入口：按《九宫数独求解程序完整逻辑（模拟人做题·绿色/黄色候选分层·锁定类提前）》推进，每次只走一步。
 *
 *   第一遍：数字 1→9，先按 宫→行→列 找唯一填数，再顺手标锁定类绿色并立即排除
 *   主循环：
 *     局部检查（落子后只查该行/列/宫）
 *     阶段A 宫→行→列找唯一
 *     阶段B 卡住后补标绿色（候选少类 + 聚焦区域 + 锁定类补漏）+ 立即排除
 *     阶段C 用绿色候选推进（唯一候选 / 数对 / 三数组）
 *     阶段D 绿色解决不了 → 标黄色全部候选（+ 黄色层基础排除补漏）
 *     阶段E 用黄色候选做基础/进阶技巧（唯一候选 / 宫内唯一 / 数对 / 三数组 / 区块排除）
 *     阶段F 高阶技巧（鱼形 / 翼形 / 唯一矩形 / 链）
 *     阶段G 连续无进展 → 快速补扫 1—9（同样顺手标锁定绿色）
 *     阶段H 仍无进展 → 报告卡住（教学模式不做试错回溯）
 *
 * 关键约束：每填一个数只做"三向检查 + 受影响区域唯一位置检查"，不触发全盘补扫；
 *          快速补扫只发生在阶段结束或连续无进展时，有阈值A 与轮数上限。
 */
function findTeachingStep() {
    if (!teachShown) resetTeachState();
    syncTeachShown();
    if (!teachPlan) resetTeachProgress();

    const st = teachPlan;
    let guard = 0;

    while (guard++ < 60) {
        // ---------- 局部检查：落子后立刻做，范围仅限该行/列/宫 ----------
        if (st.local) {
            const localStep = teachLocalScan(st.anchor, st.resume);
            if (localStep) return localStep;
            st.local = false;
            st.anchor = null;
            st.stage = st.resume || 'MAIN';
            st.resume = null;
        }

        // ---------- 第一遍：数字 1→9 逐个数找唯一 ----------
        if (st.stage === 'PASS1') {
            const hit = teachScanDigits(st.num, 'PASS1');
            if (hit) return hit;
            st.num = 1;
            if (st.filled >= TEACH_CFG.thresholdA) {
                // 第一遍填出足够多，值得快速补扫一轮
                st.stage = 'RESCAN';
                st.rescanRounds = 0;
                st.rescanReturn = 'MAIN';
                st.filled = 0;
            } else {
                // 收益低，直接换视角进入主循环
                st.stage = 'MAIN';
                st.filled = 0;
            }
            continue;
        }

        // ---------- 快速补扫 1—9：阶段性动作，有阈值与上限 ----------
        if (st.stage === 'RESCAN') {
            const hit = teachScanDigits(st.num, 'RESCAN');
            if (hit) return hit;
            st.num = 1;
            const progressed = st.filled > 0;
            st.filled = 0;
            st.rescanRounds++;
            if (progressed && st.rescanRounds < TEACH_CFG.rescanLimit) continue;
            // 补扫结束，回到主循环；补扫无进展则直接记为"无进展已满"，避免反复补扫
            st.rescanRounds = 0;
            st.rescanReturn = null;
            st.stage = 'MAIN';
            st.noProgress = progressed ? 0 : TEACH_CFG.noProgressLimit;
            continue;
        }

        // ---------- 主循环 ----------
        // 阶段A：宫→行→列找唯一
        const aStep = teachUnitUniqueScan('MAIN');
        if (aStep) return aStep;
        if (st.filled >= TEACH_CFG.thresholdA) {
            st.stage = 'RESCAN';
            st.num = 1;
            st.rescanRounds = 0;
            st.rescanReturn = 'MAIN';
            st.filled = 0;
            continue;
        }
        if (st.filled > 0) { st.filled = 0; continue; }

        // 阶段B：标绿色部分候选 + 标记后立即做宫外排除
        const bStep = teachMarkGreenStep();
        if (bStep) return bStep;

        // 阶段C：只用绿色候选推进（唯一候选 / 数对 / 三数组 / 区块排除）
        const cStep = teachGreenTechniqueStep();
        if (cStep) { st.noProgress = 0; st.rescanUsed = false; return cStep; }

        // 阶段D：绿色推不动了，标黄色全部候选
        const dStep = teachMarkYellowStep();
        if (dStep) return dStep;

        // 阶段D：黄色层的基础排除（补掉"只差一次基本排除"的残留候选）
        const d2Step = teachYellowEliminationStep();
        if (d2Step) { st.noProgress = 0; st.rescanUsed = false; return d2Step; }

        // 阶段E：用黄色（完整）候选做基础技巧（唯一候选 / 宫内唯一 / 行唯一 / 列唯一）
        const e1Step = teachBasicCandidateScan('MAIN');
        if (e1Step) return e1Step;

        // 阶段E：数对 / 三数组 / 区块排除等进阶技巧
        const e2Step = teachTechniqueScan(teachTechD());
        if (e2Step) { st.noProgress = 0; st.rescanUsed = false; return e2Step; }

        // 阶段F：鱼形 / 翼形 / 唯一矩形 / 链等高阶技巧
        const fStep = teachTechniqueScan(teachTechE());
        if (fStep) { st.noProgress = 0; st.rescanUsed = false; return fStep; }

        // 阶段G：连续无进展 → 快速补扫一次（补扫同样顺手标锁定绿色）
        st.noProgress++;
        if (st.noProgress >= TEACH_CFG.noProgressLimit && !st.rescanUsed) {
            st.rescanUsed = true;
            st.stage = 'RESCAN';
            st.num = 1;
            st.filled = 0;
            st.rescanRounds = 0;
            st.rescanReturn = 'MAIN';
            continue;
        }

        // 阶段H：仍无进展 → 报告卡住（教学模式不做试错回溯）
        return null;
    }
    return null;
}
