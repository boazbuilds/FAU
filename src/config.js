// Eén plek voor alle afstembare knoppen. Pas hier aan; de rest leest hieruit.
export const CONFIG = {
  // --- Spaced repetition (Leitner) ---
  intervals: { 1: 0, 2: 1, 3: 3, 4: 7, 5: 16 }, // dagen tot volgende beurt per box
  maxBox: 5,
  historyCap: 10,

  // --- Sessie ---
  sessionLength: 12,
  newPerSession: 5,
  lessonLength: 10, // max vragen per les-sessie (wisselende selectie uit grote lessen)

  // --- Kennis-Blitz (getimede modus: zoveel mogelijk goed tegen de klok) ---
  blitz: {
    seconds: 60, // duur van een ronde
    timeBonusSec: 4, // tijd erbij per goed antwoord
    wrongPenaltySec: 0, // (optioneel) tijd eraf bij fout; 0 = geen straf
    poolSize: 50, // ruime pool zodat de klok eerder op is dan de vragen
    pointsPerCorrect: 10, // basispunten per goed antwoord (los van XP)
    comboStep: 2 // extra punten per goed-op-rij (combo × step)
  },

  // --- Levens (mild) ---
  maxHearts: 5,
  heartRegenHours: 2,

  // --- XP ---
  xpPerCorrect: 10,
  difficultyMultiplier: { 1: 1, 2: 1.5, 3: 2 },
  partialXpFactor: 0.5,
  perfectSessionBonus: 20,
  firstSessionOfDayBonus: 15,

  // --- Dagdoel-opties (XP per dag) ---
  dailyGoals: [
    { id: 'casual', label: 'Rustig', xp: 30 },
    { id: 'regular', label: 'Normaal', xp: 50 },
    { id: 'serious', label: 'Serieus', xp: 80 },
    { id: 'intense', label: 'Intens', xp: 120 }
  ],
  defaultDailyGoalXp: 50,

  // --- Leerpad / Boss ---
  path: {
    bossPassRatio: 0.8, // correct/answered nodig om de boss te halen
    bossLength: 12, // aantal vragen in een boss (wisselende subset uit de modulepool)
    bossBonusXp: 60, // bonus bij gehaalde boss
    bossCostsHearts: false, // mild: boss tornt niet aan levens
    star2Ratio: 0.8, // ≥80% in een les = 2 sterren
    star3Ratio: 1.0 // 100% = 3 sterren (1 ster = afgerond)
  },

  // --- Sjef Delegé onderbreekt af en toe met een gedelegeerde vraag (met klok) ---
  sjef: { chance: 0.22, maxPerSession: 3, seconds: 15, bonusXp: 15 },

  // --- Snelheidsbonus: vlot goed antwoorden = extra XP (geen straf voor traag) ---
  speedBonus: { withinMs: 12000, xp: 5 },

  // --- Content ---
  content: {
    earlyUnlockModules: ['m0', 'm7', 'lt3'], // (m0/m7 = gearchiveerd, fixtures) + lt3-pilot meteen open
    moduleWeightOverrides: { m7: 0 } // techniek telt niet mee in slaagkans
  },

  // --- Online-klaar (nu nog lokaal) ---
  online: {
    enabled: false,
    weeklyLeaderboard: true
  },

  // --- "Ga ik slagen?"-voorspelling ---
  predict: {
    S0: 0.6, // vaardigheid die ~ "net slagen" benadert
    k: 8, // steilheid van de logistische curve
    prior: 0.35, // beheersing van een nog onbekend onderwerp
    pseudoCount: 5, // blending naar de prior bij weinig data
    expAccuracy: 0.5, // exponenten van m = A^a · R^r · C^c
    expRetention: 0.3,
    expCoverage: 0.2,
    minAttemptsForNumber: 15, // daaronder: geen percentage tonen
    confidenceAttempts: 150, // pogingen voor "volle" confidence
    bandMax: 0.18 // maximale halve bandbreedte bij 0 confidence
  },

  masteryTarget: 0.8 // doelbeheersing voor "oefen dit als eerste"
};
