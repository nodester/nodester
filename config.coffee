module.exports =
  ports:
    proxy: 80
    api: 4000
    public: 4001
  
  paths:
    api: require('path').join(__dirname, './api/')
