<script setup>
import { onMounted, reactive, ref } from 'vue'
import api from '../api/client'
import { useAuth } from '../composables/useAuth'
import Modal from '../components/Modal.vue'
const { login, register } = useAuth()
const mode = ref('login'), message = ref(''), isError = ref(false)
const resetDetails = ref(null)
const loginError = ref('')
const forgotEmailError = ref('')
const form = reactive({ username: '', email: '', password: '', new_password: '', first_name: '', last_name: '', department: '', user_type: 'student' })
function removeCredentialSpaces(field, event) {
  form[field] = event.target.value.replace(/ /g, '')
}
function setMode(nextMode) { mode.value = nextMode; message.value = ''; isError.value = false; forgotEmailError.value = '' }
function openForgotPassword() {
  if (!form.username.trim()) {
    message.value = 'Enter your username before continuing to password recovery.'
    isError.value = true
    return
  }
  setMode('forgot')
}
async function submit() {
  if (mode.value === 'forgot' && !form.email.trim()) {
    forgotEmailError.value = 'Enter the email address linked to your account to request a password reset.'
    return
  }
  try {
    message.value = ''
    isError.value = false
    if (mode.value === 'login') {
      await login(form.username, form.password)
    } else if (mode.value === 'register') {
      await register({ username: form.username, email: form.email, password: form.password, first_name: form.first_name, last_name: form.last_name, department: form.department, user_type: form.user_type })
      setMode('login')
      message.value = 'Registration successful. You can now sign in.'
    } else if (mode.value === 'forgot') {
      const { data } = await api.post('/password-reset/', { email: form.email.trim() })
      message.value = data.message
    } else {
      await api.post('/password-reset/confirm/', {
        ...resetDetails.value,
        new_password: form.new_password,
      })
      window.history.replaceState({}, '', window.location.pathname)
      resetDetails.value = null
      form.new_password = ''
      setMode('login')
      message.value = 'Your password was reset. You can now sign in.'
    }
  } catch (e) {
    if (mode.value === 'login' && e.response?.status === 401) {
      loginError.value = 'The username or password is incorrect. Check your details and try again.'
      return
    }
    isError.value = true
    const data = e.response?.data
    message.value = data?.message || data?.detail || Object.values(data || {}).flat().join(' ') || 'Unable to continue.'
  }
}
onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const uid = params.get('reset_uid')
  const token = params.get('token')
  if (uid && token) {
    resetDetails.value = { uid, token }
    mode.value = 'reset'
  }
})
</script>
<template>
  <main class="auth-page">
    <section class="auth-photo">
      <div class="photo-shade"></div>
      <div class="photo-brand"><img src="/logo.png" alt=""><span>CSU COEA<small>LAB BORROWING SYSTEM</small></span></div>
      <div class="photo-copy"><span class="eyebrow">CSU COEA · CARIG CAMPUS</span><h1>COEA Lab Borrowing System</h1><p>Manage laboratory equipment, borrowing requests, and returns in one place.</p></div>
    </section>
    <section class="auth-main">
      <form class="auth-form" @submit.prevent="submit">
        <div class="mobile-brand"><img src="/logo.png" alt=""><span>CSU COEA<small>LAB BORROWING SYSTEM</small></span></div>
        <span class="form-eyebrow">{{ mode === 'login' ? 'YOUR LAB, IN ONE PLACE' : mode === 'register' ? 'JOIN THE LAB PORTAL' : 'ACCOUNT RECOVERY' }}</span>
        <h2>{{ mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Choose a new password' }}</h2>
        <p class="form-intro">{{ mode === 'login' ? 'Sign in to manage equipment and borrowing requests.' : mode === 'register' ? 'Register to request laboratory equipment.' : mode === 'forgot' ? 'Enter the email address on your account. If it matches, we’ll send you a password reset link.' : 'Choose a new password for your account.' }}</p>
        <div v-if="mode === 'register'" class="name-fields">
          <label>First name<input v-model="form.first_name" required autocomplete="given-name" placeholder="First name" class="field"></label>
          <label>Last name<input v-model="form.last_name" required autocomplete="family-name" placeholder="Last name" class="field"></label>
        </div>
        <label v-if="mode === 'register'">Department<input v-model="form.department" required placeholder="e.g. Computer Engineering" class="field"></label>
        <label v-if="mode === 'register'">Email<input v-model="form.email" required type="email" autocomplete="email" placeholder="you@example.com" class="field"></label>
        <label v-if="mode === 'login' || mode === 'register'">Username<input :value="form.username" required autocomplete="username" placeholder="Enter your username" class="field" @input="removeCredentialSpaces('username', $event)"></label>
        <label v-if="mode === 'forgot'">Email<input v-model="form.email" type="email" autocomplete="email" placeholder="you@example.com" class="field"></label>
        <label v-if="mode === 'login' || mode === 'register'">Password<input :value="form.password" required type="password" minlength="8" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" placeholder="At least 8 characters" class="field" @input="removeCredentialSpaces('password', $event)"></label>
        <label v-if="mode === 'reset'">New password<input :value="form.new_password" required type="password" minlength="8" autocomplete="new-password" placeholder="At least 8 characters" class="field" @input="removeCredentialSpaces('new_password', $event)"></label>
        <button v-if="mode === 'login'" type="button" class="forgot-link" @click="openForgotPassword">Forgot password?</button>
        <label v-if="mode === 'register'">Account type<select v-model="form.user_type" class="field"><option value="student">Student</option><option value="faculty">Faculty</option></select></label>
        <p v-if="message" :class="['alert', isError ? 'error' : 'success']">{{ message }}</p>
        <button class="primary submit-button">{{ mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Reset password' }}</button>
        <p class="switch-mode"><template v-if="mode === 'login'">New to the lab portal? <button type="button" class="link" @click="setMode('register')">Create an account</button></template><template v-else>Remembered your password? <button type="button" class="link" @click="setMode('login')">Back to sign in</button></template></p>
        <p class="auth-footnote">Authorized CSU COEA laboratory use only.</p>
      </form>
    </section>
    <Modal :open="Boolean(loginError)" title="Unable to sign in" @close="loginError = ''">
      <div class="login-error-dialog">
        <p role="alert">{{ loginError }}</p>
        <div class="login-error-actions">
          <button type="button" class="primary" autofocus @click="loginError = ''">Try again</button>
        </div>
      </div>
    </Modal>
    <Modal :open="Boolean(forgotEmailError)" title="Email required" @close="forgotEmailError = ''">
      <div class="login-error-dialog">
        <p role="alert">{{ forgotEmailError }}</p>
        <div class="login-error-actions">
          <button type="button" class="primary" autofocus @click="forgotEmailError = ''">Okay</button>
        </div>
      </div>
    </Modal>
  </main>
</template>
<style scoped>
.auth-page { position: relative; display: grid; min-height: 100vh; min-height: 100svh; place-items: center; overflow-x: clip; background: #21160f; }
.auth-photo { position: fixed; inset: 0; display: block; overflow: hidden; background: #54250f url('/campus.jpg') center 48% / cover no-repeat; color: white; }
.photo-shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgb(18 14 12 / 62%), rgb(44 23 12 / 48%) 44%, rgb(37 16 9 / 70%)); }
.photo-brand { position: absolute; z-index: 1; top: 26px; left: 50%; display: flex; align-items: center; gap: 12px; transform: translateX(-50%); color: white; font-size: 13px; font-weight: 800; letter-spacing: .08em; white-space: nowrap; }
.photo-brand img { width: 52px; height: 52px; border: 2px solid rgb(255 255 255 / 80%); border-radius: 50%; background: white; box-shadow: 0 4px 18px rgb(0 0 0 / 30%); }
.photo-brand small { display: block; margin-top: 4px; font-size: 10px; font-weight: 650; letter-spacing: .14em; opacity: .85; }
.photo-copy { position: absolute; z-index: 1; top: 108px; left: 50%; width: min(calc(100% - 36px), 600px); transform: translateX(-50%); text-align: center; }
.eyebrow, .form-eyebrow { color: #ff7433; font-size: 10px; font-weight: 800; letter-spacing: .16em; }
.photo-copy h1 { max-width: 600px; margin: 9px auto 6px; font-size: clamp(27px, 4vw, 40px); font-weight: 800; letter-spacing: -.045em; line-height: 1.05; text-shadow: 0 2px 14px rgb(0 0 0 / 30%); text-wrap: balance; }
.photo-copy p { margin: 0 auto; color: rgb(255 255 255 / 84%); font-size: 12px; line-height: 1.5; }
.photo-caption { display: none; }
.auth-main { position: relative; z-index: 2; display: grid; width: 100%; min-height: 100vh; min-height: 100svh; place-items: center; padding: 250px 20px 34px; }
.auth-form { width: min(100%, 430px); border: 1px solid rgb(255 255 255 / 36%); border-top: 3px solid #fd4d01; border-radius: 20px; background: rgb(38 34 32 / 58%); padding: 23px 28px 21px; color: white; box-shadow: 0 24px 70px rgb(0 0 0 / 34%), inset 0 1px 0 rgb(255 255 255 / 10%); backdrop-filter: blur(16px); }
.auth-form label { display: block; margin-top: 15px; color: rgb(255 255 255 / 88%); font-size: 10px; font-weight: 700; letter-spacing: .045em; text-transform: uppercase; }
.auth-form .field { display: block; width: 100%; min-height: 43px; margin-top: 6px; border: 1px solid rgb(255 255 255 / 36%); border-radius: 10px; background: rgb(255 255 255 / 90%); padding: 0 12px; color: #26303b; font-size: 12px; text-transform: none; }
.auth-form .field::placeholder { color: #89919d; }
.auth-form .field:focus { border-color: #fd4d01; outline: 2px solid rgb(253 77 1 / 24%); }
.form-eyebrow { color: #ff7433; }
.auth-form h2 { margin: 8px 0 5px; color: white; font-size: 27px; font-weight: 780; letter-spacing: -.04em; }
.form-intro { margin: 0 0 17px; color: rgb(255 255 255 / 76%); font-size: 12px; line-height: 1.55; }
.name-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.submit-button { width: 100%; min-height: 45px; margin-top: 18px; border: 1px solid #fd4d01; background: linear-gradient(100deg, #fd4d01, #e83b00); color: white; font-weight: 800; box-shadow: 0 7px 22px rgb(253 77 1 / 30%); }
.submit-button:hover:not(:disabled) { border-color: #ff7433; background: linear-gradient(100deg, #ff6421, #f14b0b); }
.switch-mode { margin: 16px 0 0; color: rgb(255 255 255 / 78%); font-size: 11px; text-align: center; }
.link { border: 0; background: none; padding: 0; color: #ff7433; font-size: inherit; font-weight: 750; }
.link:hover { color: #ffa078; text-decoration: underline; }
.forgot-link { display: block; margin: 8px 0 0 auto; border: 0; background: none; padding: 0; color: #ff8a50; font-size: 10px; font-weight: 700; }.forgot-link:hover { color: white; text-decoration: underline; }
.auth-footnote { margin: 19px 0 0; color: rgb(255 255 255 / 61%); font-size: 9px; text-align: center; }
.alert { margin-top: 13px; border-radius: 9px; padding: 10px 12px; font-size: 11px; }
.error { border: 1px solid #fda4af; background: #fff1f2; color: #be123c; }
.success { border: 1px solid #6ee7b7; background: #ecfdf5; color: #047857; }
.login-error-dialog p { margin: 0; border: 1px solid #ffe4e6; border-radius: 10px; background: #fff1f2; padding: 14px; color: #be123c; font-size: 14px; line-height: 1.6; }
.login-error-actions { display: flex; justify-content: flex-end; margin-top: 18px; }
.mobile-brand { display: none; }
@media (max-width: 640px) {
  .auth-photo { background-position: 54% center; }
  .photo-brand { top: 20px; font-size: 11px; }
  .photo-brand img { width: 44px; height: 44px; }
  .photo-brand small { font-size: 8px; }
  .photo-copy { top: 91px; }
  .photo-copy h1 { margin: 8px auto 5px; font-size: clamp(25px, 7vw, 32px); }
  .photo-copy p { max-width: 360px; font-size: 11px; }
  .auth-main { align-items: start; padding: 205px 14px 28px; }
  .auth-form { padding: 21px 19px 18px; border-radius: 16px; }
  .auth-form h2 { font-size: 24px; }
  .form-intro { margin-bottom: 13px; }
  .name-fields { grid-template-columns: 1fr; gap: 0; }
}
@media (max-height: 700px) and (min-width: 641px) {
  .auth-main { padding-top: 220px; }
  .auth-form { padding-top: 19px; padding-bottom: 16px; }
  .auth-form label { margin-top: 11px; }
  .auth-footnote { margin-top: 13px; }
}
@media (prefers-reduced-motion: reduce) {
  .auth-form,
  .photo-brand,
  .photo-copy { animation: none; }
}
</style>
