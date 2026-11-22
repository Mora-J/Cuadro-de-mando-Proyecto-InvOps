/**
 * CENTRO DE MANDO OPERACIONAL - OPTIMIZACIÓN AGROPECUARIA QUINTERO DA SILVA
 * Motor Simplex Paso a Paso y Solucionador Paramétrico en Tiempo Real
 * Universidad Católica Andrés Bello - Escuela de Ingeniería Informática
 */

const SOLVER = (function() {
  
  /**
   * Generador de pasos Simplex para visualización pedagógica en tiempo real
   * Método de Dos Fases / Gran M con las 7 variables originales del problema:
   * x_v, x_g, x_s, x_m, x_t, x_ip, x_vo
   * Convención académica: Se transforma el problema a MINIMIZACIÓN de (-Z)
   * Forma canónica: (-Z) + sum(c_j * x_j) = -baseConst
   * Columna del Lado Derecho: LD
   * Columna de Test de la Razón Mínima: TMR
   * Variables de holgura: s_1 .. s_7, variables artificiales: t_1, t_2
   */
  function generateSimplexSteps(modelType = 'model1') {
    const varNames = ['x_v', 'x_g', 'x_s', 'x_m', 'x_t', 'x_{ip}', 'x_{vo}'];
    const slackNames = ['s_1', 's_2', 's_3', 's_4', 's_5', 's_6', 's_7'];
    const artNames = ['t_1', 't_2'];
    const colNames = ['(-Z)', ...varNames, ...slackNames, ...artNames, 'LD'];
    const totalCols = colNames.length;

    // 9 Restricciones del Modelo Canónico Completo:
    const rows = [
      // 1: s1: 2*xv + xs + xm + xt + s1 = 580 (Tierra disponible: 640 - 60 pasto base)
      { basic: 's_1', coeffs: { 'x_v': 2, 'x_s': 1, 'x_m': 1, 'x_t': 1, 's_1': 1 }, rhs: 580 },
      // 2: s2: 1500*xv + 3*xg + s2 = 20000 (Fondo disponible de inversión)
      { basic: 's_2', coeffs: { 'x_v': 1500, 'x_g': 3, 's_2': 1 }, rhs: 20000 },
      // 3: xip: 60*xv + 0.30*xg + 1.0*xs + 0.9*xm + 0.6*xt + xip = 1600 (MO Invierno-Primavera)
      { basic: 'x_{ip}', coeffs: { 'x_v': 60, 'x_g': 0.30, 'x_s': 1.0, 'x_m': 0.9, 'x_t': 0.6, 'x_{ip}': 1 }, rhs: 1600 },
      // 4: xvo: 60*xv + 0.30*xg + 1.4*xs + 1.2*xm + 0.7*xt + xvo = 2100 (MO Verano-Otoño)
      { basic: 'x_{vo}', coeffs: { 'x_v': 60, 'x_g': 0.30, 'x_s': 1.4, 'x_m': 1.2, 'x_t': 0.7, 'x_{vo}': 1 }, rhs: 2100 },
      // 5: s3: xv + s3 = 12 (Capacidad del granero lechero)
      { basic: 's_3', coeffs: { 'x_v': 1, 's_3': 1 }, rhs: 12 },
      // 6: s4: xg + s4 = 3000 (Capacidad del gallinero)
      { basic: 's_4', coeffs: { 'x_g': 1, 's_4': 1 }, rhs: 3000 },
      // 7: s5: xs + s5 = 450 (Cota agronómica máxima para soya)
      { basic: 's_5', coeffs: { 'x_s': 1, 's_5': 1 }, rhs: 450 },
      // 8: t1: -xv + xm - s6 + t1 = 30 (Alimento maíz mínimo: xm >= 30 + xv)
      { basic: 't_1', coeffs: { 'x_v': -1, 'x_m': 1, 's_6': -1, 't_1': 1 }, rhs: 30 },
      // 9: t2: -0.05*xg + xt - s7 + t2 = 100 (Alimento trigo mínimo: xt >= 100 + 0.05*xg)
      { basic: 't_2', coeffs: { 'x_g': -0.05, 'x_t': 1, 's_7': -1, 't_2': 1 }, rhs: 100 }
    ];

    const m = rows.length;
    const basicVars = rows.map(r => r.basic);
    const matrix = [];

    for (let i = 0; i < m; i++) {
      const row = new Array(totalCols).fill(0);
      const r = rows[i];
      for (const [v, val] of Object.entries(r.coeffs)) {
        row[colNames.indexOf(v)] = val;
      }
      row[totalCols - 1] = r.rhs;
      matrix.push(row);
    }

    // Coeficientes de la función objetivo según el modelo seleccionado:
    let c_s, c_m, c_t, c_v = 700.0, c_g = 3.50, c_ip = 5.0, c_vo = 5.50, baseConst = 49250.0;
    let title = "";

    if (modelType === 'model1') {
      title = "Modelo 1: Buen Clima (Escenario Ideal)";
      c_s = 70.0; c_m = 60.0; c_t = 40.0;
    } else if (modelType === 'model3') {
      title = "Modelo 3: Valor Esperado";
      c_s = 34.0; c_m = 27.50; c_t = 20.75;
    } else if (modelType === 'sequia') {
      title = "Modelo 2.1: Sequía Severa (Resiliencia)";
      c_s = -10.0; c_m = -15.0; c_t = 0.0;
    } else {
      return generateSimplexSteps('model1');
    }

    // Fila 0 de la función objetivo: Minimizar (-Z) = -baseConst - sum(c_j * x_j)
    // Forma canónica: (-Z) + sum(c_j * x_j) = -baseConst
    const zRow = new Array(totalCols).fill(0);
    zRow[0] = 1;
    zRow[colNames.indexOf('x_v')] = c_v;
    zRow[colNames.indexOf('x_g')] = c_g;
    zRow[colNames.indexOf('x_s')] = c_s;
    zRow[colNames.indexOf('x_m')] = c_m;
    zRow[colNames.indexOf('x_t')] = c_t;
    zRow[colNames.indexOf('x_{ip}')] = c_ip;
    zRow[colNames.indexOf('x_{vo}')] = c_vo;
    zRow[totalCols - 1] = -baseConst;

    // Snapshot del tableau numérico
    function getTableauSnapshot() {
      return [
        zRow.map(x => Number(x.toFixed(4))),
        ...matrix.map(r => r.map(x => Number(x.toFixed(4))))
      ];
    }

    // Valores físicos de las 7 variables de decisión
    function getSolution() {
      const sol = { xv: 0, xg: 0, xs: 0, xm: 0, xt: 0, xip: 0, xvo: 0 };
      for (let i = 0; i < m; i++) {
        const bVar = basicVars[i];
        const val = matrix[i][totalCols - 1];
        if (bVar === 'x_v') sol.xv = val;
        else if (bVar === 'x_g') sol.xg = val;
        else if (bVar === 'x_s') sol.xs = val;
        else if (bVar === 'x_m') sol.xm = val;
        else if (bVar === 'x_t') sol.xt = val;
        else if (bVar === 'x_{ip}') sol.xip = val;
        else if (bVar === 'x_{vo}') sol.xvo = val;
      }
      return sol;
    }

    // Pivote Gauss-Jordan completo
    function fullPivot(pRow, pCol) {
      const pVal = matrix[pRow][pCol];
      for (let j = 0; j < totalCols; j++) matrix[pRow][j] /= pVal;
      matrix[pRow][pCol] = 1.0;

      for (let i = 0; i < m; i++) {
        if (i !== pRow) {
          const factor = matrix[i][pCol];
          if (Math.abs(factor) > 1e-9) {
            for (let j = 0; j < totalCols; j++) {
              matrix[i][j] -= factor * matrix[pRow][j];
            }
            matrix[i][pCol] = 0.0;
          }
        }
      }

      const zFactor = zRow[pCol];
      if (Math.abs(zFactor) > 1e-9) {
        for (let j = 0; j < totalCols; j++) {
          zRow[j] -= zFactor * matrix[pRow][j];
        }
        zRow[pCol] = 0.0;
      }

      basicVars[pRow] = colNames[pCol];
    }

    const steps = [];

    function recordStep(iterNum, enteringCol, leavingRow, pivotVal, minRatio, msg, status, detailMsg, phaseName) {
      const sol = getSolution();
      const negZ = zRow[totalCols - 1];
      const currentZ = -negZ;

      steps.push({
        iteration: iterNum,
        phase: phaseName,
        tableau: getTableauSnapshot(),
        colNames: [...colNames],
        basicVars: [...basicVars],
        enteringCol,
        enteringVar: enteringCol !== null ? colNames[enteringCol] : null,
        leavingRow,
        leavingVar: leavingRow !== null ? basicVars[leavingRow] : null,
        pivotVal,
        minRatio,
        currentNegZ: negZ,
        currentZ: Math.max(0, currentZ),
        sol,
        message: msg,
        detailMessage: detailMsg,
        status
      });
    }

    // Canonicalización inicial de fila (-Z) respecto a las variables básicas iniciales (x_ip, x_vo)
    for (let i = 0; i < m; i++) {
      const bVar = basicVars[i];
      const bCol = colNames.indexOf(bVar);
      const factor = zRow[bCol];
      if (Math.abs(factor) > 1e-9) {
        for (let j = 0; j < totalCols; j++) {
          zRow[j] -= factor * matrix[i][j];
        }
        zRow[bCol] = 0;
      }
    }

    // PASO 0: Inicio de Fase 1
    recordStep(
      0, colNames.indexOf('x_m'), 7, 1.0, 30.0,
      "Fase 1 (Inicio): Planteamiento Canónico con Variables Artificiales",
      "initial",
      `Se formula el sistema completo con las 7 variables de decisión, holguras $s_1 \\dots s_7$ y variables artificiales $t_1, t_2$ para satisfacer los requerimientos mínimos de alimentación animal. En la <strong>Fase 1</strong> se eliminan las variables artificiales para acceder a la región factible. El pivote inicial entra en $x_m$ para reemplazar $t_1$.`,
      "Fase 1"
    );

    // PASO 1: Fase 1 (Paso 1) - xm entra, sale t1 (fila índice 7)
    fullPivot(7, colNames.indexOf('x_m'));
    recordStep(
      1, colNames.indexOf('x_t'), 8, 1.0, 100.0,
      "Fase 1 (Paso 1): Eliminación de la Variable Artificial t_1 (Maíz Mínimo)",
      "iterating",
      `Entra la variable de cultivo <strong>$x_m$</strong> al valor de $\\text{LD} = 30\\text{ acres}$ para alimentar a las 30 vacas iniciales. Sale la variable artificial <strong>$t_1$</strong> quedando en 0. Siguiente pivote: entra $x_t$ para expulsar $t_2$.`,
      "Fase 1"
    );

    // PASO 2: Fase 1 (Paso 2) - xt entra, sale t2 (fila índice 8)
    fullPivot(8, colNames.indexOf('x_t'));
    recordStep(
      2, null, null, null, null,
      "Fin de Fase 1: Base Factible Alcanzada (Inicio de Fase 2)",
      "iterating",
      `Las variables artificiales han sido eliminadas ($t_1=0, t_2=0$). Se alcanza una <strong>Solución Básica Factible (SBF)</strong> real con $x_m = 30\\text{ ac}$, $x_t = 100\\text{ ac}$ y $450\\text{ ac}$ libres de tierra arable. El beneficio del estado base es $Z = ${(-zRow[totalCols - 1]).toLocaleString('es-ES', { minimumFractionDigits: 2 })}\\text{ u.m.}$ Iniciamos la <strong>Fase 2 de Optimización</strong>.`,
      "Fase 2"
    );

    // ITERACIONES DE FASE 2:
    let iter = 2;
    const maxIter = 12;

    while (iter < maxIter) {
      iter++;
      // Regla de entrada: coeficiente MÁS POSITIVO en fila (-Z), ignorando artificiales
      let maxVal = 1e-5;
      let enteringCol = null;

      for (let j = 1; j < totalCols - 1; j++) {
        const cName = colNames[j];
        if (!cName.startsWith('t_') && zRow[j] > maxVal) {
          maxVal = zRow[j];
          enteringCol = j;
        }
      }

      if (enteringCol === null) {
        const last = steps[steps.length - 1];
        last.status = 'optimal';
        last.message = `¡Solución Óptima Alcanzada en el Paso ${iter - 1}!`;
        last.detailMessage = `Todos los coeficientes de las variables no básicas en la fila $(-Z)$ son $\\le 0$. Condición de optimalidad de minimización cumplida. En la columna <strong>LD</strong>: $(-Z)^* = -${last.currentZ.toLocaleString('es-ES', { minimumFractionDigits: 2 })}\\text{ u.m.}$, recuperando el beneficio óptimo patrimonial: $$Z^* = -(-Z)^* = \\mathbf{+${last.currentZ.toLocaleString('es-ES', { minimumFractionDigits: 2 })}\\text{ u.m.}}$$`;
        break;
      }

      // Test de la Razón Mínima (TMR)
      let minRatio = Infinity;
      let leavingRow = null;
      for (let i = 0; i < m; i++) {
        const a = matrix[i][enteringCol];
        const ld = matrix[i][totalCols - 1];
        if (a > 1e-7) {
          const ratio = ld / a;
          if (ratio < minRatio) {
            minRatio = ratio;
            leavingRow = i;
          }
        }
      }

      if (leavingRow === null) {
        recordStep(iter, enteringCol, null, null, null, "Problema no acotado", "unbounded", "Función objetivo no acotada.", "Fase 2");
        break;
      }

      const pivotVal = matrix[leavingRow][enteringCol];
      const entName = colNames[enteringCol];
      const lvgName = basicVars[leavingRow];

      // Registrar pivote en el paso previo para mostrar celda pivote en amarillo
      steps[steps.length - 1].enteringCol = enteringCol;
      steps[steps.length - 1].enteringVar = entName;
      steps[steps.length - 1].leavingRow = leavingRow;
      steps[steps.length - 1].leavingVar = lvgName;
      steps[steps.length - 1].pivotVal = pivotVal;
      steps[steps.length - 1].minRatio = minRatio;

      // Ejecutar pivote Gauss-Jordan
      fullPivot(leavingRow, enteringCol);

      let planDesc = "";
      if (entName === 'x_v') {
        planDesc = `Se adquieren vacas lecheras adicionales hasta copar el granero (Plan C Defensivo).`;
      } else if (entName === 'x_s') {
        planDesc = `Se siembra soya comercial ocupando toda la tierra arable disponible (Plan B Recomendado).`;
      } else if (entName === 's_3') {
        planDesc = `Se sustituye la inversión ganadera para expandir la soya al tope agronómico de 450 acres (Plan A Óptimo Global).`;
      } else if (entName === 'x_g') {
        planDesc = `Se incorporan gallinas de postura aprovechando la holgura de capital (Óptimo Sequía).`;
      }

      const stepMsg = `Paso ${iter} (Fase 2): Entra ${entName} y sale ${lvgName}.`;
      const detailMsg = `Variable entrante: <strong>${entName}</strong> (coeficiente en fila $(-Z)$: +${maxVal.toFixed(2)}). <strong>TMR:</strong> $\\min \\{ \\text{LD}_i / a_{ik} \\} = ${minRatio.toFixed(2)}$, dictado por la fila de <strong>${lvgName}</strong>. Elemento pivote = ${pivotVal.toFixed(4)}. ${planDesc}`;

      recordStep(iter, null, null, null, null, stepMsg, 'iterating', detailMsg, "Fase 2");
    }

    const finalStep = steps[steps.length - 1];
    finalStep.status = 'optimal';

    return {
      modelType,
      config: { title, varNames, colNames, totalCols },
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
