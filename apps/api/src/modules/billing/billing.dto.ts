export type CreditPackDto = {
  name: string;
  credits: number;
  price: number;
  currency?: string;
};

export type AutoRechargeDto = {
  enabled: boolean;
  threshold: number;
  amount: number;
  currency?: string;
};

export type CreateCheckoutSessionDto = {
  packId: string;
};

export type ConfirmCheckoutDto = {
  sessionId: string;
};
