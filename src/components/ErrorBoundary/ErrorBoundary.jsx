import { Component } from 'react'
import { tr } from '../../utils/locale'
import styles from './ErrorBoundary.module.css'

/**
 * Какво се вижда, когато нещо гръмне.
 *
 * Без това React разглобява цялото дърво при първата хвърлена грешка и
 * остава черен екран — точно това се случи, когато една функция се извика с
 * един аргумент вместо с два. Черният екран не казва нищо нито на клиента,
 * нито на този, който трябва да го поправи.
 *
 * Класов компонент, защото componentDidCatch няма аналог с кукички — затова
 * и преводът минава през tr(), а не през useSettings.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Остава в конзолата с целия стек — това е, което се чете после.
    console.error('[blag] екранът гръмна:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <h1 className={styles.title}>{tr('eb.title')}</h1>
          <p className={styles.lead}>{tr('eb.lead')}</p>

          {/* Съобщението, не стекът: то е достатъчно да се намери мястото, а
              стекът върху телефон е стена, която никой не чете. */}
          <p className={styles.detail}>{String(this.state.error?.message || this.state.error)}</p>

          <button
            type="button"
            className={styles.btn}
            onClick={() => window.location.reload()}
          >
            {tr('eb.reload')}
          </button>
        </div>
      </div>
    )
  }
}
