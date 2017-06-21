import React, { Component } from 'react';
import axios from 'axios';
import ReactHighcharts from 'react-highcharts';
import Highcharts from 'highcharts';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import 'react-bootstrap-table/dist/react-bootstrap-table-all.min.css';
import { Link } from 'react-router-dom';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import moment from 'moment'

class EsIndexDetail extends Component {
	constructor() {
		super();
		this.state = { indexstats: [] }
	}

	getInitialState() {
		return {
			indexname: this.props.match.params.indexname
		}
	}

	componentDidMount() {
		console.log("componentDidMount is called in EsIndexDetail")
		this.setState({ indexname: this.props.match.params.indexname });
		this.timerId = setInterval(() => this.tick(), 20000);
	}

	componentWillMount() {
		console.log(this.props.match.params)
		this.tick()
	}

	componentWillUnmount() {
		clearInterval(this.timerId);
	}

	tick() {
		var indexName = this.props.match.params.indexname
		var fetchUrl = `/indexstats/${indexName}`
		var self = this
		axios.get(fetchUrl).then(response => {
			console.log("receive response in tick()")
			var jsonData = response.data
			console.log(jsonData)
			self.setState({ indexstats: jsonData })
		}).catch(error => {
			console.log(error)
		})
	}

	componentDidUpdate() {
	}

	byteConverter(valueStr) {
		var sizeMap = { 'b': 1, 'kb': 1024, 'mb': Math.pow(1024, 2), 'gb': Math.pow(1024, 3) };
		var unitPart = valueStr.replace(/[\d.]/g, '');
		var sizeInBytes = sizeMap[unitPart] * Number(valueStr.replace(/[^\d.]/g, ''));
		var sizeInMegaBytes = Math.ceil(sizeInBytes / sizeMap['mb']);
		return sizeInMegaBytes;
	}


	render() {
		if (this.state.indexstats.length == 0)
			return <div></div>


		var indexStats = this.state.indexstats

        var timeSeries = indexStats.map(item => { return item.timestamp})
        
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
            { name: 'docs', path: 'primaries.docs.count', series: [], isRate: true },
			{ name: 'store', path: 'primaries.store.size_in_bytes', series: [], isRate: false, convertFunc: memoryConverter.bind(null,'gb') },
			{ name: 'fielddata', path: 'primaries.fielddata.memory_size_in_bytes', series: [], isRate: false, convertFunc: memoryConverter.bind(null,'mb') },
			{ name: 'segments', path: 'primaries.segments.count', series: [], isRate: false},
			{ name: 'segments.memory', path: 'primaries.segments.memory_in_bytes', series: [], isRate: false, convertFunc: memoryConverter.bind(null,'mb')},
			{ name: 'query_cache', path: 'primaries.query_cache.memory_size_in_bytes', series: [], isRate: false, convertFunc: memoryConverter.bind(null,'mb')},
			{ name: 'search', path: 'primaries.search.query_total', series:[], isRate:true},
			{ name: 'merge', path: 'primaries.merges.total', series:[], isRate:true},
			{ name: 'refresh', path: 'primaries.refresh.total', series:[], isRate:true},
			{ name: 'flush', path: 'primaries.flush.total', series:[], isRate:true},
			{ name: 'indexing.throttle', path: 'primaries.indexing.throttle_time_in_millis', series:[], isRate:false}
        ]

        var chartData = []
		
        indexStats.forEach((item,idx) => {
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
                    <ResponsiveContainer width='100%' aspect={6.0/1.5}>
                    <LineChart data={chartData.slice(1)}
                        margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                        <XAxis dataKey="timestamp" tickFormatter={dateFormat}/>
                        <YAxis tickFormatter={unitConvert} />
                        <CartesianGrid strokeDasharray="3 3" />
                        <Tooltip />
                        <Legend verticalAlign="top"/>
                        <Line type="monotone" dataKey={rateName} stroke="#82ca9d" fillOpacity={1} fill="Coral" isAnimationActive={false} />
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
                    <ResponsiveContainer width='100%' aspect={6.0/1.5}>
                    <AreaChart data={chartData}
                        margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
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
                        <Area type="monotone" dataKey={metric.name} stroke="#8884d8" fillOpacity={1} fill="url(#colorPv)" />
                    </AreaChart>
                    </ResponsiveContainer>
                    </div>)
        })

              
		var choosedIndex = this.state.indexname


		return (
            <div className="col-lg-11">
                <div className="row">
                        <ol className="breadcrumb">
                            <li><Link to="/indices">indices</Link></li>
                            <li className="active">{this.state.indexname}</li>
                        </ol>
                    </div>
                <div className="row">
					{rateCharts}
                    {histogramCharts}
                </div>
                </div>
        )
	}
}

export default EsIndexDetail;
