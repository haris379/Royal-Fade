import { Link } from "react-router-dom";
import { site } from "../config/site.js";

/** Crown over a "fade" (bars that taper in width and opacity). */
export function Mark({ className = "h-10 w-10" }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* badge */}
      <circle cx="24" cy="24" r="23" className="fill-gold-500" />
      <circle
        cx="24"
        cy="24"
        r="20.5"
        fill="none"
        strokeWidth="0.8"
        className="stroke-ink-900"
        opacity="0.35"
      />

      {/* crown */}
      <path
        d="M12 27 L10 14 L18 20 L24 11 L30 20 L38 14 L36 27 Z"
        className="fill-ink-900"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="13" r="2" className="fill-ink-900" />
      <circle cx="24" cy="10" r="2" className="fill-ink-900" />
      <circle cx="38" cy="13" r="2" className="fill-ink-900" />

      {/* the fade */}
      <rect
        x="12"
        y="30.5"
        width="24"
        height="2.6"
        rx="1.3"
        className="fill-ink-900"
      />
      <rect
        x="15"
        y="35"
        width="18"
        height="2.6"
        rx="1.3"
        className="fill-ink-900"
        opacity="0.7"
      />
      <rect
        x="19"
        y="39.5"
        width="10"
        height="2.6"
        rx="1.3"
        className="fill-ink-900"
        opacity="0.4"
      />
    </svg>
  );
}
export default function Logo({ to = "/", onClick, tagline = true }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="group flex items-center gap-2.5 text-white"
      aria-label={`${site.name} home`}
    >
      <Mark className="h-8 w-8 transition-transform duration-300 group-hover:scale-105" />
      <span className="flex flex-col leading-none">
        <span className="text-base font-bold uppercase tracking-[0.14em]">
          Royal <span className="text-gold-400">Fade</span>
        </span>
        {tagline && (
          <span className="mt-1 hidden text-[0.5rem] font-medium uppercase tracking-[0.28em] text-white/60 sm:block">
            Premium Barber Studio
          </span>
        )}
      </span>
    </Link>
  );
}
