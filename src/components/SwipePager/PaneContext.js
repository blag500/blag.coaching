import { createContext, useContext } from 'react'

/**
 * Where a page should put the things it pins to the screen, and whether it is
 * the page the user is on.
 *
 * A bar pinned to the bottom of the window cannot simply live inside the page:
 * a sliding ancestor becomes its containing block and it gets measured against
 * the page instead of the window. But hoisting it to the document leaves it
 * nailed in place while its own page slides away, which looks just as wrong.
 *
 * So each pane owns a chrome layer — fixed, the size of the window, and carried
 * by the same transform as the pane. Anything portalled into it is positioned
 * against the window, and still travels with the page it belongs to.
 */
const PaneContext = createContext({ chrome: null, live: true })

export const PaneProvider = PaneContext.Provider
export function usePane() { return useContext(PaneContext) }
