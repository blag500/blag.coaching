import { useState, useEffect, useRef } from 'react'
import { useFriends } from '../../hooks/useFriends'
import { useSettings } from '../../contexts/SettingsContext'
import { haptic } from '../../lib/haptics'
import Pictogram from '../Pictogram/Pictogram'
import styles from './FriendsPage.module.css'

/**
 * Адресникът.
 *
 * Не е стена и не сменя фийда — фийдът си остава общ. Това е списъкът с хора,
 * от който се стига до профил и до бутона ПИШИ, защото досега единственият
 * начин да намериш някого беше да го изчакаш да коментира под теб.
 *
 * Две отношения на един екран, разделени по това дали питат:
 *   · приятелство — покана и приемане, взаимно;
 *   · следване — еднопосочно, без питане.
 * Един и същ човек може да е и двете, и това не е противоречие: следвам те,
 * защото ми е интересно как се справяш, и сме приятели, защото си пишем.
 */

function Avatar({ person, size = 40 }) {
  const url = person?.avatar_url
  const name = person?.name
  return (
    <div className={styles.avatar} style={{ width: size, height: size }}>
      {url
        ? <img src={url} alt="" className={styles.avatarImg} />
        : <span>{(name || '?')[0].toUpperCase()}</span>}
    </div>
  )
}

/** Един ред: кой е човекът, и какво може да се направи с него. */
function PersonRow({ person, onOpen, children }) {
  return (
    <div className={styles.row}>
      <button
        type="button"
        className={styles.who}
        onClick={() => person && onOpen?.(person)}
        disabled={!person}
      >
        <Avatar person={person} />
        <span className={styles.whoText}>
          <span className={styles.whoName}>{person?.name || '—'}</span>
          {person?.username && <span className={styles.whoHandle}>@{person.username}</span>}
        </span>
      </button>
      <div className={styles.rowActions}>{children}</div>
    </div>
  )
}

