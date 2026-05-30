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

// 'correct' | 'wrong' voor objectieve types. Open vragen worden zelf beoordeeld.
export function gradeObjective(question, answer) {
  let ok = false;
  if (question.type === 'mcq') ok = gradeMcq(question, answer);
  else if (question.type === 'truefalse') ok = gradeTrueFalse(question, answer);
  else if (question.type === 'short') ok = gradeShort(question, answer);
  else if (question.type === 'match') ok = gradeMatch(question, answer);
  return ok ? 'correct' : 'wrong';
}
