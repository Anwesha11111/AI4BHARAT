import { useContext } from "react";

import { TenderContext } from "@/lib/tender-context";

export const useTenderStore = () => {
  const context = useContext(TenderContext);

  if (!context) {
    throw new Error("useTenderStore must be used inside TenderProvider.");
  }

  return context;
};
