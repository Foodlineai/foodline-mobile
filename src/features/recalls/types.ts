export type RecallClassification = {
  id: string;
  label: string;
  /** Shown inline under the label. Warehouse staff should not need FDA
   *  terminology to pick correctly. Pending a regulatory read. */
  definition: string;
};

export type RecallTarget = {
  itemId: string;
  itemName: string;
  lotCode: string;
  /** "42 cases shipped · 14 customers · 3 open orders · 6 cases in CHILL-A03" */
  blastRadius: string;
  customersAffected: number;
  openOrders: number;
};
