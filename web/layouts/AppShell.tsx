import type { ReactNode } from "react";
import "../css/App.css";

interface AppShellProps {
  sidebar?: ReactNode;
  children?: ReactNode;
}

export default function AppShell({ sidebar, children }: AppShellProps) {
  return (
    <div className="base-container">
      <div className="filter-and-history-sidebar">{sidebar}</div>
      <main className="route-content">{children}</main>
    </div>
  );
}
