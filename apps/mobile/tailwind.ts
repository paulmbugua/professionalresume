import { create } from 'twrnc';

// make sure the filename matches exactly: twrnc.config.js
const config = require('./twrnc.config.js');

const tw = create(config);
export default tw;
