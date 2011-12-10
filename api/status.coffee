module.exports =
  exec: (res) ->
    res.end JSON.stringify status: 'Online'
