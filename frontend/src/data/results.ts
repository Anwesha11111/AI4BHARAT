export type EvaluationDecision = "PASS" | "FAIL" | "REVIEW";

export type EvidenceItem = {
  bidder: string;
  confidence: number;
  criteria: string;
  decision: EvaluationDecision;
  evidence: string;
  pageNumber: number;
};

export type EvaluationRow = {
  bidderA: EvidenceItem;
  bidderB: EvidenceItem;
  criteria: string;
};

export type ReviewItem = {
  aiDecision: EvaluationDecision;
  bidder: string;
  criteria: string;
  id: string;
};

export type FinalSummary = {
  bidder: string;
  criteriaPassed: number;
  criteriaTotal: number;
  note: string;
  status: "Qualified" | "Disqualified";
};

export const evaluationRows: EvaluationRow[] = [
  {
    criteria: "Minimum annual turnover",
    bidderA: {
      bidder: "Bidder A",
      confidence: 94,
      criteria: "Minimum annual turnover",
      decision: "PASS",
      evidence:
        "Audited financial statements show average annual turnover above the required threshold for the last three financial years.",
      pageNumber: 12,
    },
    bidderB: {
      bidder: "Bidder B",
      confidence: 78,
      criteria: "Minimum annual turnover",
      decision: "REVIEW",
      evidence:
        "Turnover values are present, but one year appears to reference a provisional statement instead of audited accounts.",
      pageNumber: 9,
    },
  },
  {
    criteria: "Similar project experience",
    bidderA: {
      bidder: "Bidder A",
      confidence: 88,
      criteria: "Similar project experience",
      decision: "PASS",
      evidence:
        "Completion certificates list two comparable public infrastructure projects completed within the required period.",
      pageNumber: 21,
    },
    bidderB: {
      bidder: "Bidder B",
      confidence: 91,
      criteria: "Similar project experience",
      decision: "FAIL",
      evidence:
        "Submitted project references do not meet the minimum contract value required by the tender criteria.",
      pageNumber: 18,
    },
  },
  {
    criteria: "Valid statutory registrations",
    bidderA: {
      bidder: "Bidder A",
      confidence: 97,
      criteria: "Valid statutory registrations",
      decision: "PASS",
      evidence:
        "GST, PAN, and labor registration certificates are included and valid through the bid submission date.",
      pageNumber: 6,
    },
    bidderB: {
      bidder: "Bidder B",
      confidence: 83,
      criteria: "Valid statutory registrations",
      decision: "PASS",
      evidence:
        "Required statutory certificates are available with registration numbers matching the bidder profile.",
      pageNumber: 5,
    },
  },
  {
    criteria: "Technical methodology",
    bidderA: {
      bidder: "Bidder A",
      confidence: 74,
      criteria: "Technical methodology",
      decision: "REVIEW",
      evidence:
        "Methodology covers execution stages, but the equipment deployment schedule is partially missing.",
      pageNumber: 34,
    },
    bidderB: {
      bidder: "Bidder B",
      confidence: 89,
      criteria: "Technical methodology",
      decision: "PASS",
      evidence:
        "Work plan includes staffing, equipment deployment, quality checks, and a milestone schedule.",
      pageNumber: 29,
    },
  },
];

export const reviewItems: ReviewItem[] = [
  {
    id: "turnover-bidder-b",
    criteria: "Minimum annual turnover",
    bidder: "Bidder B",
    aiDecision: "REVIEW",
  },
  {
    id: "methodology-bidder-a",
    criteria: "Technical methodology",
    bidder: "Bidder A",
    aiDecision: "REVIEW",
  },
  {
    id: "experience-bidder-b",
    criteria: "Similar project experience",
    bidder: "Bidder B",
    aiDecision: "FAIL",
  },
];

export const finalSummaries: FinalSummary[] = [
  {
    bidder: "Bidder A",
    criteriaPassed: 4,
    criteriaTotal: 4,
    note: "Meets the mandatory eligibility, technical, and statutory requirements after human validation.",
    status: "Qualified",
  },
  {
    bidder: "Bidder B",
    criteriaPassed: 2,
    criteriaTotal: 4,
    note: "Disqualified due to unresolved turnover evidence and insufficient similar project experience.",
    status: "Disqualified",
  },
];
