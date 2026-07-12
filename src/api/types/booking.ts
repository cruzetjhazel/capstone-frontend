export interface BookingPaymentInfo {
  merchant_name: string;
  merchant_qr?: string;
  gcash_number?: string;
  gcash_name?: string;
  amount_due: number;
}

export interface SubmitPaymentPayload {
  reference_code: string;
  amount_paid: number;
  sender_name: string;
  paid_at: string;
  receipt: File;
}

export interface BookingReceipt {
  receipt_no: string;
  ref_code: string;
  amount_paid: number;
  sender_name: string;
  paid_at: string;
  merchant_name: string;
  merchant_qr: string;
  verified_at: string;
}
