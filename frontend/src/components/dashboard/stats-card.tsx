import { type LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type StatsCardProps = {
  description: string;
  icon: LucideIcon;
  title: string;
  value: number;
};

export const StatsCard = ({
  description,
  icon: Icon,
  title,
  value,
}: StatsCardProps) => {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm shadow-slate-900/5">
      <CardHeader className="flex-row items-center justify-between gap-4">
        <div>
          <CardDescription className="text-sm text-slate-500">
            {title}
          </CardDescription>
          <CardTitle className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            {value}
          </CardTitle>
        </div>
        <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="size-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-500">{description}</p>
      </CardContent>
    </Card>
  );
};
