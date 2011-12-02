db = require '../lib/database'

module.exports =
  get: (req, res, next) ->
    apps = db.getDatabase 'apps'
    apps.view 'nodeapps/all', (err, resp) ->
      return res.end JSON.stringify {status: 'Database offline'} if err
      total = resp.length
      running = x for x in resp when x.running = 'true'
      res.end JSON.stringify { status: 'Online', online: running, offline: total - running, total: total } 
      
