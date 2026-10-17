import type { OnlinePaymentProvider } from "@/services/payment/paymentService";

export function PaymentProviderSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: OnlinePaymentProvider;
  onChange: (provider: OnlinePaymentProvider) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="mt-4" disabled={disabled}>
      <legend className="text-sm font-bold text-mineral">Choose payment provider</legend>
      <div className="mt-3 flex flex-wrap gap-5">
        {(["PAYSTACK", "FLUTTERWAVE"] as const).map((provider) => (
          <label
            key={provider}
            className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold"
          >
            <input
              type="radio"
              name="payment-provider"
              value={provider}
              checked={value === provider}
              onChange={() => onChange(provider)}
            />
            {provider === "PAYSTACK" ? "Paystack" : "Flutterwave"}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
