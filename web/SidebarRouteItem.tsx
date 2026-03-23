import type { ReactNode, CSSProperties } from "react";
import { NavLink } from "react-router-dom";

interface CSSCustomProperties extends CSSProperties {
  "--sidebar-route-icon-gap"?: string;
  "--sidebar-route-left-padding"?: string;
}

interface SidebarRouteItemProps {
  to: string;
  label: string;
  icon?: ReactNode;
  end?: boolean;
  iconGap?: number | string;
  leftPadding?: number | string;
  className?: string;
}

function toCssSize(value: number | string): string {
  return typeof value === "number" ? `${value}px` : value;
}

export default function SidebarRouteItem({
  to,
  label,
  icon,
  end = false,
  iconGap = 8,
  leftPadding = 5,
  className = "",
}: SidebarRouteItemProps) {
  const style: CSSCustomProperties = {
    "--sidebar-route-icon-gap": toCssSize(iconGap),
    "--sidebar-route-left-padding": toCssSize(leftPadding),
  };

  return (
    <NavLink
      to={to}
      end={end}
      style={style}
      className={({ isActive }) =>
        `sidebar-route-link${isActive ? " is-active" : ""}${className ? ` ${className}` : ""}`
      }
    >
      <span className="sidebar-route-link-content">
        <span className="sidebar-route-link-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="sidebar-route-link-label">{label}</span>
      </span>
    </NavLink>
  );
}
