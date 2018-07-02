module.exports = meta

function meta (state, emitter, app) {
  var doc = state.documents.items.find((item) => item.type === 'homepage')

  state.meta = Object.assign({
    image: 'https://www.thenewdivision.world/share.png',
    title: 'The New Division',
    description: doc && doc.data.summary[0].text
  }, state.meta)

  emitter.on('DOMTitleChange', function (title) {
    state.meta.title = title
  })

  emitter.on('meta', function (meta) {
    Object.assign(state.meta, meta)
  })
}
