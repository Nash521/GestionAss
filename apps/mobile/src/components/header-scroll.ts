export type HeaderScrollState = { offset: number; distance: number; visible: boolean };
export const initialHeaderScrollState = (): HeaderScrollState => ({ offset: 0, distance: 0, visible: true });

export function nextHeaderScrollState(state: HeaderScrollState, rawOffset: number): HeaderScrollState {
  const offset = Math.max(0, rawOffset);
  if (offset < 12) return { offset, distance: 0, visible: true };
  const delta = offset - state.offset;
  const distance = delta === 0 ? state.distance : Math.sign(delta) === Math.sign(state.distance) ? state.distance + delta : delta;
  if (Math.abs(distance) >= 12) return { offset, distance: 0, visible: distance < 0 };
  return { offset, distance, visible: state.visible };
}
