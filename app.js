/**
 * CENTRO DE MANDO OPERACIONAL - OPTIMIZACIÓN AGROPECUARIA QUINTERO DA SILVA
 * Controlador Principal de la Aplicación Web (UI, Animaciones y Gráficos)
 * Universidad Católica Andrés Bello - Escuela de Ingeniería Informática
 */

document.addEventListener("DOMContentLoaded", function () {
  // Inicializar KaTeX si está disponible
  if (typeof renderMathInElement === "function") {
    renderMathInElement(document.body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false }
      ],
      throwOnError: false
    });
  }

  // ==========================================================================
  // 1. GESTOR DE PESTAÑAS (TAB NAVIGATION)
  // ==========================================================================
  const tabButtons = document.querySelectorAll(".nav-tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");

      tabButtons.forEach(b => b.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add("active");
      }

      // Re-renderizar o redimensionar gráficos de Chart.js al cambiar de pestaña
      window.dispatchEvent(new Event("resize"));
      if (typeof renderMathInElement === "function") {
        renderMathInElement(targetPane, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false }
          ],
          throwOnError: false
        });
      }
    });
  });

  // ==========================================================================
  // 2. SIMULADOR SIMPLEX EN VIVO (CONVENCIÓN DE MINIMIZACIÓN DE -Z)
  // ==========================================================================
  const SimplexApp = (function () {
    let currentModel = "model1";
    let simData = null;
    let currentStepIndex = 0;
    let isPlaying = false;
    let timerId = null;
    let speedMs = 1200;

    let convergenceChart = null;

    // Elementos DOM
    const modelSelect = document.getElementById("simplex-model-select");
    const btnPlay = document.getElementById("btn-simplex-play");
    const btnPause = document.getElementById("btn-simplex-pause");
    const btnNext = document.getElementById("btn-simplex-next");
    const btnPrev = document.getElementById("btn-simplex-prev");
    const btnAccelerate = document.getElementById("btn-simplex-accelerate");
    const btnReset = document.getElementById("btn-simplex-reset");
    const speedSelect = document.getElementById("simplex-speed-select");
    const stepBadge = document.getElementById("simplex-step-badge");
    const statusBadge = document.getElementById("simplex-status-badge");
    const tableauContainer = document.getElementById("simplex-tableau-container");
    const logTitle = document.getElementById("simplex-log-title");
    const logText = document.getElementById("simplex-log-text");

    // Métricas en vivo
    const mZ = document.getElementById("m-val-z");
    const mXv = document.getElementById("m-val-xv");
    const mXg = document.getElementById("m-val-xg");
    const mXs = document.getElementById("m-val-xs");
    const mXm = document.getElementById("m-val-xm");
    const mXt = document.getElementById("m-val-xt");
    const mXip = document.getElementById("m-val-xip");
    const mXvo = document.getElementById("m-val-xvo");

    function initChart() {
      const ctx = document.getElementById("chart-convergence").getContext("2d");
      convergenceChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: ["Paso 0"],
          datasets: [{
            label: "Patrimonio Z (u.m.)",
            data: [0],
            borderColor: "#0070F3",
            backgroundColor: "rgba(0, 112, 243, 0.12)",
            borderWidth: 3,
            fill: true,
            tension: 0.25,
            pointBackgroundColor: "#0070F3",
            pointRadius: 6,
            pointHoverRadius: 9
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 350 },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  return `Z = ${ctx.parsed.y.toLocaleString("es-ES", { minimumFractionDigits: 2 })} u.m.`;
                }
              }
            }
          },
          scales: {
            y: {
              ticks: {
                callback: val => val.toLocaleString("es-ES") + " u.m."
              },
              grid: { color: "#E2E8F0" }
            },
            x: {
              grid: { display: false }
            }
          }
        }
      });
    }

    function loadModel(modelKey) {
      pause();
      currentModel = modelKey;
      simData = SOLVER.generateSimplexSteps(modelKey);
      currentStepIndex = 0;
      renderStep(currentStepIndex);
    }

    function renderStep(idx) {
      if (!simData || !simData.steps || idx >= simData.steps.length) return;
      const step = simData.steps[idx];
      const totalSteps = simData.steps.length;

      // 1. Actualizar Badge de Pasos y Estado
      stepBadge.textContent = `Iteración ${step.iteration} (${idx + 1} de ${totalSteps})`;
      if (step.status === "initial") {
        statusBadge.textContent = "Estado Base";
        statusBadge.className = "badge kpi-badge-amber";
      } else if (step.status === "optimal") {
        statusBadge.textContent = "Óptimo Alcanzado ✓";
        statusBadge.className = "badge kpi-badge-green";
      } else {
        statusBadge.textContent = "Pivotando...";
        statusBadge.className = "badge kpi-badge-blue";
      }

      // 2. Actualizar Métricas en Vivo
      if (mZ) mZ.textContent = step.currentZ.toLocaleString("es-ES", { minimumFractionDigits: 2 }) + " u.m.";
      if (mXv) mXv.textContent = step.sol.xv;
      if (mXg) mXg.textContent = step.sol.xg.toLocaleString("es-ES");
      if (mXs) mXs.textContent = step.sol.xs.toFixed(1);
      if (mXm) mXm.textContent = step.sol.xm.toFixed(1);
      if (mXt) mXt.textContent = step.sol.xt.toFixed(1);
      if (mXip) mXip.textContent = step.sol.xip.toFixed(1);
      if (mXvo) mXvo.textContent = step.sol.xvo.toFixed(1);

      // 3. Actualizar Gráfica de Convergencia
      const historyLabels = [];
      const historyData = [];
      const pointColors = [];

      for (let i = 0; i <= idx; i++) {
        const s = simData.steps[i];
        historyLabels.push(`Paso ${s.iteration}`);
        historyData.push(s.currentZ);
        pointColors.push(i === totalSteps - 1 && s.status === "optimal" ? "#10B981" : "#0070F3");
      }

      convergenceChart.data.labels = historyLabels;
      convergenceChart.data.datasets[0].data = historyData;
      convergenceChart.data.datasets[0].pointBackgroundColor = pointColors;
      convergenceChart.update();

      // 4. Renderizar Tableau Simplex con convenciones: (-Z), LD y TMR
      renderTableau(step);

      // 5. Explicación Narrativa
      logTitle.innerHTML = `<span>ℹ️</span> ${step.message}`;
      logText.innerHTML = step.detailMessage;
      if (typeof renderMathInElement === "function") {
        renderMathInElement(logText, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false }
          ],
          throwOnError: false
        });
      }

      // Controlar habilitación de botones
      btnPrev.disabled = idx === 0;
      btnNext.disabled = idx === totalSteps - 1;
    }

    function renderTableau(step) {
      const colNames = step.colNames;
      const tableau = step.tableau;
      const basicVars = step.basicVars;
      const entCol = step.enteringCol;
      const lvgRow = step.leavingRow;

      let html = '<table class="simplex-table"><thead><tr>';
      html += '<th>Base</th>';
      colNames.forEach((col, j) => {
        const isEnt = j === entCol;
        html += `<th class="${isEnt ? 'entering-col' : ''}">${col}${isEnt ? ' ↓' : ''}</th>`;
      });
      html += '<th>TMR</th>';
      html += '</tr></thead><tbody>';

      // Fila 0: Función Objetivo (-Z) en convención de MINIMIZACIÓN
      html += '<tr>';
      html += '<td class="font-bold">(-Z)</td>';
      tableau[0].forEach((val, j) => {
        const isEnt = j === entCol;
        html += `<td class="${isEnt ? 'entering-col' : ''}">${val.toFixed(2)}</td>`;
      });
      html += '<td class="text-center">—</td>';
      html += '</tr>';

      // Filas de Restricciones
      for (let i = 1; i < tableau.length; i++) {
        const rowConstraintIndex = i - 1;
        const isLvg = rowConstraintIndex === lvgRow;
        const basicName = basicVars[rowConstraintIndex];

        html += `<tr class="${isLvg ? 'leaving-row' : ''}">`;
        html += `<td class="font-bold">${basicName}${isLvg ? ' ←' : ''}</td>`;

        for (let j = 0; j < colNames.length; j++) {
          const isEnt = j === entCol;
          const isPivot = isEnt && isLvg;
          const cellClass = isPivot ? 'pivot-cell' : isEnt ? 'entering-col' : '';
          html += `<td class="${cellClass}">${tableau[i][j].toFixed(2)}</td>`;
        }

        // Razón TMR (Lado Derecho / Coeficiente Positivo)
        let ratioText = "—";
        if (entCol !== null && tableau[i][entCol] > 1e-7) {
          const ratio = tableau[i][colNames.length - 1] / tableau[i][entCol];
          ratioText = ratio.toFixed(2);
        }
        html += `<td class="text-right font-bold">${ratioText}</td>`;
        html += '</tr>';
      }

      html += '</tbody></table>';
      tableauContainer.innerHTML = html;
    }

    function play() {
      if (isPlaying) return;
      isPlaying = true;
      btnPlay.style.display = "none";
      btnPause.style.display = "inline-flex";

      timerId = setInterval(() => {
        if (currentStepIndex < simData.steps.length - 1) {
          currentStepIndex++;
          renderStep(currentStepIndex);
        } else {
          pause();
        }
      }, speedMs);
    }

    function pause() {
      isPlaying = false;
      if (timerId) clearInterval(timerId);
      timerId = null;
      btnPlay.style.display = "inline-flex";
      btnPause.style.display = "none";
    }

    function next() {
      pause();
      if (currentStepIndex < simData.steps.length - 1) {
        currentStepIndex++;
        renderStep(currentStepIndex);
      }
    }

    function prev() {
      pause();
      if (currentStepIndex > 0) {
        currentStepIndex--;
        renderStep(currentStepIndex);
      }
    }

    function accelerate() {
      pause();
      if (!simData || !simData.steps) return;
      currentStepIndex = simData.steps.length - 1;
      renderStep(currentStepIndex);
    }

    function reset() {
      pause();
      currentStepIndex = 0;
      renderStep(currentStepIndex);
    }

    function initListeners() {
      modelSelect.addEventListener("change", e => loadModel(e.target.value));
      btnPlay.addEventListener("click", play);
      btnPause.addEventListener("click", pause);
      btnNext.addEventListener("click", next);
      btnPrev.addEventListener("click", prev);
      btnAccelerate.addEventListener("click", accelerate);
      btnReset.addEventListener("click", reset);

      speedSelect.addEventListener("change", e => {
        speedMs = parseInt(e.target.value, 10);
        if (isPlaying) {
          pause();
          play();
        }
      });
    }

    return {
      init: function () {
        initChart();
        initListeners();
        loadModel("model1");
      }
    };
  })();

  // ==========================================================================
  // 3. LABORATORIO WHAT-IF (SENSIBILIDAD DINÁMICA)
  // ==========================================================================
  const WhatIfApp = (function () {
    let landAllocationChart = null;

    const p1 = document.getElementById("slider-p1");
    const p2 = document.getElementById("slider-p2");
    const p3 = document.getElementById("slider-p3");
    const p4 = document.getElementById("slider-p4");
    const p5 = document.getElementById("slider-p5");
    const p6 = document.getElementById("slider-p6");

    const sFund = document.getElementById("slider-fund");
    const sBarn = document.getElementById("slider-barn");
    const sSoyPrice = document.getElementById("slider-soy-price");

    const p1Val = document.getElementById("val-p1");
    const p2Val = document.getElementById("val-p2");
    const p3Val = document.getElementById("val-p3");
    const p4Val = document.getElementById("val-p4");
    const p5Val = document.getElementById("val-p5");
    const p6Val = document.getElementById("val-p6");
    const pSum = document.getElementById("val-psum");

    const fundVal = document.getElementById("val-fund");
    const barnVal = document.getElementById("val-barn");
    const soyVal = document.getElementById("val-soy-price");

    const outZ = document.getElementById("whatif-out-z");
    const outDelta = document.getElementById("whatif-out-delta");
    const outPlan = document.getElementById("whatif-out-plan");
    const outEcs = document.getElementById("whatif-out-ecs");
    const outEcm = document.getElementById("whatif-out-ecm");
    const outEct = document.getElementById("whatif-out-ect");
    const outXv = document.getElementById("whatif-out-xv");
    const outXs = document.getElementById("whatif-out-xs");
    const outXm = document.getElementById("whatif-out-xm");
    const outXt = document.getElementById("whatif-out-xt");
    const outXip = document.getElementById("whatif-out-xip");
    const outXvo = document.getElementById("whatif-out-xvo");
    const outAdvantage = document.getElementById("whatif-out-advantage");

    function initChart() {
      const ctx = document.getElementById("chart-whatif-land").getContext("2d");
      landAllocationChart = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Pastoreo Vacuno", "Cultivo Soya", "Cultivo Maíz", "Cultivo Trigo", "Tierra sin sembrar"],
          datasets: [{
            data: [84, 414, 42, 100, 0],
            backgroundColor: ["#1565C0", "#2E7D32", "#F59E0B", "#F9A825", "#94A3B8"],
            borderWidth: 2,
            borderColor: "#FFFFFF"
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom" },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  return ` ${ctx.label}: ${ctx.parsed.toFixed(1)} acres (${((ctx.parsed / 640) * 100).toFixed(1)}%)`;
                }
              }
            }
          }
        }
      });
    }

    function recompute() {
      const probs = [
        parseFloat(p1.value) / 100,
        parseFloat(p2.value) / 100,
        parseFloat(p3.value) / 100,
        parseFloat(p4.value) / 100,
        parseFloat(p5.value) / 100,
        parseFloat(p6.value) / 100
      ];

      const sumP = probs.reduce((a, b) => a + b, 0) * 100;
      p1Val.textContent = p1.value + "%";
      p2Val.textContent = p2.value + "%";
      p3Val.textContent = p3.value + "%";
      p4Val.textContent = p4.value + "%";
      p5Val.textContent = p5.value + "%";
      p6Val.textContent = p6.value + "%";
      pSum.textContent = sumP.toFixed(0) + "%";
      pSum.style.color = Math.abs(sumP - 100) < 0.1 ? "#10B981" : "#EF4444";

      const fund = parseFloat(sFund.value);
      const barn = parseInt(sBarn.value, 10);
      const soyPrice = parseFloat(sSoyPrice.value);

      fundVal.textContent = fund.toLocaleString("es-ES") + " u.m.";
      barnVal.textContent = barn + " vacas";
      soyVal.textContent = soyPrice.toFixed(0) + " u.m./ac";

      const res = SOLVER.solveWhatIf({
        probs,
        fund,
        barnCap: barn,
        soyBase: soyPrice
      });

      outZ.textContent = res.totalZ.toLocaleString("es-ES", { minimumFractionDigits: 2 }) + " u.m.";
      const deltaSign = res.deltaVsBase >= 0 ? "+" : "";
      outDelta.textContent = `${deltaSign}${res.deltaVsBase.toLocaleString("es-ES", { minimumFractionDigits: 2 })} u.m. vs Histórico`;
      outDelta.className = res.deltaVsBase >= 0 ? "kpi-badge kpi-badge-green" : "kpi-badge kpi-badge-amber";
      outPlan.textContent = res.matchingPlan;

      outEcs.textContent = res.expectedPrices.soy.toFixed(2) + " u.m.";
      outEcm.textContent = res.expectedPrices.corn.toFixed(2) + " u.m.";
      outEct.textContent = res.expectedPrices.wheat.toFixed(2) + " u.m.";

      outXv.textContent = res.decisionVars.xv;
      outXs.textContent = res.decisionVars.xs.toFixed(1);
      outXm.textContent = res.decisionVars.xm.toFixed(1);
      outXt.textContent = res.decisionVars.xt.toFixed(1);
      outXip.textContent = res.decisionVars.xip.toFixed(1);
      outXvo.textContent = res.decisionVars.xvo.toFixed(1);

      if (outAdvantage) {
        outAdvantage.textContent = (res.cowVsSoyAdvantage >= 0 ? "+" : "") + res.cowVsSoyAdvantage.toFixed(2) + " u.m./vaca";
        outAdvantage.style.color = res.cowVsSoyAdvantage >= 0 ? "#10B981" : "#EF4444";
      }

      landAllocationChart.data.datasets[0].data = [
        res.landAllocation.pasture,
        res.landAllocation.soy,
        res.landAllocation.corn,
        res.landAllocation.wheat,
        res.landAllocation.idle
      ];
      landAllocationChart.update();
    }

    function normalizeProbs() {
      const vals = [
        parseFloat(p1.value),
        parseFloat(p2.value),
        parseFloat(p3.value),
        parseFloat(p4.value),
        parseFloat(p5.value),
        parseFloat(p6.value)
      ];
      const sum = vals.reduce((a, b) => a + b, 0);
      if (sum === 0) return;

      const norm = vals.map(v => Math.round((v / sum) * 100));
      const normSum = norm.reduce((a, b) => a + b, 0);
      norm[0] += (100 - normSum);

      p1.value = norm[0];
      p2.value = norm[1];
      p3.value = norm[2];
      p4.value = norm[3];
      p5.value = norm[4];
      p6.value = norm[5];
      recompute();
    }

    function initListeners() {
      [p1, p2, p3, p4, p5, p6, sFund, sBarn, sSoyPrice].forEach(slider => {
        slider.addEventListener("input", recompute);
      });

      const btnNorm = document.getElementById("btn-normalize-probs");
      if (btnNorm) btnNorm.addEventListener("click", normalizeProbs);

      const btnResetWhatif = document.getElementById("btn-reset-whatif");
      if (btnResetWhatif) {
        btnResetWhatif.addEventListener("click", () => {
          p1.value = 40; p2.value = 20; p3.value = 10;
          p4.value = 15; p5.value = 10; p6.value = 5;
          sFund.value = 20000;
          sBarn.value = 12;
          sSoyPrice.value = 70;
          recompute();
        });
      }
    }

    return {
      init: function () {
        initChart();
        initListeners();
        recompute();
      }
    };
  })();

  // ==========================================================================
  // 4. GALERÍA DE GRÁFICAS ANALÍTICAS (CHART.JS)
  // ==========================================================================
  const GalleryApp = (function () {
    function initCharts() {
      // 1. Comparativa de Patrimonio Z*
      const ctxScenarios = document.getElementById("gallery-chart-scenarios");
      if (ctxScenarios) {
        new Chart(ctxScenarios.getContext("2d"), {
          type: "bar",
          data: {
            labels: ["1. Buen Clima", "2.1 Sequía", "2.2 Inundación", "2.3 Helada Temp.", "2.4 Sequía+Helada", "2.5 Inund.+Helada", "3. Valor Esperado"],
            datasets: [{
              label: "Patrimonio Z* (u.m.)",
              data: [99367.0, 67863.80, 74055.02, 88767.0, 66648.80, 69836.80, 80537.0],
              backgroundColor: ["#1B4D3E", "#C0392B", "#2980B9", "#8E44AD", "#7F1D1D", "#34495E", "#0B192C"],
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: ctx => ` Z* = ${ctx.parsed.y.toLocaleString("es-ES", { minimumFractionDigits: 2 })} u.m.`
                }
              }
            },
            scales: {
              y: {
                min: 50000,
                ticks: { callback: v => v.toLocaleString("es-ES") + " u.m." }
              }
            }
          }
        });
      }

      // 2. Uso de la Tierra (640 Acres) apilada
      const ctxLand = document.getElementById("gallery-chart-land");
      if (ctxLand) {
        new Chart(ctxLand.getContext("2d"), {
          type: "bar",
          data: {
            labels: ["1. Buen Clima", "2.1 Sequía", "2.2 Inundación", "2.3 Helada Temp.", "2.4 Sequía+Helada", "2.5 Inund.+Helada", "3. Valor Esperado"],
            datasets: [
              { label: "Soya", data: [450, 0, 0, 450, 0, 0, 414], backgroundColor: "#2E7D32" },
              { label: "Maíz", data: [30, 42, 422.7, 30, 42, 37, 42], backgroundColor: "#F59E0B" },
              { label: "Trigo", data: [100, 133.3, 133.3, 100, 100, 250, 100], backgroundColor: "#F9A825" },
              { label: "Pastoreo", data: [60, 84, 84, 60, 84, 74, 84], backgroundColor: "#1565C0" },
              { label: "Sin sembrar", data: [0, 380.7, 0, 0, 414, 279, 0], backgroundColor: "#94A3B8" }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "top" }
            },
            scales: {
              x: { stacked: true },
              y: { stacked: true, max: 640 }
            }
          }
        });
      }

      // 3. Matriz de Pagos de los Planes A, B, C agrupada
      const ctxPayoffs = document.getElementById("gallery-chart-payoffs");
      if (ctxPayoffs) {
        new Chart(ctxPayoffs.getContext("2d"), {
          type: "bar",
          data: {
            labels: ["Buen Clima", "Sequía", "Inundación", "Helada Temp.", "Sequía+Helada", "Inund.+Helada", "Prom. Esperado"],
            datasets: [
              { label: "Plan A (Optimista)", data: [99367, 57117, 70417, 88767, 53717, 67367, 80267], backgroundColor: "#1B4D3E" },
              { label: "Plan B (Recomendado)", data: [98731, 58461, 71281, 88611, 55181, 68291, 80537], backgroundColor: "#1A5276" },
              { label: "Plan C (Defensivo)", data: [75008.8, 67858.8, 70328.8, 73168.8, 66648.8, 69408.8, 71718.8], backgroundColor: "#B7950B" }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "top" } },
            scales: {
              y: { min: 45000, ticks: { callback: v => v.toLocaleString("es-ES") + " u.m." } }
            }
          }
        });
      }

      // 4. Descomposición del Patrimonio Modelo 3
      const ctxDonut = document.getElementById("gallery-chart-donut");
      if (ctxDonut) {
        new Chart(ctxDonut.getContext("2d"), {
          type: "pie",
          data: {
            labels: [
              "Patrimonio Base Consolidado",
              "Cultivo de Soya (414 ac)",
              "Ganado Vacuno (12 vacas)",
              "Jornales Externos (Inv+Ver)",
              "Cultivo de Trigo (100 ac)",
              "Cultivo de Maíz (42 ac)"
            ],
            datasets: [{
              data: [49250, 14076, 8400, 5581, 2075, 1155],
              backgroundColor: ["#1B2A4A", "#2E7D32", "#1565C0", "#E65100", "#F9A825", "#00838F"]
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "right" },
              tooltip: {
                callbacks: {
                  label: ctx => ` ${ctx.label}: ${ctx.parsed.toLocaleString("es-ES")} u.m. (${((ctx.parsed / 80537) * 100).toFixed(1)}%)`
                }
              }
            }
          }
        });
      }
    }

    return {
      init: initCharts
    };
  })();

  // ==========================================================================
  // INICIALIZACIÓN GLOBAL
  // ==========================================================================
  SimplexApp.init();
  WhatIfApp.init();
  GalleryApp.init();
});
