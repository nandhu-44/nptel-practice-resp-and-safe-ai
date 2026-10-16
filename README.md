# NPTEL Practice — Responsible & Safe AI Systems

Next.js app for practising the 12 weekly assignments (141 questions).

- **Weekly assignments** with per-question checking and explanations
- **Exams**: full or random 50, with option/question shuffling and a review archive
- **Study answers** per week
- **Flashcards** with spaced repetition (Leitner boxes) and cat memes
- **Mistakes**: every question you got wrong, retried until you get it right
- **Search** across questions, answers and explanations (press `/`)
- Light/dark theme (follows the system, toggle in the top bar or mobile header)

Progress is stored in `localStorage`; question data is `resources/nptel_quiz_and_answer_key.json`.

```bash
npm install
npm run dev     # http://localhost:3000
npm run lint
npm run build
```