export default function FriendsPage({ onOpenPerson }) {
  const { t } = useSettings()
  const {
    friends, incoming, outgoing, following, loading,
    search, invite, accept, unlink, follow, unfollow,
    relationTo, isFollowing,
  } = useFriends()

  const [term, setTerm]       = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy]       = useState(null)   // id-то, върху което тече заявка
  const [searching, setSearching] = useState(false)

  /* Търсенето чака пръста да спре. Заявка на всяка буква прави по една
     обиколка до сървъра за „Ни", „Ник", „Нико" — а отговорите се връщат в
     какъвто ред им се случи и последният на екрана може да е за предпоследния
     низ. */
  const termRef = useRef(term)
  termRef.current = term
  useEffect(() => {
    const q = term.trim()
    if (q.length < 2) { setResults([]); setSearching(false); return }
    setSearching(true)
    const id = setTimeout(async () => {
      const found = await search(q)
      // Докато заявката е пътувала, полето може да се е променило.
      if (termRef.current.trim() === q) { setResults(found); setSearching(false) }
    }, 320)
    return () => clearTimeout(id)
  }, [term, search])

  async function run(key, fn) {
    setBusy(key)
    haptic('tap')
    await fn()
    setBusy(null)
  }

  const pendingCount = incoming.length

  return (
    <div className={styles.page}>
      {/* ── Търсене ── */}
      <div className={styles.searchWrap}>
        <input
          className={styles.search}
          value={term}
          onChange={e => setTerm(e.target.value)}
          placeholder={t('fr.searchPlaceholder')}
          aria-label={t('fr.searchPlaceholder')}
        />
        {term && (
          <button type="button" className={styles.searchClear} onClick={() => setTerm('')} aria-label={t('fr.clear')}>×</button>
        )}
      </div>

      {term.trim().length >= 2 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('fr.results')}</h3>
          {searching && <p className={styles.empty}>…</p>}
          {!searching && results.length === 0 && <p className={styles.empty}>{t('fr.noResults')}</p>}
          {results.map(p => {
            const rel = relationTo(p.id)
            const followed = isFollowing(p.id)
            return (
              <PersonRow key={p.id} person={p} onOpen={onOpenPerson}>
                {rel.kind === 'none' && (
                  <button type="button" className={styles.primaryBtn}
                    disabled={busy === p.id}
                    onClick={() => run(p.id, () => invite(p.id))}>
                    {t('fr.add')}
                  </button>
                )}
                {rel.kind === 'sent'     && <span className={styles.stateChip}>{t('fr.sent')}</span>}
                {rel.kind === 'received' && (
                  <button type="button" className={styles.primaryBtn}
                    disabled={busy === p.id}
                    onClick={() => run(p.id, () => accept(rel.linkId))}>
                    {t('fr.accept')}
                  </button>
                )}
                {rel.kind === 'friend'   && <span className={styles.stateChip}>{t('fr.friend')}</span>}

                <button type="button"
                  className={followed ? styles.ghostBtnOn : styles.ghostBtn}
                  disabled={busy === p.id}
                  onClick={() => run(p.id, () => (followed ? unfollow(p.id) : follow(p.id)))}>
                  {followed ? t('fr.following') : t('fr.follow')}
                </button>
              </PersonRow>
            )
          })}
        </section>
      )}

      {/* ── Покани към мен ──
          Първи, защото чакат отговор — а нещо, което чака мен, стои преди
          нещо, което просто е вярно. */}
      {pendingCount > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            {t('fr.incoming')} <span className={styles.count}>{pendingCount}</span>
          </h3>
          {incoming.map(l => (
            <PersonRow key={l.id} person={l.person} onOpen={onOpenPerson}>
              <button type="button" className={styles.primaryBtn}
                disabled={busy === l.id}
                onClick={() => run(l.id, () => accept(l.id))}>
                {t('fr.accept')}
              </button>
              <button type="button" className={styles.ghostBtn}
                disabled={busy === l.id}
                onClick={() => run(l.id, () => unlink(l.id))}>
                {t('fr.decline')}
              </button>
            </PersonRow>
          ))}
        </section>
      )}

      {/* ── Приятели ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          {t('fr.friends')} {friends.length > 0 && <span className={styles.count}>{friends.length}</span>}
        </h3>
        {loading && <p className={styles.empty}>…</p>}
        {!loading && friends.length === 0 && (
          <div className={styles.blank}>
            <Pictogram name="friends" size={34} className={styles.blankIcon} />
            <p className={styles.blankText}>{t('fr.emptyFriends')}</p>
          </div>
        )}
        {friends.map(l => (
          <PersonRow key={l.id} person={l.person} onOpen={onOpenPerson}>
            <button type="button" className={styles.primaryBtn}
              onClick={() => { haptic('tap'); l.person && onOpenPerson?.(l.person) }}>
              {t('fr.message')}
            </button>
            <button type="button" className={styles.ghostBtn}
              disabled={busy === l.id}
              onClick={() => run(l.id, () => unlink(l.id))}>
              {t('fr.remove')}
            </button>
          </PersonRow>
        ))}
      </section>

      {/* ── Мои покани без отговор ── */}
      {outgoing.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('fr.outgoing')}</h3>
          {outgoing.map(l => (
            <PersonRow key={l.id} person={l.person} onOpen={onOpenPerson}>
              <span className={styles.stateChip}>{t('fr.sent')}</span>
              <button type="button" className={styles.ghostBtn}
                disabled={busy === l.id}
                onClick={() => run(l.id, () => unlink(l.id))}>
                {t('fr.cancel')}
              </button>
            </PersonRow>
          ))}
        </section>
      )}

      {/* ── Следвам ── */}
      {following.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            {t('fr.followingTitle')} <span className={styles.count}>{following.length}</span>
          </h3>
          {following.map(f => (
            <PersonRow key={f.otherId} person={f.person} onOpen={onOpenPerson}>
              <button type="button" className={styles.ghostBtnOn}
                disabled={busy === f.otherId}
                onClick={() => run(f.otherId, () => unfollow(f.otherId))}>
                {t('fr.unfollow')}
              </button>
            </PersonRow>
          ))}
        </section>
      )}
    </div>
  )
}
