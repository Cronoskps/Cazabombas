const LETTERS = "ABCDEFGHIJKLM";
const PLAYERS = ["Tu Atril (P1)", "Mateo (IA 2)", "Valentina (IA 3)", "Lucas (IA 4)"];

let state = {
    lives: 3,
    active: true,
    matrix: [[], [], [], []],
    inventory: {},
    dualCharges: 2,
    pliersActive: false,
    initialClueSelected: false,
    pendingTarget: null
};

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
    state.pliersUsed = false;   // Control de 1 solo uso
    state.scannerUsed = false;  // Control de 1 solo uso
    state.initialClueSelected = false;
    state.matrix = [[], [], [], []];
    state.inventory = {};

    for (let i = 1; i <= 12; i++) {
        state.inventory[i] = { total: 4, cut: 0 };
    }
    state.inventory[4.5] = { total: 2, cut: 0, yellow: true };
    state.inventory[9.5] = { total: 2, cut: 0, yellow: true };

    let deck = [];
    for (let i = 1; i <= 12; i++) {
        for (let j = 0; j < 4; j++) {
            deck.push({ value: i, isYellow: false });
        }
    }
    deck.push({ value: 4.5, isYellow: true }, { value: 4.5, isYellow: true });
    deck.push({ value: 9.5, isYellow: true }, { value: 9.5, isYellow: true });
    deck.sort(() => Math.random() - 0.5);

    for (let p = 0; p < 4; p++) {
        let hand = deck.splice(0, 13).map((item, idx) => ({
            ...item,
            cut: false,
            clue: false,
            revealed: p === 0,
            pos: LETTERS[idx]
        }));
        hand.sort((a, b) => a.value - b.value);
        hand.forEach((item, idx) => item.pos = LETTERS[idx]);
        state.matrix[p] = hand;
    }

    // Pistas iniciales de los bots (solo números enteros)
    [1, 2, 3].forEach(botIdx => {
        const standardCards = state.matrix[botIdx].filter(c => !c.isYellow);
        const card = standardCards[Math.floor(Math.random() * standardCards.length)];
        card.clue = true;
        card.revealed = true;
    });

    document.getElementById('terminal').innerHTML = '';
    log("Partida configurada con 52 cables inmutables repartidos.", "#38bdf8");
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
    const values = [1, 2, 3, 4, 4.5, 5, 6, 7, 8, 9, 9.5, 10, 11, 12];
    values.forEach(v => {
        const btn = document.createElement('button');
        btn.className = `keypad-btn ${String(v).includes('.') ? 'yellow-key' : ''}`;
        btn.textContent = String(v).includes('.') ? `${v}🟡` : v;
        btn.onclick = () => submitGuess(v);
        pad.appendChild(btn);
    });
}

function renderTracker() {
    const bar = document.getElementById('tracker-bar');
    bar.innerHTML = '';

    Object.keys(state.inventory).forEach(val => {
        const item = state.inventory[val];
        const div = document.createElement('div');

        const isDone = item.cut === item.total;
        const isPartial = item.cut > 0 && !isDone;

        let statusClass = '';
        if (isDone) {
            statusClass = 'done';
        } else if (isPartial) {
            statusClass = 'partial';
        }

        div.className = `track-item ${statusClass}`;

        // Etiqueta del texto
        const label = item.yellow ? `${val}🟡` : val;
        const checkIcon = isDone ? ' ✅' : '';
        div.textContent = `${label}: ${item.cut}/${item.total}${checkIcon}`;

        bar.appendChild(div);
    });
}

function updateToolsState() {
    const myActiveCards = state.matrix[0].filter(c => !c.cut).length;
    const autoAdvanceBtn = document.getElementById('advance-bots-btn');

    if (myActiveCards === 0 && state.active) {
        autoAdvanceBtn.style.display = 'inline-block';
    } else {
        autoAdvanceBtn.style.display = 'none';
    }

    document.getElementById('dual-charges').textContent = state.dualCharges;
    document.getElementById('dual-detector-btn').disabled = state.dualCharges <= 0 || !state.active || !state.initialClueSelected;
    document.getElementById('self-cut-btn').disabled = !state.active || !state.initialClueSelected || myActiveCards === 0;

    // Habilitar solo si el cuarteto se completó Y no se ha usado todavía
    document.getElementById('pliers-btn').disabled = (state.inventory[5].cut < 4) || state.pliersUsed || !state.active || !state.initialClueSelected;
    document.getElementById('scanner-btn').disabled = (state.inventory[8].cut < 4) || state.scannerUsed || !state.active || !state.initialClueSelected;
}

