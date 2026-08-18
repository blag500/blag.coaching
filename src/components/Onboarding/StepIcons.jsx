/**
 * The pictograms the onboarding flows draw with — one stroke on a dark ground,
 * the same weight and viewBox as the bottom-nav set. Shared by both the
 * self-serve calculator flow and the coaching intake, so an emoji never creeps
 * back into one of them alone. No colour of their own: they take currentColor
 * from the badge that holds them.
 */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export const FlameIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5Z" />
  </svg>
)

export const ScaleIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="M7 21h10" />
    <path d="M12 3v18" />
    <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
  </svg>
)

export const DumbbellIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="5" y1="9"  x2="5"  y2="15" />
    <line x1="19" y1="9" x2="19" y2="15" />
    <line x1="3" y1="10" x2="3"  y2="14" />
    <line x1="21" y1="10" x2="21" y2="14" />
    <line x1="3" y1="12" x2="5"  y2="12" />
    <line x1="19" y1="12" x2="21" y2="12" />
  </svg>
)

export const TargetIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.4" />
  </svg>
)

export const CameraIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
    <path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4l-1.5-2Z" />
    <circle cx="12" cy="13" r="3.2" />
  </svg>
)

export const CheckIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

/* The goal options carry their pictogram rather than an emoji string. Kept here
   next to the icons so the pairing is defined in one place for both flows. */
export const GOAL_ICON = {
  cut:      FlameIcon,
  maintain: ScaleIcon,
  bulk:     DumbbellIcon,
}
