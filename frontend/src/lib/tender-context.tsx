import { createContext, useMemo, useState, type ReactNode } from "react";

import { evaluationRows, type EvaluationRow } from "@/data/results";
import { tenders, type Tender } from "@/data/tenders";

type TenderContextValue = {
  currentTender: Tender;
  results: EvaluationRow[];
  setCurrentTenderById: (tenderId: string) => void;
};

export const TenderContext = createContext<TenderContextValue | null>(null);

type TenderProviderProps = {
  children: ReactNode;
};

export const TenderProvider = ({ children }: TenderProviderProps) => {
  const [currentTenderId, setCurrentTenderId] = useState(tenders[0].id);

  const value = useMemo<TenderContextValue>(() => {
    const currentTender =
      tenders.find((tender) => tender.id === currentTenderId) ?? tenders[0];

    return {
      currentTender,
      results: evaluationRows,
      setCurrentTenderById: setCurrentTenderId,
    };
  }, [currentTenderId]);

  return (
    <TenderContext.Provider value={value}>{children}</TenderContext.Provider>
  );
};
