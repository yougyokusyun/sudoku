/**
 * 数独解题器 - 核心逻辑（完整修复版）
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
const DEBUG = false; // 生产环境设为false

function log(message, data = null) {
    if (DEBUG) {
        if (data) console.log(`[Sudoku] ${message}`, data);
        else console.log(`[Sudoku] ${message}`);
    }
}

// ==================== 候选数管理 ====================

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

function recalcAfterPlacement(row, col, num) {
    cellCandidates[row][col].clear();
    for (let c = 0; c < SIZE; c++) if (currentBoard[row][c] === 0) cellCandidates[row][c].delete(num);
    for (let r = 0; r < SIZE; r++) if (currentBoard[r][col] === 0) cellCandidates[r][col].delete(num);
    const br = Math.floor(row / SUBSIZE) * SUBSIZE, bc = Math.floor(col / SUBSIZE) * SUBSIZE;
    for (let i = 0; i < SUBSIZE; i++) {
        for (let j = 0; j < SUBSIZE; j++) {
            const r = br + i, c = bc + j;
            if (currentBoard[r][c] === 0) cellCandidates[r][c].delete(num);
        }
    }
}

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

function isValidMove(row, col, num) {
    for (let c = 0; c < SIZE; c++) if (currentBoard[row][c] === num) return false;
    for (let r = 0; r < SIZE; r++) if (currentBoard[r][col] === num) return false;
    let br = Math.floor(row / SUBSIZE) * SUBSIZE, bc = Math.floor(col / SUBSIZE) * SUBSIZE;
    for (let i = 0; i < SUBSIZE; i++) for (let j = 0; j < SUBSIZE; j++) if (currentBoard[br + i][bc + j] === num) return false;
    return true;
}

function applyStep(step) {
    if (step.value !== undefined && step.value !== null) {
        currentBoard[step.row][step.col] = step.value;
        recalcAfterPlacement(step.row, step.col, step.value);
        clearDeleteRecord();
        return step;
    }
    if (step.eliminations && step.eliminations.length > 0) {
        removeCandidates(step.eliminations);
    }
    return step;
}

// ==================== 1. 唯一候选数法 ====================
function findNakedSingle() {
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
            if (currentBoard[i][j] === 0 && cellCandidates[i][j].size === 1) {
                const value = Array.from(cellCandidates[i][j])[0];
                return { row: i, col: j, value: value, technique: "唯一候选数法", eliminations: [],
                    explanation: `单元格 (${i + 1},${j + 1}) 只剩下数字 ${value}。` };
            }
        }
    }
    return null;
}

// ==================== 2. 唯余法 ====================
function findHiddenSingle() {
    for (let row = 0; row < SIZE; row++) {
        for (let num = 1; num <= SIZE; num++) {
            let targetCol = -1, count = 0;
            for (let col = 0; col < SIZE; col++) {
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(num)) {
                    targetCol = col; count++;
                    if (count > 1) break;
                }
            }
            if (count === 1) {
                return { row: row, col: targetCol, value: num, technique: "唯余法（行）", eliminations: [],
                    explanation: `第 ${row + 1} 行中数字 ${num} 只能出现在 (${row + 1},${targetCol + 1})。` };
            }
        }
    }
    for (let col = 0; col < SIZE; col++) {
        for (let num = 1; num <= SIZE; num++) {
            let targetRow = -1, count = 0;
            for (let row = 0; row < SIZE; row++) {
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(num)) {
                    targetRow = row; count++;
                    if (count > 1) break;
                }
            }
            if (count === 1) {
                return { row: targetRow, col: col, value: num, technique: "唯余法（列）", eliminations: [],
                    explanation: `第 ${col + 1} 列中数字 ${num} 只能出现在 (${targetRow + 1},${col + 1})。` };
            }
        }
    }
    for (let box = 0; box < SIZE; box++) {
        const br = Math.floor(box / SUBSIZE) * SUBSIZE, bc = (box % SUBSIZE) * SUBSIZE;
        for (let num = 1; num <= SIZE; num++) {
            let targetRow = -1, targetCol = -1, count = 0;
            for (let i = 0; i < SUBSIZE; i++) {
                for (let j = 0; j < SUBSIZE; j++) {
                    const row = br + i, col = bc + j;
                    if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(num)) {
                        targetRow = row; targetCol = col; count++;
                        if (count > 1) break;
                    }
                }
                if (count > 1) break;
            }
            if (count === 1) {
                return { row: targetRow, col: targetCol, value: num, technique: "唯余法（宫）", eliminations: [],
                    explanation: `第 ${box + 1} 宫中数字 ${num} 只能出现在 (${targetRow + 1},${targetCol + 1})。` };
            }
        }
    }
    return null;
}

// ==================== 3. 显性数对 ====================
function findNakedPair() {
    for (let row = 0; row < SIZE; row++) {
        const pairCells = [];
        for (let col = 0; col < SIZE; col++) {
            if (currentBoard[row][col] === 0 && cellCandidates[row][col].size === 2) {
                const cand = Array.from(cellCandidates[row][col]).sort();
                pairCells.push({ col: col, cand: cand });
            }
        }
        for (let i = 0; i < pairCells.length; i++) {
            for (let j = i + 1; j < pairCells.length; j++) {
                if (pairCells[i].cand[0] === pairCells[j].cand[0] && pairCells[i].cand[1] === pairCells[j].cand[1]) {
                    const eliminations = [];
                    for (let col = 0; col < SIZE; col++) {
                        if (col !== pairCells[i].col && col !== pairCells[j].col && currentBoard[row][col] === 0) {
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
    for (let col = 0; col < SIZE; col++) {
        const pairCells = [];
        for (let row = 0; row < SIZE; row++) {
            if (currentBoard[row][col] === 0 && cellCandidates[row][col].size === 2) {
                const cand = Array.from(cellCandidates[row][col]).sort();
                pairCells.push({ row: row, cand: cand });
            }
        }
        for (let i = 0; i < pairCells.length; i++) {
            for (let j = i + 1; j < pairCells.length; j++) {
                if (pairCells[i].cand[0] === pairCells[j].cand[0] && pairCells[i].cand[1] === pairCells[j].cand[1]) {
                    const eliminations = [];
                    for (let row = 0; row < SIZE; row++) {
                        if (row !== pairCells[i].row && row !== pairCells[j].row && currentBoard[row][col] === 0) {
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
    for (let box = 0; box < SIZE; box++) {
        const br = Math.floor(box / SUBSIZE) * SUBSIZE, bc = (box % SUBSIZE) * SUBSIZE;
        const pairCells = [];
        for (let i = 0; i < SUBSIZE; i++) {
            for (let j = 0; j < SUBSIZE; j++) {
                const row = br + i, col = bc + j;
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].size === 2) {
                    const cand = Array.from(cellCandidates[row][col]).sort();
                    pairCells.push({ row, col, cand });
                }
            }
        }
        for (let i = 0; i < pairCells.length; i++) {
            for (let j = i + 1; j < pairCells.length; j++) {
                if (pairCells[i].cand[0] === pairCells[j].cand[0] && pairCells[i].cand[1] === pairCells[j].cand[1]) {
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
                if (p1 && p2 && p1.length === 2 && p2.length === 2 && p1[0] === p2[0] && p1[1] === p2[1]) {
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
                if (p1 && p2 && p1.length === 2 && p2.length === 2 && p1[0] === p2[0] && p1[1] === p2[1]) {
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
    return null;
}

// ==================== 5. 显性三数组 ====================
function findNakedTriple() {
    for (let row = 0; row < SIZE; row++) {
        const cells = [];
        for (let col = 0; col < SIZE; col++) {
            if (currentBoard[row][col] === 0 && cellCandidates[row][col].size >= 2 && cellCandidates[row][col].size <= 3) {
                cells.push({ col: col, cand: Array.from(cellCandidates[row][col]).sort() });
            }
        }
        for (let i = 0; i < cells.length - 2; i++) {
            for (let j = i + 1; j < cells.length - 1; j++) {
                for (let k = j + 1; k < cells.length; k++) {
                    const union = new Set([...cells[i].cand, ...cells[j].cand, ...cells[k].cand]);
                    if (union.size === 3) {
                        const eliminations = [];
                        for (let col = 0; col < SIZE; col++) {
                            if (col !== cells[i].col && col !== cells[j].col && col !== cells[k].col && currentBoard[row][col] === 0) {
                                for (const num of union) {
                                    if (cellCandidates[row][col].has(num)) {
                                        eliminations.push({ row, col, num });
                                    }
                                }
                            }
                        }
                        if (eliminations.length > 0) {
                            return { technique: `显性三数组 (行 ${row + 1})`, eliminations: eliminations,
                                explanation: `第 ${row + 1} 行中三个格子的候选数合并为3个数字，可以删除同行其他格中的这些数字。` };
                        }
                    }
                }
            }
        }
    }
    for (let col = 0; col < SIZE; col++) {
        const cells = [];
        for (let row = 0; row < SIZE; row++) {
            if (currentBoard[row][col] === 0 && cellCandidates[row][col].size >= 2 && cellCandidates[row][col].size <= 3) {
                cells.push({ row: row, cand: Array.from(cellCandidates[row][col]).sort() });
            }
        }
        for (let i = 0; i < cells.length - 2; i++) {
            for (let j = i + 1; j < cells.length - 1; j++) {
                for (let k = j + 1; k < cells.length; k++) {
                    const union = new Set([...cells[i].cand, ...cells[j].cand, ...cells[k].cand]);
                    if (union.size === 3) {
                        const eliminations = [];
                        for (let row = 0; row < SIZE; row++) {
                            if (row !== cells[i].row && row !== cells[j].row && row !== cells[k].row && currentBoard[row][col] === 0) {
                                for (const num of union) {
                                    if (cellCandidates[row][col].has(num)) {
                                        eliminations.push({ row, col, num });
                                    }
                                }
                            }
                        }
                        if (eliminations.length > 0) {
                            return { technique: `显性三数组 (列 ${col + 1})`, eliminations: eliminations,
                                explanation: `第 ${col + 1} 列中三个格子的候选数合并为3个数字，可以删除同列其他格中的这些数字。` };
                        }
                    }
                }
            }
        }
    }
    for (let box = 0; box < SIZE; box++) {
        const br = Math.floor(box / SUBSIZE) * SUBSIZE, bc = (box % SUBSIZE) * SUBSIZE;
        const cells = [];
        for (let i = 0; i < SUBSIZE; i++) {
            for (let j = 0; j < SUBSIZE; j++) {
                const row = br + i, col = bc + j;
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].size >= 2 && cellCandidates[row][col].size <= 3) {
                    cells.push({ row, col, cand: Array.from(cellCandidates[row][col]).sort() });
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
                            return { technique: `显性三数组 (宫 ${box + 1})`, eliminations: eliminations,
                                explanation: `宫 ${box + 1} 中三个格子的候选数合并为3个数字，可以删除同宫其他格中的这些数字。` };
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
        const numbers = Object.keys(numPos).map(Number);
        for (let i = 0; i < numbers.length - 2; i++) {
            for (let j = i + 1; j < numbers.length - 1; j++) {
                for (let k = j + 1; k < numbers.length; k++) {
                    const n1 = numbers[i], n2 = numbers[j], n3 = numbers[k];
                    const p1 = numPos[n1], p2 = numPos[n2], p3 = numPos[n3];
                    if (!p1 || !p2 || !p3) continue;
                    const allPositions = new Set([...p1, ...p2, ...p3]);
                    if (allPositions.size === 3) {
                        const eliminations = [];
                        for (const col of allPositions) {
                            for (const num of cellCandidates[row][col]) {
                                if (num !== n1 && num !== n2 && num !== n3) {
                                    eliminations.push({ row, col, num });
                                }
                            }
                        }
                        if (eliminations.length > 0) {
                            return { technique: `隐性三数组 (行 ${row + 1})`, eliminations: eliminations,
                                explanation: `第 ${row + 1} 行中三个数字只能出现在三格中，删除这些格的其他候选数。` };
                        }
                    }
                }
            }
        }
    }
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
                    const allPositions = new Set([...p1, ...p2, ...p3]);
                    if (allPositions.size === 3) {
                        const eliminations = [];
                        for (const row of allPositions) {
                            for (const num of cellCandidates[row][col]) {
                                if (num !== n1 && num !== n2 && num !== n3) {
                                    eliminations.push({ row, col, num });
                                }
                            }
                        }
                        if (eliminations.length > 0) {
                            return { technique: `隐性三数组 (列 ${col + 1})`, eliminations: eliminations,
                                explanation: `第 ${col + 1} 列中三个数字只能出现在三格中，删除这些格的其他候选数。` };
                        }
                    }
                }
            }
        }
    }
    for (let box = 0; box < SIZE; box++) {
        const br = Math.floor(box / SUBSIZE) * SUBSIZE, bc = (box % SUBSIZE) * SUBSIZE;
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
        const numbers = Object.keys(numPos).map(Number);
        for (let i = 0; i < numbers.length - 2; i++) {
            for (let j = i + 1; j < numbers.length - 1; j++) {
                for (let k = j + 1; k < numbers.length; k++) {
                    const n1 = numbers[i], n2 = numbers[j], n3 = numbers[k];
                    const p1 = numPos[n1], p2 = numPos[n2], p3 = numPos[n3];
                    if (!p1 || !p2 || !p3) continue;
                    const allPositionsSet = new Set();
                    for (const pos of p1) allPositionsSet.add(`${pos[0]},${pos[1]}`);
                    for (const pos of p2) allPositionsSet.add(`${pos[0]},${pos[1]}`);
                    for (const pos of p3) allPositionsSet.add(`${pos[0]},${pos[1]}`);
                    if (allPositionsSet.size === 3) {
                        const eliminations = [];
                        for (const posStr of allPositionsSet) {
                            const [row, col] = posStr.split(',').map(Number);
                            for (const num of cellCandidates[row][col]) {
                                if (num !== n1 && num !== n2 && num !== n3) {
                                    eliminations.push({ row, col, num });
                                }
                            }
                        }
                        if (eliminations.length > 0) {
                            return { technique: `隐性三数组 (宫 ${box + 1})`, eliminations: eliminations,
                                explanation: `宫 ${box + 1} 中三个数字只能出现在三格中，删除这些格的其他候选数。` };
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
                return { technique: `区块排除法 (行到宫)`, eliminations: eliminations,
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
                return { technique: `区块排除法 (列到宫)`, eliminations: eliminations,
                    explanation: `数字 ${num} 在第 ${col + 1} 列只能出现在第 ${targetBoxRow + 1} 宫，排除该宫其他列。` };
            }
        }
    }
    return null;
}

// ==================== 9. X-Wing ====================
function findXWing() {
    for (let num = 1; num <= SIZE; num++) {
        const rowsWithTwo = [], colPairs = [];
        for (let row = 0; row < SIZE; row++) {
            const cols = [];
            for (let col = 0; col < SIZE; col++) {
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(num)) cols.push(col);
            }
            if (cols.length === 2) { rowsWithTwo.push(row); colPairs.push(cols.sort()); }
        }
        for (let i = 0; i < colPairs.length; i++) {
            for (let j = i + 1; j < colPairs.length; j++) {
                if (colPairs[i][0] === colPairs[j][0] && colPairs[i][1] === colPairs[j][1]) {
                    const c1 = colPairs[i][0], c2 = colPairs[i][1];
                    const row1 = rowsWithTwo[i], row2 = rowsWithTwo[j];
                    const eliminations = [];
                    for (let row = 0; row < SIZE; row++) {
                        if (row !== row1 && row !== row2) {
                            if (cellCandidates[row][c1].has(num)) eliminations.push({ row, col: c1, num });
                            if (cellCandidates[row][c2].has(num)) eliminations.push({ row, col: c2, num });
                        }
                    }
                    if (eliminations.length > 0) {
                        return { technique: "X-Wing", eliminations: eliminations,
                            explanation: `X-Wing结构，排除其他行这两列的 ${num}。` };
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
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(num)) cols.push(col);
            }
            if (cols.length === 2 || cols.length === 3) { rows.push(row); colsList.push(cols.sort()); }
        }
        if (rows.length >= 3) {
            for (let i = 0; i < rows.length; i++) {
                for (let j = i + 1; j < rows.length; j++) {
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
                                    explanation: `剑鱼结构，排除其他行这3列的 ${num}。` };
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
            const br = Math.floor(p1.row / SUBSIZE) * SUBSIZE, bc = Math.floor(p1.col / SUBSIZE) * SUBSIZE;
            for (let i = 0; i < SUBSIZE; i++) {
                for (let j = 0; j < SUBSIZE; j++) {
                    const r = br + i, c = bc + j;
                    if (!(r === p1.row && c === p1.col) && !(r === p2.row && c === p2.col) && currentBoard[r][c] === 0) {
                        common.push({ row: r, col: c });
                    }
                }
            }
        }
        return common;
    }
    
    for (const pivot of bivalue) {
        for (const wing1 of bivalue) {
            if (pivot === wing1) continue;
            if (!isVisible(pivot, wing1)) continue;
            
            for (const wing2 of bivalue) {
                if (wing2 === pivot || wing2 === wing1) continue;
                if (!isVisible(pivot, wing2)) continue;
                if (isVisible(wing1, wing2)) continue;
                
                if (pivot.a === wing1.a && pivot.b === wing2.a && wing1.b === wing2.b) {
                    const commonNum = wing1.b;
                    const commonCells = findCommonVisibleCells(wing1, wing2);
                    const eliminations = [];
                    for (const cell of commonCells) {
                        if (cellCandidates[cell.row][cell.col].has(commonNum)) {
                            eliminations.push({ row: cell.row, col: cell.col, num: commonNum });
                        }
                    }
                    if (eliminations.length > 0) {
                        return { technique: "XY-Wing", eliminations: eliminations,
                            explanation: `XY-Wing结构，排除共同可见格中的数字 ${commonNum}。` };
                    }
                }
                
                if (pivot.a === wing2.a && pivot.b === wing1.a && wing1.b === wing2.b) {
                    const commonNum = wing1.b;
                    const commonCells = findCommonVisibleCells(wing1, wing2);
                    const eliminations = [];
                    for (const cell of commonCells) {
                        if (cellCandidates[cell.row][cell.col].has(commonNum)) {
                            eliminations.push({ row: cell.row, col: cell.col, num: commonNum });
                        }
                    }
                    if (eliminations.length > 0) {
                        return { technique: "XY-Wing", eliminations: eliminations,
                            explanation: `XY-Wing结构，排除共同可见格中的数字 ${commonNum}。` };
                    }
                }
            }
        }
    }
    return null;
}

// ==================== 12. XYZ-Wing（修复版 - 严格限制条件） ====================
function findXYZWing() {
    const tripleValue = [];
    const bivalue = [];
    
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
            if (currentBoard[i][j] === 0) {
                const cand = Array.from(cellCandidates[i][j]);
                if (cand.length === 3) {
                    tripleValue.push({ row: i, col: j, cand: cand });
                } else if (cand.length === 2) {
                    bivalue.push({ row: i, col: j, a: cand[0], b: cand[1] });
                }
            }
        }
    }
    
    if (tripleValue.length === 0 || bivalue.length < 2) return null;
    
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
            const br = Math.floor(p1.row / SUBSIZE) * SUBSIZE, bc = Math.floor(p1.col / SUBSIZE) * SUBSIZE;
            for (let i = 0; i < SUBSIZE; i++) {
                for (let j = 0; j < SUBSIZE; j++) {
                    const r = br + i, c = bc + j;
                    if (!(r === p1.row && c === p1.col) && !(r === p2.row && c === p2.col) && currentBoard[r][c] === 0) {
                        common.push({ row: r, col: c });
                    }
                }
            }
        }
        return common;
    }
    
    function isSubset(set1, set2) {
        for (const item of set1) if (!set2.has(item)) return false;
        return true;
    }
    
    // XYZ-Wing 要求：枢纽有3个候选数，两个翅膀各有2个候选数
    // 枢纽与两个翅膀都可见，两个翅膀互不可见
    // 三个格子的候选数并集大小为3
    for (const pivot of tripleValue) {
        const pivotSet = new Set(pivot.cand);
        
        for (let i = 0; i < bivalue.length; i++) {
            const wing1 = bivalue[i];
            if (!isVisible(pivot, wing1)) continue;
            const wing1Set = new Set([wing1.a, wing1.b]);
            if (!isSubset(wing1Set, pivotSet)) continue;
            
            for (let j = i + 1; j < bivalue.length; j++) {
                const wing2 = bivalue[j];
                if (!isVisible(pivot, wing2)) continue;
                if (isVisible(wing1, wing2)) continue;
                
                const wing2Set = new Set([wing2.a, wing2.b]);
                if (!isSubset(wing2Set, pivotSet)) continue;
                
                // 检查三个格子的候选数并集大小是否为3
                const union = new Set([...pivot.cand, wing1.a, wing1.b, wing2.a, wing2.b]);
                if (union.size !== 3) continue;
                
                // 找出两个翅膀的共同数字
                const common = new Set();
                for (const num of wing1Set) if (wing2Set.has(num)) common.add(num);
                
                if (common.size === 1) {
                    const commonNum = Array.from(common)[0];
                    // 排除的是枢纽与两个翅膀共同可见格中的这个数字
                    const commonCells1 = findCommonVisibleCells(pivot, wing1);
                    const commonCells2 = findCommonVisibleCells(pivot, wing2);
                    const allCommon = [...commonCells1, ...commonCells2];
                    const eliminations = [];
                    const seen = new Set();
                    
                    for (const cell of allCommon) {
                        const key = `${cell.row},${cell.col}`;
                        if (!seen.has(key) && cellCandidates[cell.row][cell.col].has(commonNum)) {
                            seen.add(key);
                            eliminations.push({ row: cell.row, col: cell.col, num: commonNum });
                        }
                    }
                    
                    if (eliminations.length > 0) {
                        return { technique: "XYZ-Wing", eliminations: eliminations,
                            explanation: `XYZ-Wing结构，排除共同可见格中的数字 ${commonNum}。` };
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
            if (cols.length === 2) rowPositions.push({ row: row, cols: cols });
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
                                explanation: `摩天楼结构，排除候选数 ${num}。` };
                        }
                    }
                }
            }
        }
    }
    return null;
}

// ==================== 14. 空矩形法 (Empty Rectangle) ====================
function findEmptyRectangle() {
    for (let num = 1; num <= SIZE; num++) {
        for (let box = 0; box < SIZE; box++) {
            const br = Math.floor(box / SUBSIZE) * SUBSIZE, bc = (box % SUBSIZE) * SUBSIZE;
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
                        if (Math.floor(col / SUBSIZE) !== bc / SUBSIZE) {
                            if (cellCandidates[targetRow][col].has(num)) {
                                eliminations.push({ row: targetRow, col: col, num: num });
                            }
                        }
                    }
                    if (eliminations.length > 0) {
                        return { technique: "空矩形法 (Empty Rectangle)", eliminations: eliminations,
                            explanation: `空矩形结构，排除候选数 ${num}。` };
                    }
                } else if (cols.size === 1) {
                    const targetCol = Array.from(cols)[0];
                    const eliminations = [];
                    for (let row = 0; row < SIZE; row++) {
                        if (Math.floor(row / SUBSIZE) !== br / SUBSIZE) {
                            if (cellCandidates[row][targetCol].has(num)) {
                                eliminations.push({ row: row, col: targetCol, num: num });
                            }
                        }
                    }
                    if (eliminations.length > 0) {
                        return { technique: "空矩形法 (Empty Rectangle)", eliminations: eliminations,
                            explanation: `空矩形结构，排除候选数 ${num}。` };
                    }
                }
            }
        }
    }
    return null;
}

// ==================== 15. 分组链 (Grouped Chain) - 完全对应后端逻辑 ====================
function findGroupedChain() {
    // 对每个数字进行链搜索（后端：for (int num = 1; num <= SIZE; num++)）
    for (let num = 1; num <= SIZE; num++) {
        // 收集该数字的所有候选位置（后端：candidatesMap.get(num)）
        const positions = [];
        for (let row = 0; row < SIZE; row++) {
            for (let col = 0; col < SIZE; col++) {
                if (currentBoard[row][col] === 0 && cellCandidates[row][col].has(num)) {
                    positions.push({ row, col });
                }
            }
        }
        
        if (positions.length < 2) continue;
        
        // ========== 1. 构建强链接（后端：strongLinks） ==========
        // 强链接：同行、同列、同宫中只有2个候选数
        const strongLinks = new Map(); // key: "row,col", value: [{row, col}]
        
        // 按行分组
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
                strongLinks.get(key1).push({ row: cells[1].row, col: cells[1].col });
                strongLinks.get(key2).push({ row: cells[0].row, col: cells[0].col });
            }
        }
        
        // 按列分组
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
                strongLinks.get(key1).push({ row: cells[1].row, col: cells[1].col });
                strongLinks.get(key2).push({ row: cells[0].row, col: cells[0].col });
            }
        }
        
        // 按宫分组
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
                strongLinks.get(key1).push({ row: cells[1].row, col: cells[1].col });
                strongLinks.get(key2).push({ row: cells[0].row, col: cells[0].col });
            }
        }
        
        if (strongLinks.size < 2) continue;
        
        // ========== 2. 辅助函数 ==========
        // 检查两个格子是否可见（同行、同列、同宫）- 用于弱链接
        function isVisible(pos1, pos2) {
            if (pos1.row === pos2.row) return true;
            if (pos1.col === pos2.col) return true;
            if (Math.floor(pos1.row / SUBSIZE) === Math.floor(pos2.row / SUBSIZE) &&
                Math.floor(pos1.col / SUBSIZE) === Math.floor(pos2.col / SUBSIZE)) {
                return true;
            }
            return false;
        }
        
        // 寻找共同可见格（后端：findCommonVisibleCells）
        function findCommonVisibleCells(cell1, cell2) {
            const common = [];
            if (cell1.row === cell2.row) {
                for (let c = 0; c < SIZE; c++) {
                    if (c !== cell1.col && c !== cell2.col && currentBoard[cell1.row][c] === 0) {
                        common.push({ row: cell1.row, col: c });
                    }
                }
            } else if (cell1.col === cell2.col) {
                for (let r = 0; r < SIZE; r++) {
                    if (r !== cell1.row && r !== cell2.row && currentBoard[r][cell1.col] === 0) {
                        common.push({ row: r, col: cell1.col });
                    }
                }
            } else if (Math.floor(cell1.row / SUBSIZE) === Math.floor(cell2.row / SUBSIZE) &&
                       Math.floor(cell1.col / SUBSIZE) === Math.floor(cell2.col / SUBSIZE)) {
                const br = Math.floor(cell1.row / SUBSIZE) * SUBSIZE;
                const bc = Math.floor(cell1.col / SUBSIZE) * SUBSIZE;
                for (let i = 0; i < SUBSIZE; i++) {
                    for (let j = 0; j < SUBSIZE; j++) {
                        const r = br + i, c = bc + j;
                        if (!(r === cell1.row && c === cell1.col) && !(r === cell2.row && c === cell2.col) && currentBoard[r][c] === 0) {
                            common.push({ row: r, col: c });
                        }
                    }
                }
            }
            return common;
        }
        
        // ========== 3. DFS 搜索链（后端：dfs + buildXYChain） ==========
        let foundEliminations = null;
        
        function dfs(currentKey, path, visited, needStrong) {
            // 检查链长度，奇数长度时检查首尾
            if (path.length >= 3 && path.length % 2 === 1) {
                const startKey = path[0];
                const endKey = currentKey;
                const [startRow, startCol] = startKey.split(',').map(Number);
                const [endRow, endCol] = endKey.split(',').map(Number);
                
                // 检查首尾是否可见（后端：isVisible）
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
            
            // 限制链最大长度
            if (path.length > 10) return false;
            
            if (needStrong) {
                // 需要强链接（后端：strongLinks.get(currentKey)）
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
                // 需要弱链接：所有可见的格子（后端：isVisible 检查）
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
        
        // ========== 4. 从每个强链接开始搜索（后端：for (int[] start : strongLinks)） ==========
        for (const [startKey, neighbors] of strongLinks) {
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.row},${neighbor.col}`;
                const visited = new Set();
                visited.add(startKey);
                visited.add(neighborKey);
                const path = [startKey, neighborKey];
                
                // 第一步是强链，下一步应该是弱链
                if (dfs(neighborKey, path, visited, false)) {
                    if (foundEliminations && foundEliminations.length > 0) {
                        // 去重
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
                                explanation: `分组链结构，排除共同可见格中的数字 ${num}。` };
                        }
                    }
                }
            }
        }
    }
    return null;
}
// ==================== 查找下一步 ====================
function findNextStep() {
    let step = findNakedSingle();      if (step) return step;
    step = findHiddenSingle();         if (step) return step;
    step = findNakedPair();            if (step) return step;
    step = findHiddenPair();           if (step) return step;
    step = findNakedTriple();          if (step) return step;
    step = findHiddenTriple();         if (step) return step;
    step = findBlockRowToBox();        if (step) return step;
    step = findBlockColToBox();        if (step) return step;
    step = findXWing();                if (step) return step;
    step = findSwordfish();            if (step) return step;
    step = findXYWing();               if (step) return step;
//    step = findXYZWing();              if (step) return step;
    step = findSkyscraper();           if (step) return step;
    step = findEmptyRectangle();       if (step) return step;
    step = findGroupedChain();         if (step) return step;
    
    return null;
}