function renderBoard() {
    const board = document.getElementById('board-container');
    board.innerHTML = '';
    document.getElementById('lives-display').textContent = '❤️'.repeat(Math.max(0, state.lives)) + '💔'.repeat(Math.max(0, 3 - state.lives));

    const myActiveCards = state.matrix[0].filter(c => !c.cut).length;

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
            const showYellow = cable.isYellow && (pIdx === 0 || cable.revealed || cable.cut);

            btn.className = `cable-btn ${showYellow ? 'yellow' : ''} ${isHidden ? 'hidden' : ''} ${cable.cut ? 'cut' : ''} ${cable.clue ? 'clue' : ''}`;

            const posSpan = document.createElement('span');
            posSpan.className = 'pos-label';
            posSpan.textContent = cable.pos;

            const valSpan = document.createElement('span');
            valSpan.textContent = isHidden ? '?' : cable.value + (cable.isYellow ? '🟡' : '');

            btn.appendChild(posSpan);
            btn.appendChild(valSpan);

            if (pIdx === 0) {
                btn.disabled = state.initialClueSelected || cable.cut;
                btn.onclick = () => {
                    if (!state.initialClueSelected) {
                        if (cable.isYellow) {
                            alert("Reglamento: No puedes marcar un cable amarillo (.5🟡) como pista inicial. Elige un número entero.");
                            return;
                        }
                        cable.clue = true;
                        state.initialClueSelected = true;
                        log(`Pista inicial voluntaria fijada en posición ${cable.pos} (${cable.value}).`, "#38bdf8");
                        log("¡Tu turno! Señala un cable compañero o usa tus herramientas.", "#10b981");
                        renderBoard();
                        updateToolsState();
                    }
                };
            } else {
                btn.disabled = !state.active || cable.cut || !state.initialClueSelected || myActiveCards === 0;
                if (!cable.cut) {
                    btn.onclick = () => openCutModal(pIdx, cIdx);
                }
            }

            row.appendChild(btn);
        });

        rack.appendChild(row);
        board.appendChild(rack);
    });
}

function triggerSelfPairCut() {
    if (!state.active || !state.initialClueSelected) return;

    const valInput = prompt("¿Qué número repetido de tu propio atril declaras autocortar? (ej: 1, 2 o 4.5):");
    if (!valInput) return;
    const val = parseFloat(valInput);

    if (!state.inventory[val]) {
        alert("Número no válido.");
        return;
    }

    const activeCopies = state.matrix[0].filter(c => c.value === val && !c.cut);

    if (activeCopies.length < 2) {
        alert(`No tienes suficientes copias activas del ${val} en tu atril para realizar un autocorte.`);
        return;
    }

    // CASO 1: TIENES EL CUARTETO COMPLETO (4 COPIAS EN MANO)
    if (activeCopies.length === 4) {
        activeCopies.forEach(c => c.cut = true);
        state.inventory[val].cut += 4;
        log(`💣 ¡CUARTETO COMPLETO EN MANO! Descartaste tus 4 cables del ${val} simultáneamente (${activeCopies.map(c => c.pos).join(', ')}).`, "#10b981");
    }
    // CASO 2: CABLES AMARILLOS (2 COPIAS = TOTAL)
    else if (state.inventory[val].yellow && activeCopies.length === 2) {
        activeCopies[0].cut = true;
        activeCopies[1].cut = true;
        state.inventory[val].cut += 2;
        log(`✂️ ¡PAREJA AMARILLA DESCARTADA! Descartaste tus dos cables amarillos ${val}🟡 (${activeCopies[0].pos} y ${activeCopies[1].pos}).`, "#10b981");
    }
    // CASO 3: TIENES UNA PAREJA (2 O 3 COPIAS) DE UN NÚMERO ENTERO
    else {
        if (state.inventory[val].cut < 2) {
            alert(`Reglamento: No puedes cortar una pareja propia de ${val} desde cero (0/4) a menos que tengas las 4 copias en tu mano. Primero debe cortarse un par en la mesa mediante interacción.`);
            return;
        }

        activeCopies[0].cut = true;
        activeCopies[1].cut = true;
        state.inventory[val].cut += 2;

        const extraNote = activeCopies.length > 2 ? ` (Conservas 1 copia restante del ${val} en tu atril).` : '';
        log(`✂️ ¡AUTOCORTE EN PAREJA! Descartaste tu pareja de posiciones ${activeCopies[0].pos} y ${activeCopies[1].pos} de valor ${val}.${extraNote}`, "#10b981");
    }

    checkGameState();
    renderTracker();
    renderBoard();
    updateToolsState();

    if (state.active && state.lives > 0) {
        setTimeout(executeBotRounds, 800);
    }
}

