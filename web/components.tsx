import { ButtonHTMLAttributes, TextareaHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return <button className={`button button--${variant} ${className}`} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="textarea" {...props} />;
}

export function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}

export function Panel({ children, className = "", active = false }: { children: React.ReactNode; className?: string; active?: boolean }) {
  return <section className={`panel ${active ? "panel--active" : ""} ${className}`}>{children}</section>;
}