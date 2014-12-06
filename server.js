var express = require('express'),
	path = require('path');

var app = express(),
	http = require('http').Server(app),
	io = require('socket.io')(http);

app.use('/', express.static(path.join(__dirname, 'client')));
app.use('/shared', express.static(path.join(__dirname, 'shared')));

var port = process.env.PORT || 80;
http.listen(port, function() {
	console.log("Listening on", port);

	require('./game')(io);
});
