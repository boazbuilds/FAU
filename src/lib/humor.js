// Nerdy Big Four-accountantshumor + Duolingo-achtige feedback.
// Alles is puur en deterministisch te seeden, zodat het testbaar blijft.

export const MASCOT = { emoji: '🧮', name: 'Plus', role: 'de Rekenmachine' };

// --- Grappen (Big Four / accountancy, mild en zelfspot) ---
export const jokes = [
  'Waarom werd de accountant nooit verliefd? Niemand was materieel genoeg.',
  'Hoe noem je een accountant zonder rekenmachine? Werkloos.',
  'Big Four-stagiair: “Ik heb work-life balance gevonden!” Manager: “Boek je dat onder activa of passiva?”',
  'Waarom staat debet altijd links? Omdat credit altijd gelijk wil hebben.',
  'Een auditor controleert of de koffie écht op is: “Onvoldoende controle-informatie.” En zet nieuwe.',
  'Wat is het lievelingsgetal van een accountant? Eentje dat afrondt op nul.',
  'PwC, EY, KPMG en Deloitte lopen een café binnen. De rekening? Die wordt nog ge-audit.',
  'Waarom slapen accountants slecht in maart? Hoogseizoen — ze tellen geen schaapjes maar journaalposten.',
  'Mijn therapeut zei: laat het verleden los. Mijn accountant zei: niet vóór we de jaarrekening hebben vastgesteld.',
  'Waarom is een accountant zo rustig? Hij weet: alles komt uiteindelijk in balans.',
  'Een goede grap is als een goede afschrijving: je spreidt ’m uit over meerdere jaren.',
  'Hoeveel auditors heb je nodig om een lamp te vervangen? Dat hangt af van de risico-inschatting.',
  'De optimist ziet het glas halfvol, de pessimist halfleeg. De accountant vraagt waar de bon is.',
  'Romantiek volgens een accountant: “Jij bent mijn enige niet-afschrijfbare actief.”',
  'Waarom huilde de balans? Hij voelde zich niet in evenwicht.',
  'Going concern: het idee dat de tent volgend jaar nóg bestaat. Accountants vinden dat optimistisch.',
  'Een controle is een speurtocht waarbij de schat een typefout van € 0,02 blijkt.',
  'Wat zegt een accountant op een begrafenis? “Mijn deelneming.” En hij meent het, 100% geconsolideerd.',
  'Voorzichtigheidsbeginsel: verwacht het ergste en boek het alvast.',
  'Junior: “Het scheelt 1 euro.” Senior: “Boek ’m onder diversen.” Partner: “Welke euro?”',
  'Waarom zijn accountants slecht in verstoppertje? Vroeg of laat worden ze tóch geconsolideerd.',
  'Steekproef: ik proef één hapje en concludeer iets over het hele buffet.',
  'Deadline jaarrekening: het moment waarop slaap een immaterieel actief wordt.',
  'Afschrijven is gewoon volwassen worden: elk jaar wat minder waard, maar nog steeds nuttig.',
  'Interne controle: vertrouwen is goed, het vier-ogenprincipe is beter.',
  'Hoe versier je een accountant? Fluister dat hun werkpapieren “review-proof” zijn.',
  'Materialiteit: als je het verschil niet ziet, was het toch niet belangrijk. Zegt de accountant. Tegen zijn kapper.',
  // --- Iets scherper: Big Four-werkdrukcultuur ---
  'Work-life balance bij de Big Four: je laptop slaapt ook nooit.',
  'Busy season: drie maanden waarin “heel even” vier uur betekent.',
  'Een junior vroeg om vakantie. De partner lachte. Stond ook op de timesheet: 0,2 uur, code “humor”.',
  'Billable hours zijn de enige uren die echt bestaan. De rest is voor mensen die slapen.',
  'Up or out: je groeit, of je groeit ergens anders.',
  '“We zijn een familie”, zei de partner om 23:47 uur, terwijl hij je review terugstuurde.',
  'Mijn timesheet klopt tot op zes minuten nauwkeurig. Mijn privéleven helaas niet.',
  'Het verschil tussen de Big Four? De kleur van het logo en welke deadline je mist.',
  'Verlof opnemen in busy season is als afschrijven op iets wat je nog hard nodig hebt.',
  'De koffie is gratis, want ze weten dat slaap dat niet is.',
  'Een goede consultant lost je probleem op. Een goede auditor bewijst dat je het had.',
  'Vakantie: theoretisch beschikbaar, in de praktijk toegelicht in de notes.'
];

