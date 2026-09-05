import { ref, watch } from 'vue'

/**
 * Composable para validación en tiempo real de formularios
 * @param {Object} rules - Reglas de validación { field: [rule1, rule2] }
 * @returns {Object} - Errores y función de validación
 */
export function useFormValidation(rules = {}) {
  const errors = ref({})
  const touched = ref({})

  /**
   * Validar un campo específico
   * @param {string} field - Nombre del campo
   * @param {any} value - Valor del campo
   * @returns {string|null} - Mensaje de error o null
   */
  function validateField(field, value) {
    const fieldRules = rules[field]
    if (!fieldRules || !Array.isArray(fieldRules)) return null

    for (const rule of fieldRules) {
      const error = rule(value)
      if (error) return error
    }

    return null
  }

  /**
   * Validar todos los campos
   * @param {Object} formData - Datos del formulario
   * @returns {boolean} - true si todo es válido
   */
  function validate(formData) {
    const newErrors = {}
    let isValid = true

    Object.keys(rules).forEach(field => {
      const error = validateField(field, formData[field])
      if (error) {
        newErrors[field] = error
        isValid = false
      }
    })

    errors.value = newErrors
    return isValid
  }

  /**
   * Marcar un campo como tocado
   * @param {string} field - Nombre del campo
   */
  function touch(field) {
    touched.value[field] = true
  }

  /**
   * Limpiar errores
   */
  function clearErrors() {
    errors.value = {}
    touched.value = {}
  }

  /**
   * Obtener error de un campo (solo si ha sido tocado)
   * @param {string} field - Nombre del campo
   * @returns {string|null}
   */
  function getError(field) {
    return touched.value[field] ? errors.value[field] : null
  }

  /**
   * Verificar si un campo tiene error
   * @param {string} field - Nombre del campo
   * @returns {boolean}
   */
  function hasError(field) {
    return touched.value[field] && !!errors.value[field]
  }

  /**
   * Verificar si un campo es válido (y ha sido tocado)
   * @param {string} field - Nombre del campo
   * @returns {boolean}
   */
  function isValid(field) {
    return touched.value[field] && !errors.value[field]
  }

  return {
    errors,
    touched,
    validateField,
    validate,
    touch,
    clearErrors,
    getError,
    hasError,
    isValid
  }
}

// ============================================
// REGLAS DE VALIDACIÓN PREDEFINIDAS
// ============================================

/**
 * Regla: Campo requerido
 * @param {string} message - Mensaje personalizado
 */
export const required = (message = 'Este campo es requerido') => {
  return (value) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return message
    }
    return null
  }
}

/**
 * Regla: Longitud mínima
 * @param {number} min - Longitud mínima
 * @param {string} message - Mensaje personalizado
 */
export const minLength = (min, message) => {
  return (value) => {
    if (value && value.length < min) {
      return message || `Debe tener al menos ${min} caracteres`
    }
    return null
  }
}

/**
 * Regla: Longitud máxima
 * @param {number} max - Longitud máxima
 * @param {string} message - Mensaje personalizado
 */
export const maxLength = (max, message) => {
  return (value) => {
    if (value && value.length > max) {
      return message || `Debe tener máximo ${max} caracteres`
    }
    return null
  }
}

/**
 * Regla: Email válido
 * @param {string} message - Mensaje personalizado
 */
export const email = (message = 'Email inválido') => {
  return (value) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return message
    }
    return null
  }
}

/**
 * Regla: Número mínimo
 * @param {number} min - Valor mínimo
 * @param {string} message - Mensaje personalizado
 */
export const minValue = (min, message) => {
  return (value) => {
    const num = Number(value)
    if (!isNaN(num) && num < min) {
      return message || `Debe ser al menos ${min}`
    }
    return null
  }
}

/**
 * Regla: Número máximo
 * @param {number} max - Valor máximo
 * @param {string} message - Mensaje personalizado
 */
export const maxValue = (max, message) => {
  return (value) => {
    const num = Number(value)
    if (!isNaN(num) && num > max) {
      return message || `Debe ser máximo ${max}`
    }
    return null
  }
}

/**
 * Regla: Patrón regex
 * @param {RegExp} pattern - Patrón a validar
 * @param {string} message - Mensaje personalizado
 */
export const pattern = (pattern, message = 'Formato inválido') => {
  return (value) => {
    if (value && !pattern.test(value)) {
      return message
    }
    return null
  }
}

/**
 * Regla: Confirmar password
 * @param {string} passwordField - Campo password original
 * @param {Object} formData - Datos del formulario
 * @param {string} message - Mensaje personalizado
 */
export const sameAs = (otherField, getOtherValue, message) => {
  return (value) => {
    const otherValue = getOtherValue()
    if (value && value !== otherValue) {
      return message || `Debe coincidir con ${otherField}`
    }
    return null
  }
}
