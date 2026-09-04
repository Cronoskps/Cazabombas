const LETTERS = "ABCDEFGHIJKLM";
const PLAYERS = ["Tu Atril (P1)", "Mateo (IA 2)", "Valentina (IA 3)", "Lucas (IA 4)"];

let state = {
    gameMode: 'basic',
    lives: 3,
    active: true,
    matrix: [[], [], [], []],
    inventory: {},
    dualCharges: 2,
    pliersActive: false,
    pliersUsed: false,
    scannerUsed: false,
    initialClueSelected: false,
    pendingTarget: null
};

// --- NAVEGACIÓN DEL MENÚ ---
function startGame(mode) {
    state.gameMode = mode;
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'flex';
    initGame();
}

function returnToMenu() {
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('main-menu').style.display = 'flex';
}

function log(msg, color = "#94a3b8") {
    const term = document.getElementById('terminal');
    const p = document.createElement('p');
    p.className = 'log-entry';
    p.style.color = color;
    p.textContent = `> ${msg}`;
    term.appendChild(p);
    term.scrollTop = term.scrollHeight;
}

function initGame() {
    state.lives = 3;
    state.active = true;
    state.dualCharges = 2;
    state.pliersActive = false;
    state.pliersUsed = false;
    state.scannerUsed = false;
    state.initialClueSelected = false;
    state.matrix = [[], [], [], []];
    state.inventory = {};

    for (let i = 1; i <= 12; i++) {
        state.inventory[i] = { trackerTotal: 4, inDeckCount: 4, cut: 0 };
    }

    let deck = [];
    for (let i = 1; i <= 12; i++) {
        for (let j = 0; j < 4; j++) {
            deck.push({ value: i, isYellow: false, isRed: false });
        }
    }

    if (state.gameMode === 'basic') {
        state.inventory[4.5] = { trackerTotal: 2, inDeckCount: 2, cut: 0, isYellow: true };
        state.inventory[9.5] = { trackerTotal: 2, inDeckCount: 2, cut: 0, isYellow: true };
        deck.push({ value: 4.5, isYellow: true, isRed: false }, { value: 4.5, isYellow: true, isRed: false });
        deck.push({ value: 9.5, isYellow: true, isRed: false }, { value: 9.5, isYellow: true, isRed: false });
    } else if (state.gameMode === 'advanced') {
        const decimals = [1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5];

        // 1 Cable Rojo (Muerte Súbita)
        const redVal = decimals.splice(Math.floor(Math.random() * decimals.length), 1)[0];
        state.inventory[redVal] = { trackerTotal: 1, inDeckCount: 1, cut: 0, isRed: true };
        deck.push({ value: redVal, isYellow: false, isRed: true });

        // 3 Cables Amarillos reales, pero mostramos 4 en el rastreador (Misterio de Reparto)
        const yellowVals = [];
        for (let i = 0; i < 4; i++) {
            yellowVals.push(decimals.splice(Math.floor(Math.random() * decimals.length), 1)[0]);
        }
        const missingYellow = yellowVals[Math.floor(Math.random() * yellowVals.length)];

        yellowVals.forEach(yv => {
            const inDeck = (yv !== missingYellow);
            state.inventory[yv] = { trackerTotal: 1, inDeckCount: inDeck ? 1 : 0, cut: 0, isYellow: true };
            if (inDeck) {
                deck.push({ value: yv, isYellow: true, isRed: false });
            }
        });
    }

    deck.sort(() => Math.random() - 0.5);

    for (let p = 0; p < 4; p++) {
        let hand = deck.splice(0, 13).map((item, idx) => ({
            ...item, cut: false, clue: false, revealed: p === 0, pos: LETTERS[idx]
        }));
        hand.sort((a, b) => a.value - b.value);
        hand.forEach((item, idx) => item.pos = LETTERS[idx]);
        state.matrix[p] = hand;
    }

    let usedClueValues = [];
    for (let bot = 1; bot <= 3; bot++) {
        const botHand = state.matrix[bot];
        let validClues = botHand.filter(c => !usedClueValues.includes(c.value) && !c.isYellow && !c.isRed);
        if (validClues.length === 0) {
            validClues = botHand.filter(c => !c.isYellow && !c.isRed);
            if (validClues.length === 0) validClues = botHand;
        }
        const chosenClue = validClues[Math.floor(Math.random() * validClues.length)];
        chosenClue.clue = true; chosenClue.revealed = true;
        usedClueValues.push(chosenClue.value);
    }

    document.getElementById('terminal').innerHTML = '';
    log(`Misión Configurada: Modo ${state.gameMode === 'basic' ? 'Intermedio' : 'Experto'}.`, "#38bdf8");
    log("👉 Haz clic en una carta estándar de TU ATRIL para fijar tu pista inicial voluntaria.", "#facc15");

    buildModalKeypad();
    renderTracker();
    renderBoard();
    updateToolsState();
    recordGameStart();
}

