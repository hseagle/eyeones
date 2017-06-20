import React, { Component } from 'react';
import axios from 'axios';
import ReactHighcharts from 'react-highcharts';
import Highcharts from 'highcharts';
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table';
import 'react-bootstrap-table/dist/react-bootstrap-table-all.min.css';

class EsIndexDetail extends Component {
	constructor() {
		super();
		this.state = {nodestats:{}}
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

	componentWillMount() {
		console.log(this.props.match.params)
		this.tick()
	}

	componentWillUnmount() {
		clearInterval(this.timerId);
	}

	tick() {
		var indexName = this.props.match.params.indexname
		var fetchUrl = `/nodestats/${indexName}`
		axios.get(fetchUrl).then(response => {
			var jsonData = response.data
			this.setState({nodestats:jsonData})
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
		var choosedIndex = this.props.match.params.indexname

		if ( Object.keys(this.state.nodestats).length == 0 ) 
			return <div></div>
		
		return <div>{this.state.nodestats.nodename}</div>
	}
}

export default EsIndexDetail;
