import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "ink" | "outline";
};

export function Button({ variant = "ink", className = "", ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-3 font-sans text-[10px] tracking-[0.2em] uppercase px-7 py-4 transition-colors duration-300 cursor-pointer";
  const variants = {
    ink: "bg-ink text-white border border-ink hover:bg-transparent hover:text-ink",
    outline: "bg-transparent text-ink border border-line hover:border-ink",
  };

  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
