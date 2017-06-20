import React, { Component } from 'react';
import axios from 'axios';
import Highcharts from 'highcharts';
import { Link } from 'react-router-dom';
import 'jquery/dist/jquery.min.js';
import 'bootstrap/dist/js/bootstrap.min.js'
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import 'react-bootstrap-table/dist/react-bootstrap-table-all.min.css';
import { VictoryArea, VictoryLine, VictoryTheme, VictoryChart } from 'victory'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import moment from 'moment'

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

        var timeSeries = nodeStats.map(item => { return item.timestamp})
        
        const memoryConverter = (unit, sizeInBytes) => { 
            var sizeMap = {
                kb: {coefficient: 1024**1},
                mb: {coefficient: 1024**2},
                gb: {coefficient: 1024**3}
            }

            var rst = Math.ceil(Number(sizeInBytes) / Number(sizeMap[unit.toLowerCase()].coefficient)) + unit.toUpperCase()
            return rst;
        }

        //series data and rate data
        var metrics = [
            { name: 'timestamp', path: 'timestamp' },
            { name: 'oldgc', path: 'jvm.gc.collectors.old.collection_count', series: [], isRate: true },
            { name: 'youngc', path: 'jvm.gc.collectors.young.collection_count', series: [], isRate: true },
            { name: 'docs', path: 'indices.docs.count', series: [], isRate: true },
            { name: 'search', path: 'indices.search.query_total', series: [], isRate: true },
            { name: 'merge', path: 'indices.merges.total', series: [], isRate: true },
            { name: 'refresh', path: 'indices.refresh.total', series: [],isRate: true },
            { name: 'flush', path: 'indices.flush.total', series: [], isRate: true },
            { name: 'fielddata', path: 'indices.fielddata.memory_size_in_bytes', series: [],isRate: false, convertFunc: memoryConverter.bind(null,'mb') },
            { name: 'segments', path: 'indices.segments.count', series: [], isRate:false },
            { name: 'heap', path: 'jvm.mem.heap_used_in_bytes', series: [], isRate:false, convertFunc: memoryConverter.bind(null,'gb') },
            { name: 'write_operations', path: 'fs.io_stats.total.write_operations', series: [], isRate: true },
            { name: 'read_operations', path: 'fs.io_stats.total.read_operations', series: [], isRate: true }
        ]

        var chartData = []
        nodeStats.forEach((item,idx) => {
            var metricJson = {}
            console.log("idx: " + idx)
            console.log(chartData)
            var series = metrics.forEach(metric => {
                var targetPath = "item." + metric.path
                var rawValue =  eval(targetPath)
              
                metricJson[metric.name] = rawValue
                //caculating the rates
                metricJson['hasRate'] = metric.isRate
                if ( metric.isRate ) {
                    if ( idx > 0 ) {
                        var rawDiff = Number(metricJson[metric.name]) - Number(chartData[idx - 1][metric.name])
                        var timeDiff = (Number(timeSeries[idx]) - Number(timeSeries[idx-1])) / 1000.0
                        var rate = rawDiff / timeDiff
                        console.log(`rawDiff ${rawDiff} timeDiff ${timeDiff}`)
                        var rateName = metric.name + "_rate"
                        metricJson[rateName] = Math.ceil(rate)
                    }
                }
            })
           
            chartData.push(metricJson)
        })

        console.log(chartData)
        
        const dateFormat = (time) => { return moment(time).format('HH:mm:ss') }
        
            
        var rateCharts = metrics.filter( item=> item.isRate == true).map( metric => {
            var graphData = chartData.slice(1)
            var rateName = metric.name + "_rate"
            const unitConvert = ( value ) => {
                if ( metric.convertFunc != null )
                return metric.convertFunc(value)
                else
                return value
            }    
            
            return (<div className="col-lg-6">
                    <ResponsiveContainer width='95%' aspect={5.0/1.5}>
                    <LineChart data={chartData.slice(1)}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <XAxis dataKey="timestamp" tickFormatter={dateFormat}/>
                        <YAxis tickFormatter={unitConvert} />
                        <CartesianGrid strokeDasharray="3 3" />
                        <Tooltip />
                        <Legend verticalAlign="top"/>
                        <Line type="monotone" dataKey={rateName} stroke="blue" fillOpacity={1} fill="Coral" isAnimationActive={false} />
                    </LineChart>
                    </ResponsiveContainer>
                    </div>)
        })

        var histogramCharts = metrics.filter( item=> item.isRate == false ).map( metric => {
            var graphData = chartData.slice(1)
            const unitConvert = ( value ) => {
                if ( metric.convertFunc != null )
                return metric.convertFunc(value)
                else
                return value
            }
            return (<div className="col-lg-6">
                    <ResponsiveContainer width='95%' aspect={5.0/1.5}>
                    <AreaChart data={chartData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="timestamp" tickFormatter={dateFormat}/>
                        <YAxis tickFormatter={unitConvert}/>
                        <CartesianGrid strokeDasharray="3 3" />
                        <Tooltip />
                        <Legend verticalAlign="top"/>
                        <Area type="monotone" dataKey={metric.name} stroke="Lime" fillOpacity={1} fill="SeaGreen" />
                    </AreaChart>
                    </ResponsiveContainer>
                    </div>)
        })

        return (
            <div className="col-lg-11">
                <div className="row">
                    {histogramCharts}
                    {rateCharts}
                </div>
                </div>
        )
        /*
        return (
            <div className="col-lg-11">
                <div className="row">
                    <div className="col-lg-6">
                    <ResponsiveContainer width='95%' aspect={5.0/2.0}>
                    <AreaChart data={chartData.slice(1)}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="timestamp" tickFormatter={dateFormat}/>
                        <YAxis />
                        <CartesianGrid strokeDasharray="3 3" />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="youngc_rate" stroke="#8884d8" fillOpacity={1} fill="url(#colorUv)" />
                    </AreaChart>
                    </ResponsiveContainer>
                    </div>
                    <div className="col-lg-6">
                    <ResponsiveContainer width='95%' aspect={5.0/2.0}>
                    <AreaChart data={chartData.slice(1)}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="timestamp" tickFormatter={dateFormat}/>
                        <YAxis />
                        <CartesianGrid strokeDasharray="3 3" />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="oldgc_rate" stroke="#8884d8" fillOpacity={1} fill="url(#colorUv)" />
                    </AreaChart>
                    </ResponsiveContainer>
                    </div>
                </div>
            </div>)
            */
    }
}

export default EsNodeDetail;
