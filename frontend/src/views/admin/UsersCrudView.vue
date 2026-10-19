<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { Plus, Search, Trash2 } from 'lucide-vue-next'
import api from '../../api/client'
import { useAuth } from '../../composables/useAuth'
import Modal from '../../components/Modal.vue'
import SuccessModal from '../../components/SuccessModal.vue'

const users = ref([]), error = ref(''), search = ref(''), selectedRole = ref('all'), sortBy = ref('name-asc')
const roleEdits = ref({})
const { isAdmin } = useAuth()
const createOpen = ref(false), editUser = ref(null), formError = ref('')
const successMessage = ref('')
const newUser = reactive({ username: '', email: '', password: '', first_name: '', last_name: '', department: '', user_type: 'student' })
const editForm = reactive({ email: '', first_name: '', last_name: '', department: '', user_type: 'student' })
function removeCredentialSpaces(field, event) {
  newUser[field] = event.target.value.replace(/ /g, '')
}
const roleOptions = ['VIEWER', 'STAFF', 'ADMIN']
const roleFilters = [
  { value: 'all', label: 'Everyone' },
  { value: 'ADMIN', label: 'Admins' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'VIEWER', label: 'Viewers' },
]
const sortOptions = [
  { value: 'name-asc', label: 'Name: A to Z' },
  { value: 'name-desc', label: 'Name: Z to A' },
  { value: 'department-asc', label: 'Department: A to Z' },
  { value: 'type-asc', label: 'Account type: A to Z' },
  { value: 'role-asc', label: 'Access role: A to Z' },
]
const filteredUsers = computed(() => {
  const query = search.value.trim().toLowerCase()
  const visibleUsers = users.value.filter((person) => {
    const matchesRole = selectedRole.value === 'all' || person.role === selectedRole.value
    const matchesSearch = !query || [person.first_name, person.last_name, person.username, person.email, person.department]
      .some((value) => value?.toLowerCase().includes(query))
    return matchesRole && matchesSearch
  })

  return [...visibleUsers].sort((a, b) => {
    const getValue = (person) => {
      if (sortBy.value === 'department-asc') return person.department || ''
      if (sortBy.value === 'type-asc') return person.user_type || ''
      if (sortBy.value === 'role-asc') return person.role || ''
      return [person.first_name, person.last_name].filter(Boolean).join(' ') || person.username
    }
    const difference = String(getValue(a)).localeCompare(
      String(getValue(b)),
      undefined,
      { sensitivity: 'base', numeric: true },
    )
    return sortBy.value === 'name-desc' ? -difference : difference
  })
})
function countRole(role) {
  return role === 'all' ? users.value.length : users.value.filter((person) => person.role === role).length
}
async function load() {
  try {
    users.value = (await api.get('/users/')).data
    roleEdits.value = Object.fromEntries(users.value.map((person) => [person.user_id, person.role]))
    error.value = ''
  } catch (e) {
    const data = e.response?.data
    error.value = data?.message || data?.detail || 'Unable to load user accounts. Check the API connection and try again.'
  }
}
async function createUser() {
  try {
    formError.value = ''
    await api.post('/users/', newUser)
    Object.assign(newUser, { username: '', email: '', password: '', first_name: '', last_name: '', department: '', user_type: 'student' })
    createOpen.value = false
    await load()
  } catch (e) {
    const data = e.response?.data
    formError.value = data?.message || data?.detail || Object.entries(data || {})
      .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(' ') : messages}`)
      .join(' ') || 'Unable to create account.'
  }
}
function openEdit(person) {
  editUser.value = person
  formError.value = ''
  Object.assign(editForm, {
    email: person.email || '',
    first_name: person.first_name,
    last_name: person.last_name,
    department: person.department,
    user_type: person.user_type,
  })
}
async function saveEdit() {
  try {
    formError.value = ''
    await api.put(`/users/${editUser.value.user_id}/update/`, editForm)
    editUser.value = null
    successMessage.value = 'Account details were updated successfully.'
    await load()
  } catch (e) {
    const data = e.response?.data
    formError.value = data?.message || data?.detail || Object.entries(data || {})
      .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(' ') : messages}`)
      .join(' ') || 'Unable to update account.'
  }
}
async function changeRole(person) {
  const role = roleEdits.value[person.user_id]
  if (!role || role === person.role) return
  try {
    error.value = ''
    await api.patch(`/users/${person.user_id}/role/`, { role })
    successMessage.value = `Access role for ${person.username} was updated successfully.`
    await load()
  } catch (e) {
    const data = e.response?.data
    error.value = data?.message || data?.detail || Object.entries(data || {})
      .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(' ') : messages}`)
      .join(' ') || 'Unable to update role.'
  }
}
async function remove(person) {
  if (!confirm(`Delete ${person.username}'s account? This cannot be undone.`)) return
  try {
    error.value = ''
    await api.delete(`/users/${person.user_id}/delete/`)
    await load()
  } catch (e) {
    error.value = e.response?.data?.message || 'Unable to delete user.'
  }
}
onMounted(load)
</script>

