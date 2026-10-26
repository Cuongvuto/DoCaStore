export function configureProxy(app, value = process.env.TRUST_PROXY_HOPS ?? '0') {
  if (!/^[0-5]$/.test(value)) throw new Error('TRUST_PROXY_HOPS must be an integer from 0 to 5');
  // Never trust arbitrary X-Forwarded-For. Set the verified proxy hop count on hosting.
  app.set('trust proxy', Number(value));
}
