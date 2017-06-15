var express = require('express');
var router = express.Router();
var db = require('../persistence/datastore')
/* GET home page. */
router.get('/', function(req, res, next) {
  var cnt = db.getCollection('cluster').count();
  res.render('index', { title: cnt });
});

router.get('/cluster/stats', function(req, res, next) {
  var cluster = db.getCollection('cluster')
  var clusterInfo =  cluster.get(cluster.maxRecord("timestamp").index)
  if ( clusterInfo != null ) {
    clusterInfo['timestamp'] = (new Date()).toLocaleString()
    res.send(clusterInfo)
  }
})

router.get('/cluster/history', function(req, res, next) {
  var cluster = db.getCollection('cluster')
  var jsonData = {"total": cluster.count()}
  res.send(jsonData)
})

router.get('/indices', function(req, res, next) {
  var index = db.getCollection('indices')
  var jsonData = index.find()
  res.send(jsonData)
})

router.get('/shards', function(req, res, next) {
  var shards = db.getCollection('shards')
  var jsonData = shards.find()
  res.send(jsonData)
})

router.get('/nodes', function(req, res, next) {
  var nodes = db.getCollection('nodes')
  var jsonData = nodes.find()
  res.send(jsonData)
})

module.exports = router;
