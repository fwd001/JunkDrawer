<script setup lang="ts" generic="T extends string | number">
const props = defineProps<{ options: { value: T; label: string }[]; modelValue: T }>()
const emit = defineEmits<{ 'update:modelValue': [T] }>()

function pick(value: T) {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="flex flex-wrap gap-8px">
    <button
      v-for="option in props.options"
      :key="String(option.value)"
      type="button"
      class="chip"
      :class="props.modelValue === option.value ? 'chip-on' : 'chip-idle'"
      @click="pick(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
