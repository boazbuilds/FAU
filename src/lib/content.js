// Laadt de content (los van de engine). Vite bundelt de JSON bij de build in.
import topicsData from '../../content/topics.json';
import achievementsData from '../../content/achievements.json';

const questionModules = import.meta.glob('../../content/questions/*.json', { eager: true });

export const topics = [...(topicsData.topics ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
export const achievements = achievementsData.achievements ?? [];
export const topicById = Object.fromEntries(topics.map((t) => [t.id, t]));

export const questionsByTopic = {};
export const questionById = {};

for (const mod of Object.values(questionModules)) {
  const data = mod.default ?? mod;
  const topicId = data.topicId;
  if (!questionsByTopic[topicId]) questionsByTopic[topicId] = [];
  for (const q of data.questions ?? []) {
    const question = { ...q, topicId: q.topicId ?? topicId };
    questionsByTopic[question.topicId].push(question);
    questionById[question.id] = question;
  }
}

export const allQuestions = Object.values(questionById);

export function questionsForTopic(topicId) {
  return questionsByTopic[topicId] ?? [];
}
