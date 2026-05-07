import { type ReactNode } from "react";

type DashboardLayoutProps = {
  children: ReactNode;
  title: string;
  eyebrow?: string;
  action?: ReactNode;
};

export const DashboardLayout = ({
  action,
  children,
  eyebrow = "TenderMind",
  title,
}: DashboardLayoutProps) => {
  return (
    <>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">{eyebrow}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
            {title}
          </h2>
        </div>
        {action}
      </section>

      {children}
    </>
  );
};
