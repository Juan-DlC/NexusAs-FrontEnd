export function toUpperCase(value) {
  return value ? value.toUpperCase() : value
}

/**
 * Convierte texto a mayúsculas preservando la posición del cursor
 * Uso: @input="handleUpperCase($event, (val) => form.field = val)"
 */
export function handleUpperCase(event, setter) {
  const input = event.target
  const cursorPos = input.selectionStart
  const upperValue = input.value.toUpperCase()
  
  setter(upperValue)
  
  // Restaurar posición del cursor en el siguiente tick
  setTimeout(() => {
    input.setSelectionRange(cursorPos, cursorPos)
  }, 0)
}
