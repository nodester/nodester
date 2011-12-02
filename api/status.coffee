module.exports =
  get: (req, res, next) ->
    res.end JSON.stringify {status: 'Online'}
    next()
      

