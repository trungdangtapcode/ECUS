import { LayoutDashboard, FileStack, FileSpreadsheet, SearchCheck, ListChecks } from "lucide-react";

// Case-dependent entries become available after selecting a shipment.
export const navigation = [
  { id: "cases", label: "app.navCases", icon: LayoutDashboard, route: "/cases", section: null },
  {
    id: "documents",
    label: "navigation.documents",
    section: "documents",
    icon: FileStack,
    route: null,
  },
  {
    id: "reconcile",
    label: "navigation.reconcile",
    section: "compare",
    icon: SearchCheck,
    route: null,
  },
  {
    id: "consolidation",
    label: "navigation.consolidation",
    section: "canonical",
    icon: ListChecks,
    route: null,
  },
  {
    id: "export",
    label: "navigation.export",
    section: "export",
    icon: FileSpreadsheet,
    route: null,
  },
] as const;
