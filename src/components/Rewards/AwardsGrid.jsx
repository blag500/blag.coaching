import { useSettings } from '../../contexts/SettingsContext'
import Pictogram from '../Pictogram/Pictogram'
import { AWARDS, sortAwards } from './awards'
import styles from './AwardsGrid.module.css'

/**
 * Спечеленото, наредено.
 *
 * Показват се и неспечелените, угаснали. Страница само със спечелени казва
 * какво е било; страница с двете казва и какво следва — а следващата награда
 * е единствената причина някой да отвори тази страница втори път. Затова
 * неспечелените са подредени по близост: първата отгоре е тази, до която
 * остава най-малко.
 *
 * Знакът е от рисувания набор, не готова картинка: осемнайсет медала като
 * файлове са осемнайсет неща за поддържане и половин мегабайт, а формата се
 * прави от една маска.
 */
export default function AwardsGrid({ stats }) {
  const { t } = useSettings()
  const list = sortAwards(AWARDS, stats)
  const earned = list.filter(a => a.of(stats) >= a.need).length

  return (
    <section className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.title}>{t('aw.title')}</span>
        <span className={styles.count}>{t('aw.count', { n: earned, m: AWARDS.length })}</span>
      </div>

      <div className={styles.grid}>
        {list.map(a => {
          const have = a.of(stats)
          const done = have >= a.need
          return (
            <div key={a.id} className={`${styles.item} ${done ? styles.itemOn : ''}`}>
              <span className={styles.medal}>
                <Pictogram name={a.icon} size={30} />
              </span>
              <span className={styles.name}>{t(`aw.${a.id}.title`)}</span>
              <span className={styles.sub}>
                {done ? t(`aw.${a.id}.need`) : t('aw.progress', { n: Math.min(have, a.need), m: a.need })}
              </span>
              {/* Лентата стои само на неспечелените: на спечелена тя би била
                  пълна лента, която не казва нищо. */}
              {!done && (
                <span className={styles.bar}>
                  <span className={styles.barFill} style={{ width: `${Math.min(have / a.need, 1) * 100}%` }} />
                </span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
