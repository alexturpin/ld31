var Physics = require('./physicsjs-full-0.6.0.min');

module.exports = function(io) {
	var world,
		players = {},
		viewWidth = 512;
		viewHeight = 512,
		acceleration = 0.0005,
		movementVectors = {
			up: new Physics.vector(0, -acceleration),
			down: new Physics.vector(0, acceleration),
			left: new Physics.vector(-acceleration, 0),
			right: new Physics.vector(acceleration, 0)
		};

	(function init() {
		world = Physics();

		world.add(Physics.behavior('body-impulse-response'));
		world.add(Physics.behavior('body-collision-detection'));
		world.add(Physics.behavior('sweep-prune'));

		function physicsUpdate() {
			var time = Date.now();

			world.step(time);

			for(var id in players) {
				var player = players[id];
				var body = player.body;

				for(var direction in movementVectors) {
					if (player.movement[direction]) {
						body.accelerate(movementVectors[direction]);
					}
				}
			}

			setTimeout(physicsUpdate, 1000 / 66);
		}

		physicsUpdate();
	})();

	function serverUpdate() {
		var data = [];

		for(var id in players) {
			var player = players[id];
			var body = player.body;

			var playerData = {
				id: id,
				x: body.state.pos.get(0),
				y: body.state.pos.get(1)
			};

			data.push(playerData);
		}

		for(var id in io.sockets.connected) {
			io.sockets.connected[id].volatile.emit('update', {
				players: data
			});
		}

		setTimeout(serverUpdate, 1000 / 22);
	}
	serverUpdate();

	io.on('connection', function(socket) {
		console.log("Client", socket.id, "connected");

		var body = Physics.body('circle', {
			x: Math.random() * viewWidth,
			y: Math.random() * viewHeight,
			vx: 0,
			vy: 0,
			radius: 16
		});

		world.add(body);
		
		var player = players[socket.id] = {
			info: socket.id,
			movement: [],
			body: body
		};

		socket.on('disconnect', function() {
			console.log("Client", player.info.name, "disconnected");

			world.removeBody(body);
			delete players[socket.id];

			io.emit('leave', socket.id);
		});

		socket.on('info', function(data) {
			player.info = data;

			console.log("Client", socket.id, "identified as", player.info.name);
		});

		socket.on('move', function(data) {
			player.movement = data;
		});
	});
};