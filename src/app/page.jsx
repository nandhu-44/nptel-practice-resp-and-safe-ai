import { getWeekCatalog } from "../lib/quiz-data";
import QuizApp from "./quiz-app";

export default function Home() {
  return <QuizApp weeks={getWeekCatalog()} />;
}