<template>
  <section class="users-page">
    <header class="users-intro">
      <div><span class="page-eyebrow">ACCESS MANAGEMENT</span><h2>People & permissions</h2><p>Manage laboratory accounts, contact details, and access roles.</p></div>
      <div class="users-total"><strong>{{ users.length }}</strong><span>registered accounts</span></div>
    </header>
    <div class="panel directory-panel">
      <div class="directory-heading"><h3>Accounts <span class="heading-count">{{ filteredUsers.length }}</span></h3><div class="directory-controls"><label class="search-box"><Search :size="16" /><input v-model="search" placeholder="Search accounts"></label><label class="sort-control"><span>Sort by</span><select v-model="sortBy" aria-label="Sort user accounts"><option v-for="option in sortOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label><button v-if="isAdmin" class="primary add-user" @click="createOpen = true; formError = ''"><Plus :size="15" /> Add user</button></div></div>
      <div class="filters" aria-label="Filter users by role"><button v-for="filter in roleFilters" :key="filter.value" type="button" :class="['filter-button', { selected: selectedRole === filter.value }]" :aria-pressed="selectedRole === filter.value" @click="selectedRole = filter.value">{{ filter.label }}<span>{{ countRole(filter.value) }}</span></button></div>
      <p v-if="error" class="error">{{ error }}</p>
      <div class="table-scroll"><table class="table"><thead><tr><th>Account</th><th>Department</th><th>Account type</th><th>Access role</th><th v-if="isAdmin">Actions</th></tr></thead><tbody>
        <tr v-for="person in filteredUsers" :key="person.user_id">
          <td><div class="person-cell"><span class="person-avatar">{{ (person.first_name || person.username || 'U').slice(0, 1).toUpperCase() }}</span><div class="person-copy"><strong>{{ [person.first_name, person.last_name].filter(Boolean).join(' ') || person.username }}</strong><span>@{{ person.username }}</span></div></div></td>
          <td>{{ person.department || '—' }}</td><td class="capitalize">{{ person.user_type || '—' }}</td>
          <td><span :class="['role-badge', person.role.toLowerCase()]"><i></i>{{ person.role }}</span></td>
          <td v-if="isAdmin" class="row-actions">
            <button class="edit-button" :aria-label="`Edit ${person.username}`" title="Edit account details" @click="openEdit(person)">Edit</button>
            <select v-model="roleEdits[person.user_id]" class="role-select" :aria-label="`Role for ${person.username}`" :disabled="person.role === 'ADMIN' && users.filter(user => user.role === 'ADMIN').length === 1">
              <option v-for="role in roleOptions" :key="role" :value="role">{{ role }}</option>
            </select>
            <button class="save-button" :disabled="roleEdits[person.user_id] === person.role" @click="changeRole(person)">Save</button>
            <button v-if="person.role !== 'ADMIN'" class="delete-button" :aria-label="`Delete ${person.username}`" title="Delete account" @click="remove(person)"><Trash2 :size="15" /></button>
          </td>
        </tr>
        <tr v-if="!filteredUsers.length"><td :colspan="isAdmin ? 5 : 4" class="empty">{{ search ? 'No accounts match your search.' : 'No accounts found for this role.' }}</td></tr>
      </tbody></table></div>
    </div>
    <Modal :open="createOpen" title="Add user account" @close="createOpen = false">
      <form class="account-form" @submit.prevent="createUser">
        <label>Username<input :value="newUser.username" required maxlength="50" autocomplete="off" class="field" @input="removeCredentialSpaces('username', $event)"></label>
        <label>Email<input v-model="newUser.email" required type="email" autocomplete="email" class="field"></label>
        <label>Temporary password<input :value="newUser.password" required type="password" minlength="8" autocomplete="new-password" class="field" @input="removeCredentialSpaces('password', $event)"></label>
        <label>First name<input v-model="newUser.first_name" required maxlength="50" class="field"></label>
        <label>Last name<input v-model="newUser.last_name" required maxlength="50" class="field"></label>
        <label>Department<input v-model="newUser.department" required maxlength="100" class="field"></label>
        <label>Account type<select v-model="newUser.user_type" class="field"><option value="student">Student</option><option value="faculty">Faculty</option><option value="staff">Staff</option></select></label>
        <p v-if="formError" class="error">{{ formError }}</p>
        <div class="modal-actions"><button type="button" class="secondary" @click="createOpen = false">Cancel</button><button class="primary">Create account</button></div>
      </form>
    </Modal>
    <Modal :open="Boolean(editUser)" title="Edit user details" @close="editUser = null">
      <form class="account-form" @submit.prevent="saveEdit">
        <label>Email<input v-model="editForm.email" required type="email" autocomplete="email" class="field"></label>
        <label>First name<input v-model="editForm.first_name" required maxlength="50" class="field"></label>
        <label>Last name<input v-model="editForm.last_name" required maxlength="50" class="field"></label>
        <label>Department<input v-model="editForm.department" required maxlength="100" class="field"></label>
        <label>Account type<select v-model="editForm.user_type" class="field"><option value="student">Student</option><option value="faculty">Faculty</option><option value="staff">Staff</option></select></label>
        <p v-if="formError" class="error">{{ formError }}</p>
        <div class="modal-actions"><button type="button" class="secondary" @click="editUser = null">Cancel</button><button class="primary">Save changes</button></div>
      </form>
    </Modal>
    <SuccessModal
      :open="Boolean(successMessage)"
      :message="successMessage"
      @close="successMessage = ''"
    />
  </section>
