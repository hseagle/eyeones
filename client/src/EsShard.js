import React, { Component } from 'react';
import axios from 'axios';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import 'react-bootstrap-table/dist/react-bootstrap-table-all.min.css';
import $, { jQuery } from 'jquery';
import 'jquery-sparkline/jquery.sparkline.js';
import { Link } from 'react-router-dom';
import ReactHighcharts from 'react-highcharts';
import Highcharts from 'highcharts';

class EsShard extends Component {
    constructor() {
        super();
        this._nodes = [];
        this._heapHistoryData = [];
        this._cpuHistoryData = [];
        this.state = { nodes: this._nodes };
        this.setState({ nodes: this._nodes, toggleUpdate: false, page: 1, sizePerPage: 20 });
    }

    componentWillMount() {
        this.tick()
    }

    componentDidMount() {
        console.log("componentDidMount is called")
        this.timerID = setInterval(() => this.tick(), 5000)
    }

    componentWillUnmount() {
        clearInterval(this.timerID)
    }

    tick() {
        var self = this
        axios.get("/shards").then(response => {
            console.log("try to fetch shards")
            var nodesInfo = response.data
            self.setState({ nodes: nodesInfo })
        })
    }

    componentWillReceiveProps(nextProps) {
    }

    nodeNameFormatter(cell, row) {
        var targetUrl = "/nodedetail/" + cell;
        return <Link to={targetUrl}>{cell}</Link>;
    }

    componentDidUpdate() {
        console.log("EsShard componentDidUpdate is called")
        $('.dynamicsparkline').sparkline('html');
    }

    ratingSort(a, b, order, sortField) {
        var valueA = a[sortField].slice(-1)
        var valueB = b[sortField].slice(-1)

        if (order == 'desc')
            return valueB - valueA
        else
            return valueA - valueB
    }

    chartFormatter(cell, row) {
        return (<div><strong>{cell.slice(-1)[0]}</strong>&nbsp;&nbsp;<span className="dynamicsparkline">{cell.toString()}</span></div>);
    }

    numericSortFunc(a, b, order, sortField) {
        var valueA, valueB
        var fieldName = sortField.replace("history", "").toLowerCase()
        if (fieldName === 'heap' || fieldName === 'cpu') {
            valueA = a[fieldName]
            valueB = b[fieldName]
        } else {
            valueA = a[fieldName];
            valueB = b[fieldName];
        }


        if (order === 'desc') {
            return Number(valueB) - Number(valueA);
        } else {
            return Number(valueA) - Number(valueB);
        }
    }

    //callback function after the sorting is changed
    onSortChange(sortName, sortOrder) {
        this.setState({ toggleUpdate: !this.state.toggleUpdate });
        $('.dynamicsparkline').sparkline('html');
    }

    //callback function while the search contents is changed
    afterSearch(searchText) {
        //this.setState({toggleUpdate: !this.state.toggleUpdate});
        console.log("Home react-bootstrap-table after search")
    }

    onPageChange(page, sizePerPage) {
        console.log("onPageChange is called")
        this.setState({ toggleUpdate: !this.state.toggleUpdate, page: page, sizePerPage: sizePerPage })
    }

    render() {
        var shards = this.state.nodes

        if (shards.length == 0) return (<div><p></p></div>);


        shards.forEach(index => {
            var timeSeries = index.timestamp
            var timeDiffs = timeSeries.slice(1).map((val, idx) => { return Math.ceil((val - timeSeries[idx]) / 1000) })

            var rate_meta = [
                { source_field: 'indexing.index_total', target_field: 'indexing' },
                { source_field: 'search.query_total', target_field: 'search' }
            ]
            rate_meta.forEach(item => {
                var series = index[item.source_field]
                var rates = series.slice(1).map((val, idx) => {
                    return Math.ceil((val - series[idx]) / timeDiffs[idx])
                })
                index[item.target_field] = rates
            })
        })



        var column_meta = {
            'key': ['uniq_id'],
            'rate': ['indexing', 'search'],
            'others': ['index', 'shard', 'prirep','ip']
        }

        var keyColumn = column_meta['key'].map(col => {
            return <TableHeaderColumn isKey hidden dataField={col} width='220px'>{col}</TableHeaderColumn>
        })

        var rateColumn = column_meta['rate'].map(col => {
            return <TableHeaderColumn dataField={col} dataSort={true} dataFormat={this.chartFormatter} sortFunc={this.ratingSort}>{col}</TableHeaderColumn>
        })

        var otherColumn = column_meta['others'].map(col => {
            return <TableHeaderColumn dataSort={true} dataField={col} sortFunc={this.numericSortFunc}>{col}</TableHeaderColumn>
        })

        var columns = keyColumn.concat(otherColumn).concat(rateColumn)
        var tableData = shards.filter(item => item['index'].includes(".monitor") == false)

        var bsTableOptions = {
            sizePerPage: 15,
            paginationShowsTotal: true,
            onSortChange: this.onSortChange.bind(this),
            defaultSortName: 'indexing',
            defaultSortOrder: 'desc'
        }

        return (
            <div className="col-lg-11">
                <BootstrapTable data={tableData} striped hover pagination search options={bsTableOptions}>
                    {columns}
                </BootstrapTable>
            </div>
        );
    }
}

export default EsShard