function openCutModal(playerIdx, cableIdx) {
    if (!state.active) return;
    state.pendingTarget = { pIdx: playerIdx, cIdx: cableIdx };
    const card = state.matrix[playerIdx][cableIdx];
    document.getElementById('modal-title').textContent = `Declarar valor para posición ${card.pos} (${PLAYERS[playerIdx]})`;
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
        targetCable.cut = true;
        targetCable.revealed = true;
        playerCard.cut = true;
        state.inventory[guess].cut += 2;
    } else {
        if (state.pliersActive) {
            log(`¡Fallo protegido por Alicates! La posición ${targetCable.pos} era ${targetCable.value}. No pierden vidas.`, "#38bdf8");
            state.pliersActive = false;
        } else {
            state.lives--;
            log(`¡FALLO! La posición ${targetCable.pos} de ${PLAYERS[target.pIdx]} era ${targetCable.value}. Pierden 1 vida.`, "#ef4444");
        }
        targetCable.revealed = true;
    }

    checkGameState();
    renderTracker();
    renderBoard();
    updateToolsState();

    if (state.active && state.lives > 0) {
        setTimeout(executeBotRounds, 800);
    }
}

function triggerDualDetector() {
    if (state.dualCharges <= 0 || !state.active || !state.initialClueSelected) return;

    const targetP = prompt("¿A qué compañero aplicar Detector Dual? (2: Mateo, 3: Valentina, 4: Lucas):");
    if (!targetP) return;
    const pIdx = parseInt(targetP) - 1;
    if (![1, 2, 3].includes(pIdx)) return;

    const pos = prompt("Ingresa la letra de la posición a escanear (ej: D):").toUpperCase();
    const card = state.matrix[pIdx].find(c => c.pos === pos && !c.cut);
    if (!card) { alert("Posición no válida o ya cortada."); return; }

    const num1 = parseFloat(prompt("Primer número posible:"));
    const num2 = parseFloat(prompt("Segundo número posible:"));
    if (isNaN(num1) || isNaN(num2)) return;

    state.dualCharges--;

    if (card.value === num1 || card.value === num2) {
        card.clue = true;
        card.revealed = true;
        log(`🔍 Detector Dual: ¡CONFIRMADO! La casilla ${pos} de ${PLAYERS[pIdx]} es ${card.value}.`, "#38bdf8");

        // Si el jugador humano tiene una copia activa del número confirmado, se realiza el corte simultáneo
        const playerMatch = state.matrix[0].find(c => c.value === card.value && !c.cut);
        if (playerMatch) {
            log(`✂️ ¡CORTE SIMULTÁNEO! Coincide con tu posición ${playerMatch.pos} (${playerMatch.value}). Ambos cables descartados.`, "#10b981");
            card.cut = true;
            playerMatch.cut = true;
            state.inventory[card.value].cut += 2;
        }
    } else {
        log(`🔍 Detector Dual: NEGATIVO. La casilla ${pos} de ${PLAYERS[pIdx]} NO es ni ${num1} ni ${num2}.`, "#94a3b8");
    }

    checkGameState();
    renderTracker();
    renderBoard();
    updateToolsState();

    // El uso del detector consume el turno: avanzan los bots
    if (state.active && state.lives > 0) {
        setTimeout(executeBotRounds, 800);
    }
}