function buildModalKeypad() {
    const pad = document.getElementById('modal-keypad');
    pad.innerHTML = '';
    Object.keys(state.inventory).sort((a, b) => parseFloat(a) - parseFloat(b)).forEach(vStr => {
        const v = parseFloat(vStr);
        const item = state.inventory[v];
        const btn = document.createElement('button');

        let label = v;
        if (item.isYellow) { label = `${v}🟡`; btn.className = 'keypad-btn yellow-key'; }
        else if (item.isRed) { label = `${v}🔴`; btn.className = 'keypad-btn red-key'; btn.style.background = '#ef4444'; btn.style.color = 'white'; }
        else { btn.className = 'keypad-btn'; }

        btn.textContent = label;
        btn.onclick = () => submitGuess(v);
        pad.appendChild(btn);
    });
}

function renderTracker() {
    const bar = document.getElementById('tracker-bar');
    bar.innerHTML = '';

    Object.keys(state.inventory).sort((a, b) => parseFloat(a) - parseFloat(b)).forEach(val => {
        const item = state.inventory[val];
        const div = document.createElement('div');

        // Para las cartas de misterio que no están en el mazo, nunca llegarán a trackerTotal, se quedan grises.
        const isDone = item.cut === item.trackerTotal;
        const isPartial = item.cut > 0 && !isDone;

        let statusClass = isDone ? 'done' : (isPartial ? 'partial' : '');
        div.className = `track-item ${statusClass}`;

        let label = val;
        if (item.isYellow) label = `${val}🟡`;
        if (item.isRed) { label = `${val}🔴`; div.style.color = '#ef4444'; div.style.borderColor = '#ef4444'; }

        const checkIcon = isDone ? ' ✅' : '';
        div.textContent = `${label}: ${item.cut}/${item.trackerTotal}${checkIcon}`;
        bar.appendChild(div);
    });
}

function updateToolsState() {
    const activeHand = state.matrix[0].filter(c => !c.cut);
    const myActiveCards = activeHand.length;

    document.getElementById('advance-bots-btn').style.display = (myActiveCards === 0 && state.active) ? 'inline-block' : 'none';

    // Botón Revelar Rojos (Solo Modo Avanzado)
    const hasOnlyReds = myActiveCards > 0 && activeHand.every(c => c.isRed);
    document.getElementById('reveal-reds-btn').style.display = (state.gameMode === 'advanced' && hasOnlyReds) ? 'inline-block' : 'none';

    document.getElementById('dual-charges').textContent = state.dualCharges;
    document.getElementById('dual-detector-btn').disabled = state.dualCharges <= 0 || !state.active || !state.initialClueSelected;
    document.getElementById('self-cut-btn').disabled = !state.active || !state.initialClueSelected || myActiveCards === 0;

    document.getElementById('pliers-btn').disabled = (state.inventory[5].cut < 2) || state.pliersUsed || !state.active || !state.initialClueSelected;
    document.getElementById('scanner-btn').disabled = (state.inventory[8].cut < 2) || state.scannerUsed || !state.active || !state.initialClueSelected;
}

function renderBoard() {
    const board = document.getElementById('board-container');
    board.innerHTML = '';
    document.getElementById('lives-display').textContent = '❤️'.repeat(Math.max(0, state.lives)) + '💔'.repeat(Math.max(0, 3 - state.lives));

    state.matrix.forEach((hand, pIdx) => {
        const rack = document.createElement('div');
        rack.className = 'rack';
        const header = document.createElement('div');
        header.className = 'rack-header';
        header.innerHTML = `<span>${PLAYERS[pIdx]}</span> <span>${hand.filter(c => !c.cut).length} cables activos</span>`;
        rack.appendChild(header);

        const row = document.createElement('div');
        row.className = 'cables-row';

        hand.forEach((cable, cIdx) => {
            const btn = document.createElement('button');
            const isHidden = !cable.revealed && !cable.cut;

            let colorClass = '';
            if (cable.isYellow && (pIdx === 0 || !isHidden)) colorClass = 'yellow';
            if (cable.isRed && (pIdx === 0 || !isHidden)) colorClass = 'red'; // Puedes agregar .cable-btn.red en CSS

            btn.className = `cable-btn ${colorClass} ${isHidden ? 'hidden' : ''} ${cable.cut ? 'cut' : ''} ${cable.clue ? 'clue' : ''}`;

            if (colorClass === 'red') { btn.style.background = '#ef4444'; btn.style.color = 'white'; }

            const posSpan = document.createElement('span');
            posSpan.className = 'pos-label';
            posSpan.textContent = cable.pos;

            const valSpan = document.createElement('span');
            let valText = '?';
            if (!isHidden) {
                valText = cable.value;
                if (cable.isYellow) valText += '🟡';
                if (cable.isRed) valText += '🔴';
            }
            valSpan.textContent = valText;

            btn.appendChild(posSpan);
            btn.appendChild(valSpan);

            if (pIdx === 0) {
                btn.disabled = state.initialClueSelected || cable.cut;
                btn.onclick = () => {
                    if (!state.initialClueSelected) {
                        if (cable.isYellow || cable.isRed) {
                            alert("Reglamento: No puedes marcar un cable decimal como pista inicial.");
                            return;
                        }
                        cable.clue = true; state.initialClueSelected = true;
                        log(`Pista inicial voluntaria fijada en posición ${cable.pos} (${cable.value}).`, "#38bdf8");
                        renderBoard(); updateToolsState();
                    }
                };
            } else {
                btn.disabled = !state.active || cable.cut || !state.initialClueSelected || state.matrix[0].filter(c => !c.cut).length === 0;
                if (!cable.cut) btn.onclick = () => openCutModal(pIdx, cIdx);
            }
            row.appendChild(btn);
        });
        rack.appendChild(row);
        board.appendChild(rack);
    });
}

