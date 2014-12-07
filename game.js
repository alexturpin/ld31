var Physics = require('./physicsjs-full-0.6.0.min');

module.exports = function(io) {
	var world,
		players = {},
		viewWidth = 512,
		viewHeight = 512,
		radius = viewWidth / 2,
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

				var body = player.body,
					x = player.body.state.pos.get(0),
					y = player.body.state.pos.get(1),
					outside = distance(viewWidth / 2, viewHeight / 2, x, y) > radius + 16;

				if (!player.outside && outside) { //Meaning we _just_ left
					setTimeout(function() {
						var coords = respawnCoordinates();

						player.startOfLife = Date.now();
						player.body.state.pos.set(coords.x, coords.y);
						player.body.state.vel.set(0, 0);
						player.body.state.acc.set(0, 0);
					}, 3000);
				}

				player.outside = outside;

				if (!player.outside) {
					for(var direction in movementVectors) {
						if (player.movement[direction]) {
							body.accelerate(movementVectors[direction]);
						}
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

			var timeAlive = player.outside ? 0 : ((Date.now() - player.startOfLife) / 1000) | 0;

			var playerData = {
				id: id,
				x: player.body.state.pos.get(0),
				y: player.body.state.pos.get(1),
				name: player.info.name,
				timeAlive: timeAlive,
				outside: player.outside
			};

			data.push(playerData);
		}

		io.emit('update', data);

		setTimeout(serverUpdate, 1000 / 22);
	}
	serverUpdate();

	function distance(x1, y1, x2, y2) {
		return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
	}

	function respawnCoordinates() {
		var x = 0, y = 0;
		do {
			x = Math.random() * viewWidth;
			y = Math.random() * viewHeight;
		}
		while(distance(viewWidth / 2, viewHeight / 2, x, y) > radius - 32);

		return {x: x, y: y};
	}

	io.on('connection', function(socket) {
		console.log("Client", socket.id, "connected");
		
		var coords = respawnCoordinates();
		var body = Physics.body('circle', {
			x: coords.x,
			y: coords.y,
			radius: 16
		});
		world.add(body);

		var player = players[socket.id] = {
			info: socket.id,
			movement: [],
			startOfLife: Date.now(),
			outside: false,
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
			player.info.name = player.info.name.substr(0, 16);

			console.log("Client", socket.id, "identified as", player.info.name);
		});

		socket.on('move', function(data) {
			player.movement = data;
		});
	});
};