import styles from './Skeleton.module.css'

export default function Skeleton({ width = '100%', height = 14, circle = false, style = {} }) {
  return (
    <div
      className={styles.skeleton}
      style={{
        width,
        height: circle ? width : height,
        borderRadius: circle ? '50%' : 6,
        ...style,
      }}
      aria-hidden="true"
    />
  )
}
