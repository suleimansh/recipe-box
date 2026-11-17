(function () {
  var LABEL = 'Copy ingredients'
  var RESET_MS = 2000

  function ingredientsText(recipe) {
    var lines = [recipe.name + ' — serves ' + recipe.serves, '']
    recipe.ingredients.forEach(function (item) { lines.push('- ' + item) })
    return lines.join('\n')
  }

  // Old-school copy through a hidden textarea; returns true on success.
  function fallbackCopy(text) {
    var area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.setAttribute('aria-hidden', 'true')
    area.style.position = 'fixed'
    area.style.top = '0'
    area.style.left = '0'
    area.style.width = '1px'
    area.style.height = '1px'
    area.style.opacity = '0'
    area.style.pointerEvents = 'none'
    document.body.appendChild(area)
    var active = document.activeElement
    var ok = false
    try {
      area.select()
      area.setSelectionRange(0, text.length)
      ok = document.execCommand('copy')
    } catch (e) {
      ok = false
    }
    document.body.removeChild(area)
    if (active && typeof active.focus === 'function') active.focus()
    return ok
  }

  // Resolves to true if either copy path worked.
  function copyText(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        return navigator.clipboard.writeText(text).then(
          function () { return true },
          function () { return fallbackCopy(text) }
        )
      } catch (e) {
        // Some browsers throw synchronously instead of rejecting.
      }
    }
    return Promise.resolve(fallbackCopy(text))
  }

  document.addEventListener('recipe:open', function (event) {
    var recipe = event.detail.recipe
    var view = event.detail.view
    var heading = view.querySelector('h3.ingredients-heading')
    if (!heading) return

    var button = document.createElement('button')
    button.type = 'button'
    button.className = 'no-print copy-ingredients'
    button.textContent = LABEL
    var timer = null

    button.addEventListener('click', function () {
      copyText(ingredientsText(recipe)).then(function (ok) {
        button.textContent = ok ? 'Copied!' : 'Copy failed'
        clearTimeout(timer)
        timer = setTimeout(function () { button.textContent = LABEL }, RESET_MS)
      })
    })

    heading.insertAdjacentElement('afterend', button)
  })
})()
