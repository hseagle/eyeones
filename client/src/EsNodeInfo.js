import React, {Component} from 'react';
import $, {jQuery} from 'jquery';
import axios from 'axios';
import {Link} from 'react-router-dom';


//decide to use react-data-grid for table displaying
class EsNodeInfo extends Component {
  constructor(props) {
    super(props);
    this.state = {
      date: new Date(),
      nodeinfo: [],
      initializeDataTable: false
    };
  }

  getInitialState() {
    this.state = {
      date: new Date(),
      nodeinfo: [],
      initializeDataTable: false
    };
    return {date: new Date(), nodeinfo: [], initializeDataTable:false};
  }

  componentDidMount() {
    /*
    $.fn.sparkline.defaults.common.type = 'line';
    $.fn.sparkline.defaults.common.enableTagOptions = true;
    $.fn.sparkline.defaults.common.fillColor = false;
    $.fn.sparkline.defaults.line.lineWidth = 2;
    jQuery(function() {
      // 我们可以将值直接放入到span中
      $('.inlinesparkline').sparkline();

      $('.dynamicsparkline').sparkline('html');
    });*/
    this.timerID = setInterval(() => this.tick(), 5000);
  }

  componentDidUpdate() {
    /*
    jQuery(function() {
      // 我们可以将值直接放入到span中
      $('.inlinesparkline').sparkline();;
      $('.dynamicsparkline').sparkline('html', {enableTagOptions: true});
      $("#nodetbl").DataTable({pageLength: 20});
      $("#nodetbl").dataTable().fnSort([2, "desc"]);
      //$("#nodetbl").DataTable().column(3).data().sort();
    });*/
    if ( this.state.initializeDataTable == false ) {
      $("#nodetbl").DataTable();
      this.setState({initializeDataTable: true});
    }else{
      console.log("re-ordering the row according to the latest data");
      $("#nodetbl").DataTable().order([4,'desc']).draw();
    }
  }

  shouldComponentUpdate() {
    return true;
  }

  componentWillUnmount() {
    console.log("node component is unmounted");
    clearInterval(this.timerID);
  }

  tick() {
    var reactRef = this;
    var heapStats, cpuStats;

    axios.get('http://10.8.183.97:9200/_cat/nodes').then(function(response) {
      var newState = reactRef.state;
      var nodes = response.data;
      var nodesArr = nodes.split('\n').filter((r) => r.length > 0);
      /*
      if (heapStats.length == 0) {
        heapStats = Array.apply(null, {length: nodesArr.length}).map(function(x) {
          return [];
        });
        cpuStats = Array.apply(null, {length: nodesArr.length}).map(function(x) {
          return [];
        });
        console.log("initialize cpustats " + heapStats);
      }*/
      newState['nodeinfo'] = nodesArr;
      newState['date'] = new Date();
      reactRef.setState(newState);
    }).catch(function(error) {
      console.log(error);
    });
  }

  render() {
    var listItems = this.state.nodeinfo.sort().map(function(info, idx) {
      var lastIdx = info.split(/\s+/).length - 1;
      //空格作为分割符，内容分成多个列
      var tdCells = info.split(/\s+/).map(function(item, index) {
        /*
        if (index == 1) {
          heapStats[idx].push(parseInt(item));
          if (heapStats[idx].length > 15)
            heapStats[idx].shift();
          var heapChart = <span className="dynamicsparkline" values={heapStats[idx].toString()}></span>;
          return <td>
            <div>{parseInt(item)}</div>{heapChart}</td>;
        } else if (index == 3) {
          cpuStats[idx].push(parseInt(item));
          if (cpuStats[idx].length > 15)
            cpuStats[idx].shift();
          var cpuChart = <span className="dynamicsparkline" values={cpuStats[idx].toString()}></span>;
          return <td data-sort={parseInt(item)}>
            <div>{parseInt(item)}</div>{cpuChart}</td>;
        } else */
          if ( index == lastIdx ) {
            var targetUrl = "/nodedetail/" + item;
            return <td><Link to={targetUrl}>{item}</Link></td>;
          }
          if ( index == 2 ) return <td>{parseInt(item)}</td>;
          return <td>{item}</td>;
        }
      );
      return <tr>{tdCells}</tr>;
    });

    var colNames = "ip heap ram cpu load.1m load.5m load.15m role master name".split(/\s+/).map(function(colName) {
      return <th>{colName}</th>;
    });
    //var availableNodes = listItems.length;

    return (
      <div className="col-sm-9 col-sm-offset-2 col-md-10 col-md-offset-1">
        <table id="nodetbl" className="table hover">
          <thead><tr>{colNames}</tr></thead>
          <tbody>{listItems}</tbody>
        </table>
      </div>
    );
  }
}

export default EsNodeInfo;