function triggerRevealReds() {
    const activeHand = state.matrix[0].filter(c => !c.cut);
    activeHand.forEach(c => { c.revealed = true; c.cut = true; state.inventory[c.value].cut++; });
    log(`🔴 ¡CABLES ROJOS REVELADOS! Has desactivado tus cables rojos restantes de forma segura.`, "#10b981");
    checkGameState();
    renderTracker();
    renderBoard();
    updateToolsState();
    if (state.active && state.lives > 0) setTimeout(executeBotRounds, 800);
}

function triggerSelfPairCut() {
    if (!state.active || !state.initialClueSelected) return;
    const valInput = prompt("¿Qué número repetido de tu propio atril declaras autocortar? (ej: 1, 2 o 4.5):");
    if (!valInput) return;
    const val = parseFloat(valInput);
    if (!state.inventory[val]) { alert("Número no válido."); return; }

    const activeCopies = state.matrix[0].filter(c => c.value === val && !c.cut);
    if (activeCopies.length < 2) { alert(`No tienes suficientes copias activas.`); return; }

    if (activeCopies.length === 4) {
        activeCopies.forEach(c => c.cut = true);
        state.inventory[val].cut += 4;
        log(`💣 ¡CUARTETO COMPLETO EN MANO! Descartaste tus 4 cables del ${val} simultáneamente.`, "#10b981");
    } else if ((state.inventory[val].isYellow || state.inventory[val].isRed) && activeCopies.length === state.inventory[val].inDeckCount) {
        activeCopies.forEach(c => c.cut = true);
        state.inventory[val].cut += activeCopies.length;
        log(`✂️ ¡PAREJA ESPECIAL DESCARTADA! Descartaste tus cables especiales ${val}.`, "#10b981");
    } else {
        if (state.inventory[val].cut < 2) {
            alert(`Reglamento: No puedes cortar una pareja propia desde cero (0/4).`);
            return;
        }
        activeCopies[0].cut = true; activeCopies[1].cut = true;
        state.inventory[val].cut += 2;
        log(`✂️ ¡AUTOCORTE EN PAREJA! Descartaste tu pareja de posiciones ${activeCopies[0].pos} y ${activeCopies[1].pos}.`, "#10b981");
    }

    checkGameState(); renderTracker(); renderBoard(); updateToolsState();
    if (state.active && state.lives > 0) setTimeout(executeBotRounds, 800);
}