function useScanner() {
    if (state.scannerUsed || !state.active || !state.initialClueSelected) return;

    const targetP = parseInt(prompt("¿A quién escanear? (2: Mateo, 3: Valentina, 4: Lucas):")) - 1;
    if (![1, 2, 3].includes(targetP)) return;

    const numInput = prompt("¿Qué número consultar? (ej: 4, 8 o 4.5):");
    if (!numInput) return;
    const num = parseFloat(numInput);

    // Contar cuántas copias activas tiene ese compañero
    const count = state.matrix[targetP].filter(c => c.value === num && !c.cut).length;
    log(`📡 Escáner de Frecuencia usado con ${PLAYERS[targetP]}: tiene ${count} cable(s) activo(s) del número ${num}.`, "#38bdf8");

    // Marcar como gastada (1 solo uso)
    state.scannerUsed = true;
    updateToolsState();

    // Consume la acción completa del turno: avanzan los bots
    if (state.active && state.lives > 0) {
        setTimeout(executeBotRounds, 800);
    }
}

function usePliers() {
    if (state.pliersUsed || !state.active || !state.initialClueSelected) return;
    state.pliersActive = true;
    state.pliersUsed = true;
    log("🔧 Alicates activados: Tu próximo corte fallido no restará vidas.", "#38bdf8");
    updateToolsState();
    // Nota: Los alicates se activan antes de un corte y protegen ese intento, no pasan el turno por sí solos.
}

