/**
 * CENTRO DE MANDO OPERACIONAL - OPTIMIZACIÓN AGROPECUARIA QUINTERO DA SILVA
 * Motor Simplex Paso a Paso y Solucionador Paramétrico en Tiempo Real
 * Universidad Católica Andrés Bello - Escuela de Ingeniería Informática
 */

const SOLVER = (function() {
  
  /**
   * Generador de pasos Simplex para visualización pedagógica en tiempo real
   * Convención académica: Se transforma el problema a MINIMIZACIÓN de (-Z)
   * Forma canónica: (-Z) + sum(c_j * x_j) = -baseZ
   * Columna del Lado Derecho: LD
   * Columna de Test de la Razón Mínima: TMR
   * Variables de holgura: s, variables artificiales: t
   */
  function generateSimplexSteps(modelType = 'model1') {
    let config;

    if (modelType === 'model1') {
      // Modelo 1: Buen Clima
      config = {
        title: "Modelo 1: Buen Clima (Escenario Ideal)",
        varNames: ['x_s', 'y_m', 'y_t', 'x_v', 'x_g'],
        colLabels: ['Soya (x_s)', 'Maíz Exc. (y_m)', 'Trigo Exc. (y_t)', 'Vacas (x_v)', 'Gallinas (x_g)'],
        c: [57.30, 48.90, 33.15, 118.90, 2.0075],
        A: [
          [1.0, 1.0, 1.0, 3.0, 0.05],   // s_1: Tierra arable libre <= 450
          [0.0, 0.0, 0.0, 1500.0, 3.0], // s_2: Fondo capital <= 20000
          [0.0, 0.0, 0.0, 1.0, 0.0],    // s_3: Establo vacas <= 12
          [0.0, 0.0, 0.0, 0.0, 1.0],    // s_4: Gallinero <= 3000
          [1.0, 0.0, 0.0, 0.0, 0.0]     // s_5: Cota agronómica soya <= 450
        ],
        b: [450.0, 20000.0, 12.0, 3000.0, 450.0],
        baseZ: 73582.0,
        fixedCorn: 30.0,
        fixedWheat: 100.0,
        optimalZ: 99367.0
      };
    } else if (modelType === 'model3') {
      // Modelo 3: Valor Esperado
      config = {
        title: "Modelo 3: Valor Esperado",
        varNames: ['x_v', 'x_s', 'y_m', 'y_t', 'x_g'],
        colLabels: ['Vacas (x_v)', 'Soya (x_s)', 'Maíz Exc. (y_m)', 'Trigo Exc. (y_t)', 'Gallinas (x_g)'],
        c: [86.40, 21.30, 16.40, 13.90, 1.045],
        A: [
          [3.0, 1.0, 1.0, 1.0, 0.05],   // s_1: Tierra libre <= 450
          [1500.0, 0.0, 0.0, 0.0, 3.0], // s_2: Fondo capital <= 20000
          [1.0, 0.0, 0.0, 0.0, 0.0],    // s_3: Establo vacas <= 12
          [0.0, 0.0, 0.0, 0.0, 1.0],    // s_4: Gallinero <= 3000
          [0.0, 1.0, 0.0, 0.0, 0.0]     // s_5: Cota soya <= 450
        ],
        b: [450.0, 20000.0, 12.0, 3000.0, 450.0],
        baseZ: 70682.0,
        fixedCorn: 30.0,
        fixedWheat: 100.0,
        optimalZ: 80537.0
      };
    } else if (modelType === 'sequia') {
      // Modelo 2.1: Sequía Severa
      config = {
        title: "Modelo 2.1: Sequía Severa (Resiliencia)",
        varNames: ['x_v', 'x_g', 'y_m', 'x_s', 'y_t'],
        colLabels: ['Vacas (x_v)', 'Gallinas (x_g)', 'Maíz Exc. (y_m)', 'Soya (x_s)', 'Trigo Exc. (y_t)'],
        c: [43.90, 0.0075, -26.10, -22.70, -6.85],
        A: [
          [3.0, 0.05, 1.0, 1.0, 1.0],
          [1500.0, 3.0, 0.0, 0.0, 0.0],
          [1.0, 0.0, 0.0, 0.0, 0.0],
          [0.0, 1.0, 0.0, 0.0, 0.0],
          [0.0, 0.0, 0.0, 1.0, 0.0]
        ],
        b: [450.0, 20000.0, 12.0, 3000.0, 450.0],
        baseZ: 67337.0,
        fixedCorn: 30.0,
        fixedWheat: 100.0,
        optimalZ: 67863.80
      };
    } else {
      return generateSimplexSteps('model1');
    }

    const { varNames, colLabels, c, A, b, baseZ, fixedCorn, fixedWheat } = config;
    const m = A.length;
    const n = c.length;

    // Nomenclatura del Tableau:
    // Columna 0: (-Z) (Función objetivo en convención de MINIMIZACIÓN)
    // Columnas de variables de decisión: x_s, etc.
    // Columnas de holgura: s_1 .. s_m (variables artificiales t si aplicaran)
    // Columna de Lado Derecho: LD
    const colNames = ['(-Z)', ...varNames];
    for (let i = 0; i < m; i++) colNames.push(`s_${i + 1}`);
    colNames.push('LD');

    const totalCols = colNames.length;
    const tableau = [];

    // Fila 0: Forma canónica de minimización:
    // Maximizar Z = baseZ + sum(c_j * x_j) <=> Minimizar (-Z) = -baseZ - sum(c_j * x_j)
    // Ecuación canónica: (-Z) + sum(c_j * x_j) = -baseZ
    // En la fila 0, los coeficientes de las variables son +c[j] y en LD es -baseZ
    const zRow = new Array(totalCols).fill(0);
    zRow[0] = 1;
    for (let j = 0; j < n; j++) {
      zRow[1 + j] = c[j]; // POSITIVO para la ecuación canónica de minimización
    }
    zRow[totalCols - 1] = -baseZ; // Valor inicial de (-Z) en LD
    tableau.push(zRow);

    // Filas de restricciones (1..m)
    const basicVars = [];
    for (let i = 0; i < m; i++) {
      const row = new Array(totalCols).fill(0);
      row[0] = 0;
      for (let j = 0; j < n; j++) row[1 + j] = A[i][j];
      row[1 + n + i] = 1.0; // variable de holgura s_i
      row[totalCols - 1] = b[i]; // Lado Derecho LD
      tableau.push(row);
      basicVars.push(`s_${i + 1}`);
    }

    const steps = [];

    // Función auxiliar para registrar cada iteración
    function recordStep(iterNum, enteringCol, leavingRow, pivotVal, minRatio, msg, status, detailMsg) {
      const tabCopy = tableau.map(r => [...r]);
      const basicCopy = [...basicVars];
      const negZ = tableau[0][totalCols - 1]; // valor de (-Z) en la columna LD
      const currentZ = -negZ; // Riqueza maximizada Z = -(-Z)

      // Variables físicas del problema
      const sol = {};
      varNames.forEach(v => sol[v] = 0);
      for (let i = 0; i < m; i++) {
        const bVar = basicVars[i];
        if (varNames.includes(bVar)) {
          sol[bVar] = tableau[i + 1][totalCols - 1];
        }
      }

      const xv = sol['x_v'] || 0;
      const xg = sol['x_g'] || 0;
      const xs = sol['x_s'] || 0;
      const ym = sol['y_m'] || 0;
      const yt = sol['y_t'] || 0;
      const xm = fixedCorn + xv + ym;
      const xt = fixedWheat + 0.05 * xg + yt;

      const xip = Math.max(0, 1600.0 - (60.0 * xv + 0.30 * xg + 1.0 * xs + 0.9 * xm + 0.6 * xt));
      const xvo = Math.max(0, 2100.0 - (60.0 * xv + 0.30 * xg + 1.4 * xs + 1.2 * xm + 0.7 * xt));

      steps.push({
        iteration: iterNum,
        tableau: tabCopy,
        colNames: [...colNames],
        basicVars: basicCopy,
        enteringCol,
        enteringVar: enteringCol !== null ? colNames[enteringCol] : null,
        leavingRow,
        leavingVar: leavingRow !== null ? basicVars[leavingRow] : null,
        pivotVal,
        minRatio,
        currentNegZ: negZ,
        currentZ: currentZ,
        sol: { xv, xg, xs, xm, xt, xip, xvo, ym, yt },
        message: msg,
        detailMessage: detailMsg,
        status // 'initial', 'iterating', 'optimal'
      });
    }

    // Paso 0: Estado Base Inicial
    recordStep(
      0, null, null, null, null,
      "Solución Básica Factible Inicial (Estado Base)",
      "initial",
      `Por convención académica, el modelo se formula como <strong>Minimizar $(-Z)$</strong>: $(-Z) + \\sum c_j x_j = -${baseZ.toLocaleString('es-ES', { minimumFractionDigits: 2 })}.\\text{ u.m.}$ Actividades adicionales en cero ($x_v=0, x_g=0, x_s=0$). En LD: $(-Z) = -${baseZ.toLocaleString('es-ES', { minimumFractionDigits: 2 })}\\text{ u.m.}$, equivalente a un beneficio inicial de $Z = +${baseZ.toLocaleString('es-ES', { minimumFractionDigits: 2 })}\\text{ u.m.}$`
    );

    let iteration = 0;
    const maxIter = 15;

    while (iteration < maxIter) {
      iteration++;

      // 1. Regla de selección para MINIMIZAR (-Z):
      // Entra la variable con el coeficiente MÁS POSITIVO en la fila (-Z), pues al aumentar esa variable se reduce (-Z)
      let maxVal = 1e-6;
      let enteringCol = null;

      for (let j = 1; j < totalCols - 1; j++) {
        if (tableau[0][j] > maxVal) {
          maxVal = tableau[0][j];
          enteringCol = j;
        }
      }

      // Si no hay coeficientes positivos en fila (-Z), se alcanzó el óptimo de minimización
      if (enteringCol === null) {
        steps[steps.length - 1].status = 'optimal';
        steps[steps.length - 1].message = `¡Solución Óptima Alcanzada en la Iteración ${iteration - 1}!`;
        steps[steps.length - 1].detailMessage = `Todos los coeficientes de la fila $(-Z)$ son $\\le 0$. Condición de parada de minimización satisfecha con éxito. En la columna <strong>LD</strong>: $(-Z)^* = -${steps[steps.length - 1].currentZ.toLocaleString('es-ES', { minimumFractionDigits: 2 })}\\text{ u.m.}$, recuperando el beneficio óptimo patrimonial maximizado: $$Z^* = -(-Z)^* = \\mathbf{+${steps[steps.length - 1].currentZ.toLocaleString('es-ES', { minimumFractionDigits: 2 })}\\text{ u.m.}}$$`;
        break;
      }

      // 2. Test de la Razón Mínima (TMR) para encontrar la variable saliente
      let minRatio = Infinity;
      let leavingRow = null;

      for (let i = 0; i < m; i++) {
        const a_ij = tableau[i + 1][enteringCol];
        const ld = tableau[i + 1][totalCols - 1]; // Lado Derecho LD
        if (a_ij > 1e-7) {
          const ratio = ld / a_ij;
          if (ratio < minRatio) {
            minRatio = ratio;
            leavingRow = i;
          }
        }
      }

      if (leavingRow === null) {
        recordStep(iteration, enteringCol, null, null, null, "Problema no acotado", "unbounded", "La función objetivo decrece indefinidamente.");
        break;
      }

      const pivotVal = tableau[leavingRow + 1][enteringCol];
      const entName = colNames[enteringCol];
      const lvgName = basicVars[leavingRow];

      const stepMsg = `Iteración ${iteration}: Entra ${entName} y sale ${lvgName}.`;
      const detailMsg = `Variable entrante: <strong>${entName}</strong> (mayor tasa de reducción de $(-Z)$: +${maxVal.toFixed(2)}). <strong>TMR (Test de la Razón Mínima):</strong> $\\text{TMR} = \\min \\{ \\text{LD}_i / a_{ik} \\} = ${minRatio.toFixed(2)}$, dictada por la fila de <strong>${lvgName}</strong>. Elemento pivote = ${pivotVal.toFixed(4)}.`;

      // 3. Operaciones elementales de Gauss-Jordan
      // Normalizar la fila pivote
      for (let j = 0; j < totalCols; j++) {
        tableau[leavingRow + 1][j] /= pivotVal;
      }
      tableau[leavingRow + 1][enteringCol] = 1.0;

      // Anular la columna pivote en las demás filas
      for (let i = 0; i <= m; i++) {
        if (i !== leavingRow + 1) {
          const factor = tableau[i][enteringCol];
          if (Math.abs(factor) > 1e-9) {
            for (let j = 0; j < totalCols; j++) {
              tableau[i][j] -= factor * tableau[leavingRow + 1][j];
            }
            tableau[i][enteringCol] = 0.0;
          }
        }
      }

      basicVars[leavingRow] = entName;
      recordStep(iteration, enteringCol, leavingRow, pivotVal, minRatio, stepMsg, 'iterating', detailMsg);
    }

    const lastStep = steps[steps.length - 1];
    if (lastStep && lastStep.status !== 'unbounded') {
      lastStep.status = 'optimal';
    }

    return {
      modelType,
      config,
      steps
    };
  }

  /**
   * Solucionador Paramétrico Ultrarrápido para el Laboratorio What-If
   */
  function solveWhatIf({ probs, fund = 20000, barnCap = 12, soyBase = 70, cornBase = 60, wheatBase = 40 }) {
    const rawSum = probs.reduce((a, b) => a + b, 0);
    const p = rawSum > 0 ? probs.map(v => v / rawSum) : [0.4, 0.2, 0.1, 0.15, 0.1, 0.05];

    const soyP = [soyBase, -10.0, 15.0, 50.0, -15.0, 10.0];
    const cornP = [cornBase, -15.0, 20.0, 40.0, -20.0, 10.0];
    const wheatP = [wheatBase, 0.0, 10.0, 30.0, -10.0, 5.0];

    let E_cs = 0, E_cm = 0, E_ct = 0;
    for (let i = 0; i < 6; i++) {
      E_cs += p[i] * soyP[i];
      E_cm += p[i] * cornP[i];
      E_ct += p[i] * wheatP[i];
    }

    const laborCostSoy = 1.0 * 5.0 + 1.4 * 5.5;   // 12.70 u.m./ac
    const laborCostCorn = 0.9 * 5.0 + 1.2 * 5.5;  // 11.10 u.m./ac
    const laborCostWheat = 0.6 * 5.0 + 0.7 * 5.5; // 6.85 u.m./ac
    const laborCostCow = 60.0 * 5.0 + 60.0 * 5.5; // 630.00 u.m./vaca

    const netSoy = E_cs - laborCostSoy;
    const netCorn = E_cm - laborCostCorn;
    const netWheat = E_ct - laborCostWheat;
    const netCowDirect = 700.0 - laborCostCow;
    
    const cowPackageMargin = netCowDirect + netCorn;
    const cowLandReq = 3.0;
    const freeLand = 450.0;
    const cowVsSoyAdvantage = cowPackageMargin - cowLandReq * netSoy;

    const maxCowsByFund = Math.floor(fund / 1500.0);
    const maxCowsByBarn = barnCap;
    const maxCowsByLand = Math.floor(freeLand / cowLandReq);
    const maxPossibleCows = Math.max(0, Math.min(maxCowsByFund, maxCowsByBarn, maxCowsByLand));

    let xv = 0;
    if (cowVsSoyAdvantage > 0 && cowPackageMargin > 0) {
      xv = maxPossibleCows;
    } else if (netSoy < 0 && cowPackageMargin > 0) {
      xv = maxPossibleCows;
    } else {
      xv = 0;
    }

    const landUsedByCows = xv * cowLandReq;
    const landLeftForSoy = Math.max(0, freeLand - landUsedByCows);

    let xs = 0;
    if (netSoy > 0) {
      xs = Math.min(landLeftForSoy, 450.0);
    }

    const xm = 30.0 + xv;
    const xt = 100.0;

    const xip = Math.max(0, 1600.0 - (60.0 * xv + 1.0 * xs + 0.9 * xm + 0.6 * xt));
    const xvo = Math.max(0, 2100.0 - (60.0 * xv + 1.4 * xs + 1.2 * xm + 0.7 * xt));

    const baseFixedZ = 49250.0 + E_cm * 30.0 + E_ct * 100.0 +
      5.0 * (1600.0 - 0.9 * 30.0 - 0.6 * 100.0) +
      5.5 * (2100.0 - 1.2 * 30.0 - 0.7 * 100.0);

    const totalZ = baseFixedZ + xv * cowPackageMargin + xs * netSoy;

    const basePasture = 60.0;
    const newPasture = xv * 2.0;
    const totalCornLand = xm;
    const totalWheatLand = xt;
    const totalSoyLand = xs;
    const totalUsedLand = basePasture + newPasture + totalCornLand + totalWheatLand + totalSoyLand;
    const idleLand = Math.max(0, 640.0 - totalUsedLand);

    let matchingPlan = "Personalizado";
    if (xv === 0 && xs === 450.0) matchingPlan = "Plan A (Optimista)";
    else if (xv === 12 && xs === 414.0) matchingPlan = "Plan B (Recomendado)";
    else if (xv === 12 && xs === 0.0) matchingPlan = "Plan C (Defensivo)";

    return {
      normalizedProbs: p,
      expectedPrices: { soy: E_cs, corn: E_cm, wheat: E_ct },
      netMargins: { soy: netSoy, corn: netCorn, wheat: netWheat, cowPackage: cowPackageMargin },
      cowVsSoyAdvantage,
      decisionVars: { xv, xg: 0, xs, xm, xt, xip, xvo },
      landAllocation: {
        total: 640.0,
        pasture: basePasture + newPasture,
        soy: totalSoyLand,
        corn: totalCornLand,
        wheat: totalWheatLand,
        idle: idleLand
      },
      capitalUsage: {
        invested: xv * 1500.0,
        fundRemaining: fund - (xv * 1500.0),
        fundTotal: fund
      },
      totalZ,
      deltaVsBase: totalZ - 80537.0,
      matchingPlan
    };
  }

  /**
   * Consolidación de Criterios de Decisión en los 3 Planes Fundamentales
   */
  function evaluateDecisionCriteria() {
    const matrix = APP_DATA.payoffMatrix;
    const p = matrix.map(m => m.prob);

    const payoffsA = matrix.map(m => m.planA);
    const payoffsB = matrix.map(m => m.planB);
    const payoffsC = matrix.map(m => m.planC);

    const maxA = Math.max(...payoffsA);
    const maxB = Math.max(...payoffsB);
    const maxC = Math.max(...payoffsC);

    const minA = Math.min(...payoffsA);
    const minB = Math.min(...payoffsB);
    const minC = Math.min(...payoffsC);

    const bayesA = payoffsA.reduce((sum, val, idx) => sum + val * p[idx], 0);
    const bayesB = payoffsB.reduce((sum, val, idx) => sum + val * p[idx], 0);
    const bayesC = payoffsC.reduce((sum, val, idx) => sum + val * p[idx], 0);

    const laplaceA = payoffsA.reduce((a, b) => a + b, 0) / 6.0;
    const laplaceB = payoffsB.reduce((a, b) => a + b, 0) / 6.0;
    const laplaceC = payoffsC.reduce((a, b) => a + b, 0) / 6.0;

    return {
      planA: { name: "Plan A", tag: "Optimista / MaxiMax", maxVal: maxA, minVal: minA, expectedVal: bayesA, laplaceVal: laplaceA },
      planB: { name: "Plan B", tag: "Recomendado / Valor Esperado", maxVal: maxB, minVal: minB, expectedVal: bayesB, laplaceVal: laplaceB },
      planC: { name: "Plan C", tag: "Defensivo / MaxiMin", maxVal: maxC, minVal: minC, expectedVal: bayesC, laplaceVal: laplaceC }
    };
  }

  return {
    generateSimplexSteps,
    solveWhatIf,
    evaluateDecisionCriteria
  };
})();

// Exportar globalmente
if (typeof window !== "undefined") {
  window.SOLVER = SOLVER;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SOLVER;
}
