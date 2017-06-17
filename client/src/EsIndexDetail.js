import React, { Component } from 'react';
import axios from 'axios';
import ReactHighcharts from 'react-highcharts';
import Highcharts from 'highcharts';
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table';
import 'react-bootstrap-table/dist/react-bootstrap-table-all.min.css';

//curl -XGET localhost:9200/_cat/indices/$indexname
//curl -XGET localhost:9200/_cat/indices?help
class EsIndexDetail extends Component {
	constructor() {
		super();
		this.state = {};
		this._initializedChart = false;
		this._myChart = {};
		this._chartSeriesData = [];
		this._chartDataIsReady = false
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
					},
					color: "#0033FF"

				}
			},
			tooltip: {
				hideDelay: 200
			},
			yAxis: {
				title: {
					text: null
				}
			}
		};

		this._indexChartConfig = [
			{ chartName: 'index', anchor: 'indexChart', title: 'index rate', jsonPath: 'primaries.docs.count' },
			{ chartName: 'query', anchor: 'queryChart', title: 'query rate', jsonPath: 'primaries.search.query_total' },
			{ chartName: 'refresh', anchor: 'refreshChart', title: 'refresh times', jsonPath: 'primaries.refresh.total' },
			{ chartName: 'merge', anchor: 'mergeChart', title: 'merge times', jsonPath: 'primaries.merges.total' },
			{ chartName: 'fielddata', anchor: 'fielddataChart', title: 'fielddata.memory_size', jsonPath: 'primaries.fielddata.memory_size_in_bytes', keepOrigin: true },
			{ chartName: 'segments', anchor: 'segmentsChart', title: 'segments.count', jsonPath: 'primaries.segments.count', keepOrigin: true },
			{ chartName: 'flush', anchor: 'flushChart', title: 'flush.total', jsonPath: 'primaries.flush.total' }
		]
	}

	getInitialState() {
		return {
			indexName: this.props.match.params.indexname
		}
	}

	componentDidMount() {
		this.setState({ indexName: this.props.match.params.indexname });
		this.timerId = setInterval(() => this.tick(), 5000);
	}

	componentWillUnmount() {
		clearInterval(this.timerId);
	}

	componentDidUpdate() {
		if (this._initializedChart == false && this._chartDataIsReady == true) {
			var indexChartConfig = this._indexChartConfig
			indexChartConfig.forEach(cfg => this.createChart(cfg.chartName, cfg.anchor, cfg.title, cfg.jsonPath, cfg.keepOrigin))
			this._initializedChart = true;
		}
	}

	createChart(chartName, anchorPoint, title, jsonPath = null, keepOrigin = null) {
		if (this._chartDataIsReady == false) return;
		this._chartConfig.series[0].data = []

		var idxName = this.state.indexName
		var historyData = window.fltIndicesDB[idxName]

		if (jsonPath != null && historyData != null) {
			console.log("createChart")
			console.log(idxName)

			//fetch the timestamp series
			var seriesData = historyData.map(item => [item['timestamp'], eval(`item.${jsonPath}`)])

			var seriesRate = seriesData.slice(1).map((a, idx) => {
				var b = seriesData[idx]
				var rate = (a[1] - b[1]) / ((a[0] - b[0]) / 1000)
				return Math.ceil(rate);
			})

			if (keepOrigin) {
				seriesRate = seriesData.map(a => a[1])
			}

			console.log(chartName + " " + jsonPath)
			console.log(seriesRate)
			this._chartConfig.series[0].data = seriesRate
		}

		this._myChart[chartName] = Highcharts.chart(anchorPoint, this._chartConfig);
		this._myChart[chartName].setTitle({ text: title, style: { "fontSize": "12px" } });
	}


	updateChart2(chartName, anchorPoint, jsonPath = null, keepOrigin = null) {
		var existedChart = this._myChart[chartName]

		if (existedChart == null) return;

		var idxName = this.state.indexName
		var historyData = window.fltIndicesDB[idxName]

		if (jsonPath != null && historyData != null) {
			//fetch the timestamp series
			var seriesData = historyData.map(item => [item['timestamp'], eval(`item.${jsonPath}`)])


			var seriesRate = seriesData.slice(1).map((a, idx) => {
				var b = seriesData[idx]
				var rate = (a[1] - b[1]) / ((a[0] - b[0]) / 1000)
				return Math.ceil(rate);
			})

			var newValue = keepOrigin ? seriesData.slice(-1)[0][1] : seriesRate.slice(-1)[0]
			var existedSeries = existedChart.series[0]
			if (existedSeries.data.length < 50) {
				existedChart.series[0].addPoint(newValue, false, false)
				existedChart.redraw()
			} else
				existedChart.series[0].addPoint(newValue, true, true)
		}
	}

	updateChart(chart, maxLen, newValue) {
		if (chart.series[0].data.length < maxLen) {
			chart.series[0].addPoint(newValue, false, false);
			chart.redraw();
		} else
			chart.series[0].addPoint(newValue, true, true);
	}

	byteConverter(valueStr) {
		var sizeMap = { 'b': 1, 'kb': 1024, 'mb': Math.pow(1024, 2), 'gb': Math.pow(1024, 3) };
		var unitPart = valueStr.replace(/[\d.]/g, '');
		var sizeInBytes = sizeMap[unitPart] * Number(valueStr.replace(/[^\d.]/g, ''));
		var sizeInMegaBytes = Math.ceil(sizeInBytes / sizeMap['mb']);
		return sizeInMegaBytes;
	}


	tick() {
		var indexChartConfig = this._indexChartConfig

		indexChartConfig.forEach(cfg => {
			this.updateChart2(cfg.chartName, cfg.anchor, cfg.jsonPath, cfg.keepOrigin)
		})
	}

	render() {
		var idxName = this.props.match.params.indexname
		var historyData = window.fltIndicesDB[idxName]


		if (historyData == null)
			return (
				<div>data is loading</div>
			);

		var indexStats = this.state.indexStats
		var indicesChartConfig = this._indexChartConfig
		const chartElements = indicesChartConfig.map(cfg => {
			return (
				<div className="col-lg-6">
					<div id={cfg.anchor} height="300px">
					</div>
				</div>
			)
		})
		this._chartDataIsReady = true
		var esDB = window.esDB
		var shards = esDB.getCollection("shards")
		var tableData = shards.find({index: this.props.match.params.indexname})
		console.log(tableData)

		return (
			<div className="col-lg-10">
				<div className="row text-right">
					<span className="label-success">{this.state.indexName}</span>
				</div>
				<div className="row">
					{chartElements}
				</div>
				<BootstrapTable data={tableData} striped hover pagination search>
                    <TableHeaderColumn hidden isKey dataField='uniq_id' width='250px'>uniq_id</TableHeaderColumn>
					<TableHeaderColumn dataField='index'>index</TableHeaderColumn>
					<TableHeaderColumn dataField='shard'>shard</TableHeaderColumn>
					<TableHeaderColumn dataField='prirep'>prirep</TableHeaderColumn>
					<TableHeaderColumn dataField='ip' dataSort={true}>ip</TableHeaderColumn>
                </BootstrapTable>
			</div>
		)
	}
}

export default EsIndexDetail;
