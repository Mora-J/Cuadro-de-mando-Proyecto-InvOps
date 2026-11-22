/**
 * CENTRO DE MANDO OPERACIONAL - OPTIMIZACIÓN AGROPECUARIA QUINTERO DA SILVA
 * Datos Maestros del Proyecto y Parámetros del Sistema
 * Universidad Católica Andrés Bello - Escuela de Ingeniería Informática
 */

const APP_DATA = {
  meta: {
    institution: "Universidad Católica Andrés Bello",
    faculty: "Facultad de Ingeniería",
    school: "Escuela de Ingeniería Informática",
    course: "Investigación de Operaciones",
    author: "Jesús Mora",
    professor: "Prof. José Luis Quintero",
    client: "Administración Agrícola Quintero Da Silva",
    location: "Caracas, Venezuela",
    version: "2.5.0"
  },

  // Parámetros base del enunciado
  baseParameters: {
    totalLandAcres: 640.0,
    baseCows: 30,
    baseHens: 2000,
    initialFund: 20000.0,
    laborHoursWinterSpring: 4000.0,
    laborHoursSummerAutumn: 4500.0,
    fixedLaborInternal: 2400.0, // 30 vacas * 40h + 2000 gallinas * 0.60h = 1200 + 1200 = 2400 h-p por semestre
    externalWageWinterSpring: 5.0, // u.m./h-p
    externalWageSummerAutumn: 5.5, // u.m./h-p
    baseFixedWealth: 49250.0, // u.m. constante
    maxBarnCapacityNewCows: 12, // 42 total - 30 actuales
    maxCoopCapacityNewHens: 3000, // 5000 total - 2000 actuales
    maxSoyAcres: 450.0,
    cowPastureAcres: 2.0, // acres de pasto por vaca
    cowCornAcresFeed: 1.0, // acre de maiz para autoconsumo por vaca
    henWheatAcresFeed: 0.05, // acre de trigo para autoconsumo por gallina
    cowNetIncomePerYear: 700.0, // u.m./vaca
    henNetIncomePerYear: 3.50, // u.m./gallina
    cowInvestmentCost: 1500.0, // u.m./vaca
    henInvestmentCost: 3.0 // u.m./gallina
  },

  // 6 Escenarios climáticos históricos (Tabla 2 y 3)
  scenarios: [
    {
      id: "buen_clima",
      name: "1. Buen Clima (Favorable)",
      shortName: "Buen Clima",
      prob: 0.40,
      soyPrice: 70.0,
      cornPrice: 60.0,
      wheatPrice: 40.0,
      optimalZ: 99367.0,
      color: "#1b4d3e", // Verde bosque
      optimalVars: { xv: 0, xg: 0, xs: 450.0, xm: 30.0, xt: 100.0, xip: 1063.0, xvo: 1364.0 },
      description: "Condición agronómica ideal. Toda la tierra arable libre se destina a soya comercial; la ganadería se mantiene en el plantel base."
    },
    {
      id: "sequia",
      name: "2.1 Sequía Severa",
      shortName: "Sequía",
      prob: 0.20,
      soyPrice: -10.0,
      cornPrice: -15.0,
      wheatPrice: 0.0,
      optimalZ: 67863.80,
      color: "#c0392b", // Rojo quemado
      optimalVars: { xv: 12, xg: 666, xs: 0.0, xm: 42.0, xt: 133.3, xip: 1598.91, xvo: 799.44 },
      description: "Déficit hídrico crítico. Se suspende la siembra comercial; se satura el establo con 12 vacas lecheras para blindar los ingresos."
    },
    {
      id: "inundacion",
      name: "2.2 Inundación Pluvial",
      shortName: "Inundación",
      prob: 0.10,
      soyPrice: 15.0,
      cornPrice: 20.0,
      wheatPrice: 10.0,
      optimalZ: 74055.02,
      color: "#2980b9", // Azul lluvia
      optimalVars: { xv: 12, xg: 666, xs: 0.0, xm: 422.7, xt: 133.3, xip: 799.44, xvo: 799.44 },
      description: "Exceso hídrico moderado. El maíz resiste mejor que la soya; se combina ganadería lechera máxima con maíz comercial."
    },
    {
      id: "helada",
      name: "2.3 Helada Temprana",
      shortName: "Helada Temp.",
      prob: 0.15,
      soyPrice: 50.0,
      cornPrice: 40.0,
      wheatPrice: 30.0,
      optimalZ: 88767.0,
      color: "#8e44ad", // Violeta frío
      optimalVars: { xv: 0, xg: 0, xs: 450.0, xm: 30.0, xt: 100.0, xip: 1063.0, xvo: 1364.0 },
      description: "Descenso térmico prematuro con merma parcial de rendimientos. La soya sigue siendo la mejor opción económica."
    },
    {
      id: "sequia_helada",
      name: "2.4 Sequía y Helada Temprana",
      shortName: "Sequía+Helada",
      prob: 0.10,
      soyPrice: -15.0,
      cornPrice: -20.0,
      wheatPrice: -10.0,
      optimalZ: 66648.80,
      color: "#7f1d1d", // Granate oscuro
      optimalVars: { xv: 12, xg: 0, xs: 0.0, xm: 42.0, xt: 100.0, xip: 2041.8, xvo: 1048.2 },
      description: "El peor escenario posible (catástrofe agronómica combinada). Se dejan 414 acres en barbecho y se maximiza el ganado vacuno."
    },
    {
      id: "inundacion_helada",
      name: "2.5 Inundación y Helada Temprana",
      shortName: "Inund.+Helada",
      prob: 0.05,
      soyPrice: 10.0,
      cornPrice: 10.0,
      wheatPrice: 5.0,
      optimalZ: 69836.80,
      color: "#34495e", // Pizarra húmedo
      optimalVars: { xv: 7, xg: 3000, xs: 0.0, xm: 37.0, xt: 250.0, xip: 657.3, xvo: 657.3 },
      description: "Combinación de frío y anegamiento. La avicultura llega a su tope físico (3,000 gallinas) junto a 7 vacas lecheras."
    }
  ],

  // Modelo 3: Valores Esperados
  expectedModel: {
    expectedSoyPrice: 34.0,
    expectedCornPrice: 27.50,
    expectedWheatPrice: 20.75,
    optimalZ: 80537.0,
    optimalVars: {
      xv: 12,
      xg: 0,
      xs: 414.0,
      xm: 42.0,
      xt: 100.0,
      xip: 368.20,
      xvo: 680.00
    },
    decomposition: [
      { concept: "Patrimonio Base Consolidado", amount: 49250.0, pct: 61.15, color: "#1b2a4a" },
      { concept: "Cultivo de Soya (414 ac × 34 u.m.)", amount: 14076.0, pct: 17.48, color: "#2e7d32" },
      { concept: "Ganado Vacuno Adicional (12 vacas × 700 u.m.)", amount: 8400.0, pct: 10.43, color: "#1565c0" },
      { concept: "Jornales Familiares Externos (Inv-Prim + Ver-Oto)", amount: 5581.0, pct: 6.93, color: "#e65100" },
      { concept: "Cultivo de Trigo Autoconsumo (100 ac × 20.75 u.m.)", amount: 2075.0, pct: 2.58, color: "#f9a825" },
      { concept: "Cultivo de Maíz Autoconsumo (42 ac × 27.50 u.m.)", amount: 1155.0, pct: 1.43, color: "#00838f" }
    ]
  },

  // Matriz de Pagos de los 3 Planes Estratégicos (Tabla 4.2)
  payoffMatrix: [
    {
      scenarioId: "buen_clima",
      prob: 0.40,
      planA: 99367.0,
      planB: 98731.0,
      planC: 75008.80,
      diffBvsA: -636.0
    },
    {
      scenarioId: "sequia",
      prob: 0.20,
      planA: 57117.0,
      planB: 58461.0,
      planC: 67858.80,
      diffBvsA: +1344.0
    },
    {
      scenarioId: "inundacion",
      prob: 0.10,
      planA: 70417.0,
      planB: 71281.0,
      planC: 70328.80,
      diffBvsA: +864.0
    },
    {
      scenarioId: "helada",
      prob: 0.15,
      planA: 88767.0,
      planB: 88611.0,
      planC: 73168.80,
      diffBvsA: -156.0
    },
    {
      scenarioId: "sequia_helada",
      prob: 0.10,
      planA: 53717.0,
      planB: 55181.0,
      planC: 66648.80,
      diffBvsA: +1464.0
    },
    {
      scenarioId: "inundacion_helada",
      prob: 0.05,
      planA: 67367.0,
      planB: 68291.0,
      planC: 69408.80,
      diffBvsA: +924.0
    }
  ],

  // Resumen consolidado de los 3 planes
  plansSummary: {
    planA: {
      name: "Plan A (Optimista / Especialización Agrícola)",
      tag: "MaxiMax",
      expectedZ: 80267.0,
      minZ: 53717.0,
      maxZ: 99367.0,
      cows: 0,
      hens: 0,
      soyAcres: 450.0,
      cornAcres: 30.0,
      wheatAcres: 100.0,
      idleAcres: 0.0,
      strategy: "Apuesta integral al buen clima. Máximo potencial monetario pero vulnerable ante sequía severa.",
      recommendation: "Elegir únicamente si el inversionista es amante del riesgo o si cuenta con coberturas de seguros agrícolas paramétricos que aseguren el piso de ingreso."
    },
    planB: {
      name: "Plan B (Recomendado / Óptimo de Valor Esperado)",
      tag: "Recomendado",
      expectedZ: 80537.0,
      minZ: 55181.0,
      maxZ: 98731.0,
      cows: 12,
      hens: 0,
      soyAcres: 414.0,
      cornAcres: 42.0,
      wheatAcres: 100.0,
      idleAcres: 0.0,
      strategy: "Diversificación equilibrada: copa el establo con 12 vacas lecheras y siembra soya en la tierra restante.",
      recommendation: "Es la decisión racional óptima bajo el criterio del valor esperado. Maximiza la riqueza esperada a mediano y largo plazo (+270 u.m. vs Plan A)."
    },
    planC: {
      name: "Plan C (Defensivo / Cobertura Ganadera)",
      tag: "MaxiMin",
      expectedZ: 71718.80,
      minZ: 66648.80,
      maxZ: 75008.80,
      cows: 12,
      hens: 0,
      soyAcres: 0.0,
      cornAcres: 42.0,
      wheatAcres: 100.0,
      idleAcres: 414.0,
      strategy: "Cobertura total: cero riesgo en cultivos comerciales; solo siembra grano para autoconsumo animal y deja 414 acres en reserva.",
      recommendation: "Elegir si la familia enfrenta aversión severa al riesgo, deudas impostergables de corto plazo o pronósticos confirmados de sequía devastadora."
    }
  },

  // EVPI (Valor Esperado de la Información Perfecta)
  evpi: {
    expectedWithForecast: 84196.83,
    expectedWithoutForecast: 80537.0,
    evpiValue: 3659.83,
    explanation: "El valor de 3,659.83 u.m. representa el límite superior estricto que la Administración Agrícola Quintero Da Silva debe pagar por un servicio meteorológico de pronóstico 100% confiable."
  }
};

// Exportar globalmente para browsers
if (typeof window !== "undefined") {
  window.APP_DATA = APP_DATA;
}

// Exportar para Node.js si aplica
if (typeof module !== "undefined" && module.exports) {
  module.exports = APP_DATA;
}
