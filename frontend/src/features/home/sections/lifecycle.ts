export function init(element: Element) {
  element.setAttribute("data-section-ready", "true");
}

export function destroy(element: Element) {
  element.removeAttribute("data-section-ready");
}
