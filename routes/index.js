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
  var jsonData = index.chain().find().data()
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

router.get('/nodestats', function(req,res,next) {
  var nodeStats = db.getCollection('nodeStats')
  var jsonData = nodeStats.chain().find().limit(1).data()
  res.send(jsonData)
})

router.get('/nodestats/:nodename', function(req,res, next) {
  console.log(req.params)
  var nodeName = req.params.nodename
  var nodeStatsTbl = db.getCollection('nodeStats')
  var matchedNodes = nodeStatsTbl.chain().find({name: nodeName}).simplesort('timestamp').data()
  res.send(matchedNodes)
})

module.exports = router;