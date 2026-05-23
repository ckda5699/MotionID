const paths = {
  back: <path d="M15.5 5.5 9 12l6.5 6.5" />,
  bell: <><path d="M6.5 17h11l-1.3-2.1v-4.2a4.2 4.2 0 0 0-8.4 0v4.2L6.5 17Z" /><path d="M10.3 19a1.9 1.9 0 0 0 3.4 0" /></>,
  home: <path d="M4.5 11.3 12 5l7.5 6.3v7.2a1 1 0 0 1-1 1h-4.2v-5.4H9.7v5.4H5.5a1 1 0 0 1-1-1v-7.2Z" />,
  matches: <><rect x="4.6" y="5.4" width="14.8" height="13.8" rx="2" /><path d="M8 3.8v3.6M16 3.8v3.6M4.8 10h14.4" /></>,
  calendar: <><rect x="4.6" y="5.4" width="14.8" height="13.8" rx="2" /><path d="M8 3.8v3.6M16 3.8v3.6M8 13h8" /></>,
  focus: <><path d="M8 3.8H4v4M16 3.8h4v4M8 20.2H4v-4M20 16.2v4h-4" /><circle cx="12" cy="12" r="3.2" /></>,
  news: <><rect x="5" y="4.5" width="14" height="15" rx="2" /><path d="M8 8.5h8M8 12h8M8 15.5h5.5" /></>,
  more: <><circle cx="6.5" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="17.5" cy="12" r="1.2" fill="currentColor" /></>,
  timer: <><circle cx="12" cy="13" r="7" /><path d="M9.5 3.8h5M12 8.8v4.6l3.1 1.8" /></>,
  replay: <><path d="M7.2 7.4A6.7 6.7 0 1 1 6 15.9" /><path d="M7.4 3.9v3.8H3.6" /></>,
  pause: <><path d="M8.2 6v12M15.8 6v12" /></>,
  play: <path d="M8 5.8v12.4l10-6.2L8 5.8Z" />,
  arrow: <><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></>,
  trophy: <><path d="M8 5h8v4.5a4 4 0 0 1-8 0V5Z" /><path d="M8 7H5.5a2 2 0 0 0 2 3.4M16 7h2.5a2 2 0 0 1-2 3.4M12 13.5v3M8.5 19h7" /></>,
  chart: <><path d="M5 18V9M10 18V6M15 18v-4M20 18V4" /><path d="M4 20h17" /></>,
  user: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 19a6.5 6.5 0 0 1 13 0" /></>,
  ball: <><circle cx="12" cy="12" r="8" /><path d="m12 7 3 2-1.1 3.5h-3.8L9 9l3-2ZM10.1 12.5 7 15M13.9 12.5 17 15M9 9 6.2 8M15 9l2.8-1" /></>,
  goal: <><path d="M4 18V7h16v11M7 18V10h10v8" /><path d="M4 10h16" /></>,
  keeper: <><path d="M12 4v16M5 9l7-5 7 5M5 15l7 5 7-5" /></>,
  expert: <><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6-4.4-4.3 6.1-.9L12 3Z" /></>,
  cards: <><rect x="6" y="5" width="10" height="14" rx="1.5" /><path d="M9 3h9v13M12 8h2M9 12h4" /></>,
  check: <path d="m5 12 4 4 10-10" />,
  x: <><path d="m7 7 10 10M17 7 7 17" /></>,
  lock: <><rect x="6.4" y="10.4" width="11.2" height="9" rx="1.7" /><path d="M8.7 10.4V8a3.3 3.3 0 0 1 6.6 0v2.4M12 14v2" /></>,
  search: <><circle cx="10.8" cy="10.8" r="5.8" /><path d="m15.2 15.2 4 4" /></>,
};

export function Icon({ name, className = "", title }) {
  return (
    <svg className={`icon ${className}`} viewBox="0 0 24 24" aria-hidden={title ? undefined : "true"} role={title ? "img" : undefined}>
      {title ? <title>{title}</title> : null}
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {paths[name]}
      </g>
    </svg>
  );
}