function executeBotRounds() {
    for (let bot = 1; bot <= 3; bot++) {
        if (!state.active || state.lives <= 0) break;
        const botHand = state.matrix[bot].filter(c => !c.cut);
        if (botHand.length === 0) continue;

        // TÁCTICA AVANZADA: Buscar siempre de derecha a izquierda en la propia mano
        const reversedHand = [...botHand].reverse();
        let executed = false;

        // PRIORIDAD 0: Autocorte de pares o cuartetos propios
        const countByValue = {};
        botHand.forEach(c => countByValue[c.value] = (countByValue[c.value] || 0) + 1);

        for (const valStr in countByValue) {
            const val = parseFloat(valStr);
            const count = countByValue[val];
            const inv = state.inventory[val];

            // Si el bot tiene los 4 en mano, o tiene 2 y los otros 2 ya salieron
            if (count === 4 || (count === 2 && inv.cut === 2)) {
                const cardsToCut = botHand.filter(c => c.value === val);
                const positions = cardsToCut.map(c => c.pos).join(" y ");

                log(`✂️ ¡AUTOCORTE! ${PLAYERS[bot]} descarta automáticamente sus cables de valor ${val} (posiciones ${positions}).`, "#10b981");

                cardsToCut.forEach(c => {
                    c.cut = true;
                    c.revealed = true;
                });

                inv.cut += cardsToCut.length;
                executed = true;
                break;
            }
        }

        // Si ya ejecutó un autocorte, termina su turno y pasa al siguiente bot
        if (executed) {
            checkGameState();
            renderTracker();
            renderBoard();
            updateToolsState();
            continue;
        }

        // PRIORIDAD 1: Pistas visibles públicas legítimas
        for (let myCard of reversedHand) {
            for (let otherP = 0; otherP < 4; otherP++) {
                if (otherP === bot) continue;
                const match = state.matrix[otherP].find(c => !c.cut && (c.clue || (otherP !== 0 && c.revealed)) && c.value === myCard.value);
                if (match) {
                    log(`${PLAYERS[bot]} ve la pista de ${PLAYERS[otherP]} (${match.pos}: ${match.value}) y corta con su ${myCard.pos}.`, "#0284c7");
                    match.cut = true;
                    match.revealed = true;
                    myCard.cut = true;
                    myCard.revealed = true;
                    state.inventory[myCard.value].cut += 2;
                    executed = true;
                    break;
                }
            }
            if (executed) break;
        }

        // PRIORIDAD 2: Uso táctico de herramientas de apoyo
        if (!executed) {
            if (!state.scannerUsed && state.inventory[8] && state.inventory[8].cut === 4) {
                const targetP = (bot + 1) % 4;
                const queryVal = botHand[0].value;
                const count = state.matrix[targetP].filter(c => c.value === queryVal && !c.cut).length;
                state.scannerUsed = true;
                log(`📡 ${PLAYERS[bot]} activa el Escáner de Frecuencia con ${PLAYERS[targetP]}: confirma que tiene ${count} copia(s) del número ${queryVal}.`, "#38bdf8");
                updateToolsState();
                executed = true;
            }
            else if (state.dualCharges > 0) {
                for (let targetOffset = 1; targetOffset < 4; targetOffset++) {
                    const targetP = (bot + targetOffset) % 4;
                    const targetRack = state.matrix[targetP];
                    const hiddenCards = targetRack.filter(c => !c.cut && !c.revealed);

                    for (let targetCard of hiddenCards) {
                        const targetIdx = LETTERS.indexOf(targetCard.pos);

                        let minBound = 1;
                        for (let i = targetIdx - 1; i >= 0; i--) {
                            if (targetRack[i].revealed || targetRack[i].cut) { minBound = targetRack[i].value; break; }
                        }

                        let maxBound = 12;
                        for (let i = targetIdx + 1; i < targetRack.length; i++) {
                            if (targetRack[i].revealed || targetRack[i].cut) { maxBound = targetRack[i].value; break; }
                        }

                        if (maxBound - minBound <= 1.5 && minBound !== maxBound) {
                            state.dualCharges--;
                            const opt1 = minBound;
                            const opt2 = maxBound;

                            if (targetCard.value === opt1 || targetCard.value === opt2) {
                                targetCard.clue = true;
                                targetCard.revealed = true;
                                log(`🔍 ${PLAYERS[bot]} usa Detector Dual sobre ${PLAYERS[targetP]} (${targetCard.pos}) [${opt1} o ${opt2}]: ¡CONFIRMADO! Es ${targetCard.value}.`, "#38bdf8");

                                const botMatch = reversedHand.find(c => c.value === targetCard.value);
                                if (botMatch) {
                                    log(`✂️ ¡Corte simultáneo de ${PLAYERS[bot]} con su ${botMatch.pos} (${botMatch.value})!`, "#10b981");
                                    targetCard.cut = true;
                                    botMatch.cut = true;
                                    state.inventory[targetCard.value].cut += 2;
                                }
                            } else {
                                log(`🔍 ${PLAYERS[bot]} usa Detector Dual sobre ${PLAYERS[targetP]} (${targetCard.pos}) [${opt1} o ${opt2}]: NEGATIVO.`, "#94a3b8");
                            }

                            updateToolsState();
                            executed = true;
                            break;
                        }
                    }
                    if (executed) break;
                }
            }
        }

        // PRIORIDAD 3: Corte obligatorio por heurística de rango y descarte estricto de inventario
        if (!executed) {
            let possibleMoves = [];

            for (let targetOffset = 1; targetOffset < 4; targetOffset++) {
                const targetP = (bot + targetOffset) % 4;
                const targetRack = state.matrix[targetP];
                const hiddenCards = targetRack.filter(c => !c.cut && !c.revealed);

                for (let targetCard of hiddenCards) {
                    const targetIdx = LETTERS.indexOf(targetCard.pos);

                    let minBound = 1;
                    for (let i = targetIdx - 1; i >= 0; i--) {
                        if (targetRack[i].revealed || targetRack[i].cut) { minBound = targetRack[i].value; break; }
                    }

                    let maxBound = 12;
                    for (let i = targetIdx + 1; i < targetRack.length; i++) {
                        if (targetRack[i].revealed || targetRack[i].cut) { maxBound = targetRack[i].value; break; }
                    }

                    const validCandidates = reversedHand.filter(c => {
                        if (c.value < minBound || c.value > maxBound) return false;

                        const inv = state.inventory[c.value];
                        const copiesInMyHand = botHand.filter(h => h.value === c.value).length;
                        const remainingInOtherRacks = inv.total - inv.cut - copiesInMyHand;

                        return remainingInOtherRacks > 0;
                    });

                    const uniqueCandidates = [];
                    const seen = new Set();
                    for (let cand of validCandidates) {
                        if (!seen.has(cand.value)) {
                            seen.add(cand.value);
                            uniqueCandidates.push(cand);
                        }
                    }

                    for (let validCandidate of uniqueCandidates) {
                        possibleMoves.push({
                            targetP,
                            targetCard,
                            validCandidate,
                            minBound,
                            maxBound,
                            rangeWidth: maxBound - minBound
                        });
                    }
                }
            }

            if (possibleMoves.length > 0) {
                possibleMoves.sort((a, b) => a.rangeWidth - b.rangeWidth);
                const bestMove = possibleMoves[0];

                const chosenVal = bestMove.validCandidate.value;
                const targetCard = bestMove.targetCard;
                const targetP = bestMove.targetP;
                const minBound = bestMove.minBound;
                const maxBound = bestMove.maxBound;

                if (bestMove.rangeWidth > 0 && !state.pliersUsed && state.inventory[5] && state.inventory[5].cut === 4) {
                    state.pliersActive = true;
                    state.pliersUsed = true;
                    log(`🔧 ${PLAYERS[bot]} activa los Alicates de Precisión para proteger su intento de corte.`, "#38bdf8");
                    updateToolsState();
                }

                if (targetCard.value === chosenVal) {
                    log(`${PLAYERS[bot]} deduce por rango acotado [${minBound}-${maxBound}] y corta con éxito el ${chosenVal} en ${PLAYERS[targetP]} (${targetCard.pos}).`, "#10b981");
                    targetCard.cut = true;
                    targetCard.revealed = true;
                    bestMove.validCandidate.cut = true;
                    state.inventory[chosenVal].cut += 2;
                } else {
                    if (state.pliersActive) {
                        log(`¡Fallo protegido por Alicates! ${PLAYERS[bot]} probó el ${chosenVal} en ${PLAYERS[targetP]} (${targetCard.pos}) y era un ${targetCard.value}. No pierden vidas.`, "#38bdf8");
                        state.pliersActive = false;
                    } else {
                        state.lives--;
                        log(`${PLAYERS[bot]} dedujo rango [${minBound}-${maxBound}], probó el ${chosenVal} en ${PLAYERS[targetP]} (${targetCard.pos}) y falló. Era un ${targetCard.value}.`, "#ef4444");
                    }
                    targetCard.revealed = true;
                }
                executed = true;
            } else {
                const fallbackCandidate = reversedHand.find(c => c.value === botHand[0].value);
                const fallbackTargetP = (bot + 1) % 4;
                const fallbackCard = state.matrix[fallbackTargetP].find(c => !c.cut && !c.revealed) || state.matrix[fallbackTargetP].find(c => !c.cut);

                if (fallbackCard) {
                    if (fallbackCard.value === fallbackCandidate.value) {
                        log(`${PLAYERS[bot]} arriesga al límite y corta con éxito el ${fallbackCandidate.value} en ${PLAYERS[fallbackTargetP]} (${fallbackCard.pos}).`, "#10b981");
                        fallbackCard.cut = true;
                        fallbackCard.revealed = true;
                        fallbackCandidate.cut = true;
                        state.inventory[fallbackCandidate.value].cut += 2;
                    } else {
                        state.lives--;
                        log(`${PLAYERS[bot]} arriesgó al límite con ${fallbackCandidate.value} en ${PLAYERS[fallbackTargetP]} (${fallbackCard.pos}) y falló. Era un ${fallbackCard.value}.`, "#ef4444");
                        fallbackCard.revealed = true;
                    }
                }
            }
        }

        checkGameState();
        renderTracker();
        renderBoard();
        updateToolsState();
    }

    const myActiveCards = state.matrix[0].filter(c => !c.cut).length;
    if (myActiveCards === 0 && state.active && state.lives > 0) {
        const remainingGlobal = Object.values(state.inventory).reduce((acc, curr) => acc + (curr.total - curr.cut), 0);
        if (remainingGlobal > 0) {
            log("Atril del jugador completado. Los compañeros resuelven la mesa automáticamente...", "#facc15");
            setTimeout(executeBotRounds, 1200);
        }
    }
}

