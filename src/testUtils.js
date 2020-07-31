export const delayIn = (ms = 0, value) =>
  new Promise((resolve) => setTimeout(resolve, ms, value));
