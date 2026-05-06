export type TenderStatus = "Processing" | "Completed" | "Review";

export type Tender = {
  createdDate: string;
  department: string;
  id: string;
  name: string;
  status: TenderStatus;
};

export const tenders: Tender[] = [
  {
    id: "municipal-road-2026",
    name: "Municipal Road Maintenance Tender",
    department: "Public Works Department",
    createdDate: "May 05, 2026",
    status: "Processing",
  },
  {
    id: "school-network-upgrade",
    name: "Public School Network Upgrade",
    department: "Education Department",
    createdDate: "Apr 29, 2026",
    status: "Review",
  },
  {
    id: "water-treatment-plant",
    name: "Water Treatment Plant Equipment",
    department: "Water Resources Department",
    createdDate: "Apr 18, 2026",
    status: "Completed",
  },
];

export const criteria = [
  "Minimum annual turnover",
  "Similar project experience",
  "Valid statutory registrations",
  "Technical methodology",
];
