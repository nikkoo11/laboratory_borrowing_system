<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  ArrowRight,
  CheckCircle2,
  Grid2X2,
  List,
  MapPin,
  PackageSearch,
  Search,
  SlidersHorizontal,
} from 'lucide-vue-next'
import api from '../../api/client'
import { useAuth } from '../../composables/useAuth'

const { user } = useAuth()
const inventory = ref([])
const quantities = ref({})
const requestingItems = ref([])
const error = ref('')
const message = ref('')
const search = ref('')
const selectedCategory = ref('all')
const availabilityFilter = ref('available')
const loading = ref(true)
const viewMode = ref('grid')

const categories = computed(() => [...new Set(
  inventory.value.map((item) => item.category_name || item.category?.category_name).filter(Boolean),
)].sort((a, b) => a.localeCompare(b)))
const availableCount = computed(() => inventory.value.filter(
  (item) => item.status === 'available' && item.quantity > 0,
).length)
const availableUnits = computed(() => inventory.value.reduce(
  (total, item) => total + (item.status === 'available' ? item.quantity : 0),
  0,
))
const visibleInventory = computed(() => {
  const query = search.value.trim().toLowerCase()
  return inventory.value.filter((item) => {
    const category = item.category_name || item.category?.category_name || ''
    const matchesSearch = !query
      || [item.item_name, category, item.location].some((value) => value?.toLowerCase().includes(query))
    const matchesCategory = selectedCategory.value === 'all' || category === selectedCategory.value
    const matchesAvailability = availabilityFilter.value === 'all'
      || (availabilityFilter.value === 'available'
        ? item.status === 'available' && item.quantity > 0
        : item.status !== 'available' || item.quantity < 1)
    return matchesSearch && matchesCategory && matchesAvailability
  })
})

async function load() {
  loading.value = true
  try {
    inventory.value = (await api.get('/inventory/')).data
    quantities.value = Object.fromEntries(inventory.value.map((item) => [
      item.item_id,
      Math.min(Math.max(quantities.value[item.item_id] || 1, 1), item.quantity),
    ]))
    error.value = ''
  } catch (e) {
    const data = e.response?.data
    error.value = data?.message || data?.detail || 'Unable to load equipment. Check the API connection and try again.'
  } finally {
    loading.value = false
  }
}