function checkGameState() {
    if (state.lives <= 0) {
        state.active = false;
        log("💥 ¡LA BOMBA HA DETONADO! Fin de la partida.", "#ef4444");
        saveFinishedGame("DERROTA - BOMBA DETONADA"); // <-- Agregado para el Log interno
        return;
    }

    const remaining = Object.values(state.inventory).reduce((acc, curr) => acc + (curr.total - curr.cut), 0);
    if (remaining === 0) {
        state.active = false;
        log("🎉 ¡MISIÓN CUMPLIDA! Todos los cables fueron desactivados.", "#10b981");
        saveFinishedGame("VICTORIA - CABLES COMPLETADOS"); // <-- Agregado
    }
}

window.onload = initGame;

// --- SISTEMA DE LOG INTERNO MULTI-PARTIDA ---
let currentSessionLog = [];

// Interceptor de la función log original para guardar los eventos
const originalLog = log;
log = function (msg, color = "#94a3b8") {
    originalLog(msg, color);
    currentSessionLog.push(`> ${msg}`);
};

// Registrar el inicio de la partida con el reparto inicial de atriles
function recordGameStart() {
    currentSessionLog = [];
    currentSessionLog.push(`=== NUEVA PARTIDA INICIADA ===`);
    currentSessionLog.push(`FECHA: ${new Date().toLocaleTimeString()}`);
    currentSessionLog.push(`REPARTO INICIAL:`);
    PLAYERS.forEach((name, idx) => {
        const handStr = state.matrix[idx].map(c => `${c.pos}:${c.value}${c.isYellow ? '🟡' : ''}`).join(' ');
        currentSessionLog.push(`  ${name}: [ ${handStr} ]`);
    });
    currentSessionLog.push(`--- ACCIONES DE LA PARTIDA ---`);
}

