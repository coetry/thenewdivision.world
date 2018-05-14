const assert = require('assert')
const html = require('choo/html')
const { getApi, Predicates } = require('prismic-javascript')

module.exports = documents

const endpoint = getApi('https://thenewdivision.cdn.prismic.io/api/v2')

function documents (state, emitter) {
  state.documents = {
    error: null,
    loading: false,
    resolve: resolve,
    items: state.documents ? [...state.documents.items] : []
  }

  let queue = 0
  emitter.on('doc:fetch', function (query, opts = {}) {
    if (typeof window === 'undefined') {
      if (state._experimental_prefetch) {
        state._experimental_prefetch.push(api(query))
      }
    } else {
      api(query).then(done, done)
    }

    function done () {
      if (!opts.silent) render()
    }
  })

  if (
    typeof window !== 'undefined' ||
    !state.documents.items.find((item) => item.type === 'homepage')
  ) {
    // preemtively fetch homepage
    emitter.emit('doc:fetch', {type: 'homepage'}, {silent: true})
  }

  function api (query) {
    if (!query.id) assert.equal(typeof query.type, 'string', 'documents: type should be a string')

    const opts = {}
    const predicates = []
    if (state.ref) opts.ref = state.ref

    // default to fetching primary case fields
    if (query.fetchLinks) opts.fetchLinks = query.fetchLinks
    else opts.fetchLinks = ['case.title', 'case.description', 'case.image']

    if (query.id) {
      predicates.push(Predicates.at('document.id', query.id))
    }

    if (query.type) {
      if (query.uid) {
        predicates.push(Predicates.at(`my.${query.type}.uid`, query.uid))
      } else {
        predicates.push(Predicates.at('document.type', query.type))
      }
    }

    assert(predicates.length, 'documents: could not construct predicates')

    queue += 1
    state.documents.loading = true
    return endpoint.then(function (api) {
      return api.query(predicates, opts).then(function (response) {
        response.results.forEach(preload)
        state.documents.items.push(...response.results.filter(function (doc) {
          return !state.documents.items.find((existing) => existing.id === doc.id)
        }))
      })
    }).catch(function (err) {
      state.documents.error = new DocumentError(err)
    }).then(function () {
      queue -= 1
      if (queue === 0) state.documents.loading = false
    })
  }

  // preload critical images in document
  // obj -> void
  function preload (doc) {
    if (doc.type === 'homepage') {
      doc.data.featured_cases.forEach(function (props) {
        html`<img src="${props.image.url}">`
        if (props.case.data.image) html`<img src="${props.case.data.image.url}">`
      })
    } else if (doc.type === 'case') {
      html`<img src="${doc.data.image.url}">`
    }
  }

  // utility function for emitting a render event
  function render () {
    emitter.emit('render')
  }

  // keep state serializable by stripping out resolve
  resolve.toJSON = function () {
    return null
  }

  // resolve href to document
  // obj -> str
  function resolve (doc) {
    switch (doc.type) {
      case 'homepage': return '/'
      case 'about': return '/about'
      case 'case': return `/${doc.uid}`
      default: return '/404'
    }
  }
}

class DocumentError extends Error {
  constructor (err, ...args) {
    if (err instanceof Error) super(err.message, ...args)
    else super(err, ...args)

    if (Error.captureStackTrace) Error.captureStackTrace(this, DocumentError)

    this.name = 'DocumentError'
  }

  toJSON () {
    const props = {
      name: this.name,
      message: this.message
    }

    if (process.env.NODE_ENV === 'development') props.stack = this.stack

    return props
  }
}
