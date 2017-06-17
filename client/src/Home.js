import React, { Component } from 'react';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import 'react-bootstrap-table/dist/react-bootstrap-table-all.min.css';
import $, { jQuery } from 'jquery';
import axios from 'axios';
import 'jquery-sparkline/jquery.sparkline.js';
import { Link } from 'react-router-dom';

//http://fooplugins.github.io/FooTable/docs/examples/bootstrap/collapse.html
//FooTable is powerful as DataTables
class Home extends Component {
    constructor() {
        super();
        this._nodes = [];
        this._heapHistoryData = [];
        this._cpuHistoryData = [];
        this.state = { nodes: this._nodes };
        this.setState({ nodes: this._nodes, toggleUpdate: false, page: 1, sizePerPage: 20 });
    }

    componentWillMount() {
        var self = this;
        axios.get("/nodes").then(response => {
            var nodesInfo = response.data
            self.setState({ nodes: nodesInfo })
        })
    }

    componentDidMount() {
        this.timerID = setInterval(() => this.tick(), 10000)
    }

    componentWillUnmount() {
        clearInterval(this.timerID)
    }

    tick() {
        var self = this
        axios.get("/nodes").then(response => {
            var nodesInfo = response.data
            self.setState({ nodes: nodesInfo })
        })
    }

    componentWillReceiveProps(nextProps) {
    }

    shouldComponentUpdate(nextProps, nextState) {
        //return (this.props.nodes.version != nextProps.nodes.version || this.state != nextState)
        return true;
    }

    nodeNameFormatter(cell, row) {
        var targetUrl = "/nodedetail/" + cell;
        return <Link to={targetUrl}>{cell}</Link>;
    }

    componentDidUpdate() {
        $('.inlinebar').sparkline('html', { type: 'line', barColor: 'blue' })
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
        if ( cell !=null && cell.length == 0 ) {
            console.log("warning no data")
            console.log(row)
        }
        return (<div><strong>{cell.slice(-1)[0]}</strong>&nbsp;&nbsp;<span className="inlinebar">{cell.toString()}</span></div>);
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
        $('.inlinebar').sparkline('html', { type: 'bar' });
    }

    //callback function while the search contents is changed
    afterSearch(searchText) {
        //this.setState({toggleUpdate: !this.state.toggleUpdate});
        console.log("Home react-bootstrap-table after search")
    }

    onPageChange(page, sizePerPage) {
        console.log("onPageChange is called")
        //this.setState({ toggleUpdate: !this.state.toggleUpdate, page: page, sizePerPage: sizePerPage })
    }

    //var colNames = "ip heap ram cpu load.1m load.5m load.15m role master name".split(/\s+/);
    render() {
        var nodes = this.state.nodes

        if (nodes.length == 0) return (<div><p></p></div>);

        

        var bsTableOptions = {
            sizePerPage: 20,
            paginationShowsTotal: true,
            defaultSortName: 'load_5m',
            onSortChange: this.onSortChange.bind(this),
            defaultSortOrder: 'desc'
        }

        nodes.forEach( node => {
            var timeSeries = node.timestamp
            var timeDiffs = timeSeries.slice(1).map((val,idx) => { return Math.ceil((val - timeSeries[idx])/1000) })

            var rate_meta = [ 
                {source_field: 'indexing.index_total', target_field:'indexing'},
                {source_field: 'search.query_total', target_field:'search'}
                ]

            rate_meta.forEach( item => {
                var series = node[item.source_field]
                var rates= series.slice(1).map((val,idx) => {
                    return Math.ceil((val - series[idx])/timeDiffs[idx])
                })
                node[item.target_field] = rates
            })
        })

        var column_meta = {
            'key': ['name'],
            'rate': ['load_5m', 'heap.percent', 'cpu', 'indexing', 'search'],
            'others': ['ip', 'node.role', 'master','shard_num','disk.avail']
        }

        var keyColumn = column_meta['key'].map(col => {
            return <TableHeaderColumn isKey dataField={col} width='220px' dataFormat={this.nodeNameFormatter}>{col}</TableHeaderColumn>
        })

        var rateColumn = column_meta['rate'].map(col => {
            return <TableHeaderColumn dataField={col} dataSort={true} dataFormat={this.chartFormatter} sortFunc={this.ratingSort}>{col}</TableHeaderColumn>
        })

        var otherColumn = column_meta['others'].map(col => {
            return <TableHeaderColumn dataField={col}>{col}</TableHeaderColumn>
        })

        var columns = keyColumn.concat(rateColumn).concat(otherColumn)
        var tableData = nodes
        
        return (
            <div className="col-lg-11" >
                <BootstrapTable data={tableData} striped hover search options={bsTableOptions}>
                    {columns}
                </BootstrapTable>
            </div>
        );
    }
}

export default Home
