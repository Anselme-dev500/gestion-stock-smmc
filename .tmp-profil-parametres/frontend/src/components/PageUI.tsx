import React from "react";

/* =========================================================
   PAGE HEADER
========================================================= */

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: string;
  action?: React.ReactNode;
};

export function PageHeader({
  title,
  subtitle,
  icon = "▦",
  action,
}: PageHeaderProps) {

  return (
    <div className="page-header">

      <div>

        <div className="page-breadcrumb">
          SMMC / Gestion du stock / {title}
        </div>

        <div className="page-title-row">

          <span className="page-title-icon">
            {icon}
          </span>

          <div>

            <h1 className="page-title">
              {title}
            </h1>

            {subtitle && (
              <p className="page-subtitle">
                {subtitle}
              </p>
            )}

          </div>

        </div>

      </div>

      {action && (
        <div className="page-header-actions">
          {action}
        </div>
      )}

    </div>
  );
}


/* =========================================================
   BUTTON
========================================================= */

type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "outline"
  | "warning";

type ButtonProps = {
  children: React.ReactNode;

  variant?: ButtonVariant;

  onClick?: () => void;

  type?: "button" | "submit";

  disabled?: boolean;

  className?: string;
};

export function Button({
  children,
  variant = "primary",
  onClick,
  type = "button",
  disabled = false,
  className = "",
}: ButtonProps) {

  return (

    <button
      type={type}
      className={`smmc-btn smmc-btn-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>

  );
}


/* =========================================================
   SEARCH BOX
========================================================= */

type SearchBoxProps = {
  value: string;

  onChange: (value: string) => void;

  placeholder?: string;
};

export function SearchBox({
  value,
  onChange,
  placeholder = "Rechercher...",
}: SearchBoxProps) {

  return (

    <div className="smmc-search">

      <span>
        ⌕
      </span>

      <input
        type="search"
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
      />

    </div>
  );
}


/* =========================================================
   STATUS BADGE
========================================================= */

type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "info";

type StatusBadgeProps = {
  children: React.ReactNode;

  tone?: StatusTone;
};

export function StatusBadge({
  children,
  tone = "success",
}: StatusBadgeProps) {

  return (

    <span
      className={`status-badge status-${tone}`}
    >
      {children}
    </span>

  );
}


/* =========================================================
   EMPTY STATE
========================================================= */

type EmptyStateProps = {
  title?: string;

  text?: string;

  icon?: string;
};

export function EmptyState({
  title = "Aucune donnée",
  text = "Aucune donnée disponible.",
  icon = "□",
}: EmptyStateProps) {

  return (

    <div className="empty-state">

      <div className="empty-icon">
        {icon}
      </div>

      <div className="empty-title">
        {title}
      </div>

      <div className="empty-text">
        {text}
      </div>

    </div>

  );
}