import styles from './BotBubble.module.css'
import { useSettings } from '../../contexts/SettingsContext'
import { haptic } from '../../lib/haptics'

/**
 * Балончето на бота.
 *
 * Стои на един и същи ъгъл на всеки екран, защото въпросът идва, където
 * дойде: човек гледа теглото си и се пита защо стои, гледа тренировката и се
 * пита дали да я мести. Помощник, до който се стига през чекмеджето, се
 * използва, когато човек вече е решил да го използва — а точно това решение
 * е стъпката, която убива въпроса.
 *
 * Живее в обвивката на приложението, не вътре в страница: разделите се движат
 * с трансформация при плъзгане и `position: fixed` вътре в тях се закача за
 * тях, не за прозореца.
 *
 * Не се рисува на своя екран. Балонче, което отваря страницата, на която
 * стоиш, е предложение да отидеш там, където вече си.
 */
export default function BotBubble({ activeTab, onOpen }) {
  const { t } = useSettings()
  if (activeTab === 'bot') return null

  return (
    <button
      type="button"
      className={styles.bubble}
      onClick={() => { haptic('tap'); onOpen('bot') }}
      aria-label={t('nav.bot')}
    >
      <img src="/bot.webp" alt="" width="34" height="34" />
    </button>
  )
}
