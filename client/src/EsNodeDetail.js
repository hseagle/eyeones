import React, { Component } from 'react';
import axios from 'axios';
import Highcharts from 'highcharts';
import { Link } from 'react-router-dom';
import 'jquery/dist/jquery.min.js';
import 'bootstrap/dist/js/bootstrap.min.js'
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table';
import 'react-bootstrap-table/dist/react-bootstrap-table-all.min.css';

class EsNodeDetail extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = { initialized: false };
        this._charts = {};
        this._chartInitialized = false;
        this._historyNodeStats = [];
        this._chartConfig = {
            /* HighchartsConfig */
            credits: {
                enabled: false
            },
            series: [{
                data: [],
                lineWidth: 1,
                showInLegend: false
            }],
            chart: {
                height: 200
            },
            plotOptions: {
                line: {
                    marker: {
                        radius: 2
                    }
                }
            },
            yAxis: {
                title: {
                    text: null
                }
            }
        };

        console.log("try to access fltDB in EsNodeDetail constructor")

        console.log(window.fltDB)

        var esNodeName = this.props.match.params.nodeid
        if (window.fltDB[esNodeName]) {
            console.log("EsNodeDetail constructor after display the fltDB items")
            if (window.fltDB[esNodeName].length > 0) {
                var nodeStats = window.fltDB[esNodeName].slice(-1)[0]
                Object.assign(this._historyNodeStats, window.fltDB[esNodeName])
                this.setState({ nodeStats: nodeStats, initialized: true })
            }
        }
    }

    getInitialState() {
        this.state = { esnodename: this.props.match.params.nodeid };

        return { esnodename: this.props.match.params.nodeid };
    }

    componentWillMount() {
        var esNodeName = this.state.esnodename

        console.log(JSON.stringify(esNodeName))
        console.log(window.fltDB)

        if (window.fltDB[esNodeName] != null) {
            console.log("component willMount after display the fltDB items")
            if (window.fltDB[esNodeName].length > 0) {
                var nodeStats = window.fltDB[esNodeName].slice(-1)[0]
                Object.assign(this._historyNodeStats, window.fltDB[esNodeName])
                this.setState({ nodeStats: nodeStats })
            }
        }
    }

    componentDidMount() {
        console.log("call componentDidMount()");

        this.setState({ esnodename: this.props.match.params.nodeid });
        this.timerID = setInterval(() => this.tick(), 5000);
    }


    //take the history series data and plotting the chart immiediately
    componentDidUpdate() {
        if (this._chartInitialized == false) {
            var esNodeName = this.props.match.params.nodeid
            this._chartInitialized = true;
            this.createChart('heap', 'heapChart', 'used heap memory');
            this.createChart('gc', 'gcChart', 'gc count');

            var oldGcSeriesData = window.fltNodeRateDB[esNodeName]['old_gc']['rates']
            this._charts['gc'].addSeries({ data: oldGcSeriesData, lineWidth: 1, color: "#FF0000", name: "old gc" });

            this.createChart('thread', 'threadChart', 'thread count');
            var threadPeakSeriesData = window.fltNodeRateDB[esNodeName]['thread_peak']['rates']
            this._charts['thread'].addSeries({ data: threadPeakSeriesData, lineWidth: 1, color: "#FF0000", name: "peak_count" });


            //fs related charts
            this.createChart('write_ops', 'writeOpChart', 'write operations');
            this.createChart('read_ops', 'readOpChart', 'read operations');


            //indices charts
            this.createChart('segments', 'segmentsChart', 'segments count');
            this.createChart('fielddata', 'fielddataChart', 'fielddata size');
            this.createChart('flush', 'flushChart', 'flush rate');
            this.createChart('refresh', 'refreshChart', 'refresh rate');
            this.createChart('merges', 'mergeChart', 'merge rate');
            this.createChart('query', 'queryChart', 'query rate');
            this.createChart('index', 'indexChart', 'index rate');
        } else {
            var heapChart = this._charts['heap'];
            var stats = this.state.nodeStats;
            console.log(heapChart);
            var series = heapChart.series[0];
            if (series.data.length < 50) {
                series.addPoint(stats.jvm.mem.heap_used_in_bytes, false, false);
                heapChart.redraw();
            } else {
                series.addPoint(stats.jvm.mem.heap_used_in_bytes, true, true);
            }

            //update the gc charts by calculating the rate
            var gcChart = this._charts['gc'];
            var historyStats = this._historyNodeStats.slice(-2);
            var diffTime = Number(historyStats[1].timestamp) - Number(historyStats[0].timestamp);

            var youngGcDiff = Number(historyStats[1].jvm.gc.collectors.young.collection_count) -
                Number(historyStats[0].jvm.gc.collectors.young.collection_count);

            var oldGcDiff = Number(historyStats[1].jvm.gc.collectors.old.collection_count) -
                Number(historyStats[0].jvm.gc.collectors.old.collection_count);

            var youngGcRate = Math.ceil(youngGcDiff / (diffTime / 1000));
            var oldGcRate = Math.ceil(oldGcDiff / (diffTime / 1000));
            this.updateChart(gcChart, 50, 0, youngGcRate);
            this.updateChart(gcChart, 50, 1, oldGcRate);


            var threadChart = this._charts['thread'];
            this.updateChart(threadChart, 50, 0, Number(stats.jvm.threads.count));
            this.updateChart(threadChart, 50, 1, Number(stats.jvm.threads.peak_count));

            //update fs charts
            var writeOpDiff = Number(historyStats[1].fs.io_stats.total.write_operations) - Number(historyStats[0].fs.io_stats.total.write_operations);
            var readOpDiff = Number(historyStats[1].fs.io_stats.total.read_operations) - Number(historyStats[0].fs.io_stats.total.read_operations);

            var writeRate = Math.ceil(writeOpDiff / (diffTime / 1000.0));
            var readRate = Math.ceil(readOpDiff / (diffTime / 1000.0));
            var writeOpChart = this._charts['write_ops'];
            this.updateChart(writeOpChart, 50, 0, writeRate);

            var readOpChart = this._charts['read_ops'];
            this.updateChart(readOpChart, 50, 0, readRate);

            //update indices chart
            this.updateChartByName('segments', 50, 0, Number(stats.indices.segments.count));

            var fielddataSizeInMb = Math.ceil(Number(stats.indices.fielddata.memory_size_in_bytes) / Math.pow(1024, 2));
            this.updateChartByName('fielddata', 50, 0, fielddataSizeInMb);

            var refreshRate = this.calculateRate(historyStats, "indices.refresh.total", "timestamp");
            this.updateChartByName('refresh', 50, 0, refreshRate);
            console.log("refreshRate " + refreshRate);

            var mergeRate = this.calculateRate(historyStats, "indices.merges.total", "timestamp");
            this.updateChartByName('merges', 50, 0, refreshRate);
            console.log("mergeRate" + mergeRate);

            var flushRate = this.calculateRate(historyStats, "indices.flush.total", "timestamp");
            this.updateChartByName('flush', 50, 0, refreshRate);
            console.log("flushRate" + flushRate);

            var queryRate = this.calculateRate(historyStats, "indices.search.query_total", "timestamp");
            this.updateChartByName('query', 50, 0, queryRate);

            var indexRate = this.calculateRate(historyStats, "indices.indexing.index_total", "timestamp");
            this.updateChartByName('index', 50, 0, indexRate);
        }
    }

    calculateRate(seriesData, valuePath, timePath) {
        var prevVal = Number(eval("seriesData[0]." + valuePath));
        var currVal = Number(eval("seriesData[1]." + valuePath));
        var prevTime = Number(eval("seriesData[0]." + timePath));
        var curTime = Number(eval("seriesData[1]." + timePath));

        var valDiff = currVal - prevVal;
        var timeDiff = (curTime - prevTime) / 1000.0;

        console.log("preval: " + prevVal + " currVal: " + currVal);
        return Math.ceil(valDiff / timeDiff);
    }

    createChart(chartName, anchorPoint, title) {
        var localChartConfig = Object.assign({}, this._chartConfig)
        if (window.fltNodeRateDB[this.state.esnodename] != null) {
            if (window.fltNodeRateDB[this.state.esnodename][chartName] != null)
                localChartConfig.series[0].data = window.fltNodeRateDB[this.state.esnodename][chartName]['rates'].slice()
        }
        this._charts[chartName] = Highcharts.chart(anchorPoint, localChartConfig)
        this._charts[chartName].setTitle({ text: title, style: { "fontSize": "12px" } });
    }

    updateChartByName(chartName, maxLen, idx, newValue) {
        var chart = this._charts[chartName];
        this.updateChart(chart, maxLen, idx, newValue);
    }

    updateChart(chart, maxLen, idx, newValue) {
        if (chart.series[idx].data.length < maxLen) {
            chart.series[idx].addPoint(newValue, false, false);
            chart.redraw();
        } else
            chart.series[idx].addPoint(newValue, true, true);
    }


    tick() {
        var esNodeName = this.state.esnodename

        if (window.fltNodeRateDB[esNodeName] != null)
            console.log(window.fltNodeRateDB[esNodeName])

        if ( (window.fltNodeRateDB[esNodeName] != null) && ( window.fltDB[esNodeName].length > 0) ) {
            var nodeStats = window.fltDB[esNodeName].slice(-1)[0]
            Object.assign(this._historyNodeStats, window.fltDB[esNodeName])
            this.setState({ nodeStats: nodeStats })
        }
    }

    componentWillUnmount() {
        clearInterval(this.timerID);
    }

    render() {
        if (this.state.initialized == false) {
            this.state.initialized = true;
            return (<div><p>{this.state.esnodename}</p></div>);
        } else {
            var stats = this.state.nodeStats;
            var shards = window.esDB.getCollection("shards")
            var tableData = shards.find({node: this.state.esnodename})
            return (
                <div className="col-lg-11">
                    <div className="row">
                        <ol className="breadcrumb">
                            <li><Link to="/nodes">Nodes</Link></li>
                            <li className="active">{this.state.esnodename}</li>
                        </ol>
                    </div>
                    <div className="row panel panel-default">
                        <div className="panel-heading text-left">
                            <h2 className="panel-title">
                                <a data-toggle="collapse" href="#collapse1" className="label label-success">jvm stats</a>
                            </h2>
                        </div>
                        <div id="collapse1" className="panel-body">
                            <div id="heapChart" className="col-md-4"></div>
                            <div id="gcChart" className="col-md-4"></div>
                            <div id="threadChart" className="col-md-4"></div>
                        </div>
                    </div>
                    <div className="row panel panel-default">
                        <div className="panel-heading text-left">
                            <h2 className="panel-title">
                                <a data-toggle="collapse" href="#collapse2" className="label label-success">indices data</a>
                            </h2>
                        </div>
                        <div className="panel-body" id="collapse2">
                            <div id="indexChart" className="col-md-4"></div>
                            <div id="queryChart" className="col-md-4"></div>
                            <div id="mergeChart" className="col-md-4"></div>
                            <div id="refreshChart" className="col-md-4"></div>
                            <div id="flushChart" className="col-md-4"></div>
                            <div id="fielddataChart" className="col-md-4"></div>
                            <div id="segmentsChart" className="col-md-4"></div>
                        </div>
                    </div>
                    <div className="row panel panel-default">
                        <div className="panel-heading text-left">
                            <h2 className="panel-title">
                                <a data-toggle="collapse" href="#collapse3" className="label label-success">fs</a>
                            </h2>
                        </div>
                        <div className="panel-body" id="collapse3">
                            <div id="writeOpChart" className="col-md-4"></div>
                            <div id="readOpChart" className="col-md-4"></div>
                        </div>
                    </div>
                    <BootstrapTable data={tableData} striped hover pagination search>
                    <TableHeaderColumn hidden isKey dataField='uniq_id' width='250px'>uniq_id</TableHeaderColumn>
					<TableHeaderColumn dataField='index'>index</TableHeaderColumn>
					<TableHeaderColumn dataField='shard'>shard</TableHeaderColumn>
					<TableHeaderColumn dataField='prirep'>prirep</TableHeaderColumn>
					<TableHeaderColumn dataField='ip' dataSort={true}>ip</TableHeaderColumn>
                    </BootstrapTable>
                </div>
            );
        }
    }
}

export default EsNodeDetail;
