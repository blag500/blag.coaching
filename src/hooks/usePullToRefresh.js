import { useState, useEffect, useRef } from 'react'
import { haptic } from '../lib/haptics'

const THRESHOLD = 68

export function usePullToRefresh(onRefresh) {
  const [distance, setDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startYRef   = useRef(null)
  const busyRef     = useRef(false)
  /* Прагът е минат веднъж за едно дърпане, иначе трептенето около 68 пиксела
     бръмчи непрекъснато. */
  const crossedRef  = useRef(false)

  useEffect(() => {
    function onTouchStart(e) {
      if (window.scrollY > 4 || busyRef.current) return
      startYRef.current = e.touches[0].clientY
    }

    function onTouchMove(e) {
      if (startYRef.current === null || busyRef.current) return
      const dy = e.touches[0].clientY - startYRef.current
      if (dy <= 0) { startYRef.current = null; return }
      const d = Math.min(dy * 0.38, THRESHOLD + 22)
      /* Ударът е при минаване на прага, не при пускането: той казва „дотук
         стига, пусни" — прагът иначе е невидим и човек дърпа наслуки. */
      if (d >= THRESHOLD && !crossedRef.current) { crossedRef.current = true; haptic('toggle') }
      if (d < THRESHOLD) crossedRef.current = false
      setDistance(d)
    }

    async function onTouchEnd() {
      const d = distance
      setDistance(0)
      startYRef.current = null
      crossedRef.current = false
      if (d >= THRESHOLD && !busyRef.current) {
        busyRef.current = true
        setRefreshing(true)
        await onRefresh()
        setRefreshing(false)
        busyRef.current = false
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove',  onTouchMove,  { passive: true })
    window.addEventListener('touchend',   onTouchEnd)
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove',  onTouchMove)
      window.removeEventListener('touchend',   onTouchEnd)
    }
  }, [onRefresh, distance])

  return { distance, refreshing, threshold: THRESHOLD }
}
