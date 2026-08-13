import styles from './EstimateFlag.module.css'

/**
 * Marks a number a machine guessed rather than read.
 *
 * The macro lookup, the label scan and the food photo all end in figures that
 * look exactly like the ones off a package — same field, same weight, same
 * confidence — and there is nothing in them to say one was measured and the
 * other inferred from a sentence. A day built on a bad guess is a day the coach
 * reads as fact, so the guess has to admit what it is at the moment it is
 * offered, while correcting it still costs nothing.
 *
 * Drawn rather than an emoji: an emoji is somebody else's typeface, changes
 * shape on every platform, and reads as decoration next to numbers. The
 * approximately-equal sign already means this and means nothing else.
 */
export default function EstimateFlag({ children, className = '' }) {
  return (
    <p className={`${styles.flag} ${className}`}>
      <svg viewBox="0 0 20 20" width="15" height="15" className={styles.mark} aria-hidden="true">
        <rect x="1.5" y="1.5" width="17" height="17" rx="5"
              fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
        <path d="M5 8.2c1.4-1.6 2.6-1.6 4 0s2.6 1.6 4 0M5 12.4c1.4-1.6 2.6-1.6 4 0s2.6 1.6 4 0"
              fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" transform="translate(1,0)" />
      </svg>
      <span>{children ?? <>Изчислено приблизително. <b>Провери числата</b>, преди да запишеш.</>}</span>
    </p>
  )
}
