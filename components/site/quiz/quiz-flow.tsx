"use client";

import { useState, useTransition } from "react";
import type { PublicQuizFamily, PublicQuizRecommendation } from "@/domain/quiz/catalog";
import type { QuizAnswers } from "@/domain/quiz/recommendation";
import { recommendQuizPackageAction } from "@/app/(site)/quiz/actions";
import { QUIZ_STEPS } from "./quiz-copy";
import { QuizResult } from "./quiz-result";
import styles from "@/app/(site)/quiz/quiz.module.css";

type QuizKey = keyof QuizAnswers;

export function QuizFlow({
  families,
  recommend = recommendQuizPackageAction,
}: {
  families: PublicQuizFamily[];
  recommend?: (answers: QuizAnswers) => Promise<PublicQuizRecommendation>;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [result, setResult] = useState<PublicQuizRecommendation | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const current = QUIZ_STEPS[step];
  const selected = answers[current.id as QuizKey];
  const options = current.id === "familySlug"
    ? families.map((family) => [family.slug, family.name] as const)
    : current.options;

  function choose(value: string) {
    setAnswers((previous) => ({ ...previous, [current.id]: value }));
  }

  function continueQuiz() {
    if (!selected) return;
    if (step < QUIZ_STEPS.length - 1) {
      setStep((value) => value + 1);
      return;
    }
    startTransition(async () => {
      try {
        setError("");
        setResult(await recommend(answers as QuizAnswers));
      } catch {
        setError("Não foi possível concluir a curadoria agora. Tente novamente em alguns instantes.");
      }
    });
  }

  if (result) return <QuizResult result={result} answers={answers as Pick<QuizAnswers, "production" | "looks" | "investment">} onRestart={() => { setAnswers({}); setResult(null); setStep(0); }} />;

  return (
    <section className={styles.flow} aria-live="polite">
      <p className={styles.progressCopy}>Passo {step + 1} de {QUIZ_STEPS.length}</p>
      <div className={styles.progress} role="progressbar" aria-label="Progresso da curadoria" aria-valuemin={1} aria-valuemax={QUIZ_STEPS.length} aria-valuenow={step + 1}><span style={{ width: `${((step + 1) / QUIZ_STEPS.length) * 100}%` }} /></div>
      <h1>{current.title}</h1>
      <div className={styles.optionGrid}>
        {options?.map(([value, label]) => <button key={value} className={styles.option} type="button" aria-pressed={selected === value} onClick={() => choose(value)}>{label}</button>)}
      </div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <div className={styles.controls}>
        <button className={styles.back} type="button" disabled={step === 0 || isPending} onClick={() => setStep((value) => value - 1)}>Voltar</button>
        <button className={styles.primary} type="button" disabled={!selected || isPending} onClick={continueQuiz}>{isPending ? "Encontrando sua curadoria…" : step === QUIZ_STEPS.length - 1 ? "Ver minha curadoria" : "Continuar"} <span aria-hidden="true">↗</span></button>
      </div>
    </section>
  );
}
