export function formatNumber(n) {
  return Number(n || 0).toLocaleString('es-CO')
}

export function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  })
}

export function formatDateTime(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
