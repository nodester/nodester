module.exports =
  exec: (res) ->
    res.end JSON.stringify error: 'Invalid API'
