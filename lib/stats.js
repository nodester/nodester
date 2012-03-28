var sys = require('util'),
exec = require('child_process').exec,
fs = require('fs'),
os = require('os');

process.startTime = new Date().getTime();

module.exports = {
  getMemoryUsage: function (cb) { 
    var memPerc = 100 - ((os.freemem() / os.totalmem()) * 100);
    return {usedRatio: memPerc}
  },
  getMemoryinUse :function(cb){
    return (os.totalmem()-os.freemem())/1024/1024 + 'Mbs';
  },
  getUptime: function (cb) { 
    return os.uptime();
  },
  getDiskUsage: function(cb) {
    exec("df -h | awk '{print $1,$3,$4,$5}'", function (err, resp){
      if (err)
        cb(err,null);
      else
        var out = {};
        resp = resp.split('\n')[1];
        args = resp.split(' ');
        out.disk = args[0];
        out.used = Math.round(args[2].replace( 'G', ''));
        out.total = Math.round(args[1].replace('G', ''));
        out.free = Math.round(out.total - out.used);
        out.usedPercent = Math.round(args[3].replace( '%', ''));
        cb(null,out)
    });
  },
  getCPUs: function (cb) {
    var cpus = os.cpus()
    return {count: cpus.length, name: cpus[0].model}
  },
  getCPUUsage: function(cb) {
    var total = 0,
        idle  = 0;
    var  cpus = os.cpus();
    for (t in cpus)
    total += cpus[t].times.user + cpus[t].times.nice + cpus[t].times.sys + cpus[t].times.idle
    idle  += cpus[t].times.idle
    total = total / cpus.length  
    idle  = idle / cpus.length 
    var cpuPerc = 100 - ((idle / total) * 100)
    return {usedRatio: cpuPerc}
  },
  getRAM: function(cb){
    var size = Math.round(os.totalmem() / 1000000000) + 'GB'
    return size;
  },
  getLoad: function(cb){
    var load = os.loadavg()[0]*100;
    if (load > 100)
      load = load / 10
    return load
  },
  getProcesses:function(cb) {
    exec("ps aux | awk '!/PID/ {print $1,$2,$3,$4,$10,$11}'", function(err, resp) {
      if (err)
        cb(err,null)
      else {
        var out = [];
        resp = resp.split('\n')
        for (proc in resp) {
          var args = proc.split(' ')
          out.push([args[1], args[2], args[3], args[5], args[4], args[0]])
        } 
        cb(null, out)
      }
    });
  },
  getPlatform: function(cb){
    return os.type() + ' ' + os.release()
  },
  getVersion:function(){ 
    return  process.version.replace('v', '')
  },
  getEnvironment: function(){
    return process.env.NODE_ENV || "None"
  },
  getPrefix: function(){
    return process.installPrefix || '/usr/lib/'
  },
  getProcessMemUsage : function(){
    return process.memoryUsage().rss/1024/1024 +'Mb'; 
  },
  getProcessUptime: function(){
    return (Date.now() - process.startTime)/1000 +'sec';
  },
  currentTime : function(){
    return new Date;
  }
}
