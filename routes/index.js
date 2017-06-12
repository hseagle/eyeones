var express = require('express');
var router = express.Router();
var db = require('../persistence/datastore')
/* GET home page. */
router.get('/', function(req, res, next) {
  var cnt = db.getCollection('cluster').count();
  res.render('index', { title: cnt });
});

module.exports = router;
