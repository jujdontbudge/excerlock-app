/** Google iOS clients use the reversed-client-ID custom scheme, not excerlock://. */
export function googleOAuthRedirect(clientId: string): { scheme: string; redirectUri: string } {
  if (!/^[a-zA-Z0-9-]+\.apps\.googleusercontent\.com$/.test(clientId)) throw new Error('Invalid Google iOS client ID');
  const scheme = clientId.split('.').reverse().join('.');
  return { scheme, redirectUri: `${scheme}:/oauthredirect` };
}
