import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './index.css';
import axios from 'axios'
import loki from 'lokijs'

//workable example A Simple React Router v4 Tutorial – Paul Sherman – Medium
//https://medium.com/@pshrmn/a-simple-react-router-v4-tutorial-7f23ff27adf
//http://codepen.io/pshrmn/pen/YZXZqM

var esServerAddr = "http://10.8.122.215:9200"

ReactDOM.render(
	<App esaddr={esServerAddr} />,
	document.getElementById('root'))
