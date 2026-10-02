/** View-model types. These are what the screen renders — never a raw RPC payload. */

export type VendorDetail = {
  id: string;
  name: string;
  code: string;
  status: string;
  contact: { email: string | null; phone: string | null };
  paymentTermCode: string | null;
  leadDays: number | null;
  minimumOrderAmount: string | null;
  /** null when this vendor has no operating profile row configured yet. */
  hasOperatingProfile: boolean;
  openOrderCount: number;
  /** One entry per currency with open exposure. Empty when none or cost is hidden. */
  openAmounts: { currency: string; value: string }[];
  canReadCost: boolean;
};
