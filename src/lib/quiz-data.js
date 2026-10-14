import quizData from "../../resources/nptel_quiz_and_answer_key.json";

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

export function getAllQuestions() {
  return quizData.quiz.flatMap((week) =>
    week.questions.map((question) => ({ ...question, week: week.week })),
  );
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
      const actual = Number(
        String(submitted ?? "")
          .trim()
          .replaceAll(",", ""),
      );
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
    passed: (score / total) * 100 > 50,
    results,
  };
}

export function gradeQuestion(questionId, submitted) {
  const question = getAllQuestions().find((item) => item.id === questionId);
  if (!question) return null;

  return gradeQuestions([question], { [questionId]: submitted }).results[0];
}

export function gradeQuestionSet(questionIds, answers) {
  const allQuestions = getAllQuestions();
  const questions = questionIds.map((id) =>
    allQuestions.find((question) => question.id === id),
  );
  if (questions.some((question) => !question)) return null;

  return gradeQuestions(questions, answers);
}

export function gradeWeek(weekNumber, answers) {
  const questions = getWeekQuestions(weekNumber);
  if (!questions) return null;
  return gradeQuestions(questions, answers);
}
