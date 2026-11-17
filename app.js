const list = document.getElementById('list')
const search = document.getElementById('search')
const view = document.getElementById('recipe')
let recipes = []

fetch('recipes.json')
  .then(response => response.json())
  .then(data => {
    recipes = data
    render(recipes)
  })

search.addEventListener('input', () => {
  const q = search.value.trim().toLowerCase()
  render(recipes.filter(r => r.name.toLowerCase().includes(q) || r.ingredients.some(i => i.toLowerCase().includes(q))))
})

function render(items) {
  view.hidden = true
  list.hidden = false
  list.innerHTML = items.map(r => `
    <li class="card" data-id="${r.id}">
      <h2>${r.name}</h2>
      <div class="meta">${r.minutes} min · serves ${r.serves}</div>
      ${r.tags.map(t => `<span class="tag">${t}</span>`).join('')}
    </li>`).join('')
}

list.addEventListener('click', event => {
  const card = event.target.closest('.card')
  if (card) open(recipes.find(r => r.id === card.dataset.id))
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
  document.getElementById('back').addEventListener('click', () => render(recipes))
}
