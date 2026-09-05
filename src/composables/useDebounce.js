import { ref, watch, onUnmounted } from 'vue'

/**
 * Composable para debounce con indicador de estado
 * @param {Function} fn - Función a ejecutar con debounce
 * @param {number} delay - Delay en milisegundos (default: 300ms)
 * @returns {Object} - Función debounceable y estado
 */
export function useDebounce(fn, delay = 300) {
  const isPending = ref(false)
  let timeoutId = null

  function debouncedFn(...args) {
    isPending.value = true

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(async () => {
      try {
        await fn(...args)
      } finally {
        isPending.value = false
      }
    }, delay)
  }

  function cancel() {
    if (timeoutId) {
      clearTimeout(timeoutId)
      isPending.value = false
    }
  }

  function flush() {
    if (timeoutId) {
      clearTimeout(timeoutId)
      fn()
      isPending.value = false
    }
  }

  // Limpiar al desmontar
  onUnmounted(() => {
    cancel()
  })

  return {
    debouncedFn,
    isPending,
    cancel,
    flush
  }
}

/**
 * Hook para debounce reactivo de un ref
 * @param {Ref} source - Ref a observar
 * @param {Function} fn - Función a ejecutar
 * @param {number} delay - Delay en milisegundos
 * @returns {Object} - Estado del debounce
 */
export function useDebouncedRef(source, fn, delay = 300) {
  const { debouncedFn, isPending, cancel } = useDebounce(fn, delay)

  watch(source, () => {
    debouncedFn(source.value)
  })

  return {
    isPending,
    cancel
  }
}
