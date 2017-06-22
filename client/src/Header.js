import React, { Component } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import axios from "axios";

class Header extends Component {
  constructor() {
    super();
    this.state = { localTime: new Date().toLocaleString() };
  }

  componentWillMount() {
    this.tick();
  }

  componentDidMount() {
    this.timerID = setInterval(() => this.tick(), 10000);
  }

  tick() {
    var fetchUrl = "/cluster/stats";
    axios.get(fetchUrl).then(response => {
      var clusterInfo = response.data;
      var clusterStatus = clusterInfo.status;
      var statusChanged = this.state.statusChanged == null
        ? 0
        : this.state.statusChanged;

      if (
        this.state.clusterStatus != null &&
        this.state.clusterStatus != clusterStatus
      ) {
        console.log(
          `status is changed from ${this.state
            .clusterStatus} to ${clusterStatus}`
        );
        statusChanged = statusChanged + 1;
      }

      this.setState({
        statusChanged: statusChanged,
        clusterStatus: clusterStatus,
        clusterName: clusterInfo.cluster_name,
        localTime: clusterInfo.timestamp,
        index_number: clusterInfo.indices.count,
        shard_number: clusterInfo.indices.shards.total,
        total_docs: clusterInfo.indices.docs.count,
        store_size: clusterInfo.indices.store.size_in_bytes
      });
    });
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  _handleKeyPress(e) {
    if (e.key === "Enter") console.log(this.refs.esaddr.value);
  }

  render() {
    var statusTag;
    var clusterStatus = this.state.clusterStatus;

    var labelTypes = {
      green: "label label-success",
      yellow: "label label-warning",
      red: "label label-danger"
    };
    const sizeConverter = (val, unitName) => {
      var sizeMap = {
        kb: 1024,
        mb: 1024 ** 2,
        gb: 1024 ** 3,
        tb: 1024 ** 4
      };
      return Math.ceil(val / sizeMap[unitName]) + ` ${unitName.toUpperCase()}`;
    };

    return (
      <nav className="navbar navbar-default">
        <div className="container-fluid">
          <div className="navbar-header">
            <a className="navbar-brand" href="#">ESMON</a>
          </div>
          <div id="rightnavbar" className="navbar-collapse collapse">
            <ul className="nav navbar-nav">
              <li><a href="#"><strong>{this.state.clusterName}</strong></a></li>
            </ul>
            <ul className="nav navbar-nav navbar-right">
              <li>
                <a href="#">
                  <span className={labelTypes[clusterStatus]}>
                    {this.state.clusterStatus}
                  </span>
                </a>
              </li>
              <li className="dropdown">
                <a href="#" className="dropdown-toggle" data-toggle="dropdown">
                  <i className="fa fa-envelope-o" />
                  <span className="badge-number label label-warning">
                    {this.state.statusChanged}
                  </span>
                </a>
                {/*}
                <ul className="dropdown-menu" role="menu">
            <li><a href="#">Action</a></li>
            <li><a href="#">Another action</a></li>
            <li><a href="#">Something else here</a></li>
            <li className="divider"></li>
            <li><a href="#">Separated link</a></li>
            <li className="divider"></li>
            <li><a href="#">One more separated link</a></li>
          </ul>{*/}
              </li>
              <li>
                <a href="#">
                  indices: <strong>{this.state.index_number}</strong>
                </a>
              </li>
              <li>
                <a href="#">
                  shards: <strong>{this.state.shard_number}</strong>
                </a>
              </li>
              <li>
                <a href="#">
                  docs:{" "}
                  <strong>
                    {Number(this.state.total_docs).toLocaleString()}
                  </strong>
                </a>
              </li>
              <li>
                <a href="#">
                  store:{" "}
                  <strong>{sizeConverter(this.state.store_size, "tb")}</strong>
                </a>
              </li>
              <li><a href="#">{this.state.localTime}</a></li>
              <li><a href="#">Help</a></li>
            </ul>
          </div>
        </div>
      </nav>
    );
  }
}

export default Header;
