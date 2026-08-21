import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  GOVERNORATES,
  REGION_LABELS,
  groupedGovernorates,
  matchGovernorate,
} from "../lib/governorates";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** Shown as the empty first option. */
  placeholder?: string;
  required?: boolean;
  id?: string;
  name?: string;
  disabled?: boolean;
};

/**
 * Pick one of Egypt's 27 governorates.
 *
 * Grouped by region, labelled in the language being read, and storing the one
 * canonical spelling everything else compares against — the shipping zones,
 * the courier mapping, and the fee quoted back in the cart.
 *
 * A value that predates the list is kept as its own option rather than
 * discarded. Otherwise opening a saved address would show an empty box and
 * quietly rewrite what the customer had entered.
 */
const GovernorateSelect: React.FC<Props> = ({
  value,
  onChange,
  className,
  placeholder,
  required,
  id,
  name,
  disabled,
}) => {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";

  const groups = useMemo(() => groupedGovernorates(), []);

  // Whatever is stored, understood if we can and preserved if we cannot.
  const canonical = matchGovernorate(value);
  const known = Boolean(canonical);
  const current = canonical ?? value;
  const stranger = Boolean(value && !known);

  return (
    <select
      id={id}
      name={name}
      required={required}
      disabled={disabled}
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      <option value="">{placeholder ?? t("Select your governorate")}</option>
      {stranger && <option value={value}>{value}</option>}
      {groups.map(({ region, items }) => (
        <optgroup key={region} label={ar ? REGION_LABELS[region].ar : REGION_LABELS[region].en}>
          {items.map((g) => (
            <option key={g.value} value={g.value}>
              {ar ? g.ar : g.value}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};

/**
 * The same list offered as suggestions on a free-text field.
 *
 * For the two administrator screens, where a governorate may already be saved
 * under a spelling of somebody's own and turning the field into a closed list
 * would strand it. Render `<GovernorateDatalist id="..." />` beside an
 * `<input list="...">`.
 */
export const GovernorateDatalist: React.FC<{ id: string }> = ({ id }) => {
  const { i18n } = useTranslation();
  const ar = i18n.language === "ar";
  return (
    <datalist id={id}>
      {GOVERNORATES.map((g) => (
        // The value is what gets saved; the label is only what is read.
        <option key={g.value} value={g.value} label={ar ? g.ar : undefined} />
      ))}
    </datalist>
  );
};

export default GovernorateSelect;
