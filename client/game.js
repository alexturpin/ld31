$("#name").focus();

$("#info").submit(function(event) {
	event.preventDefault();

	$("#intro").hide();
	$("#game").show();

	new Game($("#name").val());
});

if (location.host == "localhost") {
	$("#name").val("Test");
	$("#info").submit();
}

function Game(playerName) {
	var context = document.getElementById("canvas").getContext("2d"),
		players = {},
		viewWidth = 512;
		viewHeight = 512;

	var socket = io(),
		ownId;

	socket.on('connect', function() {
	    ownId = socket.io.engine.id;

	    socket.emit('info', {
	    	name: playerName
	    });
	});

	var currentUpdateTime = Date.now(), previousUpdateTime, deltaUpdateTime;
	socket.on('update', function(data) {
		var time = Date.now();
		currentUpdateTime = time;
		if (!previousUpdateTime) previousUpdateTime = time;
		deltaUpdateTime = currentUpdateTime - previousUpdateTime;
		previousUpdateTime = currentUpdateTime;
		$("#delta-update-time").text(deltaUpdateTime);

		for(var i = 0; i < data.length; i++) {
			var playerData = data[i]

			if (!players[playerData.id]) {
				players[playerData.id] = {
					x: playerData.x,
					y: playerData.y,
					targetX: playerData.x,
					targetY: playerData.y
				};
			}
			else {
				players[playerData.id].targetX = playerData.x;
				players[playerData.id].targetY = playerData.y;
			}
		}
	});

	socket.on('leave', function(id) {
		delete players[id];
	});

	var movement = {},
		movementKeyMap = {
			37: 'left',
			38: 'up',
			39: 'right',
			40: 'down'
		};

	document.addEventListener('keydown', function(event) {
		var direction = movementKeyMap[event.keyCode];
		if (!direction) return;

		event.preventDefault();

		if (!movement[direction]) {
			movement[direction] = true;
			movementUpdated();
		}
	});

	document.addEventListener('keyup', function(event) {
		var direction = movementKeyMap[event.keyCode];
		if (!direction) return;

		if (movement[direction]) {
			movement[direction] = false;
			movementUpdated();
		}
	});

	function movementUpdated() {
		socket.emit('move', movement);
	}

	function draw(context, dt, time) {
		context.clearRect(0 , 0, viewWidth, viewHeight);

		for(var id in players) {
			var player = players[id];

			var lerp = Math.min((time - currentUpdateTime) / deltaUpdateTime, 1);
			player.x += (player.targetX - player.x) * lerp;
			player.y += (player.targetY - player.y) * lerp;

			context.fillStyle = id == ownId ? "blue" : "red";
			context.strokeStyle = "3px solid black";
			context.beginPath();
			context.arc(player.x, player.y, 20, 0, Math.PI * 2);
			context.fill();
			context.stroke();

			if ($("#show-server-positions").prop("checked")) {
				context.beginPath();
				context.arc(player.targetX, player.targetY, 10, 0, Math.PI * 2);
				context.stroke();
			}
		}
	}

	var previousDrawTime;
	function setupDraw(time) {
		if (!previousDrawTime) previousDrawTime = time;
		var dt = (time - previousDrawTime) / 1000;
		previousDrawTime = time;

		draw(context, dt, Date.now());

		window.requestAnimationFrame(setupDraw);
	};
	window.requestAnimationFrame(setupDraw);
}