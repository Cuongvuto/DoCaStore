export const toInternalPath = (value, fallback = '/') => {
  if (typeof value !== 'string') return fallback;

  const path = value.trim();
  const hasControlCharacter = [...path].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
  if (
    !path.startsWith('/')
    || path.startsWith('//')
    || path.includes('\\')
    || hasControlCharacter
  ) {
    return fallback;
  }

  return path;
};