// Guardar la partida finalizada en el historial acumulado
function saveFinishedGame(outcome) {
    currentSessionLog.push(`RESULTADO FINAL: ${outcome}`);
    currentSessionLog.push(`VIDAS RESTANTES: ${state.lives}`);
    currentSessionLog.push(`CABLES CORTADOS:`);
    Object.keys(state.inventory).forEach(k => {
        const item = state.inventory[k];
        currentSessionLog.push(`  ${k}${item.yellow ? '🟡' : ''}: ${item.cut}/${item.total}`);
    });
    currentSessionLog.push(`==========================================\n`);

    // Guardar en localStorage
    let history = JSON.parse(localStorage.getItem('cazabombas_history') || '[]');
    history.push(currentSessionLog.join('\n'));
    localStorage.setItem('cazabombas_history', JSON.stringify(history));
}

// Función para copiar todo el historial consolidado al portapapeles
function exportMatchHistory() {
    const history = JSON.parse(localStorage.getItem('cazabombas_history') || '[]');
    if (history.length === 0) {
        alert("No hay partidas registradas en el historial todavía.");
        return;
    }
    const fullLog = history.join('\n\n');
    navigator.clipboard.writeText(fullLog).then(() => {
        alert(`¡Copiado al portapapeles! Se consolidaron ${history.length} partida(s). Pégalas en el chat.`);
    }).catch(err => {
        console.log(fullLog);
        alert("No se pudo copiar automáticamente al portapapeles. El texto completo se imprimió en la Consola (F12).");
    });
}

// Función para reiniciar el historial cuando quieras empezar una nueva tanda
function clearMatchHistory() {
    if (confirm("¿Deseas borrar todo el historial acumulado de partidas?")) {
        localStorage.removeItem('cazabombas_history');
        alert("Historial borrado.");
    }
}