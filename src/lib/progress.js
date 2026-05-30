// Leerpad-voortgang: lessen + modules. Pure functies, géén store-imports.
// 'unlocked' wordt afgeleid uit opgeslagen booleans (completed/bossPassed), niet opgeslagen.
import { CONFIG } from '../config.js';

export function defaultProgress() {
  return { v: 1, lessons: {}, modules: {} };
}

// Idempotent: zorg dat elke module/les een record heeft.
export function ensureInit(progress, modules) {
  progress.lessons = progress.lessons ?? {};
  progress.modules = progress.modules ?? {};
  for (const m of modules) {
    if (!progress.modules[m.id]) progress.modules[m.id] = { completed: false, bossPassed: false };
    for (const l of m.lessons ?? []) {
      if (!progress.lessons[l.id]) {
        progress.lessons[l.id] = { completed: false, stars: 0, bestScore: 0, attempts: 0, completedOn: null };
      }
    }
  }
  return progress;
}

function gewoneLessen(module) {
  return (module.lessons ?? []).filter((l) => !l.boss);
}
function bossLes(module) {
  return (module.lessons ?? []).find((l) => l.boss) ?? null;
}

export function isModuleUnlocked(progress, modules, moduleId) {
  const mod = modules.find((m) => m.id === moduleId);
  if (!mod) return false;
  if ((CONFIG.content.earlyUnlockModules ?? []).includes(moduleId)) return true;
  // module ontgrendeld als de vorige module (op order) voltooid is
  const ordered = [...modules].sort((a, b) => a.order - b.order);
  const idx = ordered.findIndex((m) => m.id === moduleId);
  if (idx <= 0) return true; // eerste module
  const prev = ordered[idx - 1];
  return !!progress.modules?.[prev.id]?.completed;
}

export function isLessonUnlocked(progress, modules, moduleId, lessonId) {
  const mod = modules.find((m) => m.id === moduleId);
  if (!mod || !isModuleUnlocked(progress, modules, moduleId)) return false;
  const normals = gewoneLessen(mod);
  const boss = bossLes(mod);
  if (boss && boss.id === lessonId) {
    // boss open als alle gewone lessen voltooid zijn
    return normals.every((l) => progress.lessons?.[l.id]?.completed);
  }
  const idx = normals.findIndex((l) => l.id === lessonId);
  if (idx <= 0) return true; // eerste gewone les
  return !!progress.lessons?.[normals[idx - 1].id]?.completed;
}

export function starsFor(scoreRatio) {
  if (scoreRatio >= CONFIG.path.star3Ratio) return 3;
  if (scoreRatio >= CONFIG.path.star2Ratio) return 2;
  return 1;
}

export function completeLesson(progress, lessonId, scoreRatio, today) {
  ensureLesson(progress, lessonId);
  const l = progress.lessons[lessonId];
  l.completed = true;
  l.stars = Math.max(l.stars ?? 0, starsFor(scoreRatio));
  l.bestScore = Math.max(l.bestScore ?? 0, scoreRatio);
  l.attempts = (l.attempts ?? 0) + 1;
  if (l.completedOn == null) l.completedOn = today;
  return progress;
}

// Boss afronden. Retourneert {passed, unlockedModuleId|null}.
export function recordBoss(progress, modules, moduleId, scoreRatio, today) {
  progress.modules = progress.modules ?? {};
  const rec = (progress.modules[moduleId] = progress.modules[moduleId] ?? { completed: false, bossPassed: false });
  const passed = scoreRatio >= CONFIG.path.bossPassRatio;
  rec.bestScore = Math.max(rec.bestScore ?? 0, scoreRatio);
  rec.attempts = (rec.attempts ?? 0) + 1;
  let unlockedModuleId = null;
  if (passed) {
    rec.bossPassed = true;
    rec.completed = true;
    const ordered = [...modules].sort((a, b) => a.order - b.order);
    const idx = ordered.findIndex((m) => m.id === moduleId);
    if (idx >= 0 && idx + 1 < ordered.length) unlockedModuleId = ordered[idx + 1].id;
  }
  return { passed, unlockedModuleId };
}

export function moduleProgress(progress, module) {
  const normals = gewoneLessen(module);
  const done = normals.filter((l) => progress.lessons?.[l.id]?.completed).length;
  const totalStars = normals.reduce((s, l) => s + (progress.lessons?.[l.id]?.stars ?? 0), 0);
  return {
    doneLessons: done,
    totalLessons: normals.length,
    totalStars,
    maxStars: normals.length * 3,
    bossPassed: !!progress.modules?.[module.id]?.bossPassed,
    completed: !!progress.modules?.[module.id]?.completed
  };
}

function ensureLesson(progress, lessonId) {
  progress.lessons = progress.lessons ?? {};
  if (!progress.lessons[lessonId]) {
    progress.lessons[lessonId] = { completed: false, stars: 0, bestScore: 0, attempts: 0, completedOn: null };
  }
}
