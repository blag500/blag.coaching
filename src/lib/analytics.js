export function trackPage(tabName) {
  if (typeof gtag === 'undefined') return
  gtag('event', 'page_view', {
    page_title: tabName,
    page_location: window.location.href.split('#')[0] + '#' + tabName,
  })
}

export function trackEvent(eventName, params = {}) {
  if (typeof gtag === 'undefined') return
  gtag('event', eventName, params)
}
