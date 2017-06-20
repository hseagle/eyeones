import React, { Component } from 'react';
import axios from 'axios';
import Highcharts from 'highcharts';
import { Link } from 'react-router-dom';
import 'jquery/dist/jquery.min.js';
import 'bootstrap/dist/js/bootstrap.min.js'
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import 'react-bootstrap-table/dist/react-bootstrap-table-all.min.css';

class EsNodeDetail extends Component {
    constructor(props, context) {
        super()
        this.state = { nodestats: [] }
    }

    getInitialState() {
    }

    componentWillMount() {
        console.log(this.props.match.params)
    }

    componentDidMount() {
        this.timerID = setInterval(() => this.tick(), 5000);
    }


    //take the history series data and plotting the chart immiediately
    componentDidUpdate() {
    }

    tick() {
        var nodeName = this.props.match.params.nodeid
        var fetchUrl = `/nodestats/${nodeName}`
        axios.get(fetchUrl).then(response => {
            var jsonData = response.data
            this.setState({ nodestats: jsonData })
        })
    }

    componentWillUnmount() {
        clearInterval(this.timerID);
    }

    render() {

        if (this.state.nodestats.length == 0)
            return <div></div>

        var nodeStats = this.state.nodestats

        console.log(this.state.nodestats)

        var timeSeries = nodeStats.map(item => { return item.timestamp })

        var metrics = [
            { name: 'oldgc', path: 'jvm.gc.collectors.old.collection_count', series: [] },
            { name: 'youngc', path: 'jvm.gc.collectors.young.collection_count', series: [] },
            { name: 'docs', path: 'indices.docs.count', series: [] },
            { name: 'search', path: 'indices.search.query_total', series: [] },
            { name: 'merge', path: 'indices.merges.total', series: [] },
            { name: 'refresh', path: 'indices.refresh.total', series: [] },
            { name: 'flush', path: 'indices.flush.total', series: [] },
            { name: 'fielddata', path: 'indices.fielddata.memory_size_in_bytes', series: [] },
            { name: 'segments', path: 'indices.segments.count', series: [] },
            { name: 'heap', path: 'jvm.mem.heap_used_in_bytes', series: [] },
            { name: 'write_operations', path: 'fs.io_stats.total.write_operations', series: [] },
            { name: 'read_operations', path: 'fs.io_stats.total.read_operations', series: [] }
        ]

        metrics.forEach(metric => {
            var series = nodeStats.map(item => {
                var targetPath = "item." + metric.path
                console.log(targetPath)
                var val = eval(targetPath)
                return val
            })
            metric.series = series.slice(0)
        })


        return (
            <div className="col-lg-11">
                {
                    metrics.map(item => {
                        return <p>{item.name}&nbsp;&nbsp;{item.series.toString()}</p>
                    })
                }
            </div>)
    }
}

export default EsNodeDetail;
