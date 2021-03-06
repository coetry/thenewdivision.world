var choo = require('choo')
var LRU = require('nanolru')

var app = choo({cache: new LRU(100)})

if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  app.use(require('choo-devtools')())
  app.use(require('choo-service-worker/clear')())
}

app.use(require('choo-service-worker')('/sw.js'))
app.use(require('./stores/documents'))
app.use(require('./stores/meta'))
app.use(require('./stores/ui'))

app.route('/', require('./views/home'))
app.route('/:slug', catchall)
app.route('/about', require('./views/about'))
app.route('/about/:anchor', require('./views/about'))
app.route('/404', require('./views/404'))

try {
  module.exports = app.mount('body')
} catch (err) {
  if (typeof window !== 'undefined') {
    document.documentElement.classList.remove('has-js')
  }
}

function catchall (state, emit) {
  if (typeof window !== 'undefined' && window.location.hash) {
    return require('./views/home')(state, emit)
  }
  return require('./views/case')(state, emit)
}
