export function LogoMark({ className = "h-[30px] w-[30px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <path d="M9 28V5h14v23" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12.5 9.5h7M12.5 13.5h7M12.5 17.5h7M12.5 21.5h7" stroke="#b08a57" strokeWidth="1.6" />
    </svg>
  );
}

export function LogoText({ short, sub }: { short: string; sub: string }) {
  return (
    <span>
      <b className="block font-display text-[21px] leading-none font-normal tracking-[0.24em]">{short}</b>
      <small className="mt-[5px] block font-mono text-[9px] leading-none tracking-[0.3em] opacity-70">{sub}</small>
    </span>
  );
}
