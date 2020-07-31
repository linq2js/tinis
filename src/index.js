import createState from './createState';
import createEffect from './createEffect';
import {createDebounce, createThrottle, createLatest, delayIn} from './utils';

export const state = createState;
export const effect = createEffect;
export const task = {
  debounce: createDebounce,
  throttle: createThrottle,
  latest: createLatest,
  delay: delayIn,
};
