<script setup>
import { reactive, watch } from 'vue'
import { useAuth } from '../../composables/useAuth'
import SuccessModal from '../../components/SuccessModal.vue'

const { user, updateProfile, changePassword } = useAuth()
const form = reactive({ email: '', first_name: '', last_name: '', department: '' })
const message = reactive({ text: '', error: false })
const passwordForm = reactive({ current_password: '', new_password: '' })
const passwordMessage = reactive({ text: '', error: false })
const successModal = reactive({ title: '', message: '' })
function removePasswordSpaces(field, event) {
  passwordForm[field] = event.target.value.replace(/ /g, '')
}
watch(user, (value) => {
  if (value) Object.assign(form, value)
}, { immediate: true })
async function save() {
  try {
    await updateProfile(form)
    message.text = ''
    successModal.title = 'Profile updated'
    successModal.message = 'Your personal details were saved successfully.'
  } catch (error) {
    const data = error.response?.data
    message.text = data?.message || data?.detail || Object.values(data || {}).flat().join(' ') || 'Unable to save your details. Please try again.'
    message.error = true
  }
}
async function savePassword() {
  try {
    await changePassword(passwordForm.current_password, passwordForm.new_password)
    Object.assign(passwordForm, { current_password: '', new_password: '' })
    passwordMessage.text = ''
    successModal.title = 'Password updated'
    successModal.message = 'Your password was changed successfully.'
  } catch (error) {
    const data = error.response?.data
    passwordMessage.text = data?.message || Object.values(data || {}).flat().join(' ') || 'Unable to change password.'
    passwordMessage.error = true
  }
}
</script>

