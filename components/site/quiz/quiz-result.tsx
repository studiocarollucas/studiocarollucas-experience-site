"use client";

import { useMemo, useState } from "react";
import type { PublicQuizRecommendation } from "@/domain/quiz/catalog";
import { quizContactUrl } from "@/lib/site/contact";
import { PALETTE_CHOICES, QUIZ_LABELS } from "./quiz-copy";
import styles from "@/app/(site)/quiz/quiz.module.css";

type ResultAnswers = Pick<import("@/domain/quiz/recommendation").QuizAnswers, "production" | "looks" | "investment">;

export function QuizResult({ result, answers, onRestart }: { result: PublicQuizRecommendation; answers: ResultAnswers; onRestart: () => void }) {
  const [palette, setPalette] = useState("");
  const [customPalette, setCustomPalette] = useState("");
  const selectedPalette = palette === "Outra cor que imagino" ? customPalette.trim() : palette;
  const contactHref = useMemo(() => quizContactUrl({
    familyName: result.familyName,
    packageName: result.packageName,
    persona: result.persona,
    production: QUIZ_LABELS.production[answers.production],
    looks: QUIZ_LABELS.looks[answers.looks],
    investment: QUIZ_LABELS.investment[answers.investment],
    palette: selectedPalette || undefined,
  }), [answers, result, selectedPalette]);

  return (
    <section className={styles.result} aria-live="polite">
      <p className={styles.kicker}>Sua curadoria</p>
      <h2>{result.persona}</h2>
      <p className={styles.personaCopy}>{result.personaCopy}</p>
      <div className={styles.direction}>
        <div><span>Styling</span><p>{result.styling}</p></div>
        <div><span>Direção de cena</span><p>{result.sceneDirection}</p></div>
      </div>
      <div className={styles.packageCard}>
        <p>Experiência indicada</p>
        <h3>{result.packageName}</h3>
        <p>{result.usedClosestBudgetMatch
          ? "Esta é a experiência mais próxima das suas escolhas. Na conversa, vamos encontrar a melhor forma de adaptar os detalhes ao seu momento."
          : "Suas escolhas de produção, looks e investimento apontam para esta experiência como a melhor forma de viver o ensaio."}</p>
      </div>
      {result.paletteEligible ? (
        <div className={styles.palette}>
          <h3>Escolha uma paleta inicial <em>se quiser</em></h3>
          <p>Ela não muda sua curadoria; apenas leva uma referência para a nossa conversa.</p>
          <div className={styles.optionGrid}>
            {PALETTE_CHOICES.map((choice) => <button key={choice} type="button" className={styles.option} aria-pressed={palette === choice} onClick={() => setPalette(choice)}>{choice}</button>)}
          </div>
          {palette === "Outra cor que imagino" ? <label className={styles.customPalette}>Qual cor você imagina?<input value={customPalette} maxLength={160} onChange={(event) => setCustomPalette(event.target.value)} /></label> : null}
        </div>
      ) : null}
      <div className={styles.resultActions}>
        <a className={styles.primary} href={contactHref} target="_blank" rel="noreferrer">Levar minha curadoria para o WhatsApp <span aria-hidden="true">↗</span></a>
        <button className={styles.back} type="button" onClick={onRestart}>Refazer curadoria</button>
      </div>
    </section>
  );
}
