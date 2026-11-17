// Cooking timers: adds a countdown button to every step that mentions a duration.
(function () {
  'use strict'

  var FRACTIONS = { '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4 }
  var FRAC_CHARS = '½⅓⅔¼¾'

  // A quantity: "10", "1.5", "1 1/2", "1½", "1/2" or "½".
  var NUM = '(?:\\d+(?:\\.\\d+)?(?:\\s+\\d+/\\d+|\\s*[' + FRAC_CHARS + '])?|\\d+/\\d+|[' + FRAC_CHARS + '])'
  var UNIT = '(hours?|hrs?|minutes?|mins?|seconds?|secs?)'
  // Optional range ("8-10", "8–10", "8 to 10"); the unit may be joined by a hyphen ("10-minute").
  var DURATION = new RegExp(
    '(?<![\\d./' + FRAC_CHARS + '])(' + NUM + ')(?:\\s*(?:-|–|—|to)\\s*(' + NUM + '))?(?:\\s*|-)' + UNIT + '\\b',
    'gi'
  )

  function parseNumber(text) {
    var total = 0
    text.replace(/(\d+)\/(\d+)|\d+(?:\.\d+)?|[½⅓⅔¼¾]/g, function (part, num, den) {
      if (num) total += Number(den) ? Number(num) / Number(den) : 0
      else if (FRACTIONS[part]) total += FRACTIONS[part]
      else total += Number(part)
      return part
    })
    return total
  }

  function unitSeconds(unit) {
    unit = unit.toLowerCase()
    if (unit.charAt(0) === 'h') return 3600
    if (unit.charAt(0) === 'm') return 60
    return 1
  }

  // Every duration mentioned in a piece of text, in seconds (ranges use the upper number).
  function findDurations(text) {
    var found = []
    var match
    DURATION.lastIndex = 0
    while ((match = DURATION.exec(text))) {
      var amount = parseNumber(match[2] || match[1])
      var seconds = Math.round(amount * unitSeconds(match[3]))
      if (seconds > 0) found.push(seconds)
    }
    return found
  }

  // "10 min", "30 sec", "1 hr 30 min", "1 min 30 sec"
  function label(seconds) {
    var h = Math.floor(seconds / 3600)
    var m = Math.floor((seconds % 3600) / 60)
    var s = seconds % 60
    var parts = []
    if (h) parts.push(h + ' hr')
    if (m) parts.push(m + ' min')
    if (s) parts.push(s + ' sec')
    return parts.join(' ')
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n
  }

  // mm:ss, or h:mm:ss for an hour or more.
  function clock(seconds) {
    var h = Math.floor(seconds / 3600)
    var m = Math.floor((seconds % 3600) / 60)
    var s = seconds % 60
    return h ? h + ':' + pad(m) + ':' + pad(s) : pad(m) + ':' + pad(s)
  }

  // One shared AudioContext, created on the first click so browsers allow it to play.
  var audio = null
  function unlockAudio() {
    var Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    try {
      if (!audio) audio = new Ctx()
      if (audio.state === 'suspended') audio.resume()
    } catch (e) {
      audio = null
    }
  }

  function beep() {
    unlockAudio()
    if (!audio) return
    var start = audio.currentTime + 0.05
    for (var i = 0; i < 3; i++) {
      var t = start + i * 0.25
      var osc = audio.createOscillator()
      var gain = audio.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
      osc.connect(gain)
      gain.connect(audio.destination)
      osc.start(t)
      osc.stop(t + 0.2)
    }
  }

  function notify(recipe, stepText, duration) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    try {
      new Notification(recipe.name + ': timer done', { body: '⏱ ' + label(duration) + ' · ' + stepText })
    } catch (e) {
      // Some browsers (e.g. Chrome on Android) only allow notifications from a service worker.
    }
  }

  // Timers belonging to the currently rendered view.
  var timers = []

  function stopAll() {
    timers.forEach(function (t) { t.stop() })
    timers = []
  }

  function createTimer(recipe, stepText, duration) {
    var state = 'idle' // idle | running | paused | done
    var remainingMs = duration * 1000
    var endsAt = 0
    var interval = null

    var group = document.createElement('span')
    group.className = 'no-print timer-group'

    var button = document.createElement('button')
    button.type = 'button'
    button.className = 'no-print timer'
    button.setAttribute('aria-live', 'polite')
    // The ticking digits are hidden from screen readers; the hidden status text
    // changes only on state changes, so the live region announces just those.
    var display = document.createElement('span')
    display.className = 'timer-display'
    display.setAttribute('aria-hidden', 'true')
    var status = document.createElement('span')
    status.className = 'timer-sr'
    button.appendChild(display)
    button.appendChild(status)

    var reset = document.createElement('button')
    reset.type = 'button'
    reset.className = 'no-print timer-reset'
    reset.textContent = '×'
    reset.setAttribute('aria-label', 'Reset ' + label(duration) + ' timer')
    reset.title = 'Reset timer'
    reset.hidden = true

    group.appendChild(button)
    group.appendChild(reset)

    function secondsLeft() {
      return Math.max(0, Math.ceil(remainingMs / 1000))
    }

    function clearTick() {
      if (interval !== null) clearInterval(interval)
      interval = null
    }

    function render() {
      button.dataset.state = state
      reset.hidden = !(state === 'running' || state === 'paused')
      var name = label(duration) + ' timer'
      if (state === 'idle') {
        display.textContent = '⏱ ' + label(duration)
        status.textContent = 'Start ' + name
      } else if (state === 'running') {
        display.textContent = '⏱ ' + clock(secondsLeft())
        status.textContent = name + ' running'
      } else if (state === 'paused') {
        display.textContent = '⏸ ' + clock(secondsLeft())
        status.textContent = name + ' paused, ' + clock(secondsLeft()) + ' left'
      } else {
        display.textContent = 'Done!'
        status.textContent = name + ' done'
      }
    }

    function tick() {
      // The view was re-rendered by something else: don't leak this interval.
      if (!button.isConnected) return stop()
      remainingMs = endsAt - Date.now()
      if (remainingMs <= 0) {
        remainingMs = 0
        clearTick()
        state = 'done'
        render()
        beep()
        notify(recipe, stepText, duration)
        return
      }
      display.textContent = '⏱ ' + clock(secondsLeft())
    }

    function start() {
      endsAt = Date.now() + remainingMs
      state = 'running'
      clearTick()
      interval = setInterval(tick, 250)
      render()
    }

    function pause() {
      remainingMs = Math.max(0, endsAt - Date.now())
      clearTick()
      state = 'paused'
      render()
    }

    function toIdle() {
      clearTick()
      remainingMs = duration * 1000
      state = 'idle'
      render()
    }

    function stop() {
      clearTick()
    }

    button.addEventListener('click', function () {
      unlockAudio()
      if (state === 'running') pause()
      else if (state === 'done') toIdle()
      else start()
    })

    reset.addEventListener('click', function () {
      toIdle()
      button.focus()
    })

    render()
    return { element: group, stop: stop }
  }

  document.addEventListener('recipe:open', function (event) {
    stopAll()
    var recipe = event.detail.recipe
    var view = event.detail.view
    var steps = view.querySelectorAll('li.step')
    Array.prototype.forEach.call(steps, function (li) {
      var stepText = li.textContent.trim()
      findDurations(stepText).forEach(function (seconds) {
        var timer = createTimer(recipe, stepText, seconds)
        timers.push(timer)
        li.appendChild(document.createTextNode(' '))
        li.appendChild(timer.element)
      })
    })
  })
})()
