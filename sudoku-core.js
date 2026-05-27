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
    if (step.value !== undefined && step.value !== null) {
        currentBoard[step.row][step.col] = step.value;
        recalcAfterPlacement(step.row, step.col, step.value);
        clearDeleteRecord();  // 填入数字后清除删除记录，因为候选数已重新计算
        return step;
    }
    if (step.eliminations && step.eliminations.length > 0) {
        removeCandidates(step.eliminations);
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
                if (isVisible(wing1, wing2)) continue;
                
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

// ==================== 17. XY-Chain ====================
function findXYChain() {
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
    
    function findCommon(a, b) {
        if (a.a === b.a || a.a === b.b) return a.a;
        if (a.b === b.a || a.b === b.b) return a.b;
        return -1;
    }
    
    function buildChain(start, chain, used, depth, maxDepth) {
        if (chain.length >= 3) {
            const first = chain[0];
            const last = chain[chain.length - 1];
            const common = findCommon(first, last);
            if (common !== -1 && isVisible(first, last)) {
                const commonCells = findCommonVisibleCells(first, last);
                const eliminations = [];
                for (const cell of commonCells) {
                    if (cellCandidates[cell.row][cell.col].has(common)) {
                        eliminations.push({ row: cell.row, col: cell.col, num: common });
                    }
                }
                if (eliminations.length > 0) {
                    return eliminations;
                }
            }
        }
        
        if (depth > maxDepth) return null;
        
        const current = chain[chain.length - 1];
        const needed = chain.length === 1 ? current.a : 
            (used[used.length - 1] === current.a ? current.b : current.a);
        
        for (const next of bivalue) {
            if (next === current) continue;
            if (chain.includes(next)) continue;
            if ((next.a === needed || next.b === needed) && isVisible(current, next)) {
                chain.push(next);
                used.push(needed);
                const result = buildChain(start, chain, used, depth + 1, maxDepth);
                if (result) return result;
                chain.pop();
                used.pop();
            }
        }
        return null;
    }
    
    for (const start of bivalue) {
        const chain = [start];
        const used = [start.a];
        const eliminations = buildChain(start, chain, used, 1, 10);
        if (eliminations && eliminations.length > 0) {
            return { technique: "XY-Chain", eliminations: eliminations,
                explanation: `XY-Chain：链长度 ${chain.length}，首尾共同数字，排除 ${eliminations.length} 个候选数。` };
        }
    }
    return null;
}

// ==================== 18. X-Chain ====================
function findXChain() {
    for (let num = 1; num <= SIZE; num++) {
        const allCells = [];
        for (let row = 0; row < SIZE; row++) {
            for (let col = 0; col < SIZE; col++) {
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(num)) {
                    allCells.push({ row, col });
                }
            }
        }
        
        // 构建强链接图
        const strongLinks = new Map();
        
        // 按行构建
        const rowGroups = new Map();
        for (const cell of allCells) {
            if (!rowGroups.has(cell.row)) rowGroups.set(cell.row, []);
            rowGroups.get(cell.row).push(cell);
        }
        for (const [row, cells] of rowGroups) {
            if (cells.length === 2) {
                const key1 = `${cells[0].row},${cells[0].col}`;
                const key2 = `${cells[1].row},${cells[1].col}`;
                if (!strongLinks.has(key1)) strongLinks.set(key1, []);
                if (!strongLinks.has(key2)) strongLinks.set(key2, []);
                strongLinks.get(key1).push(cells[1]);
                strongLinks.get(key2).push(cells[0]);
            }
        }
        
        // 按列构建
        const colGroups = new Map();
        for (const cell of allCells) {
            if (!colGroups.has(cell.col)) colGroups.set(cell.col, []);
            colGroups.get(cell.col).push(cell);
        }
        for (const [col, cells] of colGroups) {
            if (cells.length === 2) {
                const key1 = `${cells[0].row},${cells[0].col}`;
                const key2 = `${cells[1].row},${cells[1].col}`;
                if (!strongLinks.has(key1)) strongLinks.set(key1, []);
                if (!strongLinks.has(key2)) strongLinks.set(key2, []);
                strongLinks.get(key1).push(cells[1]);
                strongLinks.get(key2).push(cells[0]);
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
        
        let foundEliminations = null;
        
        function dfs(startKey, currentKey, path, visited, depth) {
            if (depth >= 3 && depth % 2 === 1) {
                const [startRow, startCol] = startKey.split(',').map(Number);
                const [endRow, endCol] = currentKey.split(',').map(Number);
                if (isVisible({ row: startRow, col: startCol }, { row: endRow, col: endCol })) {
                    const commonCells = findCommonVisibleCells(
                        { row: startRow, col: startCol },
                        { row: endRow, col: endCol }
                    );
                    const eliminations = [];
                    for (const cell of commonCells) {
                        if (currentBoard[cell.row][cell.col] === 0 && cellCandidates[cell.row][cell.col].has(num)) {
                            eliminations.push({ row: cell.row, col: cell.col, num: num });
                        }
                    }
                    if (eliminations.length > 0) {
                        foundEliminations = eliminations;
                        return true;
                    }
                }
                return false;
            }
            
            if (depth > 10) return false;
            if (visited.has(currentKey)) return false;
            visited.add(currentKey);
            
            const neighbors = strongLinks.get(currentKey) || [];
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.row},${neighbor.col}`;
                if (!path.includes(neighborKey)) {
                    path.push(neighborKey);
                    if (dfs(startKey, neighborKey, path, visited, depth + 1)) return true;
                    path.pop();
                }
            }
            visited.delete(currentKey);
            return false;
        }
        
        for (const startKey of strongLinks.keys()) {
            const visited = new Set();
            const path = [startKey];
            if (dfs(startKey, startKey, path, visited, 0)) {
                if (foundEliminations && foundEliminations.length > 0) {
                    return { technique: "X-Chain", eliminations: foundEliminations,
                        explanation: `X-Chain：数字 ${num} 形成链结构，排除共同可见格中的 ${num}。` };
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

// ==================== 21. AIC (Alternating Inference Chain) ====================
function findAIC() {
    for (let num = 1; num <= SIZE; num++) {
        const allCells = [];
        for (let row = 0; row < SIZE; row++) {
            for (let col = 0; col < SIZE; col++) {
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(num)) {
                    allCells.push({ row, col });
                }
            }
        }
        
        const strongLinks = new Map();
        
        // 按行构建强链接
        const rowGroups = new Map();
        for (const cell of allCells) {
            if (!rowGroups.has(cell.row)) rowGroups.set(cell.row, []);
            rowGroups.get(cell.row).push(cell);
        }
        for (const [row, cells] of rowGroups) {
            if (cells.length === 2) {
                const key1 = `${cells[0].row},${cells[0].col}`;
                const key2 = `${cells[1].row},${cells[1].col}`;
                if (!strongLinks.has(key1)) strongLinks.set(key1, []);
                if (!strongLinks.has(key2)) strongLinks.set(key2, []);
                strongLinks.get(key1).push(cells[1]);
                strongLinks.get(key2).push(cells[0]);
            }
        }
        
        // 按列构建强链接
        const colGroups = new Map();
        for (const cell of allCells) {
            if (!colGroups.has(cell.col)) colGroups.set(cell.col, []);
            colGroups.get(cell.col).push(cell);
        }
        for (const [col, cells] of colGroups) {
            if (cells.length === 2) {
                const key1 = `${cells[0].row},${cells[0].col}`;
                const key2 = `${cells[1].row},${cells[1].col}`;
                if (!strongLinks.has(key1)) strongLinks.set(key1, []);
                if (!strongLinks.has(key2)) strongLinks.set(key2, []);
                strongLinks.get(key1).push(cells[1]);
                strongLinks.get(key2).push(cells[0]);
            }
        }
        
        // 按宫构建强链接
        const boxGroups = new Map();
        for (const cell of allCells) {
            const box = Math.floor(cell.row / SUBSIZE) * SUBSIZE + Math.floor(cell.col / SUBSIZE);
            if (!boxGroups.has(box)) boxGroups.set(box, []);
            boxGroups.get(box).push(cell);
        }
        for (const [box, cells] of boxGroups) {
            if (cells.length === 2) {
                const key1 = `${cells[0].row},${cells[0].col}`;
                const key2 = `${cells[1].row},${cells[1].col}`;
                if (!strongLinks.has(key1)) strongLinks.set(key1, []);
                if (!strongLinks.has(key2)) strongLinks.set(key2, []);
                strongLinks.get(key1).push(cells[1]);
                strongLinks.get(key2).push(cells[0]);
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
        
        let foundEliminations = null;
        
        function dfs(startKey, currentKey, path, visited, depth) {
            if (depth >= 4 && depth % 2 === 0) {
                const [startRow, startCol] = startKey.split(',').map(Number);
                const [endRow, endCol] = currentKey.split(',').map(Number);
                if (isVisible({ row: startRow, col: startCol }, { row: endRow, col: endCol })) {
                    const commonCells = findCommonVisibleCells(
                        { row: startRow, col: startCol },
                        { row: endRow, col: endCol }
                    );
                    const eliminations = [];
                    for (const cell of commonCells) {
                        if (currentBoard[cell.row][cell.col] === 0 && cellCandidates[cell.row][cell.col].has(num)) {
                            eliminations.push({ row: cell.row, col: cell.col, num: num });
                        }
                    }
                    if (eliminations.length > 0) {
                        foundEliminations = eliminations;
                        return true;
                    }
                }
                return false;
            }
            
            if (depth > 12) return false;
            if (visited.has(currentKey)) return false;
            visited.add(currentKey);
            
            const neighbors = strongLinks.get(currentKey) || [];
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.row},${neighbor.col}`;
                if (!path.includes(neighborKey)) {
                    path.push(neighborKey);
                    if (dfs(startKey, neighborKey, path, visited, depth + 1)) return true;
                    path.pop();
                }
            }
            visited.delete(currentKey);
            return false;
        }
        
        for (const startKey of strongLinks.keys()) {
            const visited = new Set();
            const path = [startKey];
            if (dfs(startKey, startKey, path, visited, 0)) {
                if (foundEliminations && foundEliminations.length > 0) {
                    const uniqueElims = [];
                    const seen = new Set();
                    for (const elim of foundEliminations) {
                        const key = `${elim.row},${elim.col}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            uniqueElims.push(elim);
                        }
                    }
                    if (uniqueElims.length > 0) {
                        return { technique: "AIC (交替推理链)", eliminations: uniqueElims,
                            explanation: `AIC：数字 ${num} 形成交替推理链，排除共同可见格中的 ${num}。链路径: ${path.join(' → ')}` };
                    }
                }
            }
        }
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

// ==================== 24. 连续循环 (Continuous Nice Loop) ====================
function findContinuousNiceLoop() {
    for (let num = 1; num <= SIZE; num++) {
        const allCells = [];
        for (let row = 0; row < SIZE; row++) {
            for (let col = 0; col < SIZE; col++) {
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(num)) {
                    allCells.push({ row, col });
                }
            }
        }
        
        const strongLinks = new Map();
        
        // 构建强链接
        const rowGroups = new Map();
        for (const cell of allCells) {
            if (!rowGroups.has(cell.row)) rowGroups.set(cell.row, []);
            rowGroups.get(cell.row).push(cell);
        }
        for (const [row, cells] of rowGroups) {
            if (cells.length === 2) {
                const key1 = `${cells[0].row},${cells[0].col}`;
                const key2 = `${cells[1].row},${cells[1].col}`;
                if (!strongLinks.has(key1)) strongLinks.set(key1, []);
                if (!strongLinks.has(key2)) strongLinks.set(key2, []);
                strongLinks.get(key1).push(cells[1]);
                strongLinks.get(key2).push(cells[0]);
            }
        }
        
        const colGroups = new Map();
        for (const cell of allCells) {
            if (!colGroups.has(cell.col)) colGroups.set(cell.col, []);
            colGroups.get(cell.col).push(cell);
        }
        for (const [col, cells] of colGroups) {
            if (cells.length === 2) {
                const key1 = `${cells[0].row},${cells[0].col}`;
                const key2 = `${cells[1].row},${cells[1].col}`;
                if (!strongLinks.has(key1)) strongLinks.set(key1, []);
                if (!strongLinks.has(key2)) strongLinks.set(key2, []);
                strongLinks.get(key1).push(cells[1]);
                strongLinks.get(key2).push(cells[0]);
            }
        }
        
        const boxGroups = new Map();
        for (const cell of allCells) {
            const box = Math.floor(cell.row / SUBSIZE) * SUBSIZE + Math.floor(cell.col / SUBSIZE);
            if (!boxGroups.has(box)) boxGroups.set(box, []);
            boxGroups.get(box).push(cell);
        }
        for (const [box, cells] of boxGroups) {
            if (cells.length === 2) {
                const key1 = `${cells[0].row},${cells[0].col}`;
                const key2 = `${cells[1].row},${cells[1].col}`;
                if (!strongLinks.has(key1)) strongLinks.set(key1, []);
                if (!strongLinks.has(key2)) strongLinks.set(key2, []);
                strongLinks.get(key1).push(cells[1]);
                strongLinks.get(key2).push(cells[0]);
            }
        }
        
        // 构建弱链接
        const weakLinks = new Map();
        for (let row = 0; row < SIZE; row++) {
            for (let col = 0; col < SIZE; col++) {
                if (currentBoard[row][col] === 0) {
                    const cand = Array.from(cellCandidates[row][col]);
                    for (let i = 0; i < cand.length; i++) {
                        for (let j = i + 1; j < cand.length; j++) {
                            const key1 = `${row},${col},${cand[i]}`;
                            const key2 = `${row},${col},${cand[j]}`;
                            if (!weakLinks.has(key1)) weakLinks.set(key1, []);
                            if (!weakLinks.has(key2)) weakLinks.set(key2, []);
                            weakLinks.get(key1).push({ row, col, num: cand[j] });
                            weakLinks.get(key2).push({ row, col, num: cand[i] });
                        }
                    }
                }
            }
        }
        
        function isVisible(p1, p2) {
            return p1.row === p2.row || p1.col === p2.col || 
                (Math.floor(p1.row / SUBSIZE) === Math.floor(p2.row / SUBSIZE) && 
                 Math.floor(p1.col / SUBSIZE) === Math.floor(p2.col / SUBSIZE));
        }
        
        let foundEliminations = [];
        
        function findLoop(startKey, currentKey, path, visited, depth) {
            if (depth >= 4 && currentKey === startKey) {
                for (let i = 0; i < path.length; i++) {
                    const node = path[i];
                    const prev = path[(i - 1 + path.length) % path.length];
                    // 如果是弱链节点
                    if (node.row === prev.row && node.col === prev.col && node.num !== prev.num) {
                        for (let numTest = 1; numTest <= SIZE; numTest++) {
                            if (numTest !== node.num && cellCandidates[node.row][node.col].has(numTest)) {
                                foundEliminations.push({ row: node.row, col: node.col, num: numTest });
                            }
                        }
                    }
                }
                return foundEliminations.length > 0;
            }
            
            if (depth > 20) return false;
            
            const key = `${currentKey.row},${currentKey.col},${currentKey.num}`;
            if (visited.has(key) && depth > 0) return false;
            visited.add(key);
            
            if (depth % 2 === 0) {
                const neighbors = strongLinks.get(`${currentKey.row},${currentKey.col}`) || [];
                for (const neighbor of neighbors) {
                    const neighborNode = { row: neighbor.row, col: neighbor.col, num: currentKey.num };
                    if (!path.some(p => p.row === neighborNode.row && p.col === neighborNode.col && p.num === neighborNode.num) ||
                        (depth >= 4 && neighborNode.row === path[0].row && neighborNode.col === path[0].col && neighborNode.num === path[0].num)) {
                        path.push(neighborNode);
                        if (findLoop(startKey, neighborNode, path, visited, depth + 1)) return true;
                        path.pop();
                    }
                }
            } else {
                const neighbors = weakLinks.get(`${currentKey.row},${currentKey.col},${currentKey.num}`) || [];
                for (const neighbor of neighbors) {
                    const neighborNode = { row: neighbor.row, col: neighbor.col, num: neighbor.num };
                    if (!path.some(p => p.row === neighborNode.row && p.col === neighborNode.col && p.num === neighborNode.num)) {
                        path.push(neighborNode);
                        if (findLoop(startKey, neighborNode, path, visited, depth + 1)) return true;
                        path.pop();
                    }
                }
            }
            
            visited.delete(key);
            return false;
        }
        
        for (const [key, neighbors] of strongLinks) {
            const [row, col] = key.split(',').map(Number);
            const startNode = { row, col, num };
            for (const neighbor of neighbors) {
                const nextNode = { row: neighbor.row, col: neighbor.col, num };
                const path = [startNode, nextNode];
                const visited = new Set();
                visited.add(`${startNode.row},${startNode.col},${startNode.num}`);
                visited.add(`${nextNode.row},${nextNode.col},${nextNode.num}`);
                if (findLoop(startNode, nextNode, path, visited, 2)) {
                    if (foundEliminations.length > 0) {
                        const uniqueElims = [];
                        const seen = new Set();
                        for (const elim of foundEliminations) {
                            const key = `${elim.row},${elim.col},${elim.num}`;
                            if (!seen.has(key)) {
                                seen.add(key);
                                uniqueElims.push(elim);
                            }
                        }
                        if (uniqueElims.length > 0) {
                            return { technique: "连续循环 (Continuous Nice Loop)", eliminations: uniqueElims,
                                explanation: `连续循环：数字 ${num} 形成闭合的强弱交替链，排除 ${uniqueElims.length} 个候选数。` };
                        }
                    }
                }
            }
        }
    }
    return null;
}

// ==================== 25. 分组链 (Grouped Chain) ====================
function findGroupedChain() {
    for (let num = 1; num <= SIZE; num++) {
        const positions = [];
        for (let row = 0; row < SIZE; row++) {
            for (let col = 0; col < SIZE; col++) {
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(num)) {
                    positions.push({ row, col });
                }
            }
        }
        
        if (positions.length < 2) continue;
        
        const strongLinks = new Map();
        
        const rowGroups = new Map();
        for (const pos of positions) {
            if (!rowGroups.has(pos.row)) rowGroups.set(pos.row, []);
            rowGroups.get(pos.row).push(pos);
        }
        for (const [row, cells] of rowGroups) {
            if (cells.length === 2) {
                const key1 = `${cells[0].row},${cells[0].col}`;
                const key2 = `${cells[1].row},${cells[1].col}`;
                if (!strongLinks.has(key1)) strongLinks.set(key1, []);
                if (!strongLinks.has(key2)) strongLinks.set(key2, []);
                strongLinks.get(key1).push(cells[1]);
                strongLinks.get(key2).push(cells[0]);
            }
        }
        
        const colGroups = new Map();
        for (const pos of positions) {
            if (!colGroups.has(pos.col)) colGroups.set(pos.col, []);
            colGroups.get(pos.col).push(pos);
        }
        for (const [col, cells] of colGroups) {
            if (cells.length === 2) {
                const key1 = `${cells[0].row},${cells[0].col}`;
                const key2 = `${cells[1].row},${cells[1].col}`;
                if (!strongLinks.has(key1)) strongLinks.set(key1, []);
                if (!strongLinks.has(key2)) strongLinks.set(key2, []);
                strongLinks.get(key1).push(cells[1]);
                strongLinks.get(key2).push(cells[0]);
            }
        }
        
        const boxGroups = new Map();
        for (const pos of positions) {
            const box = Math.floor(pos.row / SUBSIZE) * SUBSIZE + Math.floor(pos.col / SUBSIZE);
            if (!boxGroups.has(box)) boxGroups.set(box, []);
            boxGroups.get(box).push(pos);
        }
        for (const [box, cells] of boxGroups) {
            if (cells.length === 2) {
                const key1 = `${cells[0].row},${cells[0].col}`;
                const key2 = `${cells[1].row},${cells[1].col}`;
                if (!strongLinks.has(key1)) strongLinks.set(key1, []);
                if (!strongLinks.has(key2)) strongLinks.set(key2, []);
                strongLinks.get(key1).push(cells[1]);
                strongLinks.get(key2).push(cells[0]);
            }
        }
        
        if (strongLinks.size < 2) continue;
        
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
        
        let foundEliminations = null;
        
        function dfs(currentKey, path, visited, needStrong) {
            if (path.length >= 3 && path.length % 2 === 1) {
                const startKey = path[0];
                const endKey = currentKey;
                const [startRow, startCol] = startKey.split(',').map(Number);
                const [endRow, endCol] = endKey.split(',').map(Number);
                
                if (isVisible({ row: startRow, col: startCol }, { row: endRow, col: endCol })) {
                    const commonCells = findCommonVisibleCells(
                        { row: startRow, col: startCol },
                        { row: endRow, col: endCol }
                    );
                    const eliminations = [];
                    for (const cell of commonCells) {
                        if (currentBoard[cell.row][cell.col] === 0 && cellCandidates[cell.row][cell.col].has(num)) {
                            eliminations.push({ row: cell.row, col: cell.col, num: num });
                        }
                    }
                    if (eliminations.length > 0) {
                        foundEliminations = eliminations;
                        return true;
                    }
                }
                return false;
            }
            
            if (path.length > 10) return false;
            
            if (needStrong) {
                const neighbors = strongLinks.get(currentKey) || [];
                for (const neighbor of neighbors) {
                    const neighborKey = `${neighbor.row},${neighbor.col}`;
                    if (visited.has(neighborKey)) continue;
                    visited.add(neighborKey);
                    path.push(neighborKey);
                    if (dfs(neighborKey, path, visited, false)) return true;
                    path.pop();
                    visited.delete(neighborKey);
                }
            } else {
                const [currentRow, currentCol] = currentKey.split(',').map(Number);
                for (const pos of positions) {
                    const posKey = `${pos.row},${pos.col}`;
                    if (visited.has(posKey)) continue;
                    if (!isVisible({ row: currentRow, col: currentCol }, pos)) continue;
                    visited.add(posKey);
                    path.push(posKey);
                    if (dfs(posKey, path, visited, true)) return true;
                    path.pop();
                    visited.delete(posKey);
                }
            }
            return false;
        }
        
        for (const [startKey, neighbors] of strongLinks) {
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.row},${neighbor.col}`;
                const visited = new Set();
                visited.add(startKey);
                visited.add(neighborKey);
                const path = [startKey, neighborKey];
                
                if (dfs(neighborKey, path, visited, false)) {
                    if (foundEliminations && foundEliminations.length > 0) {
                        const uniqueElims = [];
                        const seen = new Set();
                        for (const elim of foundEliminations) {
                            const key = `${elim.row},${elim.col}`;
                            if (!seen.has(key)) {
                                seen.add(key);
                                uniqueElims.push(elim);
                            }
                        }
                        if (uniqueElims.length > 0) {
                            return { technique: "分组链 (Grouped Chain)", eliminations: uniqueElims,
                                explanation: `分组链结构：数字 ${num} 形成交替推理链，排除共同可见格中的 ${num}。` };
                        }
                    }
                }
            }
        }
    }
    return null;
}

// ==================== 更新 findNextStep 函数 ====================
function findNextStep() {
	// 1. 首先尝试唯余法（Hidden Single）- 与后端保持一致
	   let step = findHiddenSingle();
	   if (step) return step;
	   
	   // 2. 然后尝试唯一候选数法（Naked Single）
	   step = findNakedSingle();
	   if (step) return step;
    
    // 中级方法
    step = findNakedPair();                if (step) return step;
    step = findHiddenPair();               if (step) return step;
    step = findNakedTriple();              if (step) return step;
    step = findHiddenTriple();             if (step) return step;
    step = findBlockRowToBox();            if (step) return step;
    step = findBlockColToBox();            if (step) return step;
    
    // 高级方法
    step = findXWing();                    if (step) return step;
    step = findSwordfish();                if (step) return step;
    step = findXYWing();                   if (step) return step;
    step = findXYZWing();                  if (step) return step;
    step = findSkyscraper();               if (step) return step;
    step = findTwoStringKite();            if (step) return step;
    step = findEmptyRectangle();           if (step) return step;
    
    // 专家方法
    step = findUniqueRectangle();          if (step) return step;
    step = findXYChain();                  if (step) return step;
    step = findXChain();                   if (step) return step;
    step = findWWing();                    if (step) return step;
    step = findForcingChain();             if (step) return step;
    step = findAIC();                      if (step) return step;
    step = findContinuousNiceLoop();       if (step) return step;
    step = findJellyfish();                if (step) return step;
    step = findBUGPlus1();                 if (step) return step;
    
    // 最后尝试分组链
    step = findGroupedChain();             if (step) return step;
    
    return null;
}