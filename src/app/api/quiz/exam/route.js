import {
  getAllQuestions,
  gradeQuestion,
  gradeQuestionSet,
} from "../../../../lib/quiz-data";

function publicQuestion({
  id,
  week,
  question_number,
  type,
  question,
  options,
  input_prompt,
}) {
  return {
    id,
    week,
    number: question_number,
    type,
    question,
    options,
    inputPrompt: input_prompt,
  };
}

export async function GET() {
  return Response.json({
    questions: getAllQuestions().map(publicQuestion),
  });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid submission." }, { status: 400 });
  }

  if (typeof body?.questionId === "string") {
    const result = gradeQuestion(body.questionId, body.answer);
    if (!result) {
      return Response.json({ error: "Question not found." }, { status: 404 });
    }
    return Response.json(result);
  }

  if (
    !Array.isArray(body?.questionIds) ||
    !body.questionIds.length ||
    !body.answers ||
    typeof body.answers !== "object" ||
    Array.isArray(body.answers)
  ) {
    return Response.json({ error: "Invalid submission." }, { status: 400 });
  }

  const result = gradeQuestionSet(body.questionIds, body.answers);
  if (!result) {
    return Response.json(
      { error: "One or more questions were not found." },
      { status: 404 },
    );
  }
  return Response.json(result);
}
