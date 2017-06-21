import React, { Component } from 'react';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import 'react-bootstrap-table/dist/react-bootstrap-table-all.min.css';
import $, { jQuery } from 'jquery';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { SparklinesReferenceLine, Sparklines, SparklinesLine, SparklinesSpots, SparklinesCurve } from 'react-sparklines'
import {ResponsiveContainer, LineChart, Line,XAxis, YAxis, CartesianGrid, Tooltip, Legend} from 'recharts'
import {VictoryBar, VictoryLine} from 'victory'
import moment from 'moment'

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

    componentWillUpdate() {
    }

    componentDidUpdate() {
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
        return (<div><strong>{cell.slice(-1)[0]}</strong>&nbsp;&nbsp;<Sparklines data={cell} limit={50} height={35}>
            <SparklinesLine style={{stroke: "blue", strokeWidth: 3, fill: "none"}} />
            <SparklinesSpots style={{ fill: "red"  }} />
            <SparklinesReferenceLine type="mean" style={{stroke: "green", strokeWidth: 5, strokeDasharray: '2,2'}}/>
        </Sparklines></div>)
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
    }

    onPageChange(page, sizePerPage) {
        console.log("onPageChange is called")
    }

    render() {
        var nodes = this.state.nodes

        if (nodes.length == 0) return (<div><p></p></div>);
        console.log("render is called")

        var bsTableOptions = {
            sizePerPage: 20,
            paginationShowsTotal: true,
            defaultSortName: 'load_5m',
            defaultSortOrder: 'desc'
        }

        nodes.forEach(node => {
            var timeSeries = node.timestamp.sort((a,b) => a - b)
            var timeDiffs = timeSeries.slice(1).map((val, idx) => { return Math.ceil((val - timeSeries[idx]) / 1000) })


            var rate_meta = [
                { source_field: 'indexing.index_total', target_field: 'indexing' },
                { source_field: 'search.query_total', target_field: 'search' }
            ]

            rate_meta.forEach(item => {
                var series = node[item.source_field].map(val => Number(val))

                var rates = series.slice(1).map((val, idx) => {
                    return Math.ceil((val - series[idx]) / timeDiffs[idx])
                })

                node[item.target_field] = rates
            })
        })

        
        var column_meta = {
            'key': ['name'],
            'rate': ['load_5m', 'heap.percent', 'cpu', 'indexing', 'search'],
            'others': ['ip', 'node.role', 'master', 'shard_num', 'disk.avail']
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

        var indexingSeries = tableData[0].indexing.map((val, idx) => {
           var indexing = tableData.map(node=>node.indexing[idx]).reduce((a,b)=> {return a+b})
           var search = tableData.map(node=>node.search[idx]).reduce((a,b)=> {return a+b})
           var timeLabel = moment(new Date(tableData[0].timestamp[idx])).format('hh:mm:ss')
           return {idx:timeLabel, indexing: indexing, search: search}
        })

        const numberConverter = ( val ) => { 
            var THRESHOLD_NUMBER = 100**2; 
            if ( Math.abs(Number(val)) > THRESHOLD_NUMBER ) {
                 return ( Math.ceil(val/1000) + "K" )
            }else
                return val
        }

        var chartKeys = ["indexing", "search"]
        var chartElements = chartKeys.map( item => {
            return  (
                <div className="col-lg-6">
                    <ResponsiveContainer width='100%' aspect={6.0/2.0}>
                        <LineChart 
                            margin={{ top: 10, right: 20, left: 10, bottom: 0 }} 
                            data={indexingSeries}>
                            <XAxis dataKey="idx" />
                            <YAxis tickFormatter={numberConverter}/>
                            <Line type="linear" dataKey={item} stroke="yellowgreen" isAnimationActive={false} strokeWidth={2}/>
                            <CartesianGrid strokeDasharray="3 3" />
                            <Legend />
                            <Tooltip />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )
        })

        return (
            <div className="col-lg-11" >
                <div className="row">
                    {chartElements}
                </div>
                <BootstrapTable data={tableData} striped hover search options={bsTableOptions}>
                    {columns}
                </BootstrapTable>
            </div>
        );
    }
}

export default Home
