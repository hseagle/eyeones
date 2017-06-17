var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var users = require('./routes/users');
var db = require('./persistence/datastore')
var clusterTbl = db.addCollection("cluster", { ttl: 20000, ttlInterval: 1000 })
var eventTbl = db.addCollection("events", { ttl: 3600 * 1000, ttlInterval: 5000 })
var indexTbl = db.addCollection("indices", { unique: 'index', autoupdate: true })
var shardTbl = db.addCollection("shards", { unique: 'uniq_id', autoupdate: true })
var nodeTbl = db.addCollection("nodes", { unique: 'name', autoupdate: true })
var rateTbl = db.addCollection("rates", { unique: 'metrics_name', autoupdate: true })
var axios = require('axios')

var app = express();

var defaultEsServerAddr = "http://127.0.0.1:9200"

var esServerAddr = process.env.ES_SERVER_ADDR || defaultEsServerAddr

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
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

//获取集群的最新状态
function tick() {
    axios.get(`${esServerAddr}/_cluster/stats?format=json`).then(function (response) {
        var clusterInfo = response.data
        //check whether the state is changed
        var oldState = clusterTbl.get(clusterTbl.maxRecord("timestamp").index)
        if (oldState != null && (oldState.status != clusterInfo.status))
            eventTbl.insert({ stateChanged: 1, timestamp: clusterInfo.timestamp })
        clusterTbl.insert(clusterInfo)
    })
    fetchIndicesInfo();
    fetchShardInfo();
    fetchNodeInfo()
}

//获取indices的最新状态
function fetchIndicesInfo() {
    var indexFetchUrl = `${esServerAddr}/_cat/indices?bytes=mb&h=index,status,health,docs.count,indexing.index_total,search.query_total,memory.total,pri,rep,fielddata.memory_size,docs.count,store.size&format=json`
    axios.get(indexFetchUrl).then(function (response) {
        var indices = response.data
        indices.forEach(function (item) {
            item['timestamp'] = (new Date()).getTime()
            if (item['status'] != 'open' || (item['index'].includes('.monitor') == true)) return;
            var seriesCols = ['indexing.index_total', 'search.query_total', 'timestamp']
            if (indexTbl.count({ index: item.index }) == 0) {
                seriesCols.forEach(function (col) { item[col] = [item[col]] })
                indexTbl.insert(item)
            } else {
                var targetIndex = indexTbl.findOne({ index: item.index })

                seriesCols.forEach(function (col) {
                    targetIndex[col].push(item[col])
                    if (targetIndex[col].length > 20) targetIndex[col].shift()
                    delete item[col]
                })

                Object.assign(targetIndex, item)
            }
        })
    })
}

//获取shards最新状态
function fetchShardInfo() {
    var shardFetchUrl = `${esServerAddr}/_cat/shards?h=index,shard,prirep,ip,node,indexing.index_total,search.query_total&format=json`
    axios.get(shardFetchUrl).then(function (response) {
        var shards = response.data
        shards.forEach(function (shard) {
            var uniqId = shard.index + '-' + shard.shard + '-' + shard.prirep;
            shard['timestamp'] = (new Date()).getTime()
            var seriesCol = ['indexing.index_total', 'search.query_total', 'timestamp']

            if (shardTbl.count({ uniq_id: uniqId }) == 0) {
                shard['uniq_id'] = uniqId

                seriesCol.forEach(function (col) {
                    shard[col] = [shard[col]]
                })
                shardTbl.insert(shard)

            } else {
                var targetShard = shardTbl.findOne({ uniq_id: uniqId })

                seriesCol.forEach(function (col) {
                    targetShard[col].push(shard[col])

                    if (targetShard[col].length > 20) targetShard[col].shift()
                    delete shard[col]
                })

                Object.assign(targetShard, shard)
            }
        })
    })
}


//获取nodes最新状态
function fetchNodeInfo() {
    var nodeFetchUrl = `${esServerAddr}/_cat/nodes?h=ip,name,load_5m,disk.avail,heap.percent,cpu,indexing.index_total,search.query_total,segments.count,node.role,master&format=json`
    axios.get(nodeFetchUrl).then(function (response) {
        var nodes = response.data


        nodes.forEach(function (item) {
            var queryCon = { name: item.name }
            var shardNum = shardTbl.find({ node: item.name }).length

            item['shard_num'] = shardNum
            item['timestamp'] = (new Date()).getTime()

            if (nodeTbl.count(queryCon) == 0) {
                var seriesCols = ['load_5m', 'heap.percent', 'cpu', 'indexing.index_total', 'search.query_total', 'timestamp']

                seriesCols.forEach(function (col) {
                    item[col] = [item[col]]
                })

                var rateCols = ['indexing', 'query']
                rateCols.forEach(col => item[col] = [])

                nodeTbl.insert(item)
            } else {
                var targetNode = nodeTbl.findOne(queryCon)
                var seriesCols = ['load_5m', 'heap.percent', 'cpu', 'indexing.index_total', 'search.query_total', 'timestamp']

                seriesCols.forEach(function (col) {
                    targetNode[col].push(item[col])
                    if (targetNode[col].length > 20) targetNode[col].shift()
                    delete item[col]
                })

                var rateColMeta = [
                    { 'seriesCol': 'indexing.index_total', 'rateCol': 'indexing' },
                    { 'seriesCol': 'search.query_total', 'rateCol': 'query' }
                ]

                var timeDiffs = targetNode['timestamp'].slice(1).map((val, idx) => {
                    return (val - targetNode['timestamp'][idx])
                })

                rateColMeta.map(function (item) {
                    var series = targetNode[item.seriesCol]
                    var rates = series.slice(1).map(function (val, idx) {
                        return Math.ceil((val - series[idx]) / (timeDiffs[idx] / 1000))
                    })
                    targetNode[item.rateCol] = rates
                    //delete item[rateColMeta.seriesCol]
                })
                Object.assign(targetNode, item)
                //nodeTbl.update(targetNode)
            }
        })
    })
}

setInterval(tick, 5000)

module.exports = app;
