import quizData from "../../resources/nptel_quiz_and_answer_key.json";
import { parseExplanation } from "./explanations";

const weekTitles = [
  "AI safety and systemic risk",
  "Robustness and alignment",
  "Machine unlearning",
  "Bias in machine learning",
  "Measuring and mitigating bias",
  "Privacy and differential privacy",
  "Differential privacy and fairness",
  "Interpretability",
  "AI governance and policy",
  "AGI, safety and society",
  "Governance and moral consistency",
];

const allQuestions = quizData.quiz.flatMap((week) =>
  week.questions.map((question) => ({ ...question, week: week.week })),
);
const questionsById = new Map(
  allQuestions.map((question) => [question.id, question]),
);

export function getWeekCatalog() {
  return quizData.quiz.map((week) => ({
    week: week.week,
    title: weekTitles[week.week - 1] ?? `Week ${week.week}`,
    totalQuestions: week.questions.length,
  }));
}

export function getWeekQuestions(weekNumber) {
  return (
    quizData.quiz.find((week) => week.week === weekNumber)?.questions ?? null
  );
}

export function getWeekStudyQuestions(weekNumber) {
  const questions = getWeekQuestions(weekNumber);
  if (!questions) return null;

  return questions.map((question) => {
    const answerKey = quizData.answer_key[question.id];
    return {
      id: question.id,
      number: question.question_number,
      type: question.type,
      question: question.question,
      options: question.options,
      correctAnswers: answerKey.correct_answers,
      correctAnswersFullText: answerKey.correct_answers_full_text,
      explanation: answerKey.explanation,
      explanationDetail: parseExplanation(answerKey.explanation),
    };
  });
}

export function getAllQuestions() {
  return allQuestions;
}

function gradeQuestions(questions, answers) {
  const results = questions.map((question) => {
    const answerKey = quizData.answer_key[question.id];
    const submitted = answers?.[question.id];
    const correct = answerKey.correct_answers;
    let isCorrect = false;

    if (Array.isArray(submitted)) {
      isCorrect =
        submitted.length === correct.length &&
        submitted.every((answer) =>
          correct.includes(String(answer).toLowerCase()),
        );
    } else if (question.options?.length) {
      isCorrect =
        correct.length === 1 && correct[0] === String(submitted).toLowerCase();
    } else {
      const expected = Number(correct[0]);
      const raw = String(submitted ?? "")
        .trim()
        .replaceAll(",", "");
      // Number("") is 0, so a blank answer must not be graded as zero.
      const actual = raw === "" ? Number.NaN : Number(raw);
      isCorrect = Number.isFinite(actual) && actual === expected;
    }

    return {
      id: question.id,
      week: question.week,
      type: question.type,
      question: question.question,
      correctAnswers: answerKey.correct_answers,
      correctAnswersFullText: answerKey.correct_answers_full_text,
      explanation: answerKey.explanation,
      explanationDetail: parseExplanation(answerKey.explanation),
      isCorrect,
      submitted: submitted ?? null,
    };
  });

  const score = results.filter((result) => result.isCorrect).length;
  const total = results.length;

  return {
    score,
    total,
    percentage: Math.round((score / total) * 100),
    passed: (score / total) * 100 >= 50,
    results,
  };
}

export function gradeQuestion(questionId, submitted) {
  const question = questionsById.get(questionId);
  if (!question) return null;

  return gradeQuestions([question], { [questionId]: submitted }).results[0];
}

export function gradeQuestionSet(questionIds, answers) {
  const questions = questionIds.map((id) => questionsById.get(id));
  if (questions.some((question) => !question)) return null;

  return gradeQuestions(questions, answers);
}

export function gradeWeek(weekNumber, answers) {
  const questions = getWeekQuestions(weekNumber);
  if (!questions) return null;
  return gradeQuestions(questions, answers);
}

export function getFlashcards() {
  return allQuestions.map((question) => {
    const answerKey = quizData.answer_key[question.id];
    return {
      id: question.id,
      week: question.week,
      number: question.question_number,
      type: question.type,
      question: question.question,
      options: question.options ?? null,
      correctAnswers: answerKey.correct_answers,
      answerTexts: answerKey.correct_answers_full_text,
      explanationDetail: parseExplanation(answerKey.explanation),
    };
  });
}
