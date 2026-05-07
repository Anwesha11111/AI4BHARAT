import { useNavigate, useParams } from "react-router";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

import { CriteriaList } from "@/components/tender/criteria/criteria-list";

import { criteria } from "@/data/tenders";

const initialCriteria = criteria.map((text, index) => ({
  id: `criteria-${index + 1}`,
  text,
  type: index === criteria.length - 1 ? "Optional" : "Mandatory",
})) satisfies {
  id: string;
  text: string;
  type: "Mandatory" | "Optional";
}[];

const CriteriaPage = () => {
  const navigate = useNavigate();
  const { id = "new-tender" } = useParams();

  return (
    <DashboardLayout
      title="Review Extracted Criteria"
      eyebrow="Criteria review"
    >
      <CriteriaList
        initialCriteria={initialCriteria}
        onRunEvaluation={() => navigate(`/tender/${id}/processing`)}
      />
    </DashboardLayout>
  );
};

export default CriteriaPage;
