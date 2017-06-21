import React, { Component } from 'react';
import axios from 'axios';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import 'react-bootstrap-table/dist/react-bootstrap-table-all.min.css';
import $, { jQuery } from 'jquery';
import 'jquery-sparkline/jquery.sparkline.js';
import { Link } from 'react-router-dom';
import ReactHighcharts from 'react-highcharts';
import Highcharts from 'highcharts';
import { SparklinesReferenceLine, Sparklines, SparklinesLine, SparklinesSpots, SparklinesCurve } from 'react-sparklines'

class EsIndex extends Component {
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
        $('.dynamicsparkline').sparkline('html');
        this.timerID = setInterval(() => this.tick(), 10000)
    }

    componentWillUnmount() {
        clearInterval(this.timerID)
    }

    tick() {
        var self = this
        axios.get("/indices").then(response => {
            var nodesInfo = response.data
            console.log(nodesInfo)
            self.setState({ nodes: nodesInfo })
        })
    }

    componentWillReceiveProps(nextProps) {
    }

    indexFormatter(cell, row) {
        var targetUrl = "/indexdetail/" + cell;
        return <Link to={targetUrl}>{cell}</Link>;
    }

    componentDidUpdate() {
        console.log("Home componentDidUpdate is called")
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
        if (cell != null && cell.length == 0) {
            console.log("warning no data")
            console.log(row)
        }
        return (<div><strong>{cell.slice(-1)[0]}</strong>&nbsp;&nbsp;<Sparklines data={cell} limit={50} height={35}>
            <SparklinesLine style={{stroke: "blue", strokeWidth: 3, fill: "none"}} />
            <SparklinesSpots style={{ fill: "red"  }} />
            <SparklinesReferenceLine type="mean" style={{stroke: "green", strokeWidth: 5, strokeDasharray: '2,2'}}/>
        </Sparklines></div>)
    }

    numericSortFunc(a, b, order, sortField) {
        var valueA, valueB

        valueA = a[sortField];
        valueB = b[sortField];



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

    //var colNames = "ip heap ram cpu load.1m load.5m load.15m role master name".split(/\s+/);
    render() {
        var nodes = this.state.nodes

        if (nodes.length == 0) return (<div><p></p></div>);

        var tableData = nodes

        tableData.forEach( index => {
            var timeSeries = index.timestamp
            var timeDiffs = timeSeries.slice(1).map((val,idx) => { return Math.ceil((val - timeSeries[idx])/1000) })

            var rate_meta = [ 
                {source_field: 'indexing.index_total', target_field:'indexing'},
                {source_field: 'search.query_total', target_field:'search'}
                ]
            rate_meta.forEach( item => {
                var series = index[item.source_field]
                var rates= series.slice(1).map((val,idx) => {
                    return Math.ceil((val - series[idx])/timeDiffs[idx])
                })
                index[item.target_field] = rates
            })
        })

        var column_meta = {
            'key': ['index'],
            'rate': ['indexing', 'search'],
            'others': ['memory.total', 'pri', 'rep','fielddata.memory_size','docs.count','store.size']
        }

        var keyColumn = column_meta['key'].map(col => {
            return <TableHeaderColumn isKey dataField={col} dataFormat={this.indexFormatter} width='250px'>{col}</TableHeaderColumn>
        })

        var rateColumn = column_meta['rate'].map(col => {
            return <TableHeaderColumn dataField={col} dataSort={true} dataFormat={this.chartFormatter} sortFunc={this.ratingSort}>{col}</TableHeaderColumn>
        })

        var otherColumn = column_meta['others'].map(col => {
            var displayName = col
            if ( col.includes("fielddata") ) displayName = 'fielddata'
            return <TableHeaderColumn dataSort={true} dataField={col} sortFunc={this.numericSortFunc}>{displayName}</TableHeaderColumn>
        })

        var columns = keyColumn.concat(rateColumn).concat(otherColumn)

        var bsTableOptions = {
            sizePerPage: 20,
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


export default EsIndex;
