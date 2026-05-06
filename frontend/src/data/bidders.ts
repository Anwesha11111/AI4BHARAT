export type Bidder = {
  id: string;
  name: string;
  tenderId: string;
};

export const bidders: Bidder[] = [
  {
    id: "bidder-a",
    name: "Bidder A",
    tenderId: "municipal-road-2026",
  },
  {
    id: "bidder-b",
    name: "Bidder B",
    tenderId: "municipal-road-2026",
  },
];
