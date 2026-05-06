import { useNavigate, useParams } from "react-router";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

import { EditableBidderList } from "@/components/tender/bidders/editable-bidder-list";

import { bidders } from "@/data/bidders";

const EditBiddersPage = () => {
  const navigate = useNavigate();
  const { id = "new-tender" } = useParams();
  const tenderBidders = bidders.filter((bidder) => bidder.tenderId === id);

  return (
    <DashboardLayout title="Update Bidders" eyebrow="Bidder management">
      <EditableBidderList
        bidders={tenderBidders}
        tenderId={id}
        onRunEvaluation={() => navigate(`/tender/${id}/processing`)}
      />
    </DashboardLayout>
  );
};

export default EditBiddersPage;
