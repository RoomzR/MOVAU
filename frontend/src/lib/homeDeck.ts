export const HOME_TOP_EVENT = "movau-home-top";

export function requestHomeTop() {
  window.dispatchEvent(new Event(HOME_TOP_EVENT));
}
