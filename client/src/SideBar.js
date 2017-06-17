import React,  {Component} from 'react';
import ReactDOM from 'react-dom';
import EsNodeInfo from './EsNodeInfo.js';

class SideBar extends Component {
  showMessage(event) {
    console.log(event);
    ReactDOM.render(<EsNodeInfo/>, document.getElementById("dashboard"));
  }

  render() {
    return (
      <div className="col-sm-2 col-md-1 sidebar navbar-default">
        <ul className="nav nav-sidebar navbar-default">
          <li className="active">
            <a href="#">Overview <span className="sr-only">(current)</span>
            </a>
          </li>
          <li>
            <a href="javascript:void(0)" onClick={this.showMessage}>Nodes</a>
          </li>
          <li>
            <a href="javascript:void(0)">Indices</a>
          </li>
          <li>
            <a href="#">Events</a>
          </li>
        </ul>
      </div>
    );
  }
}

export default SideBar;