</template>

<style scoped>
.users-page { display: grid; gap: 17px; }
.users-intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding: 3px 2px; }
.users-intro > div:first-child { display: grid; gap: 5px; }
.page-eyebrow { color: #bd4b16; font-size: 9px; font-weight: 800; letter-spacing: .14em; }
.users-intro h2 { margin: 0; color: #202d40; font-size: clamp(22px, 2.8vw, 29px); font-weight: 760; letter-spacing: -.04em; }
.users-intro p { margin: 0; color: #778397; font-size: 12px; }
.users-total { display: grid; min-width: 115px; justify-items: center; gap: 3px; border: 1px solid #e8edf4; border-radius: 13px; background: white; padding: 9px 13px; }
.users-total strong { color: #c2410c; font-size: 20px; line-height: 1; }.users-total span { color: #818da0; font-size: 9px; }
.heading-count { margin-left: 5px; border-radius: 20px; background: #f1f5f9; padding: 3px 7px; color: #667085; font-size: 10px; font-weight: 600; }
.directory-panel { overflow: hidden; padding: 20px; }
.directory-heading { display: flex; align-items: center; justify-content: space-between; gap: 15px; }
.directory-heading h3 { margin: 0; color: #273449; font-size: 15px; font-weight: 700; }
.directory-controls { display: flex; min-width: 0; align-items: center; justify-content: flex-end; gap: 9px; }
.search-box { display: flex; width: min(100%, 290px); min-height: 38px; align-items: center; gap: 8px; border: 1px solid #e4e9f0; border-radius: 10px; padding: 0 11px; color: #98a2b3; }
.search-box input { width: 100%; border: 0; outline: 0; color: #344054; font-size: 11px; }
.sort-control { display: flex; min-height: 38px; flex: 0 0 auto; align-items: center; gap: 7px; border: 1px solid #e4e9f0; border-radius: 10px; padding: 0 9px; color: #667085; font-size: 11px; white-space: nowrap; }
.sort-control select { max-width: 160px; border: 0; outline: 0; background: transparent; color: #344054; font-size: 11px; }
.filters { display: flex; gap: 6px; overflow-x: auto; margin: 16px 0 12px; border-bottom: 1px solid #eef1f5; }
.filter-button { display: flex; flex: 0 0 auto; align-items: center; gap: 7px; border: 0; border-bottom: 2px solid transparent; background: none; padding: 9px 10px 10px; color: #667085; font-size: 11px; }
.filter-button span { border-radius: 20px; background: #f1f5f9; padding: 2px 6px; color: #667085; font-size: 9px; }
.filter-button.selected { border-bottom-color: #c2410c; color: #c2410c; font-weight: 700; }.filter-button.selected span { background: #fff1e9; color: #c2410c; }
.table-scroll { overflow-x: auto; border: 1px solid #e9edf3; border-radius: 12px; }.table { width: 100%; min-width: 720px; }.table th, .table td { padding-right: 12px; padding-left: 12px; }.table th { background: #f8fafc; color: #738096; font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }.table tbody tr:hover { background: #fbfcfe; }.table tbody tr:last-child td { border-bottom: 0; }
.person-cell { display: flex; align-items: center; gap: 10px; }.person-avatar { display: grid; width: 34px; height: 34px; flex: 0 0 34px; place-items: center; border-radius: 50%; background: #fff1e9; color: #c2410c; font-size: 12px; font-weight: 750; }.person-copy strong, .person-copy span { display: block; }.person-copy strong { color: #344054; font-size: 11px; font-weight: 650; }.person-copy span { margin-top: 3px; color: #98a2b3; font-size: 10px; }
.capitalize { text-transform: capitalize; }.role-badge { display: inline-flex; align-items: center; gap: 6px; border-radius: 20px; background: #f1f5f9; padding: 5px 8px; color: #667085; font-size: 9px; font-weight: 700; }.role-badge i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }.role-badge.admin { background: #eff6ff; color: #2563eb; }.role-badge.staff { background: #ecfdf3; color: #027a48; }.role-badge.viewer { background: #fff7ed; color: #c2410c; }
.add-user { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }.row-actions { white-space: nowrap; }.edit-button { margin-right: 6px; border: 0; border-radius: 7px; background: #f8fafc; padding: 6px 8px; color: #475467; font-size: 10px; }.edit-button:hover { background: #fff1e9; color: #c2410c; }.role-select { min-height: 30px; border: 1px solid #e4e9f0; border-radius: 8px; background: white; padding: 4px 7px; color: #475467; font-size: 10px; }.role-select:disabled { background: #f8fafc; color: #98a2b3; }.save-button { margin: 0 7px; border: 0; border-radius: 7px; background: #fff1e9; padding: 6px 8px; color: #c2410c; font-size: 10px; font-weight: 700; }.save-button:disabled { cursor: default; background: transparent; color: #cbd5e1; }.delete-button { display: inline-grid; width: 28px; height: 28px; place-items: center; border: 0; border-radius: 7px; background: transparent; color: #98a2b3; }.delete-button:hover { background: #fff1f0; color: #dc2626; }
.account-form { display: grid; gap: 12px; }.account-form label { display: grid; gap: 5px; color: #667085; font-size: 11px; font-weight: 650; }.account-form .field { width: 100%; }.account-form .error { margin: 0; }.modal-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }.secondary { min-height: 40px; border: 1px solid #e4e9f0; border-radius: 9px; background: white; padding: 0 13px; color: #667085; font-size: 12px; }
.error { margin: 8px 0; color: #be123c; font-size: 11px; }.empty { padding: 35px 12px !important; color: #8791a2; text-align: center; }
@media (max-width: 950px) { .directory-heading { align-items: stretch; flex-direction: column; }.directory-controls { flex-wrap: wrap; justify-content: stretch; }.directory-controls .search-box { flex: 1 1 200px; width: auto; }.sort-control { flex: 1 1 200px; justify-content: space-between; }.sort-control select { max-width: none; } }
@media (max-width: 560px) { .users-intro { align-items: flex-start; flex-direction: column; }.users-total { min-width: 0; grid-template-columns: auto auto; align-items: center; justify-items: start; gap: 8px; }.users-total strong { font-size: 16px; } }
@media (max-width: 700px) { .directory-panel { padding: 14px; }.directory-controls { align-items: stretch; flex-direction: column; }.directory-controls .search-box, .directory-controls .sort-control { width: 100%; flex: auto; }.add-user { justify-content: center; } }
</style>
