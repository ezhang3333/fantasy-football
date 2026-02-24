import "../css/App.css";

export default function AppShell({ sidebar, children }) {
  return (
    <div className="base-container">
      <div className="filter-and-history-sidebar">{sidebar}</div>
      <main className="route-content">{children}</main>
    </div>
  );
}
