import { getFlashcards } from "../../../lib/quiz-data";

export async function GET() {
  return Response.json({ cards: getFlashcards() });
}
