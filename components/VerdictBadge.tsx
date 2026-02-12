
import React from 'react';

type Verdict = 'verified' | 'refuted' | 'unclear' | 'partially_true';

const VerdictBadge: React.FC<{ verdict: Verdict }> = ({ verdict }) => {
  const styles = {
    verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
    refuted: "bg-rose-50 text-rose-700 border-rose-200",
    unclear: "bg-amber-50 text-amber-700 border-amber-200",
    partially_true: "bg-blue-50 text-blue-700 border-blue-200"
  };

  const labels = {
    verified: "Verified",
    refuted: "Refuted",
    unclear: "Unclear",
    partially_true: "Partially True"
  };

  return (
    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${styles[verdict]}`}>
      {labels[verdict]}
    </span>
  );
};

export default VerdictBadge;
