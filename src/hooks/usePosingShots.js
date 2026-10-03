import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Снимките от позинга на един човек.
 *
 * Кофата е частна (миграция 122), затова тук няма publicUrl: всяка снимка се
 * чете с временен линк, издаден наведнъж за всички — един заявка, не осем.
 * Час е достатъчно за една сесия гледане; при следващо отваряне се издават нови.
 *
 * Треньорът подава userId на клиента; RLS-ът пуска него и собственика, никой друг.
 */
const BUCKET = 'posing'
const LINK_TTL = 60 * 60

export function usePosingShots(userId) {
  const [shots, setShots] = useState([])   // { id, pose_id, taken_on, path, url }
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) { setShots([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('posing_shots')
      .select('id, pose_id, taken_on, path')
      .eq('user_id', userId)
      .order('taken_on', { ascending: false })
    const rows = data ?? []
    let urls = {}
    if (rows.length) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(rows.map(r => r.path), LINK_TTL)
      for (const s of signed ?? []) if (s?.signedUrl) urls[s.path] = s.signedUrl
    }
    setShots(rows.map(r => ({ ...r, url: urls[r.path] ?? null })))
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  /**
   * Качва една снимка. Същата поза същия ден заменя старата — и в таблицата,
   * и в кофата, за да не остават сираци, които никой не вижда, а се плащат.
   */
  const save = useCallback(async (poseId, blob, takenOn) => {
    if (!userId) return { error: new Error('no user') }
    const path = `${userId}/${takenOn}/${poseId}-${Date.now()}.jpg`
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: 'image/jpeg' })
    if (upErr) return { error: upErr }

    const old = shots.find(s => s.pose_id === poseId && s.taken_on === takenOn)
    const { error } = await supabase
      .from('posing_shots')
      .upsert({ user_id: userId, pose_id: poseId, taken_on: takenOn, path },
              { onConflict: 'user_id,pose_id,taken_on' })
    if (error) {
      await supabase.storage.from(BUCKET).remove([path])
      return { error }
    }
    if (old?.path && old.path !== path) await supabase.storage.from(BUCKET).remove([old.path])

    // Новата снимка се вижда веднага, без второ ходене до сървъра за линк:
    // локалният blob е същата картина.
    const url = URL.createObjectURL(blob)
    setShots(prev => [
      { id: old?.id ?? path, pose_id: poseId, taken_on: takenOn, path, url },
      ...prev.filter(s => !(s.pose_id === poseId && s.taken_on === takenOn)),
    ].sort((a, b) => (a.taken_on < b.taken_on ? 1 : -1)))
    return { error: null }
  }, [userId, shots])

  const remove = useCallback(async shot => {
    const { error } = await supabase.from('posing_shots').delete().eq('id', shot.id)
    if (error) return { error }
    await supabase.storage.from(BUCKET).remove([shot.path])
    setShots(prev => prev.filter(s => s.id !== shot.id))
    return { error: null }
  }, [])

  return { shots, loading, save, remove, reload: load }
}
