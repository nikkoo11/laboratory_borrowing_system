import { computed, readonly, ref } from 'vue'
import api from '../api/client'

const user = ref(null)
const loading = ref(true)

async function refreshUser() {
  if (!localStorage.getItem('access_token')) {
    user.value = null
    loading.value = false
    return
  }
  try {
    user.value = (await api.get('/me/')).data
  } catch {
    logout()
  } finally {
    loading.value = false
  }
}

async function login(username, password) {
  const response = await api.post('/login/', { username, password })
  localStorage.setItem('access_token', response.data.access)
  localStorage.setItem('refresh_token', response.data.refresh)
  await refreshUser()
  if (user.value) {
    window.dispatchEvent(new CustomEvent('auth:login-success', { detail: user.value }))
  }
  return user.value
}

async function register(payload) {
  return (await api.post('/register/', payload)).data
}

function logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  user.value = null
}

async function updateProfile(payload) {
  const response = await api.put(`/users/${user.value.user_id}/update/`, payload)
  user.value = { ...user.value, ...response.data }
  return response.data
}

async function changePassword(current_password, new_password) {
  return (await api.put('/users/password/', { current_password, new_password })).data
}

export function useAuth() {
  return {
    user: readonly(user),
    loading: readonly(loading),
    isAdmin: computed(() => user.value?.role === 'ADMIN'),
    isStaff: computed(() => ['ADMIN', 'STAFF'].includes(user.value?.role)),
    refreshUser,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
  }
}