// --- Lof bij een goed antwoord (gevarieerd = verrassend) ---
export const praise = [
  'Balans klopt! ⚖️',
  'Debet = credit. Precies goed. ✅',
  'Materieel correct! 🎯',
  'Goedkeurende verklaring! ✅',
  'Dat telt lekker op. 🧮',
  'Vrij van afwijkingen. 🟢',
  'Reconciliatie geslaagd! 🔗',
  'Sluitend bewijs. 🕵️',
  'Zonder voorbehoud: goed! ✅',
  'Boekhoudkundig briljant. ✨',
  'De partner knikt tevreden. 👔'
];

// --- Troost bij een fout (zacht en grappig) ---
export const consolation = [
  'Afwijking geconstateerd — we herrubriceren even. 🔍',
  'Nog niet in balans, volgende post wordt ’m. 💪',
  'Materiële fout, geen ramp. Doorboeken. 📒',
  'Even een correctieboeking. 🧾',
  'De controle vond een afwijkinkje — leren = afschrijven op je fouten. 📉',
  'Geen goedkeurende verklaring… nog niet. 🙃'
];

// --- Combo-mijlpalen (Duolingo-achtige escalatie) ---
const COMBO_MILESTONES = [
  { n: 3, msg: '3 op rij! Lekker bezig. 🔥' },
  { n: 5, msg: '5 op rij! De partner kijkt tevreden mee. 🔥' },
  { n: 8, msg: '8 op rij! Dit is review-proof. 🔥' },
  { n: 10, msg: '10 op rij! Goedkeurende verklaring incoming. 🔥' },
  { n: 15, msg: '15 op rij! Jij bent de interne controle. 🔥' },
  { n: 20, msg: '20 op rij! Partner-materiaal. 🔥' }
];

// --- Mascotte-quips per context ---
export const mascotLines = {
  pathHints: [
    'Ik heb het doorgerekend: vandaag wordt je beste dag. Afgerond naar boven. 📈',
    'Glas halfvol? Onzin — het glas is volledig benut! 🥤',
    'Even opwarmen en dan kraken we die journaalposten. Komt helemaal goed!',
    'Going concern: jij bestaat volgend jaar nóg. Ik geloof er heilig in. ✨'
  ],
  resultPerfect: [
    'Foutloos! Ik wist het — ik reken nóóit verkeerd. 🎉',
    'Nul afwijkingen. Dit gaan we inlijsten. ✨'
  ],
  resultGood: [
    'Netjes! En met afronden naar boven is dit eigenlijk 100%. 😄',
    'Solide. De curve wijst maar één kant op: omhoog. 📈'
  ],
  resultMeh: [
    'Statistisch gezien kan het alleen maar beter — goed nieuws dus! 📈',
    'Elke fout is een afschrijving op je onwetendheid. Bijna afgeschreven! 💪'
  ],
  bossWin: [
    'BOSS VERSLAGEN! Ik reken alvast aan je volgende winst. 👑',
    'Goedgekeurd, zonder voorbehoud! Wist ik wel. 🎉'
  ],
  bossLose: [
    'Bijna! En “bijna” rondt naar boven af, toch? Volgende keer zit ie. 😄',
    'Tegenslag is gewoon uitgestelde winst. Nog één keer! 💪'
  ]
};

// --- Deterministische helpers ---
function hash(seed) {
  let h = 2166136261 ^ Math.floor(seed || 0);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function pick(arr, seed) {
  if (!arr || arr.length === 0) return null;
  return arr[hash(seed) % arr.length];
}

export function randomFrom(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function jokeOfTheDay(day) {
  return pick(jokes, day);
}

export function praiseFor(result) {
  if (result === 'correct') return randomFrom(praise);
  if (result === 'partial') return 'Deels goed 🟡';
  return randomFrom(consolation);
}

// Geeft een feestelijke tekst terug als de combo precies een mijlpaal raakt, anders null.
export function comboMessage(combo) {
  const hit = COMBO_MILESTONES.find((m) => m.n === combo);
  return hit ? hit.msg : null;
}

export function resultQuip({ perfect, isBoss, bossPassed, accuracy }) {
  if (isBoss) return randomFrom(bossPassed ? mascotLines.bossWin : mascotLines.bossLose);
  if (perfect) return randomFrom(mascotLines.resultPerfect);
  if (accuracy >= 70) return randomFrom(mascotLines.resultGood);
  return randomFrom(mascotLines.resultMeh);
}
