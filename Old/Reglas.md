# 💣 Contexto y Especificación Técnica: Cazabombas (Bomb Busters)

## 1. Visión General del Juego
Juego cooperativo de deducción lógica basado en el juego de mesa *Bomb Busters* (Cazabombas).
- **Jugadores:** 4 participantes (P1: Humano, P2: Mateo [IA], P3: Valentina [IA], P4: Lucas [IA]).
- **Vidas del equipo:** 3 vidas base (❤️❤️❤️). Al tercer error la bomba detona.
- **Condición de Victoria:** Desactivar/cortar todos los cables seguros de la mesa.
- **Condición de Derrota:** Perder todas las vidas por cortes fallidos.

---

## 2. Matriz Matemática e Inmutabilidad
- **Mazo cerrado e inmutable (52 cables en total):**
  - **48 cables estándar:** Valores del 1 al 12, exactamente 4 copias de cada número.
  - **4 cables amarillos (.5):** Dos parejas decimales (ej. dos cables `3.5🟡` y dos cables `8.5🟡`, o `4.5🟡` y `9.5🟡`).
- **Reparto:** 13 cables por jugador (Posiciones `A` a la `M`).
- **Orden estricto:** Cada atril se ordena de forma ascendente estricta de izquierda a derecha (A $\rightarrow$ M). Si hay números repetidos en un atril, quedan adyacentes.

---

## 3. Dinámica de Turno y Reglas de Corte
1. **Pistas Iniciales Voluntarias:** Al comenzar la partida, cada jugador/IA revela voluntariamente 1 posición de su atril colocando una ficha visible pública.
2. **Acción de Corte en Turno:**
   - El jugador activo señala una posición de un compañero e indica un número.
   - **Restricción obligatoria:** Solo se puede nombrar un número si el jugador activo posee al menos una copia activa en su propio atril.
3. **Resolución del Corte:**
   - **Acierto:** El compañero revela y descarta su cable; el jugador activo también descarta su copia correspondiente (corte de a pares). El contador de cortes del número sube +2.
   - **Fallo:** Se descuenta 1 vida (❤️) y la posición señalada del compañero se revela públicamente con ficha de información.
4. **Cables Amarillos (.5):**
   - No se pueden cortar de forma estándar con números enteros.
   - Requieren corte simultáneo cuando dos jugadores señalan o combinan la pareja decimal exacta.

---

## 4. Equipamiento y Herramientas
- **🔍 Detector Dual:**
  - Disponible desde el inicio con usos limitados (1 o 2 cargas).
  - Permite preguntar si una posición oculta es uno de 2 números adyacentes (ej: "¿Es 4 o 5?").
  - Si acierta uno, se confirma sin perder vidas. Consume el turno.
- **Cartas de Herramientas de Desbloqueo (1 uso cada una al completar cuartetos 4/4):**
  - **🔧 Alicates de Precisión:** Permite realizar 1 intento de corte sin perder vidas si falla.
  - **📡 Escáner de Frecuencia:** Pregunta a un compañero la cantidad exacta de un número que posee en su atril.
  - **🔀 Intercambio Seguro:** Permite colocar una ficha de pista visible extra sobre el propio atril a mitad de partida.

---

## 5. Lógica de Deducción de los Bots (IA Sin Trampa)
Los bots (Mateo, Valentina y Lucas) no leen la matriz oculta privada; deducen como humanos siguiendo esta prioridad:
1. **Prioridad 1 (Pista Visible Directa):** Si el bot tiene en su mano un número que otro jugador tiene visible como pista o error revelado, lo corta directamente.
2. **Prioridad 2 (Cartas Atrapadas / Rango Estrecho):** Si una posición oculta de otro jugador está encerrada entre dos números consecutivos o con un único valor posible disponible en el inventario global, deduce y corta ese número.
3. **Prioridad 3 (Extremos y Amarillos):** Deducción de cartas más bajas (Posición A = 1) o más altas (Posición M = 12), o parejas amarillas aisladas.
4. **Obligatoriedad:** Toda IA debe ejecutar una acción legal por turno (corte o herramienta).

---

## 6. Control de Integridad y Auditoría Global
- **Tope de inventario:** Cada número estándar no puede superar 4 cortes ni existir en más de 4 copias en total.
- **No duplicación fantasma:** Al cortar el último par (4/4), si a algún jugador le quedaba una copia huérfana por error, se limpia automáticamente.