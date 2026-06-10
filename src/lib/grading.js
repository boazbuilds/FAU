// Beoordeling per vraagtype. Pure functies.

export function normalize(s) {
  return (s ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diakrieten weg
    .replace(/[.,;:!?()'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein -> gelijkenis-ratio 0..1
export function similarity(a, b) {
  a = normalize(a);
  b = normalize(b);
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const m = a.length;
  const n = b.length;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return 1 - dp[n] / Math.max(m, n);
}

export function gradeShort(question, userAnswer) {
  const accept = question.answer?.accept ?? [];
  const min = question.answer?.minSimilarity ?? 0.85;
  const u = normalize(userAnswer);
  if (!u) return false;
  const words = u.split(' ');
  for (const acc of accept) {
    const a = normalize(acc);
    if (!a) continue;
    if (u === a) return true;
    if (a.length >= 3 && words.includes(a)) return true; // juiste kernwoord aanwezig
    if (similarity(u, a) >= min) return true;
  }
  return false;
}

export function gradeMcq(question, selectedIds) {
  const sel = [...(selectedIds ?? [])].sort();
  const cor = [...(question.correct ?? [])].sort();
  return sel.length > 0 && sel.length === cor.length && sel.every((v, i) => v === cor[i]);
}

export function gradeTrueFalse(question, value) {
  return value === question.correct;
}

// Matching: mapping is { [pairId]: gekozenPairId }. Correct = identiteit (pairId === keuze).
// Werkt op pair-id (positie), zodat dubbele 'right'-teksten zijn toegestaan.
export function matchFraction(question, mapping) {
  const pairs = question.pairs ?? [];
  if (pairs.length === 0) return 0;
  let correct = 0;
  for (const p of pairs) {
    if (mapping && mapping[p.id] === p.id) correct++;
  }
  return correct / pairs.length;
}

// 3-weg voor lessen (hergebruikt de bestaande partial-afhandeling).
export function gradeMatchResult(question, mapping) {
  const f = matchFraction(question, mapping);
  if (f >= 1) return 'correct';
  if (f >= 0.5) return 'partial';
  return 'wrong';
}

// Binair voor objectieve paden / boss.
export function gradeMatch(question, mapping) {
  return matchFraction(question, mapping) >= 1;
}

// --- casus_bouw ("bouw het antwoord uit bouwstenen") ---
// assignment = { [blockId]: slotId }. Kern in juist slot = +points; kern in
// verkeerd slot = halve points; instinker/afleider gekozen = 0 (en didactische
// uitleg in de UI); gemiste kern telt niet mee in 'behaald'.
export function buildMaxPoints(question) {
  return (question.blocks ?? [])
    .filter((b) => b.role === 'kern')
    .reduce((s, b) => s + (b.points ?? 0), 0);
}

export function buildScore(question, assignment) {
  const max = buildMaxPoints(question);
  if (max <= 0) return 0;
  const a = assignment ?? {};
  let got = 0;
  for (const b of question.blocks ?? []) {
    const placed = Object.prototype.hasOwnProperty.call(a, b.id); // in een slot gezet?
    if (b.role !== 'kern') continue; // instinker/afleider leveren niets op
    if (!placed) continue; // gemiste kern
    if (a[b.id] === b.slot) got += b.points ?? 0; // juist slot
    else got += (b.points ?? 0) / 2; // juist element, verkeerd slot
  }
  return Math.max(0, Math.min(1, got / max));
}

// 3-weg resultaat met dezelfde drempels als matching, zodat XP/SRS/combo
// ongewijzigd blijven. Een gekozen instinker kapt het resultaat af op 'partial'
// (je had een valkuil te pakken, ook al was de rest goed).
export function gradeBuildResult(question, assignment) {
  const f = buildScore(question, assignment);
  const a = assignment ?? {};
  const choseInstinker = (question.blocks ?? []).some(
    (b) => b.role === 'instinker' && Object.prototype.hasOwnProperty.call(a, b.id)
  );
  if (f >= 1 && !choseInstinker) return 'correct';
  if (f >= 0.5) return 'partial';
  return 'wrong';
}
