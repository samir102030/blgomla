import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { useStudentStore } from "../stores/student.store";
import "../styles/students.css";

/**
 * The landing page for the confirmation link.
 *
 * It runs the verification itself rather than asking the student to press a
 * second button: they already pressed one, in their mail client. The code is
 * shown here as well as emailed, because the student is looking at this screen
 * right now and the second email may take a minute to arrive.
 *
 * No sign-in is required — the token is the proof, and this link is routinely
 * opened in a university webmail session that has never touched the store.
 */

type Result = { ok: boolean; message: string; code?: string };

const StudentVerifyPage: React.FC = () => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const verify = useStudentStore((s) => s.verify);

  const [result, setResult] = useState<Result | null>(null);
  // React runs effects twice in development StrictMode; a token is single-use,
  // so the second run would report a valid link as expired.
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    verify(token).then(setResult);
  }, [token, verify]);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SEO title={t("Confirming your university email")} noindex />
      <Header />

      <main className="st-scope">
        <section className="st-head">
          <div className="st-width">
            <span className="st-kicker">{t("Student programme")}</span>
          </div>
          <div className="st-width">
            <h1 className="st-title">
              {result === null
                ? t("Confirming…")
                : result.ok
                  ? t("You are in.")
                  : t("That link did not work.")}
            </h1>
          </div>
        </section>

        <section className="st-body">
          <div className="st-width">
            <div className="st-panel" style={{ maxWidth: 720 }}>
              {result === null && <p>{t("Checking your confirmation link…")}</p>}

              {result?.ok && (
                <>
                  <p>{t("Your faculty email is confirmed. A copy of this code is on its way to your inbox.")}</p>
                  {result.code && (
                    <div className="st-code">
                      <small>{t("Personal code")}</small>
                      <b dir="ltr">{result.code}</b>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                    <Link to="/products" className="st-btn st-btn-primary">
                      {t("Shop electronics")}
                    </Link>
                    <Link to="/students" className="st-btn st-btn-ghost">
                      {t("My membership")}
                    </Link>
                  </div>
                </>
              )}

              {result && !result.ok && (
                <>
                  <div className="st-note st-bad">{result.message}</div>
                  <p style={{ marginTop: 16 }}>
                    {t("Confirmation links last an hour. Ask for a fresh one from the programme page.")}
                  </p>
                  <Link to="/students" className="st-btn st-btn-primary">
                    {t("Back to the programme")}
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default StudentVerifyPage;
