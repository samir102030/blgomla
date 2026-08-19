import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useStudentStore } from "../../../stores/student.store";

/**
 * Wraps every page of the student module for one reason: to say out loud when
 * the server refuses something.
 *
 * The module used to be a single screen, and that screen watched the store's
 * `error` and raised a toast. Splitting it into six pages left the watching
 * behind on all six, so every refusal — a malformed domain, a duplicate, an
 * expired session — happened in silence. A person clicked Add, nothing moved,
 * and there was nothing on screen to explain why.
 *
 * It lives in a layout rather than a hook each page calls, because a hook each
 * page calls is the same thing that was forgotten the first time. Here a new
 * page inherits it by being routed, without anybody remembering to.
 */

const StudentsLayout: React.FC = () => {
  const { t } = useTranslation();
  const error = useStudentStore((s) => s.error);
  const clearError = useStudentStore((s) => s.clearError);

  useEffect(() => {
    if (!error) return;
    // The server writes these in English; `t` swaps in the Arabic where there
    // is one and returns the text untouched where there is not.
    //
    // A fixed id so a second attempt replaces the first message rather than
    // stacking another copy of it — the same refusal twice reads as two
    // separate problems.
    toast.error(t(error), { id: "student-module-error" });
    clearError();
  }, [error, clearError, t]);

  return <Outlet />;
};

export default StudentsLayout;
