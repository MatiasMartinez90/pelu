import configuration from "../../config/installation.json";

export const installation = configuration;
export const locale = installation.localization.locale;
export const timezone = installation.localization.timezone;
export const currency = installation.localization.currency;

const decimal = new Intl.NumberFormat(locale, {
  minimumFractionDigits: currency.fractionDigits,
  maximumFractionDigits: currency.fractionDigits,
});

export function formatMoney(value: number) {
  return `${currency.symbol}${decimal.format(Math.round(value * 10 ** currency.fractionDigits) / 10 ** currency.fractionDigits)}`;
}
