import {
  getWeekQuestions,
  getWeekStudyQuestions,
  gradeQuestion,
  gradeWeek,
} from "../../../../lib/quiz-data";

export async function GET(request, { params }) {
  const { week: weekParam } = await params;
  const weekNumber = Number(weekParam);
  const questions = getWeekQuestions(weekNumber);

  if (!questions) {
    return Response.json({ error: "Week not found." }, { status: 404 });
  }

  if (new URL(request.url).searchParams.get("mode") === "study") {
    return Response.json({
      week: weekNumber,
      questions: getWeekStudyQuestions(weekNumber),
    });
  }

  return Response.json({
    week: weekNumber,
    questions: questions.map(
      ({ id, question_number, type, question, options, input_prompt }) => ({
        id,
        number: question_number,
        type,
        question,
        options,
        inputPrompt: input_prompt,
      }),
    ),
  });
}

export async function POST(request, { params }) {
  const { week: weekParam } = await params;
  const weekNumber = Number(weekParam);
  const questions = getWeekQuestions(weekNumber);

  if (!questions) {
    return Response.json({ error: "Week not found." }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid submission." }, { status: 400 });
  }

  if (
    !body ||
    (typeof body.questionId !== "string" &&
      (typeof body.answers !== "object" || Array.isArray(body.answers)))
  ) {
    return Response.json({ error: "Invalid submission." }, { status: 400 });
  }

  if (typeof body.questionId === "string") {
    const question = questions.find((item) => item.id === body.questionId);
    if (!question) {
      return Response.json({ error: "Question not found." }, { status: 404 });
    }
    return Response.json(gradeQuestion(body.questionId, body.answer));
  }

  return Response.json(gradeWeek(weekNumber, body.answers));
}