<template>
  <section class="profile-layout">
    <header class="profile-intro">
      <span class="page-eyebrow">ACCOUNT SETTINGS</span>
      <h2>Your profile</h2>
      <p>Manage your personal information and keep your account secure.</p>
    </header>
    <div class="account-card">
      <span class="avatar">{{ (user?.first_name || user?.username || 'U').slice(0, 1).toUpperCase() }}</span>
      <div class="account-copy">
        <strong>{{ [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username }}</strong>
        <span>@{{ user?.username }}</span>
        <span class="account-email">{{ user?.email || 'Add an email address to enable password recovery' }}</span>
      </div>
      <span class="role">{{ user?.role }}</span>
    </div>
    <div class="profile-forms">
      <form class="panel profile-form" @submit.prevent="save">
        <div class="form-heading"><span class="section-kicker">ACCOUNT INFORMATION</span><h2>Personal details</h2><p>Keep your contact information and department up to date.</p></div>
        <label class="full-field">Email<input v-model="form.email" required type="email" autocomplete="email" placeholder="you@example.com" class="field"></label>
        <label>First name<input v-model="form.first_name" required autocomplete="given-name" class="field"></label>
        <label>Last name<input v-model="form.last_name" required autocomplete="family-name" class="field"></label>
        <label class="full-field">Department<input v-model="form.department" required class="field"></label>
        <p v-if="message.error && message.text" class="error">{{ message.text }}</p>
        <button class="primary">Save changes</button>
      </form>
      <form class="panel profile-form" @submit.prevent="savePassword">
        <div class="form-heading"><span class="section-kicker">SECURITY</span><h2>Change password</h2><p>Use a new password to keep your account secure.</p></div>
        <label>Current password<input :value="passwordForm.current_password" type="password" autocomplete="current-password" required class="field" @input="removePasswordSpaces('current_password', $event)"></label>
        <label>New password<input :value="passwordForm.new_password" type="password" minlength="8" autocomplete="new-password" required class="field" @input="removePasswordSpaces('new_password', $event)"></label>
        <p class="password-hint">Use at least 8 characters. Spaces are ignored.</p>
        <p v-if="passwordMessage.error && passwordMessage.text" class="error">{{ passwordMessage.text }}</p>
        <button class="primary">Update password</button>
      </form>
    </div>
    <SuccessModal
      :open="Boolean(successModal.message)"
      :title="successModal.title"
      :message="successModal.message"
      @close="successModal.message = ''"
    />
  </section>
</template>

<style scoped>
.profile-layout { display: grid; width: min(100%, 1120px); margin: 0 auto; align-content: start; gap: 17px; }
.profile-intro { display: grid; gap: 5px; padding: 3px 2px; }
.page-eyebrow { color: #bd4b16; font-size: 9px; font-weight: 800; letter-spacing: .14em; }
.profile-intro h2 { margin: 0; color: #202d40; font-size: clamp(22px, 2.8vw, 29px); font-weight: 760; letter-spacing: -.04em; }
.profile-intro p { margin: 0; color: #778397; font-size: 12px; }
.profile-forms { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; gap: 15px; }
.account-card { display: flex; min-width: 0; align-items: center; gap: 15px; border: 1px solid #f0dfd3; border-radius: 16px; background: radial-gradient(ellipse at 95% 10%, rgb(255 255 255 / 85%), transparent 35%), linear-gradient(115deg, #fff 0%, #fff8f2 100%); padding: 20px 24px; box-shadow: 0 5px 18px rgb(16 24 40 / 4%); }
.avatar { display: grid; width: 58px; height: 58px; flex: 0 0 58px; place-items: center; border: 4px solid #fff; border-radius: 50%; background: #ffedd5; color: #c2410c; font-size: 20px; font-weight: 750; box-shadow: 0 0 0 1px #fed7aa; }
.account-copy { min-width: 0; flex: 1; }
.account-copy strong, .account-copy span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.account-copy strong { color: #273449; font-size: 15px; font-weight: 750; }
.account-copy > span { margin-top: 4px; color: #8791a2; font-size: 11px; }
.account-copy .account-email { color: #667085; }
.account-card .role { border: 1px solid #fed7aa; border-radius: 999px; background: #fff7ed; padding: 6px 10px; color: #c2410c; font-size: 10px; font-weight: 750; text-transform: capitalize; }
.profile-form { display: grid; min-width: 0; grid-template-columns: repeat(2, minmax(0, 1fr)); align-content: start; gap: 15px; border: 1px solid #e8edf4; padding: 22px; box-shadow: 0 5px 18px rgb(16 24 40 / 4%); transition: border-color .18s ease, box-shadow .18s ease; }
.profile-form:focus-within { border-color: #f0c8b1; box-shadow: 0 8px 22px rgb(87 54 32 / 6%); }
.form-heading { grid-column: 1 / -1; margin-bottom: 2px; }
.section-kicker { display: block; margin-bottom: 7px; color: #c2410c; font-size: 9px; font-weight: 750; letter-spacing: .12em; }
.form-heading h2 { margin: 0 0 5px; color: #273449; font-size: 17px; font-weight: 750; }.form-heading p { margin: 0; color: #8791a2; font-size: 12px; line-height: 1.55; }
.profile-form label { display: grid; min-width: 0; gap: 7px; color: #475467; font-size: 11px; font-weight: 650; }.profile-form .field { width: 100%; min-height: 42px; border: 1px solid #dfe5ed; border-radius: 9px; padding: 0 11px; color: #344054; font-size: 12px; }.profile-form .field:focus { border-color: #c2410c; outline: 2px solid rgb(194 65 12 / 14%); }
.full-field { grid-column: 1 / -1; }
.profile-form .password-hint { grid-column: 1 / -1; margin: -5px 0 0; color: #98a2b3; font-size: 10px; }
.profile-form .error { grid-column: 1 / -1; margin: 0; border-radius: 8px; background: #fff1f2; padding: 10px 12px; font-size: 11px; line-height: 1.5; }
.profile-form .primary { grid-column: 1 / -1; justify-self: start; margin-top: 2px; }.success, .error { margin: 0; font-size: 11px; }.success { color: #027a48; }.error { color: #be123c; }
@media (max-width: 760px) { .profile-forms { grid-template-columns: 1fr; }.profile-form { padding: 18px; } }
@media (max-width: 480px) { .account-card { gap: 11px; padding: 16px; }.avatar { width: 48px; height: 48px; flex-basis: 48px; font-size: 17px; }.account-card .role { padding: 5px 8px; font-size: 9px; }.profile-form { grid-template-columns: 1fr; gap: 13px; padding: 16px; }.form-heading, .full-field, .profile-form .password-hint, .profile-form .error, .profile-form .primary { grid-column: 1; } }
</style>