function openCutModal(playerIdx, cableIdx) {
    if (!state.active) return;
    state.pendingTarget = { pIdx: playerIdx, cIdx: cableIdx };
    document.getElementById('modal-title').textContent = `Declarar valor para posición ${state.matrix[playerIdx][cableIdx].pos} (${PLAYERS[playerIdx]})`;
    document.getElementById('cut-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('cut-modal').classList.add('hidden');
    state.pendingTarget = null;
}

function submitGuess(guess) {
    const target = state.pendingTarget;
    closeModal();
    if (!target) return;

    const targetCable = state.matrix[target.pIdx][target.cIdx];
    const playerCard = state.matrix[0].find(c => c.value === guess && !c.cut);

    if (!playerCard) {
        log(`Acción no válida: No posees ninguna copia activa del ${guess} en tu atril.`, "#f59e0b");
        return;
    }

    if (targetCable.value === guess) {
        log(`¡CORTE EXITOSO! Cortaste el ${guess} en ${PLAYERS[target.pIdx]} (${targetCable.pos}).`, "#10b981");
        targetCable.cut = true; targetCable.revealed = true;
        playerCard.cut = true; state.inventory[guess].cut += 2;
    } else {
        if (state.pliersActive) {
            log(`¡Fallo protegido por Alicates! La posición ${targetCable.pos} era ${targetCable.value}. No pierden vidas ni detona el rojo.`, "#38bdf8");
            state.pliersActive = false;
        } else {
            if (targetCable.isRed) {
                state.lives = 0;
                log(`💥 ¡CABLE ROJO CORTADO! La posición ${targetCable.pos} de ${PLAYERS[target.pIdx]} era un ${targetCable.value}🔴. MUERTE SÚBITA.`, "#ef4444");
            } else {
                state.lives--;
                log(`¡FALLO! La posición ${targetCable.pos} de ${PLAYERS[target.pIdx]} era ${targetCable.value}. Pierden 1 vida.`, "#ef4444");
            }
        }
        targetCable.revealed = true;
    }

    checkGameState(); renderTracker(); renderBoard(); updateToolsState();
    if (state.active && state.lives > 0) setTimeout(executeBotRounds, 800);
}

function triggerDualDetector() {
    if (state.dualCharges <= 0 || !state.active || !state.initialClueSelected) return;

    const targetP = prompt("¿A qué compañero aplicar Detector Doble? (2: Mateo, 3: Valentina, 4: Lucas):");
    if (!targetP) return;
    const pIdx = parseInt(targetP) - 1;
    if (![1, 2, 3].includes(pIdx)) return;

    const guessValStr = prompt("Ingresa el NÚMERO que estás buscando (ej: 4 o 9.5):");
    if (!guessValStr) return;
    const guessVal = parseFloat(guessValStr);
    if (isNaN(guessVal)) return;

    const pos1Str = prompt("Ingresa la PRIMERA letra a escanear (ej: C):");
    if (!pos1Str) return;
    const card1 = state.matrix[pIdx].find(c => c.pos === pos1Str.toUpperCase() && !c.cut);
    if (!card1) { alert("Primera posición no válida."); return; }

    const pos2Str = prompt("Ingresa la SEGUNDA letra a escanear (ej: D):");
    if (!pos2Str) return;
    if (pos1Str.toUpperCase() === pos2Str.toUpperCase()) { alert("Debes elegir letras distintas."); return; }
    const card2 = state.matrix[pIdx].find(c => c.pos === pos2Str.toUpperCase() && !c.cut);
    if (!card2) { alert("Segunda posición no válida."); return; }

    state.dualCharges--;

    if (card1.value === guessVal || card2.value === guessVal) {
        const hitCard = (card1.value === guessVal) ? card1 : card2;
        hitCard.clue = true; hitCard.revealed = true;
        log(`🔍 Detector Doble: ¡ÉXITO! ${PLAYERS[pIdx]} confirma que el número ${guessVal} está en la casilla ${hitCard.pos}.`, "#38bdf8");
        const playerMatch = [...state.matrix[0].filter(c => !c.cut)].reverse().find(c => c.value === hitCard.value);
        if (playerMatch) {
            log(`✂️ ¡CORTE SIMULTÁNEO! Coincide con tu posición ${playerMatch.pos} (${playerMatch.value}).`, "#10b981");
            hitCard.cut = true; playerMatch.cut = true; state.inventory[hitCard.value].cut += 2;
        }
    } else {
        state.lives--;
        log(`🔍 Detector Doble: NEGATIVO. Pierden 1 vida.`, "#ef4444");
        let cardToReveal = card1;
        if (card1.isRed && !card2.isRed) cardToReveal = card2;
        else if (card2.isRed && !card1.isRed) cardToReveal = card1;
        else if (card1.isYellow && !card2.isYellow) cardToReveal = card2;
        else if (card2.isYellow && !card1.isYellow) cardToReveal = card1;

        cardToReveal.revealed = true; cardToReveal.clue = true;
        log(`💡 ${PLAYERS[pIdx]} revela la casilla ${cardToReveal.pos}: es un ${cardToReveal.value}${cardToReveal.isRed ? '🔴' : (cardToReveal.isYellow ? '🟡' : '')}.`, "#eab308");
    }

    checkGameState(); renderTracker(); renderBoard(); updateToolsState();
    if (state.active && state.lives > 0) setTimeout(executeBotRounds, 1200);
}

function useScanner() {
    if (state.scannerUsed || !state.active || state.inventory[8].cut < 2) return;
    const targetP = parseInt(prompt("¿A quién escanear? (2: Mateo, 3: Valentina, 4: Lucas):")) - 1;
    if (![1, 2, 3].includes(targetP)) return;
    const num = parseFloat(prompt("¿Qué número consultar? (ej: 4, 8 o 4.5):"));
    if (isNaN(num)) return;

    const count = state.matrix[targetP].filter(c => c.value === num && !c.cut).length;
    log(`📡 Escáner usado con ${PLAYERS[targetP]}: tiene ${count} cable(s) del número ${num}.`, "#38bdf8");
    state.scannerUsed = true; updateToolsState();
    if (state.active && state.lives > 0) setTimeout(executeBotRounds, 800);
}

function usePliers() {
    if (state.pliersUsed || !state.active || state.inventory[5].cut < 2) return;
    state.pliersActive = true; state.pliersUsed = true;
    log("🔧 Alicates activados: Tu próximo corte fallido no restará vidas ni detonará cables rojos.", "#38bdf8");
    updateToolsState();
}

function checkGameState() {
    if (state.lives <= 0) {
        state.active = false;
        log("💥 ¡LA BOMBA HA DETONADO! Fin de la partida.", "#ef4444");
        saveFinishedGame("DERROTA - BOMBA DETONADA");
        return;
    }
    // Solo contar para la victoria las cartas que REALMENTE están en el mazo (inDeckCount)
    const remaining = Object.values(state.inventory).reduce((acc, curr) => acc + (curr.inDeckCount - curr.cut), 0);
    if (remaining === 0) {
        state.active = false;
        log("🎉 ¡MISIÓN CUMPLIDA! Todos los cables fueron desactivados.", "#10b981");
        saveFinishedGame("VICTORIA - CABLES COMPLETADOS");
    }
}

// --- SISTEMA DE LOG INTERNO MULTI-PARTIDA ---
let currentSessionLog = [];
const originalLog = log;
log = function (msg, color = "#94a3b8") {
    originalLog(msg, color);
    currentSessionLog.push(`> ${msg}`);
};

function recordGameStart() {
    currentSessionLog = [];
    currentSessionLog.push(`=== NUEVA PARTIDA INICIADA (${state.gameMode.toUpperCase()}) ===`);
    currentSessionLog.push(`FECHA: ${new Date().toLocaleTimeString()}`);
    currentSessionLog.push(`REPARTO INICIAL:`);
    PLAYERS.forEach((name, idx) => {
        const handStr = state.matrix[idx].map(c => `${c.pos}:${c.value}${c.isRed ? '🔴' : (c.isYellow ? '🟡' : '')}`).join(' ');
        currentSessionLog.push(`  ${name}: [ ${handStr} ]`);
    });
    currentSessionLog.push(`--- ACCIONES DE LA PARTIDA ---`);
}

function saveFinishedGame(outcome) {
    currentSessionLog.push(`RESULTADO FINAL: ${outcome}`);
    currentSessionLog.push(`VIDAS RESTANTES: ${state.lives}`);
    currentSessionLog.push(`CABLES CORTADOS:`);
    Object.keys(state.inventory).forEach(k => {
        const item = state.inventory[k];
        currentSessionLog.push(`  ${k}${item.isRed ? '🔴' : (item.isYellow ? '🟡' : '')}: ${item.cut}/${item.trackerTotal}`);
    });
    currentSessionLog.push(`==========================================\n`);
    let history = JSON.parse(localStorage.getItem('cazabombas_history') || '[]');
    history.push(currentSessionLog.join('\n'));
    localStorage.setItem('cazabombas_history', JSON.stringify(history));
}

function exportMatchHistory() {
    const history = JSON.parse(localStorage.getItem('cazabombas_history') || '[]');
    if (history.length === 0) { alert("No hay partidas registradas."); return; }
    navigator.clipboard.writeText(history.join('\n\n')).then(() => {
        alert(`¡Copiado al portapapeles!`);
    }).catch(err => {
        console.log(history.join('\n\n'));
        alert("El texto completo se imprimió en la Consola (F12).");
    });
}

function clearMatchHistory() {
    if (confirm("¿Deseas borrar todo el historial?")) {
        localStorage.removeItem('cazabombas_history');
        alert("Historial borrado.");
    }
}

// --- CEREBRO ÚNICO TÁCTICO PARA CUALQUIER JUGADOR (BOT O SIMULACIÓN) ---
function executeSingleTurn(bot) {
    if (!state.active || state.lives <= 0) return false;
    const botHand = state.matrix[bot].filter(c => !c.cut);
    if (botHand.length === 0) return false;

    // REGLA OFICIAL: Revelar Rojos solo si NO quedan cables azules ni amarillos en mano
    if (botHand.every(c => c.isRed)) {
        botHand.forEach(c => { c.revealed = true; c.cut = true; state.inventory[c.value].cut++; });
        log(`🔴 ¡CABLES ROJOS REVELADOS! ${PLAYERS[bot]} revela sus trampas y las desactiva con seguridad.`, "#10b981");
        return true;
    }

    let executed = false;
    const countByValue = {};
    botHand.forEach(c => countByValue[c.value] = (countByValue[c.value] || 0) + 1);

    // PRIORIDAD 0: Autocortes de pares o cuartetos (Regla oficial: estrictamente de 2 en 2 o 4)
    for (const valStr in countByValue) {
        const val = parseFloat(valStr);
        const count = countByValue[val];
        const inv = state.inventory[val];

        // Los cables rojos NUNCA se autocortan
        if (inv.isRed) continue;

        const isFullQuartet = (count === 4);
        const isRemainingPair = (count === 2 && inv.trackerTotal === 4 && inv.cut >= 2);
        // Autocorte de pareja amarilla idéntica (Modo Clásico)
        const isYellowPairBasic = (count === 2 && inv.isYellow && inv.trackerTotal === 2 && inv.cut === 0);

        if (isFullQuartet || isRemainingPair || isYellowPairBasic) {
            const cardsToCut = botHand.filter(c => c.value === val);
            if (cardsToCut.length >= 2) {
                const positions = cardsToCut.map(c => c.pos).join(" y ");
                log(`✂️ ¡AUTOCORTE! ${PLAYERS[bot]} descarta automáticamente sus cables de valor ${val} (posiciones ${positions}).`, "#10b981");
                cardsToCut.forEach(c => { c.cut = true; c.revealed = true; });
                inv.cut += cardsToCut.length;
                return true;
            }
        }
    }

    // Autocorte de cables amarillos en Modo Avanzado (si tiene 2 o más y son todos los que quedan)
    const myYellows = botHand.filter(c => c.isYellow);
    const totalRemainingYellows = Object.values(state.inventory)
        .filter(inv => inv.isYellow)
        .reduce((acc, curr) => acc + (curr.inDeckCount - curr.cut), 0);

    if (myYellows.length >= 2 && myYellows.length === totalRemainingYellows) {
        // Cortar de dos en dos
        const pair = [myYellows[0], myYellows[1]];
        pair.forEach(c => { c.cut = true; c.revealed = true; state.inventory[c.value].cut++; });
        log(`✂️ ¡AUTOCORTE AMARILLO! ${PLAYERS[bot]} posee todos los cables amarillos restantes y descarta el par (${pair[0].pos} y ${pair[1].pos}).`, "#10b981");
        return true;
    }

    const reversedHand = [...botHand].reverse();

    // PRIORIDAD 1: Pistas Públicas Seguras
    for (let myCard of reversedHand) {
        if (myCard.isRed) continue; // Un bot no arriesga su cable rojo en cortes ordinarios
        for (let otherP = 0; otherP < 4; otherP++) {
            if (otherP === bot) continue;
            const match = state.matrix[otherP].find(c => !c.cut && (c.clue || (otherP !== 0 && c.revealed)) && c.value === myCard.value);
            if (match) {
                log(`${PLAYERS[bot]} ve la pista de ${PLAYERS[otherP]} (${match.pos}: ${match.value}) y corta con su ${myCard.pos}.`, "#0284c7");
                match.cut = true; match.revealed = true; myCard.cut = true; myCard.revealed = true;
                state.inventory[myCard.value].cut += 2;
                return true;
            }
        }
    }

    // PRIORIDAD 2: Herramientas (Detector Doble y Escáner)
    if (!executed) {
        if (!state.scannerUsed && state.inventory[8] && state.inventory[8].cut >= 2) {
            const targetP = (bot + 1) % 4;
            const queryVal = botHand.find(c => !c.isRed)?.value || botHand[0].value;
            const count = state.matrix[targetP].filter(c => c.value === queryVal && !c.cut).length;
            state.scannerUsed = true;
            log(`📡 ${PLAYERS[bot]} activa el Escáner con ${PLAYERS[targetP]}: confirma que tiene ${count} copia(s) del número ${queryVal}.`, "#38bdf8");
            updateToolsState();
            return true;
        }
        else if (state.dualCharges > 0) {
            let toolUsed = false;
            for (let targetOffset = 1; targetOffset < 4; targetOffset++) {
                const targetP = (bot + targetOffset) % 4;
                const targetRack = state.matrix[targetP];

                for (let i = 0; i < targetRack.length - 1; i++) {
                    const c1 = targetRack[i]; const c2 = targetRack[i + 1];

                    if (!c1.cut && !c1.revealed && !c2.cut && !c2.revealed) {
                        let minB = 1; for (let j = i - 1; j >= 0; j--) { if (targetRack[j].revealed || targetRack[j].cut) { minB = targetRack[j].value; break; } }
                        let maxB = 12; for (let j = i + 2; j < targetRack.length; j++) { if (targetRack[j].revealed || targetRack[j].cut) { maxB = targetRack[j].value; break; } }

                        if (maxB - minB <= 3) {
                            const candidate = reversedHand.find(c => !c.isRed && c.value > minB && c.value < maxB);
                            if (candidate) {
                                const val = candidate.value;
                                const copiesInHand = botHand.filter(h => h.value === val).length;
                                const remaining = state.inventory[val].trackerTotal - state.inventory[val].cut - copiesInHand;

                                if (remaining > 0) {
                                    state.dualCharges--;
                                    log(`🔍 ${PLAYERS[bot]} usa Detector Doble sobre ${PLAYERS[targetP]}: ¿El número ${val} está en ${c1.pos} o ${c2.pos}?`, "#38bdf8");

                                    if (c1.value === val || c2.value === val) {
                                        const hitCard = (c1.value === val) ? c1 : c2;
                                        log(`✅ ¡ÉXITO! ${PLAYERS[targetP]} confirma y corta la casilla ${hitCard.pos}.`, "#10b981");
                                        hitCard.cut = true; hitCard.revealed = true; candidate.cut = true;
                                        state.inventory[val].cut += 2;
                                    } else {
                                        state.lives--;
                                        log(`❌ NEGATIVO. Pierden 1 vida, pero se revela información vital...`, "#ef4444");
                                        let cardToReveal = c1;
                                        if (c1.isRed && !c2.isRed) cardToReveal = c2;
                                        else if (c2.isRed && !c1.isRed) cardToReveal = c1;
                                        else if (c1.isYellow && !c2.isYellow) cardToReveal = c2;
                                        else if (c2.isYellow && !c1.isYellow) cardToReveal = c1;
                                        cardToReveal.revealed = true; cardToReveal.clue = true;
                                        log(`💡 ${PLAYERS[targetP]} revela la casilla ${cardToReveal.pos}: es un ${cardToReveal.value}${cardToReveal.isRed ? '🔴' : (cardToReveal.isYellow ? '🟡' : '')}.`, "#eab308");
                                    }
                                    updateToolsState(); toolUsed = true; executed = true; break;
                                }
                            }
                        }
                    }
                }
                if (toolUsed) return true;
            }
        }
    }

    // PRIORIDAD 3: Deducción Probabilística
    if (!executed) {
        const ALL_VALUES = Object.keys(state.inventory).map(Number);
        let possibleMoves = [];

        for (let targetOffset = 1; targetOffset < 4; targetOffset++) {
            const targetP = (bot + targetOffset) % 4;
            const targetRack = state.matrix[targetP];
            const hiddenCards = targetRack.filter(c => !c.cut && !c.revealed);

            for (let targetCard of hiddenCards) {
                const targetIdx = LETTERS.indexOf(targetCard.pos);
                let minBound = 1; let hiddenLeft = 0;
                for (let idx = targetIdx - 1; idx >= 0; idx--) { if (targetRack[idx].revealed || targetRack[idx].cut) { minBound = targetRack[idx].value; break; } hiddenLeft++; }
                let maxBound = 12; let hiddenRight = 0;
                for (let idx = targetIdx + 1; idx < targetRack.length; idx++) { if (targetRack[idx].revealed || targetRack[idx].cut) { maxBound = targetRack[idx].value; break; } hiddenRight++; }

                let totalRemainingInRange = 0;
                for (let v of ALL_VALUES) {
                    if (v >= minBound && v <= maxBound) {
                        const copiesInMyHand = botHand.filter(h => h.value === v).length;
                        const remaining = state.inventory[v].trackerTotal - state.inventory[v].cut - copiesInMyHand;
                        if (remaining > 0) totalRemainingInRange += remaining;
                    }
                }
                if (totalRemainingInRange === 0) continue;

                const uniqueVals = [...new Set(botHand.filter(c => !c.isRed).map(c => c.value))];
                for (let val of uniqueVals) {
                    if (val < minBound || val > maxBound) continue;

                    let availableGreaterOrEqual = 0;
                    for (let v of ALL_VALUES) {
                        if (v >= val) {
                            const copies = botHand.filter(h => h.value === v).length;
                            availableGreaterOrEqual += Math.max(0, state.inventory[v].trackerTotal - state.inventory[v].cut - copies);
                        }
                    }
                    if (availableGreaterOrEqual <= hiddenRight) continue;

                    let availableLessOrEqual = 0;
                    for (let v of ALL_VALUES) {
                        if (v <= val) {
                            const copies = botHand.filter(h => h.value === v).length;
                            availableLessOrEqual += Math.max(0, state.inventory[v].trackerTotal - state.inventory[v].cut - copies);
                        }
                    }
                    if (availableLessOrEqual <= hiddenLeft) continue;

                    const copiesInMyHand = botHand.filter(h => h.value === val).length;
                    const remainingInOtherRacks = state.inventory[val].trackerTotal - state.inventory[val].cut - copiesInMyHand;

                    if (remainingInOtherRacks > 0) {
                        const hitChance = remainingInOtherRacks / totalRemainingInRange;
                        const totalHidden = hiddenLeft + hiddenRight;
                        const relativePos = totalHidden === 0 ? 0.5 : hiddenLeft / totalHidden;
                        const relativeVal = maxBound === minBound ? 0.5 : (val - minBound) / (maxBound - minBound);
                        const alignmentScore = Math.abs(relativeVal - relativePos);

                        possibleMoves.push({ targetP, targetCard, guessValue: val, hitChance, rangeWidth: maxBound - minBound, alignmentScore });
                    }
                }
            }
        }

        if (possibleMoves.length > 0) {
            possibleMoves.sort((a, b) => {
                if (b.hitChance !== a.hitChance) return b.hitChance - a.hitChance;
                if (a.alignmentScore !== b.alignmentScore) return a.alignmentScore - b.alignmentScore;
                return a.rangeWidth - b.rangeWidth;
            });

            const bestMove = possibleMoves[0];
            const validCandidateCard = reversedHand.find(c => c.value === bestMove.guessValue);

            if (bestMove.hitChance < 1 && !state.pliersUsed && state.inventory[5] && state.inventory[5].cut >= 2) {
                state.pliersActive = true; state.pliersUsed = true;
                log(`🔧 ${PLAYERS[bot]} activa los Alicates de Precisión ante un corte de riesgo.`, "#38bdf8");
                updateToolsState();
            }

            if (bestMove.targetCard.value === bestMove.guessValue) {
                const probabilityStr = (bestMove.hitChance * 100).toFixed(0);
                log(`${PLAYERS[bot]} calculó un ${probabilityStr}% de éxito y corta el ${bestMove.guessValue} en ${PLAYERS[bestMove.targetP]} (${bestMove.targetCard.pos}).`, "#10b981");
                bestMove.targetCard.cut = true; bestMove.targetCard.revealed = true;
                validCandidateCard.cut = true; state.inventory[bestMove.guessValue].cut += 2;
            } else {
                if (state.pliersActive) {
                    log(`¡Fallo protegido por Alicates! ${PLAYERS[bot]} probó el ${bestMove.guessValue} en ${PLAYERS[bestMove.targetP]} (${bestMove.targetCard.pos}) y era un ${bestMove.targetCard.value}. No explota el rojo ni pierden vidas.`, "#38bdf8");
                    state.pliersActive = false;
                } else {
                    if (bestMove.targetCard.isRed) {
                        state.lives = 0;
                        log(`💥 ¡CABLE ROJO CORTADO POR IA! ${PLAYERS[bot]} probó el ${bestMove.guessValue} en ${PLAYERS[bestMove.targetP]} (${bestMove.targetCard.pos}) y era un ${bestMove.targetCard.value}🔴. Muerte Súbita.`, "#ef4444");
                    } else {
                        state.lives--;
                        const probabilityStr = (bestMove.hitChance * 100).toFixed(0);
                        log(`${PLAYERS[bot]} arriesgó con un ${probabilityStr}% de acierto y falló. Era un ${bestMove.targetCard.value}.`, "#ef4444");
                    }
                }
                bestMove.targetCard.revealed = true;
            }
        } else {
            const fallbackCandidate = reversedHand.find(c => !c.isRed) || reversedHand[0];
            const fallbackTargetP = (bot + 1) % 4;
            const fallbackCard = state.matrix[fallbackTargetP].find(c => !c.cut && !c.revealed) || state.matrix[fallbackTargetP].find(c => !c.cut);

            if (fallbackCard) {
                if (fallbackCard.value === fallbackCandidate.value) {
                    log(`${PLAYERS[bot]} arriesga a ciegas y corta con éxito el ${fallbackCandidate.value} en ${PLAYERS[fallbackTargetP]} (${fallbackCard.pos}).`, "#10b981");
                    fallbackCard.cut = true; fallbackCard.revealed = true; fallbackCandidate.cut = true;
                    state.inventory[fallbackCandidate.value].cut += 2;
                } else {
                    if (fallbackCard.isRed && !state.pliersActive) {
                        state.lives = 0;
                        log(`💥 ¡CABLE ROJO CORTADO A CIEGAS! Era un ${fallbackCard.value}🔴. Muerte Súbita.`, "#ef4444");
                    } else {
                        state.lives--;
                        log(`${PLAYERS[bot]} arriesgó a ciegas y falló. Era un ${fallbackCard.value}.`, "#ef4444");
                    }
                    fallbackCard.revealed = true;
                }
            }
        }
    }
    return true;
}

function executeBotRounds() {
    for (let bot = 1; bot <= 3; bot++) {
        if (!state.active || state.lives <= 0) break;
        executeSingleTurn(bot);
        checkGameState();
        renderTracker(); renderBoard(); updateToolsState();
    }
    const myActiveCards = state.matrix[0].filter(c => !c.cut).length;
    if (myActiveCards === 0 && state.active && state.lives > 0) {
        const remainingGlobal = Object.values(state.inventory).reduce((acc, curr) => acc + (curr.inDeckCount - curr.cut), 0);
        if (remainingGlobal > 0) {
            log("Atril del jugador completado. Los compañeros resuelven la mesa...", "#facc15");
            setTimeout(executeBotRounds, 1200);
        }
    }
}

function runSimulations(iterations = 100) {
    console.log(`🚀 Iniciando simulación de ${iterations} partidas en Modo ${state.gameMode}...`);
    let wins = 0; let losses = 0;
    const originalLog = log; log = function () { };
    const originalRenderBoard = renderBoard; renderBoard = function () { };
    const originalRenderTracker = renderTracker; renderTracker = function () { };
    const originalUpdateToolsState = updateToolsState; updateToolsState = function () { };
    const originalSaveFinishedGame = saveFinishedGame; saveFinishedGame = function () { };

    for (let i = 0; i < iterations; i++) {
        initGame();
        const p1Hand = state.matrix[0].filter(c => !c.isYellow && !c.isRed);
        const randomClue = p1Hand[Math.floor(Math.random() * p1Hand.length)];
        randomClue.clue = true; randomClue.revealed = true; state.initialClueSelected = true;

        let safetyCounter = 0;
        while (state.active && safetyCounter < 500) {
            safetyCounter++;
            for (let bot = 0; bot <= 3; bot++) {
                if (!state.active || state.lives <= 0) break;
                executeSingleTurn(bot);
                checkGameState();
            }
        }
        if (state.lives > 0) wins++; else losses++;
    }

    log = originalLog; renderBoard = originalRenderBoard; renderTracker = originalRenderTracker;
    updateToolsState = originalUpdateToolsState; saveFinishedGame = originalSaveFinishedGame;
    const winRate = ((wins / iterations) * 100).toFixed(1);
    console.log(`📊 RESULTADOS (${iterations} PARTIDAS): ✅ ${wins} | ❌ ${losses} | 🏆 Win Rate: ${winRate}%`);
}
window.onload = () => document.getElementById('game-container').style.display = 'none';