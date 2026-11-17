const list = document.getElementById('list')
const search = document.getElementById('search')
const favouritesOnly = document.getElementById('favourites-only')
const view = document.getElementById('recipe')
let recipes = []

const FAVOURITES_KEY = 'recipe-box:favourites'
const favourites = loadFavourites()

function loadFavourites() {
  try {
    const stored = JSON.parse(localStorage.getItem(FAVOURITES_KEY))
    return new Set(Array.isArray(stored) ? stored : [])
  } catch {
    return new Set()
  }
}

function saveFavourites() {
  try {
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify([...favourites]))
  } catch {
    // Storage unavailable (e.g. disabled or full): favourites last for this visit only.
  }
}

function toggleFavourite(id) {
  if (favourites.has(id)) favourites.delete(id)
  else favourites.add(id)
  saveFavourites()
}

fetch('recipes.json')
  .then(response => response.json())
  .then(data => {
    recipes = data
    showList()
  })

search.addEventListener('input', showList)

favouritesOnly.addEventListener('click', () => {
  favouritesOnly.setAttribute('aria-pressed', String(favouritesOnly.getAttribute('aria-pressed') !== 'true'))
  showList()
})

function showList() {
  const q = search.value.trim().toLowerCase()
  const onlyFavourites = favouritesOnly.getAttribute('aria-pressed') === 'true'
  render(recipes.filter(r =>
    (!onlyFavourites || favourites.has(r.id)) &&
    (r.name.toLowerCase().includes(q) || r.ingredients.some(i => i.toLowerCase().includes(q)))))
}

function heart(r) {
  const on = favourites.has(r.id)
  return `<button class="heart" aria-pressed="${on}" aria-label="${on ? 'Remove from' : 'Add to'} favourites: ${r.name}" title="${on ? 'Remove from favourites' : 'Add to favourites'}">${on ? '♥' : '♡'}</button>`
}

function render(items) {
  view.hidden = true
  list.hidden = false
  const onlyFavourites = favouritesOnly.getAttribute('aria-pressed') === 'true'
  if (!items.length) {
    list.innerHTML = `<li class="empty">${onlyFavourites && !search.value.trim()
      ? 'No favourites yet. Tap the heart on a recipe to save it here.'
      : 'No recipes match.'}</li>`
    return
  }
  list.innerHTML = items.map(r => `
    <li class="card" data-id="${r.id}">
      ${heart(r)}
      <h2>${r.name}</h2>
      <div class="meta">${r.minutes} min · serves ${r.serves}</div>
      ${r.tags.map(t => `<span class="tag">${t}</span>`).join('')}
    </li>`).join('')
}

list.addEventListener('click', event => {
  const card = event.target.closest('.card')
  if (!card) return
  if (event.target.closest('.heart')) {
    const id = card.dataset.id
    toggleFavourite(id)
    showList()
    // Re-rendering replaces the button, so put keyboard focus back on it (or the filter if the card is gone).
    const again = [...list.querySelectorAll('.card')].find(c => c.dataset.id === id)
    ;(again ? again.querySelector('.heart') : favouritesOnly).focus()
    return
  }
  open(recipes.find(r => r.id === card.dataset.id))
})

function open(r) {
  list.hidden = true
  view.hidden = false
  view.innerHTML = `
    <button id="back">← All recipes</button>
    <h2>${r.name}</h2>
    <p class="meta">${r.minutes} min · serves ${r.serves}</p>
    <h3>Ingredients</h3>
    <ul>${r.ingredients.map(i => `<li>${i}</li>`).join('')}</ul>
    <h3>Steps</h3>
    <ol>${r.steps.map(s => `<li>${s}</li>`).join('')}</ol>`
  document.getElementById('back').addEventListener('click', showList)
}
