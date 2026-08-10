import { useTranslation } from "react-i18next";
import type { ReviewWorkspace } from "@ecus/api-client";

export function useFieldLabel(data: ReviewWorkspace) {
  const { t } = useTranslation();
  return (field: string) => {
    const label =
      data.workspace.policy?.fields?.find((item) => item.field === field)?.label ?? field;
    const translated = t(label, { defaultValue: label });
    const repeated = /^(\w+)_(\d{3})_/.exec(field);
    return repeated
      ? t("integration.repeatedField", {
          group: t(`integration.groups.${repeated[1]}`, { defaultValue: repeated[1] }),
          index: Number(repeated[2]),
          label: translated,
        })
      : translated;
  };
}