async function borrow(item) {
  const quantity = quantities.value[item.item_id]
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > item.quantity) {
    error.value = `Enter a quantity from 1 to ${item.quantity}.`
    return
  }
  try {
    error.value = ''
    message.value = ''
    requestingItems.value = [...requestingItems.value, item.item_id]
    await api.post('/transactions/create/', { item_name: item.item_id, user: user.value.user_id, quantity })
    message.value = `${quantity} ${quantity === 1 ? 'unit' : 'units'} of ${item.item_name} requested. Your request is waiting for staff approval.`
    await load()
  } catch (e) {
    const data = e.response?.data
    if (data?.detail || data?.message) {
      error.value = data.detail || data.message
    } else if (data && typeof data === 'object') {
      error.value = Object.entries(data)
        .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(' ') : messages}`)
        .join(' ')
    } else {
      error.value = 'Unable to submit request. Check the API connection and try again.'
    }
  } finally {
    requestingItems.value = requestingItems.value.filter((id) => id !== item.item_id)
  }
}

onMounted(load)
</script>

<template>
  <section class="catalog-page">
    <header class="catalog-hero">
      <div class="hero-copy">
        <span class="eyebrow">EQUIPMENT CATALOG</span>
        <h2>Find what you need.<br><span>Get back to discovery.</span></h2>
        <p>Browse laboratory equipment and send a borrowing request to the lab team.</p>
      </div>
      <div class="hero-summary">
        <div class="summary-icon"><PackageSearch :size="20" /></div>
        <span>Ready to borrow</span>
        <strong>{{ availableCount }}</strong>
        <small>{{ availableUnits }} total units available</small>
      </div>
    </header>

    <div class="catalog-controls">
      <label class="search-box">
        <Search :size="17" />
        <input v-model="search" aria-label="Search equipment" placeholder="Search equipment, category, or location">
      </label>
      <label v-if="categories.length" class="category-select">
        <SlidersHorizontal :size="16" />
        <select v-model="selectedCategory" aria-label="Filter by category">
          <option value="all">All categories</option>
          <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
        </select>
      </label>
    </div>

    <div class="catalog-heading">
      <div>
        <h3>Browse equipment</h3>
        <p>{{ visibleInventory.length }} {{ visibleInventory.length === 1 ? 'item' : 'items' }} shown</p>
      </div>
      <div class="availability-filters" aria-label="Filter equipment availability">
        <button
          v-for="filter in [{ value: 'available', label: 'Available' }, { value: 'all', label: 'All items' }, { value: 'unavailable', label: 'Unavailable' }]"
          :key="filter.value"
          type="button"
          :class="['availability-filter', { selected: availabilityFilter === filter.value }]"
          :aria-pressed="availabilityFilter === filter.value"
          @click="availabilityFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>
      <div class="view-toggle" role="group" aria-label="Equipment view">
        <button type="button" :class="{ selected: viewMode === 'grid' }" :aria-pressed="viewMode === 'grid'" aria-label="Grid view" title="Grid view" @click="viewMode = 'grid'"><Grid2X2 :size="15" /><span>Grid</span></button>
        <button type="button" :class="{ selected: viewMode === 'list' }" :aria-pressed="viewMode === 'list'" aria-label="List view" title="List view" @click="viewMode = 'list'"><List :size="16" /><span>List</span></button>
      </div>
    </div>

    <p v-if="message" class="notice success" role="status"><CheckCircle2 :size="17" />{{ message }}</p>
    <p v-if="error" class="notice error" role="alert">{{ error }}</p>

    <div v-if="loading && viewMode === 'grid'" class="catalog-grid" aria-label="Loading equipment">
      <div v-for="index in 6" :key="index" class="skeleton-card"></div>
    </div>
    <div v-else-if="loading" class="equipment-list loading-list" aria-label="Loading equipment">
      <div v-for="index in 4" :key="index" class="equipment-list-skeleton"></div>
    </div>
    <div v-else-if="visibleInventory.length && viewMode === 'grid'" class="catalog-grid">
      <article v-for="item in visibleInventory" :key="item.item_id" class="equipment-card">
        <div class="card-topline">
          <span class="equipment-icon"><PackageSearch :size="21" /></span>
          <span :class="['availability', item.status, { 'out-of-stock': !item.quantity }]">
            <i></i>
            {{ item.status === 'available' && item.quantity ? 'Available' : item.status === 'available' ? 'Out of stock' : item.status }}
          </span>
        </div>
        <div class="item-details">
          <span class="item-category">{{ item.category_name || item.category?.category_name || 'Laboratory equipment' }}</span>
          <h4>{{ item.item_name }}</h4>
          <p class="equipment-location"><MapPin :size="14" />{{ item.location || 'Location not specified' }}</p>
        </div>
        <div class="card-bottom">
          <div class="stock-line">
            <span>Available stock</span>
            <strong>{{ item.quantity }} <small>{{ item.quantity === 1 ? 'unit' : 'units' }}</small></strong>
          </div>
          <div class="request-controls">
            <label :for="`quantity-${item.item_id}`">Quantity</label>
            <div class="quantity-control">
              <button type="button" :aria-label="`Decrease quantity for ${item.item_name}`" :disabled="!quantities[item.item_id] || quantities[item.item_id] <= 1" @click="quantities[item.item_id]--">−</button>
              <input :id="`quantity-${item.item_id}`" v-model.number="quantities[item.item_id]" type="number" min="1" :max="item.quantity" step="1" :disabled="!item.quantity || item.status !== 'available'" required>
              <button type="button" :aria-label="`Increase quantity for ${item.item_name}`" :disabled="!item.quantity || quantities[item.item_id] >= item.quantity" @click="quantities[item.item_id]++">+</button>
            </div>
          </div>
          <button
            class="request-button"
            :disabled="!item.quantity || item.status !== 'available' || !Number.isInteger(quantities[item.item_id]) || quantities[item.item_id] < 1 || quantities[item.item_id] > item.quantity || requestingItems.includes(item.item_id)"
            @click="borrow(item)"
          >
            {{ requestingItems.includes(item.item_id) ? 'Sending request…' : item.status === 'available' && item.quantity ? 'Request equipment' : 'Not available' }}
            <ArrowRight v-if="item.status === 'available' && item.quantity && !requestingItems.includes(item.item_id)" :size="16" />
          </button>
        </div>
      </article>
    </div>
    <div v-else-if="visibleInventory.length" class="equipment-list">
      <article v-for="item in visibleInventory" :key="item.item_id" class="equipment-list-row">
        <span class="equipment-icon"><PackageSearch :size="20" /></span>
        <div class="equipment-list-info">
          <span class="item-category">{{ item.category_name || item.category?.category_name || 'Laboratory equipment' }}</span>
          <h4>{{ item.item_name }}</h4>
          <p class="equipment-location"><MapPin :size="13" />{{ item.location || 'Location not specified' }}</p>
        </div>
        <span :class="['availability', item.status, { 'out-of-stock': !item.quantity }]"><i></i>{{ item.status === 'available' && item.quantity ? 'Available' : item.status === 'available' ? 'Out of stock' : item.status }}</span>
        <div class="list-stock"><span>Available stock</span><strong>{{ item.quantity }} <small>{{ item.quantity === 1 ? 'unit' : 'units' }}</small></strong></div>
        <div class="quantity-control">
          <button type="button" :aria-label="`Decrease quantity for ${item.item_name}`" :disabled="!quantities[item.item_id] || quantities[item.item_id] <= 1" @click="quantities[item.item_id]--">−</button>
          <input :aria-label="`Quantity to request for ${item.item_name}`" v-model.number="quantities[item.item_id]" type="number" min="1" :max="item.quantity" step="1" :disabled="!item.quantity || item.status !== 'available'" required>
          <button type="button" :aria-label="`Increase quantity for ${item.item_name}`" :disabled="!item.quantity || quantities[item.item_id] >= item.quantity" @click="quantities[item.item_id]++">+</button>
        </div>
        <button class="request-button list-request-button" :disabled="!item.quantity || item.status !== 'available' || !Number.isInteger(quantities[item.item_id]) || quantities[item.item_id] < 1 || quantities[item.item_id] > item.quantity || requestingItems.includes(item.item_id)" @click="borrow(item)">
          {{ requestingItems.includes(item.item_id) ? 'Sending…' : item.status === 'available' && item.quantity ? 'Request' : 'Unavailable' }}
          <ArrowRight v-if="item.status === 'available' && item.quantity && !requestingItems.includes(item.item_id)" :size="14" />
        </button>
      </article>
    </div>
    <div v-else-if="loading === false && inventory.length" class="empty-state">
      <span class="empty-icon"><Search :size="21" /></span>
      <strong>No matching equipment</strong>
      <p>Try another search or change the category and availability filters.</p>
      <button type="button" @click="search = ''; selectedCategory = 'all'; availabilityFilter = 'all'">Clear filters</button>
    </div>
    <div v-else-if="!loading" class="empty-state">
      <span class="empty-icon"><PackageSearch :size="21" /></span>
      <strong>No equipment listed yet</strong>
      <p>The laboratory team has not added equipment to the catalog.</p>
    </div>
  </section>
</template>

<style scoped>
.catalog-page { display: grid; gap: 19px; }
.catalog-hero { position: relative; display: flex; min-height: 232px; align-items: center; justify-content: space-between; gap: 24px; overflow: hidden; border: 1px solid #f2d8c8; border-radius: 20px; background: radial-gradient(ellipse at 88% 20%, rgb(255 255 255 / 82%), transparent 31%), linear-gradient(115deg, #fff1e7, #fffaf6 68%, #f8e5d5); padding: 30px clamp(22px, 4vw, 44px); box-shadow: 0 8px 24px rgb(87 54 32 / 4%); }
.catalog-hero::before { position: absolute; top: 24px; bottom: 24px; left: 0; width: 4px; border-radius: 0 4px 4px 0; background: #fd4d01; content: ''; }
.catalog-hero::after { position: absolute; right: 100px; bottom: -115px; width: 260px; height: 260px; border: 1px solid rgb(253 77 1 / 12%); border-radius: 50%; content: ''; }
.hero-copy, .hero-summary { position: relative; z-index: 1; }
.eyebrow { color: #c2410c; font-size: 9px; font-weight: 800; letter-spacing: .17em; }
.hero-copy h2 { margin: 10px 0 9px; color: #422817; font-size: clamp(25px, 3vw, 36px); font-weight: 780; letter-spacing: -.055em; line-height: 1.13; }
.hero-copy h2 span { color: #b45324; }
.hero-copy p { max-width: 430px; margin: 0; color: #806b5c; font-size: 12px; line-height: 1.65; }
.hero-summary { display: grid; min-width: 175px; justify-items: start; border: 1px solid rgb(255 255 255 / 75%); border-radius: 16px; background: rgb(255 255 255 / 78%); padding: 15px 18px; box-shadow: 0 8px 25px rgb(111 65 37 / 6%); }
.summary-icon { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 10px; background: #fff0e5; color: #c2410c; }
.hero-summary > span { margin-top: 12px; color: #8a7769; font-size: 10px; font-weight: 600; }
.hero-summary > strong { margin-top: 1px; color: #422817; font-size: 28px; font-weight: 780; letter-spacing: -.05em; line-height: 1.1; }
.hero-summary > small { margin-top: 4px; color: #a18d7e; font-size: 9px; }
.catalog-controls { display: flex; align-items: center; gap: 10px; }
.search-box, .category-select { display: flex; min-height: 43px; align-items: center; gap: 9px; border: 1px solid #e6eaf0; border-radius: 11px; background: white; padding: 0 12px; color: #98a2b3; transition: border-color .15s ease, box-shadow .15s ease; }
.search-box { flex: 1; }
.search-box:focus-within, .category-select:focus-within { border-color: #f4a276; box-shadow: 0 0 0 3px rgb(251 146 60 / 12%); }
.search-box input { width: 100%; border: 0; outline: 0; color: #344054; font-size: 11px; }
.search-box input::placeholder { color: #a0a8b5; }
.category-select select { min-width: 130px; border: 0; outline: 0; background: transparent; color: #475467; font-size: 11px; }
.catalog-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 1px; }
.catalog-heading h3 { margin: 0; color: #253247; font-size: 15px; font-weight: 730; letter-spacing: -.025em; }
.catalog-heading p { margin: 4px 0 0; color: #98a2b3; font-size: 10px; }
.availability-filters { display: flex; align-items: center; gap: 4px; border: 1px solid #eceff3; border-radius: 10px; background: #fff; padding: 3px; }
.availability-filter { min-height: 29px; border: 0; border-radius: 7px; background: transparent; padding: 0 10px; color: #7a8494; font-size: 10px; font-weight: 600; white-space: nowrap; }
.availability-filter:hover { color: #a33d12; }
.availability-filter.selected { background: #fff1e9; color: #b54716; }
.catalog-heading { flex-wrap: wrap; }
.view-toggle { display: flex; flex: 0 0 auto; gap: 2px; margin-left: auto; border: 1px solid #e4e9f0; border-radius: 10px; background: white; padding: 3px; }
.view-toggle button { display: inline-flex; min-height: 29px; align-items: center; justify-content: center; gap: 5px; border: 0; border-radius: 7px; background: transparent; padding: 0 9px; color: #778397; font-size: 10px; font-weight: 600; }
.view-toggle button:hover { background: #f8fafc; color: #344054; }.view-toggle button.selected { background: #fff1e9; color: #bd3e05; }
.catalog-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 13px; }
.equipment-list { display: grid; gap: 9px; }
.equipment-list-row { display: grid; min-width: 0; grid-template-columns: 42px minmax(120px, 1fr) auto auto 122px 128px; align-items: center; gap: 14px; border: 1px solid #e8edf3; border-radius: 14px; background: white; padding: 12px 14px; box-shadow: 0 2px 8px rgb(16 24 40 / 2%); transition: border-color .16s ease, box-shadow .16s ease; }
.equipment-list-row:hover { border-color: #f0c8b1; box-shadow: 0 6px 16px rgb(87 54 32 / 5%); }
.equipment-list-row > .equipment-icon { grid-column: 1; grid-row: 1; }
.equipment-list-info { min-width: 0; grid-column: 2; grid-row: 1; }
.equipment-list-row > .availability { grid-column: 3; grid-row: 1; }
.equipment-list-info .item-category { font-size: 8px; }.equipment-list-info h4 { overflow: hidden; margin: 3px 0 0; color: #263449; font-size: 13px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }.equipment-list-info .equipment-location { margin-top: 5px; font-size: 9px; }
.list-stock { display: grid; gap: 3px; min-width: 95px; }.list-stock > span { color: #8b95a4; font-size: 8px; }.list-stock strong { color: #354256; font-size: 11px; }.list-stock small { color: #98a2b3; font-size: 9px; font-weight: 500; }
.list-request-button { width: 128px; min-width: 0; min-height: 34px; grid-column: 6; grid-row: 1; margin: 0; padding: 0 10px; font-size: 9px; }
.equipment-list-skeleton { min-height: 76px; border: 1px solid #e8edf3; border-radius: 14px; background: linear-gradient(100deg, #f2f4f7 30%, #fafbfc 48%, #f2f4f7 68%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
.equipment-card { display: flex; min-width: 0; min-height: 298px; flex-direction: column; border: 1px solid #e8edf3; border-radius: 17px; background: white; padding: 17px; box-shadow: 0 4px 13px rgb(16 24 40 / 3%); transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
.equipment-card:hover { transform: translateY(-3px); border-color: #f0b997; box-shadow: 0 12px 28px rgb(87 54 32 / 8%); }
.card-topline { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.equipment-icon { display: grid; width: 42px; height: 42px; place-items: center; border-radius: 12px; background: linear-gradient(145deg, #fff1e8, #fff8f2); color: #bf4b18; }
.availability { display: inline-flex; align-items: center; gap: 5px; border-radius: 20px; background: #ecfdf3; padding: 5px 8px; color: #027a48; font-size: 9px; font-weight: 650; text-transform: capitalize; white-space: nowrap; }
.availability i { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.availability.unavailable, .availability.maintenance, .availability.out-of-stock { background: #f2f4f7; color: #667085; }
.item-details { min-height: 92px; padding-top: 15px; }
.item-category { display: inline-block; max-width: 100%; overflow: hidden; color: #bd5a2a; font-size: 9px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.item-details h4 { overflow: hidden; margin: 5px 0 0; color: #263449; font-size: 15px; font-weight: 740; letter-spacing: -.025em; text-overflow: ellipsis; white-space: nowrap; }
.equipment-location { display: flex; align-items: center; gap: 5px; margin: 8px 0 0; color: #8791a2; font-size: 10px; }
.equipment-location :deep(svg) { flex: 0 0 auto; color: #a6afbc; }
.card-bottom { margin-top: auto; border-top: 1px solid #f0f2f5; padding-top: 11px; }
.stock-line { display: flex; align-items: center; justify-content: space-between; color: #8b95a4; font-size: 9px; }
.stock-line strong { color: #354256; font-size: 11px; font-weight: 750; }
.stock-line small { color: #98a2b3; font-size: 9px; font-weight: 500; }
.request-controls { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px; }
.request-controls > label { color: #667085; font-size: 10px; font-weight: 600; }
.quantity-control { display: flex; height: 30px; align-items: center; border: 1px solid #e4e9f0; border-radius: 8px; background: white; }
.quantity-control button { display: grid; width: 28px; height: 28px; place-items: center; border: 0; background: transparent; color: #667085; font-size: 16px; }
.quantity-control button:hover:not(:disabled) { color: #c2410c; }
.quantity-control button:disabled { cursor: not-allowed; color: #d0d5dd; }
.quantity-control input { width: 37px; border: 0; outline: 0; color: #344054; font-size: 11px; font-weight: 650; text-align: center; appearance: textfield; }
.quantity-control input::-webkit-inner-spin-button, .quantity-control input::-webkit-outer-spin-button { margin: 0; appearance: none; }
.request-button { display: flex; width: 100%; min-height: 37px; align-items: center; justify-content: center; gap: 7px; margin-top: 10px; border: 1px solid #c2410c; border-radius: 9px; background: #c2410c; color: white; font-size: 10px; font-weight: 680; transition: background .15s ease, border-color .15s ease; }
.request-button:hover:not(:disabled) { border-color: #9a3412; background: #9a3412; }
.request-button:disabled { border-color: #e5e7eb; background: #f2f4f7; color: #98a2b3; cursor: not-allowed; }
.notice { display: flex; align-items: center; gap: 8px; margin: 0; border-radius: 10px; padding: 11px 13px; font-size: 11px; line-height: 1.5; }
.success { border: 1px solid #abefc6; background: #ecfdf3; color: #027a48; }
.error { border: 1px solid #fecdd3; background: #fff1f2; color: #be123c; }
.skeleton-card { min-height: 298px; border: 1px solid #e8edf3; border-radius: 17px; background: linear-gradient(100deg, #f2f4f7 30%, #fafbfc 48%, #f2f4f7 68%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
.empty-state { display: grid; justify-items: center; border: 1px dashed #d9e0e8; border-radius: 15px; background: white; padding: 42px 18px; text-align: center; }
.empty-icon { display: grid; width: 43px; height: 43px; place-items: center; border-radius: 13px; background: #fff1e9; color: #c2410c; }
.empty-state strong { margin-top: 12px; color: #344054; font-size: 13px; }
.empty-state p { margin: 5px 0 0; color: #8791a2; font-size: 11px; }
.empty-state button { margin-top: 14px; border: 0; background: transparent; color: #b54716; font-size: 11px; font-weight: 700; }
@keyframes shimmer { to { background-position-x: -200%; } }
@media (max-width: 1020px) { .catalog-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.catalog-hero { min-height: 205px; } }
@media (max-width: 850px) { .equipment-list-row { grid-template-columns: 40px minmax(0, 1fr) auto auto; gap: 10px; }.equipment-list-row > .equipment-icon { grid-column: 1; grid-row: 1; }.equipment-list-info { grid-column: 2 / 4; grid-row: 1; }.equipment-list-row > .availability { grid-column: 4; grid-row: 1; }.list-stock { grid-column: 2; grid-row: 2; }.equipment-list-row > .quantity-control { grid-column: 3; grid-row: 2; }.list-request-button { width: 104px; grid-column: 4; grid-row: 2; } }
@media (max-width: 640px) { .catalog-page { gap: 17px; }.catalog-hero { min-height: 0; align-items: flex-start; flex-direction: column; gap: 17px; border-radius: 16px; padding: 22px 18px; }.catalog-hero::after { right: -55px; bottom: -160px; }.hero-copy h2 { font-size: 28px; }.hero-summary { width: 100%; grid-template-columns: 38px 1fr auto; align-items: center; column-gap: 9px; padding: 10px 12px; }.summary-icon { grid-row: span 2; }.hero-summary > span { margin-top: 0; }.hero-summary > strong { grid-column: 3; grid-row: 1 / span 2; }.hero-summary > small { grid-column: 2; }.catalog-controls { align-items: stretch; flex-direction: column; }.search-box { min-height: 42px; }.category-select { min-height: 40px; }.category-select select { flex: 1; }.catalog-heading { align-items: flex-start; flex-direction: column; gap: 10px; }.availability-filters { width: 100%; }.availability-filter { flex: 1; padding: 0 5px; }.catalog-grid { grid-template-columns: 1fr; gap: 10px; }.equipment-card { min-height: 0; padding: 14px; }.item-details { min-height: 83px; }.skeleton-card { min-height: 265px; } }
@media (max-width: 640px) { .catalog-heading .view-toggle { width: 100%; margin-left: 0; }.catalog-heading .view-toggle button { flex: 1; }.equipment-list-row { grid-template-columns: 34px minmax(0, 1fr) auto; gap: 9px; padding: 11px; }.equipment-list-row > .equipment-icon { grid-column: 1; grid-row: 1; }.equipment-list-info { grid-column: 2 / 4; grid-row: 1; }.equipment-list-row > .availability { grid-column: 1 / 2; grid-row: 2; }.list-stock { min-width: 70px; grid-column: 2; grid-row: 2; }.equipment-list-row > .quantity-control { grid-column: 3; grid-row: 2; }.list-request-button { width: 100%; grid-column: 1 / 4; grid-row: 3; } }
@media (prefers-reduced-motion: reduce) { .equipment-card, .request-button { transition: none; }.skeleton-card { animation: none; } }
</style>
