var express = require('express'),
	path = require('path');

var app = express();

app.use('/', express.static(path.join(__dirname, 'client')));

app.listen(process.env.PORT || 80);