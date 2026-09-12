import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/** Има ли нещо непрочетено от бота.
 *
 *  Ботът вече отваря разговори сам — веднъж вечерта, когато сметнатите правила
 *  намерят повод. Наблюдението обаче не се изпраща като известие: известие с
 *  такова съдържание се изключва заедно с всички останали, а разрешенията вече
 *  са тясното място. Затова чака като точка на балончето — там, където човекът
 *  и без това поглежда.
 *
 *  Броят не се пази в контекст: това е едно число, което се чете при отваряне
 *  на приложението и се променя само когато човек отвори разговора. Известието
 *  `blag:bot-read` е по-евтино от абонамент за таблицата.
 */
export function useBotUnread() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user?.id) { setCount(0); return }

    let alive = true
    /* Редовете, не брой през заглавка: наблюдението е едно на вечер, значи
       редовете са единици, а `count: exact` иска Content-Range — заглавка,
       която не всеки посредник пази. Таван от пет, защото над него числото
       няма значение: показва се точка, не число. */
    const read = async () => {
      const { data } = await supabase
        .from('bot_chats')
        .select('id')
        .eq('user_id', user.id)
        .eq('unread', true)
        .limit(5)
      if (alive) setCount(data?.length ?? 0)
    }
    read()

    const again = () => read()
    window.addEventListener('blag:bot-read', again)
    /* И при връщане към приложението: наблюдението се появява през нощта, а
       телефонът е стоял отворен на същия екран от вечерта. */
    const onShow = () => { if (document.visibilityState === 'visible') read() }
    document.addEventListener('visibilitychange', onShow)

    return () => {
      alive = false
      window.removeEventListener('blag:bot-read', again)
      document.removeEventListener('visibilitychange', onShow)
    }
  }, [user?.id])

  return count
}
