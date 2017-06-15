var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var users = require('./routes/users');
var db = require('./persistence/datastore')
var clusterTbl = db.addCollection("cluster",{ttl: 20000, ttlInterval:1000})
var eventTbl = db.addCollection("events", {ttl:3600*1000, ttlInterval: 5000})
var indexTbl= db.addCollection("indices", {ttl:10000, ttlInterval: 2000})
var shardTbl= db.addCollection("shards", {ttl:15000, ttlInterval: 2000})
var nodeTbl= db.addCollection("nodes", {ttl:6000, ttlInterval: 2000})
var axios = require('axios')

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

//获取集群的最新状态
function tick() {
    axios.get("http://10.8.122.215:9200/_cluster/stats?format=json").then(function(response) {
        var clusterInfo = response.data
        //check whether the state is changed
        var oldState = clusterTbl.get(clusterTbl.maxRecord("timestamp").index)
        if ( oldState!=null && ( oldState.status != clusterInfo.status ) )
            eventTbl.insert({stateChanged: 1, timestamp: clusterInfo.timestamp})
        clusterTbl.insert(clusterInfo)
    })
    fetchIndicesInfo();
    fetchShardInfo();
    fetchNodeInfo()
}

//获取indices的最新状态
function fetchIndicesInfo() {
    var esServerAddr = "http://10.8.122.215:9200"
    var indexFetchUrl = `${esServerAddr}/_cat/indices?h=index,status,health,docs.count,indexing.index_total,search.query_total,memory.total,pri,rep&format=json`
    axios.get(indexFetchUrl).then( function(response) {
        var indices = response.data
        indexTbl.insert(indices.filter(item=>item.status == "open"))
    })
}

//获取shards最新状态
function fetchShardInfo() {
    var esServerAddr = "http://10.8.122.215:9200"
    var shardFetchUrl = `${esServerAddr}/_cat/shards?h=index,shard,prirep,ip,node,indexing.index_total,search.query_total&format=json`
    axios.get(shardFetchUrl).then( function(response) {
        var shards = response.data
        shardTbl.insert(shards)
    })
}


//获取nodes最新状态
function fetchNodeInfo() {
    var esServerAddr = "http://10.8.122.215:9200"
    var nodeFetchUrl = `${esServerAddr}/_cat/nodes?h=ip,name,load_5m,heap.percent,indexing.index_total,search.query_total,segments.count&format=json`
    axios.get(nodeFetchUrl).then( function(response) {
        var nodes = response.data
        nodeTbl.insert(nodes)
    })
}

setInterval(tick,5000)

module.exports = app;
