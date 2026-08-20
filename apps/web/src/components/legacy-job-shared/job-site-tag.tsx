import { Badge } from "../ui/badge";

const siteTagMap = {
  V2EX: {
    label: "V2EX",
    class: "bg-foreground text-background",
  },
  ELE_DUCK: {
    label: "电鸭",
    class: "bg-orange-500 text-white",
  },
  RUANYF: {
    label: "阮一峰",
    class: "bg-blue-600 text-white",
  },
};

export const JobSiteTag = ({ type }: { type: "V2EX" | "ELE_DUCK" | "RUANYF" }) => {
  const { label, class: cls } = siteTagMap[type];
  return <Badge className={cls}>{label}</Badge>;
};
