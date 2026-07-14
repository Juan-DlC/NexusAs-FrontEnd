<template>
  <input
    type="text"
    class="form-input"
    :value="displayValue"
    @input="onInput"
    @blur="onBlur"
    :placeholder="placeholder"
  />
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: [Number, String], default: 0 },
  placeholder: { type: String, default: '$ 0' }
})

const emit = defineEmits(['update:modelValue'])

function formatToCOP(value) {
  const num = Number(value) || 0
  return num === 0 ? '' : `$ ${num.toLocaleString('es-CO')}`
}

const displayValue = ref(formatToCOP(props.modelValue))

watch(() => props.modelValue, (newVal) => {
  displayValue.value = formatToCOP(newVal)
}, { immediate: true })

function onInput(e) {
  const raw = e.target.value.replace(/[^0-9]/g, '')
  const num = raw === '' ? 0 : Number(raw)
  displayValue.value = raw === '' ? '' : `$ ${num.toLocaleString('es-CO')}`
  emit('update:modelValue', num)
}

function onBlur() {
  displayValue.value = formatToCOP(props.modelValue)
}
</script>
