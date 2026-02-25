import { NavLink } from "react-router-dom";

function toCssSize(value) {
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
}) {
  const style = {
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
