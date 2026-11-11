// Tests provide explicit fake transports. Fail closed if an unexpected fetch
// would otherwise reach Google, Expo, analytics, or any other external service.
function unexpectedNetwork(): never {
  throw new Error(
    "Network disabled in state-machine tests; provide a mock transport.",
  );
}

globalThis.fetch = Object.assign(async () => unexpectedNetwork(), {
  preconnect: unexpectedNetwork,
});
