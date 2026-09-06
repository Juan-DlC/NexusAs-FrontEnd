<template>
  <div class="card">
    <div v-if="loading" class="state-text">Cargando...</div>
    <div v-else-if="partners.length === 0" class="state-text">
      No hay socias registradas. Crea un usuario con rol "Partner" en Usuarios y aparecerá aquí automáticamente.
    </div>
    <table v-else>
      <thead>
        <tr>
          <th>Socia</th>
          <th>Usuario</th>
          <th>% Normal</th>
          <th>% Alianza</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr 
          v-for="p in partners" 
          :key="p.id" 
          class="clickable-row" 
          @click="$emit('partner-clicked', p)"
        >
          <td><strong>{{ p.partnerName }}</strong></td>
          <td>{{ p.username }}</td>
          <td>{{ p.commissionPercent }}%</td>
          <td>{{ p.allianceCommissionPercent || 20 }}%</td>
          <td>
            <span :class="['badge', p.isActive ? 'badge-success' : 'badge-danger']">
              {{ p.isActive ? 'Activa' : 'Inactiva' }}
            </span>
          </td>
          <td>
            <button 
              class="btn-icon" 
              @click.stop="$emit('edit-commission', p)" 
              :title="`✏️ Editar comisión de ${p.partnerName}`"
            >
              ✏️
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({
  partners: { type: Array, required: true, default: () => [] },
  loading: { type: Boolean, default: false }
})

defineEmits(['partner-clicked', 'edit-commission'])
</script>

<style scoped>
.card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  box-shadow: var(--shadow-sm);
}

.state-text {
  text-align: center;
  padding: 30px 0;
  color: var(--color-text-muted);
  font-size: 13px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead th {
  background: var(--color-bg);
  padding: 10px 8px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  border-bottom: 2px solid var(--color-border);
}

tbody td {
  padding: 10px 8px;
  font-size: 13px;
  border-bottom: 1px solid var(--color-border);
}

.clickable-row {
  cursor: pointer;
  transition: background 0.15s ease;
}

.clickable-row:hover {
  background: var(--color-accent-light) !important;
}

.badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.badge-success {
  background: #E8F5E9;
  color: #388E3C;
}

.badge-danger {
  background: #FFEBEE;
  color: #D32F2F;
}

.btn-icon {
  background: var(--color-bg);
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: var(--transition);
}

.btn-icon:hover {
  background: var(--color-accent-light);
}
</style>
