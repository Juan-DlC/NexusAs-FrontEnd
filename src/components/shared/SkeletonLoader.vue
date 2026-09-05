<template>
  <div class="skeleton-loader" :class="`skeleton-${type}`">
    <!-- Table Skeleton -->
    <template v-if="type === 'table'">
      <div class="skeleton-table">
        <div class="skeleton-table-header">
          <div v-for="i in columns" :key="`h-${i}`" class="skeleton-cell"></div>
        </div>
        <div v-for="i in rows" :key="`r-${i}`" class="skeleton-table-row">
          <div v-for="j in columns" :key="`c-${j}`" class="skeleton-cell"></div>
        </div>
      </div>
    </template>

    <!-- Card Skeleton -->
    <template v-else-if="type === 'card'">
      <div class="skeleton-card">
        <div class="skeleton-card-header"></div>
        <div class="skeleton-card-body">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
    </template>

    <!-- Text Skeleton -->
    <template v-else-if="type === 'text'">
      <div class="skeleton-text">
        <div v-for="i in lines" :key="`l-${i}`" class="skeleton-line" :class="{ short: i === lines }"></div>
      </div>
    </template>

    <!-- Avatar Skeleton -->
    <template v-else-if="type === 'avatar'">
      <div class="skeleton-avatar" :style="{ width: size, height: size }"></div>
    </template>

    <!-- Button Skeleton -->
    <template v-else-if="type === 'button'">
      <div class="skeleton-button" :style="{ width: width }"></div>
    </template>

    <!-- Custom/Default -->
    <template v-else>
      <div class="skeleton-box" :style="{ width: width, height: height }"></div>
    </template>
  </div>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    default: 'box',
    validator: (value) => ['table', 'card', 'text', 'avatar', 'button', 'box'].includes(value)
  },
  rows: {
    type: Number,
    default: 5
  },
  columns: {
    type: Number,
    default: 4
  },
  lines: {
    type: Number,
    default: 3
  },
  width: {
    type: String,
    default: '100%'
  },
  height: {
    type: String,
    default: '20px'
  },
  size: {
    type: String,
    default: '40px'
  }
})
</script>

<style scoped>
.skeleton-loader {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.skeleton-table {
  width: 100%;
}

.skeleton-table-header,
.skeleton-table-row {
  display: grid;
  grid-template-columns: repeat(var(--columns, 4), 1fr);
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.skeleton-table-header {
  background: var(--color-bg);
}

.skeleton-cell {
  height: 16px;
  background: linear-gradient(90deg, var(--color-border) 0%, #e0e0e0 50%, var(--color-border) 100%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton-card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px;
}

.skeleton-card-header {
  height: 24px;
  width: 40%;
  background: var(--color-border);
  border-radius: 4px;
  margin-bottom: 16px;
}

.skeleton-card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-line {
  height: 14px;
  background: var(--color-border);
  border-radius: 4px;
  animation: shimmer 1.5s infinite;
}

.skeleton-line.short {
  width: 60%;
}

.skeleton-text {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-avatar {
  border-radius: 50%;
  background: var(--color-border);
  animation: shimmer 1.5s infinite;
}

.skeleton-button {
  height: 40px;
  background: var(--color-border);
  border-radius: var(--radius-md);
  animation: shimmer 1.5s infinite;
}

.skeleton-box {
  background: var(--color-border);
  border-radius: var(--radius-sm);
  animation: shimmer 1.5s infinite;
}
</style>
