// Print-friendly recipe layout: adds a "Print" button to the recipe toolbar.
(function () {
  // Ingredient lists at least this long are printed in two columns.
  var TWO_COLUMN_MIN = 6

  document.addEventListener('recipe:open', function (event) {
    var detail = event.detail || {}
    var view = detail.view
    var recipe = detail.recipe
    if (!view) return

    var toolbar = view.querySelector('.recipe-actions')
    if (toolbar) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'print-button no-print'
      button.textContent = 'Print'
      button.addEventListener('click', function () { window.print() })
      // A space keeps the same gap between buttons as inline HTML markup would.
      toolbar.appendChild(document.createTextNode(' '))
      toolbar.appendChild(button)
    }

    var ingredients = view.querySelector('.ingredients')
    var count = recipe && recipe.ingredients ? recipe.ingredients.length : 0
    if (ingredients && count >= TWO_COLUMN_MIN) ingredients.classList.add('print-columns')
  })
})()
