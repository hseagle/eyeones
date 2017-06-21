import React, {Component} from 'react';
import logo from './logo.svg';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Header from './Header.js';
import Home from './Home.js';
import SideBar from './SideBar.js';
import EsNodeInfo from './Home.js';
import EsIndex from './EsIndex.js';
import EsShard from './EsShard.js';
import EsNodeDetail from './EsNodeDetail';
import EsIndexDetail from './EsIndexDetail';
import { BrowserRouter, Route, Router, Link } from 'react-router-dom'


class App extends Component {
    constructor() {
        super();
    }

    componentDidMount() {
    }

    componentWillMount() {
    }

    //主页面，渲染入口
    render() {
        return (
            <BrowserRouter>
                <div id="App">
                    <Header />
                    <div className="container-fluid">
                        <div className="row">
                            <div className="col-sm-1 col-md-1 col-lg-1 navbar-default sidebar">
                                <ul className="nav nav-sidebar">
                                    <li><Link to="/nodes" >Nodes</Link></li>
                                    <li><Link to="/indices" >Indices</Link></li>
                                    <li><Link to="/shards" >Shards</Link></li>
                                </ul>
                            </div>
                            <div>
                                <Route exact path="/" component={EsNodeInfo}/>
                                <Route path="/nodes" component={EsNodeInfo}/>
                                <Route path="/indices" component={EsIndex}/>
                                <Route path="/shards" component={EsShard}/>
                                <Route path="/nodedetail/:nodeid" component={EsNodeDetail}/>
                                <Route path="/indexdetail/:indexname" component={EsIndexDetail}/>
                            </div>
                        </div>
                    </div>
                </div>
            </BrowserRouter>
        );
    }
}

export default App;
