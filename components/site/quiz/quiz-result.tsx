"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import type { PublicQuizRecommendation } from "@/domain/quiz/catalog";
import type { QuizLeadCaptureInput } from "@/domain/quiz/lead-capture";
import type { QuizAnswers } from "@/domain/quiz/recommendation";
import { quizContactUrl } from "@/lib/site/contact";
import { trackPublicEvent } from "@/lib/site/analytics";
import { PALETTE_CHOICES, QUIZ_LABELS } from "./quiz-copy";
import styles from "@/app/(site)/quiz/quiz.module.css";

type ResultAnswers = Pick<import("@/domain/quiz/recommendation").QuizAnswers, "production" | "looks" | "investment">;

export function QuizResult({ result, answers, onRestart, captureLead, leadAnswers }: { result: PublicQuizRecommendation; answers: ResultAnswers; onRestart: () => void; captureLead?: (input: QuizLeadCaptureInput) => Promise<{ created: boolean }>; leadAnswers?: QuizAnswers }) {
  const [palette, setPalette] = useState("");
  const [customPalette, setCustomPalette] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [captureMessage, setCaptureMessage] = useState("");
  const [isCapturePending, startCaptureTransition] = useTransition();
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

  function submitCapture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!captureLead || !leadAnswers || !consent) return;

    startCaptureTransition(async () => {
      try {
        const response = await captureLead({ consent: true, name, email, phone: phone || undefined, result, answers: leadAnswers });
        setCaptureMessage(response.created ? "Seus dados foram salvos. Em breve entraremos em contato." : "Não foi possível salvar seus dados agora. Tente novamente.");
        if (response.created) trackPublicEvent({ name: "quiz_lead_created", source: "quiz" });
      } catch {
        setCaptureMessage("Não foi possível salvar seus dados agora. Tente novamente.");
      }
    });
  }

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
      <form className={styles.capture} onSubmit={submitCapture}>
        <h3>Quer receber um retorno sobre sua curadoria?</h3>
        <p>Deixe seus dados apenas se quiser que a gente entre em contato.</p>
        <div className={styles.captureFields}>
          <label>Nome<input required value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>E-mail<input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Telefone <em>(opcional)</em><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
        </div>
        <label className={styles.consent}><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> Concordo em receber contato do Estúdio Carol Lucas sobre minha curadoria.</label>
        <button className={styles.primary} type="submit" disabled={!consent || isCapturePending}>{isCapturePending ? "Salvando…" : "Salvar meus dados"}</button>
        {captureMessage ? <p className={styles.captureMessage} role="status">{captureMessage}</p> : null}
      </form>
      <div className={styles.resultActions}>
        <a className={styles.primary} href={contactHref} target="_blank" rel="noreferrer" onClick={() => trackPublicEvent({ name: "quiz_whatsapp_clicked", source: "quiz" })}>Levar minha curadoria para o WhatsApp <span aria-hidden="true">↗</span></a>
        <button className={styles.back} type="button" onClick={onRestart}>Refazer curadoria</button>
      </div>
    </section>
  );
}
