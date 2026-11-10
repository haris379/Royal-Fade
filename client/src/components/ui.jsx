import { useState } from "react";
import { CircleAlert, CircleCheck, Loader2 } from "lucide-react";
import { assetUrl } from "../lib/api.js";

export const Spinner = ({
  label = "Loading",
  light = false,
  className = "",
}) => (
  <div
    className={`flex items-center justify-center gap-3 py-12 ${light ? "text-ink-700" : "text-smoke-300"} ${className}`}
    role="status"
  >
    <Loader2 className="h-5 w-5 animate-spin text-gold-600" aria-hidden />{" "}
    <span className="text-sm">{label}...</span>
  </div>
);

export function Alert({
  kind = "error",
  light = false,
  children,
  className = "",
}) {
  const ok = kind === "success";
  const dark = ok
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
    : kind === "info"
      ? "border-gold-500/40 bg-gold-500/10 text-gold-200"
      : "border-red-500/40 bg-red-500/10 text-red-200";
  const bright = ok
    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
    : kind === "info"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : "border-red-300 bg-red-50 text-red-900";
  return (
    <div
      role={ok ? "status" : "alert"}
      className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${light ? bright : dark} ${className}`}
    >
      {ok ? (
        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      )}
      <div>{children}</div>
    </div>
  );
}

/** Centred section heading: small amber label, bold title, grey subtitle (as in the design references). */
export function Heading({
  label,
  title,
  children,
  dark = false,
  as: Tag = "h2",
  className = "",
}) {
  return (
    <div className={`mx-auto mb-12 max-w-2xl text-center ${className}`}>
      {label && (
        <p className={`eyebrow ${dark ? "text-gold-400" : "text-gold-700"}`}>
          {label}
        </p>
      )}
      <Tag
        className={`text-3xl sm:text-[2.6rem] sm:leading-tight ${dark ? "text-white" : "text-ink-700"}`}
      >
        {title}
      </Tag>
      {children && (
        <p
          className={`mt-4 text-base leading-relaxed sm:text-lg ${dark ? "text-smoke-300" : "text-[#57534e]"}`}
        >
          {children}
        </p>
      )}
    </div>
  );
}

/** A form field with label and error text. `dark` selects the colour scheme. */
export function Field({
  label,
  error,
  hint,
  id,
  dark = true,
  className = "",
  children,
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={dark ? "label" : "label-light"}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <p
          className={`mt-1 text-xs ${dark ? "text-smoke-400" : "text-[#57534e]"}`}
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          className={`mt-1 text-xs ${dark ? "text-red-300" : "text-red-700"}`}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/** Image with a graceful fallback if the file is missing, so a broken path never shows a broken-image icon. */
export function Img({ src, alt, className = "", ...rest }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-char-800 text-gold-500 ${className}`}
        role="img"
        aria-label={alt}
      >
        <span className="text-3xl font-bold">RF</span>
      </div>
    );
  }
  return (
    <img
      src={assetUrl(src)}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
