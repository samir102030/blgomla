import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { useUserStore } from "../stores/user.store";
import { useStudentStore } from "../stores/student.store";
import "../styles/students.css";

/**
 * The university student programme, student side.
 *
 * One page carries the whole journey — the offer, the application, the wait,
 * and the code — because there is only ever one thing for a given student to
 * do next, and routing them between four pages to do it would be four chances
 * to lose them.
 *
 * It reads as its own product rather than a storefront page: the programme is
 * a system inside the system, and a student arriving from a faculty group chat
 * should be able to tell in a second that this is for them.
 */

const StudentsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const user = useUserStore((state) => state.user);

  const publicProgram = useStudentStore((s) => s.publicProgram);
  const myProfile = useStudentStore((s) => s.myProfile);
  const saving = useStudentStore((s) => s.saving);
  const loading = useStudentStore((s) => s.loading);
  const loadError = useStudentStore((s) => s.error);
  const fetchPublicProgram = useStudentStore((s) => s.fetchPublicProgram);
  const fetchMyProfile = useStudentStore((s) => s.fetchMyProfile);
  const apply = useStudentStore((s) => s.apply);

  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchPublicProgram();
  }, [fetchPublicProgram]);

  useEffect(() => {
    if (user) fetchMyProfile();
  }, [user, fetchMyProfile]);

  const discountLabel = useMemo(() => {
    const d = publicProgram?.discount;
    if (!d) return "—";
    return d.type === "fixed" ? `${d.value}` : `${d.value}%`;
  }, [publicProgram]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    const result = await apply(email.trim());
    setFeedback(result);
    if (result.ok) setEmail("");
  };

  const status = myProfile?.status;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SEO
        title={t("Student programme")}
        description={t(
          "Engineering and computer science students get a personal discount on electronics at Belgomla — verified with a faculty email.",
        )}
      />
      <Header />

      <main className="st-scope">
        <section className="st-head">
          <div className="st-width">
            <span className="st-kicker">{t("Engineering & computer science")}</span>
          </div>
          <div className="st-width">
            <h1 className="st-title">
              {t("Built for the people")} <span>{t("who build things.")}</span>
            </h1>
          </div>
          <div className="st-width">
            <p className="st-lede">
              {t(
                "Confirm a faculty email address and a personal discount code is yours — on the laptops, components, networking gear and storage you actually study with. The code renews; it is not a one-off voucher.",
              )}
            </p>
          </div>
          <div className="st-width">
            <div className="st-terms">
              <div className="st-term">
                <b className="st-mono">{discountLabel}</b>
                <span>{t("Off electronics")}</span>
              </div>
              <div className="st-term">
                <b className="st-mono">{publicProgram?.renewal?.usesPerPeriod ?? "—"}</b>
                <span>{t("Orders per period")}</span>
              </div>
              <div className="st-term">
                <b className="st-mono">{publicProgram?.renewal?.periodDays ?? "—"}</b>
                <span>{t("Day renewal cycle")}</span>
              </div>
              <div className="st-term">
                <b className="st-mono">{publicProgram?.domains?.length ?? 0}</b>
                <span>{t("Approved faculties")}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="st-body">
          <div className="st-width">
            {/* The programme could not be read at all. Without this the page
                rendered a masthead over an empty column — a visitor cannot
                tell that from a programme with nothing in it. */}
            {!publicProgram && !loading && (
              <div className="st-panel">
                <h2>{t("We could not load the programme")}</h2>
                <p>
                  {t(
                    "Something went wrong on our side, not yours. Refresh the page in a moment, or ask support if it keeps happening.",
                  )}
                </p>
                {loadError && <div className="st-note st-bad">{loadError}</div>}
                <Link to="/contact" className="st-btn st-btn-ghost" style={{ marginTop: 16 }}>
                  {t("Contact support")}
                </Link>
              </div>
            )}

            {!publicProgram && loading && (
              <div className="st-panel">
                <p style={{ margin: 0 }}>{t("Loading the programme…")}</p>
              </div>
            )}

            {/* Programme closed — say so plainly rather than showing a form
                that will only reject them. */}
            {publicProgram && !publicProgram.enabled && (
              <div className="st-panel">
                <h2>{t("The programme is closed right now")}</h2>
                <p>
                  {t(
                    "Applications are not open at the moment. Check back at the start of the next term, or ask support when it reopens.",
                  )}
                </p>
                <Link to="/contact" className="st-btn st-btn-ghost">
                  {t("Contact support")}
                </Link>
              </div>
            )}

            {publicProgram?.enabled && (
              <div className="st-grid2">
                <div>
                  {/* Signed out — the account has to exist first, because the
                      code is tied to it. */}
                  {!user && (
                    <div className="st-panel">
                      <h2>{t("Sign in to apply")}</h2>
                      <p>
                        {t(
                          "The discount is tied to your Belgomla account, so the code cannot be handed to anyone else. Sign in or create an account, then confirm your faculty email.",
                        )}
                      </p>
                      <Link to="/login" className="st-btn st-btn-primary">
                        {t("Sign in or register")}
                      </Link>
                    </div>
                  )}

                  {user && (!myProfile || status === "rejected" || status === "expired") && (
                    <div className="st-panel">
                      <h2>{status === "expired" ? t("Renew your membership") : t("Confirm your faculty email")}</h2>
                      <p>
                        {t(
                          "Use the address your faculty gave you. We send a confirmation link there — holding that mailbox is the proof of enrolment.",
                        )}
                      </p>

                      {status === "rejected" && myProfile?.rejectionReason && (
                        <div className="st-note st-bad" style={{ marginBottom: 16 }}>
                          {myProfile.rejectionReason}
                        </div>
                      )}

                      <form onSubmit={onSubmit}>
                        <label className="st-field">
                          <span>{t("University email")}</span>
                          <input
                            className="st-input"
                            type="email"
                            required
                            dir="ltr"
                            placeholder="name@eng.university.edu.eg"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                          />
                        </label>
                        <button className="st-btn st-btn-primary" type="submit" disabled={saving}>
                          {saving ? t("Sending…") : t("Send confirmation link")}
                        </button>
                      </form>

                      {feedback && (
                        <div
                          className={`st-note ${feedback.ok ? "" : "st-bad"}`}
                          style={{ marginTop: 16 }}
                          role="status"
                        >
                          {feedback.message}
                        </div>
                      )}
                    </div>
                  )}

                  {user && status === "pending" && (
                    <div className="st-panel">
                      <h2>{t("Check your university inbox")}</h2>
                      <p>
                        {t("We sent a confirmation link to")}{" "}
                        <b className="st-mono" dir="ltr">
                          {myProfile?.universityEmail}
                        </b>
                        . {t("The link is valid for one hour. Nothing else is needed from you here.")}
                      </p>
                      <div className="st-note st-warn">
                        {t(
                          "Not there? Look in the junk folder — university mail servers are strict. You can send it again from the form below after a couple of minutes.",
                        )}
                      </div>
                      <form onSubmit={onSubmit} style={{ marginTop: 18 }}>
                        <label className="st-field">
                          <span>{t("Resend, or use a different address")}</span>
                          <input
                            className="st-input"
                            type="email"
                            required
                            dir="ltr"
                            placeholder={myProfile?.universityEmail}
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                          />
                        </label>
                        <button className="st-btn st-btn-ghost" type="submit" disabled={saving}>
                          {saving ? t("Sending…") : t("Send again")}
                        </button>
                      </form>
                      {feedback && (
                        <div className={`st-note ${feedback.ok ? "" : "st-bad"}`} style={{ marginTop: 16 }} role="status">
                          {feedback.message}
                        </div>
                      )}
                    </div>
                  )}

                  {user && status === "verified" && (
                    <div className="st-panel">
                      <h2>{t("Your student code")}</h2>
                      <p>
                        {t(
                          "Apply it at checkout. It is checked against your account, so it will not work for anybody else.",
                        )}
                      </p>
                      <div className="st-code">
                        <small>{t("Personal code")}</small>
                        <b dir="ltr">{myProfile?.code}</b>
                        <div className="st-meta">
                          <span className="st-chip">
                            {t("Uses left")}: {myProfile?.usesLeft}/{myProfile?.usesPerPeriod}
                          </span>
                          <span className="st-chip">
                            {t("Renews every")} {myProfile?.periodDays} {t("days")}
                          </span>
                          {myProfile?.expiresAt && (
                            <span className="st-chip" dir="ltr">
                              {t("Until")} {new Date(myProfile.expiresAt).toISOString().slice(0, 10)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                        <Link to="/products" className="st-btn st-btn-primary">
                          {t("Shop electronics")}
                        </Link>
                        <Link to="/account" className="st-btn st-btn-ghost">
                          {t("My orders")}
                        </Link>
                      </div>
                    </div>
                  )}

                  {user && status === "suspended" && (
                    <div className="st-panel">
                      <h2>{t("Membership suspended")}</h2>
                      <div className="st-note st-bad">
                        {myProfile?.rejectionReason ||
                          t("This membership is on hold. Contact support if you think that is a mistake.")}
                      </div>
                      <Link to="/contact" className="st-btn st-btn-ghost" style={{ marginTop: 16 }}>
                        {t("Contact support")}
                      </Link>
                    </div>
                  )}
                </div>

                {/* Who qualifies — shown next to the form, not behind a link,
                    because it is the first question every applicant has. */}
                <aside className="st-panel">
                  <h2>{t("Who qualifies")}</h2>
                  <p>
                    {t(
                      "Engineering and computer science faculties only, proven by a faculty email domain. A general university address cannot tell us which faculty you are in, so it is not accepted.",
                    )}
                  </p>
                  <div className="st-domains" dir="ltr">
                    {(publicProgram?.domains || []).map((domain) => (
                      <b key={domain}>@{domain}</b>
                    ))}
                    {!publicProgram?.domains?.length && (
                      <span style={{ fontSize: 13, color: "var(--st-muted)" }}>
                        {isRtl ? "لم تُضف كليات بعد." : "No faculties added yet."}
                      </span>
                    )}
                  </div>
                </aside>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default StudentsPage;
