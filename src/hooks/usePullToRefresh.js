import { useState, useEffect, useRef } from 'react'

const THRESHOLD = 68

export function usePullToRefresh(onRefresh) {
  const [distance, setDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startYRef   = useRef(null)
  const busyRef     = useRef(false)

  useEffect(() => {
    function onTouchStart(e) {
      if (window.scrollY > 4 || busyRef.current) return
      startYRef.current = e.touches[0].clientY
    }

    function onTouchMove(e) {
      if (startYRef.current === null || busyRef.current) return
      const dy = e.touches[0].clientY - startYRef.current
      if (dy <= 0) { startYRef.current = null; return }
      setDistance(Math.min(dy * 0.38, THRESHOLD + 22))
    }

    async function onTouchEnd() {
      const d = distance
      setDistance(0)
      startYRef.current = null
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
