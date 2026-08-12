import { createContext, useContext } from 'react'

/**
 * Whether the page reading this is the one the user is on, or the preview of a
 * neighbour arriving under the finger.
 *
 * Anything a page pins to the screen has to be rendered outside the sliding
 * pane, which means it cannot slide with it — so a neighbour's bottom bar would
 * otherwise appear at the foot of the display before the page it belongs to had
 * arrived. Chrome like that waits until its page is actually the live one.
 */
const PaneContext = createContext(true)

export const PaneProvider = PaneContext.Provider
export function useIsLivePane() { return useContext(PaneContext) }
