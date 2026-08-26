import { useEffect } from 'react'

/**
 * Публикува височината на софтуерната клавиатура като CSS променлива
 * `--kb-inset` на `<html>`. Sheet-овете (QuickAddSheet, FoodLog editors,
 * chat input и т.н.) ползват стойността като допълнително `padding-bottom`
 * или `transform: translateY(-var(--kb-inset))`, за да останат видими
 * над клавиатурата.
 *
 * Разчита на `window.visualViewport`, което iOS Safari (включително
 * home-screen PWA) и модерен Chrome/Android поддържат. При липса на
 * поддръжка променливата остава 0px и layout-ът е като преди.
 *
 * Един слушател за цялото приложение — hook-ва се веднъж в AppShell.
 */
export function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport
    const root = document.documentElement
    if (!vv) {
      root.style.setProperty('--kb-inset', '0px')
      return
    }

    const update = () => {
      // Клавиатурата „изяжда" разликата между window.innerHeight и
      // visualViewport.height (плюс евентуален offsetTop, ако страницата
      // е скролната). Минималната стойност е 0 — при затворена клавиатура
      // двете стойности съвпадат.
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      root.style.setProperty('--kb-inset', kb + 'px')
    }

    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()

    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      root.style.removeProperty('--kb-inset')
    }
  }, [])
}
