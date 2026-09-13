/** Keep stored text safe on Windows Postgres that is not UTF-8. */
export function asciiSafe(value: string): string {
  return value
    .replace(/\u2192/g, '->')
    .replace(/\u2190/g, '<-')
    .replace(/\u2014|\u2013|\u2212/g, '-')
    .replace(/\u00b7/g, '-')
    .replace(/\u2018|\u2019|\u201a/g, "'")
    .replace(/\u201c|\u201d|\u201e/g, '"')
}

export function jsonb(value: unknown): string {
  return JSON.stringify(value, (_key, current) => (typeof current === 'string' ? asciiSafe(current) : current))
}
