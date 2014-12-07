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

$("#show-debug-info").change(function() {
	$("#debug-info").toggle($(this).prop("checked"));
});

function Game(playerName) {
	var players = {},
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

	var start = Date.now(),
		UpdatedeltaTime,
		previousUpdateTime = start - 45,
		lowestUpdateDeltaTime = Infinity;
		
	var currentUpdateTime = 0;
	socket.on('update', function(data) {
		//Network debug code
		var time = Date.now();
		UpdatedeltaTime = time - previousUpdateTime;
		lowestUpdateDeltaTime = Math.min(UpdatedeltaTime, lowestUpdateDeltaTime);
		previousUpdateTime = time;

		var elapsedSeconds = ((time - start) / 1000) | 0;
		$("pre").text("Elapsed seconds: " + elapsedSeconds + "\nUpdate delta time: " + UpdatedeltaTime + "\nLowest update delta time: " + lowestUpdateDeltaTime);

		currentUpdateTime = Date.now();

		for(var i = 0; i < data.length; i++) {
			var playerData = data[i]

			if (!players[playerData.id]) {
				players[playerData.id] = {
					id: playerData.id,
					x: playerData.x,
					y: playerData.y,
					targetX: playerData.x,
					targetY: playerData.y,
					label: ""
				};
			}
			else {
				players[playerData.id].targetX = playerData.x;
				players[playerData.id].targetY = playerData.y;
				players[playerData.id].label = playerData.label;
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

	//Drawing
	var context = document.getElementById("canvas").getContext("2d"),
		snow = document.createElement('canvas'),
		snowContext = snow.getContext("2d");

	snow.width = viewWidth;
	snow.height = viewHeight;
	snowContext.fillStyle = '#e1edf6';

	function draw(context, dt, time) {
		context.clearRect(0 , 0, viewWidth, viewHeight);

		context.strokeStyle = "black";
		context.lineWidth = 1;

		context.save();

		context.beginPath();
		context.arc(viewWidth / 2, viewHeight / 2, viewWidth / 2, 0, Math.PI * 2);
		context.stroke();
		context.clip();

		context.drawImage(snow, 0, 0);

		//Depth sorting
		var playersToDraw = [];
		for(var id in players) {
			playersToDraw.push(players[id]);
		}
		playersToDraw.sort(function(a, b) {
			return a.y - b.y;
		});

		for(var i = 0; i < playersToDraw.length; i++) {
			var player = playersToDraw[i];

			var lerp = Math.min((time - currentUpdateTime) / (1000 / 22), 1);
			player.x += (player.targetX - player.x) * lerp;
			player.y += (player.targetY - player.y) * lerp;

			snowContext.beginPath();
			snowContext.arc(player.x, player.y, 16, 0, Math.PI * 2);
			snowContext.fill();

			drawSnowman(player, id == ownId);
		}

		context.restore();
	}

	function drawSnowman(player, controlling) {
		var size = 16;

		//Bottom
		context.strokeStyle = "black";
		context.lineWidth = 1;

		context.fillStyle = 'white';
		context.beginPath();
		context.arc(player.x, player.y, size, 0, Math.PI * 2);
		context.fill();
		context.stroke();

		//Body
		context.beginPath();
		context.arc(player.x, player.y - (size * 1.2), size * 0.8, 0, Math.PI * 2);
		context.fill();
		context.stroke();

		//Head
		context.beginPath();
		context.arc(player.x, player.y - (size * 2.2), size * 0.6, 0, Math.PI * 2);
		context.fill();
		context.stroke();

		//Left eye
		context.fillStyle = 'black';
		context.beginPath();
		context.arc(player.x - size * 0.2, player.y - (size * 2.3), size * 0.1, 0, Math.PI * 2);
		context.fill();

		//Right eye
		context.beginPath();
		context.arc(player.x + size * 0.2, player.y - (size * 2.3), size * 0.1, 0, Math.PI * 2);
		context.fill();

		//Nose
		context.fillStyle = 'orange';
		context.beginPath();
		context.moveTo(player.x - size * 0.1, player.y - (size * 2.1));
		context.lineTo(player.x + size * 0.1, player.y - (size * 2.1));
		context.lineTo(player.x + size * 0.03, player.y - (size * 1.65));
		context.lineTo(player.x - size * 0.03, player.y - (size * 1.65));
		context.fill();

		//Buttons
		context.fillStyle = '#303030';
		for(var i = 0; i < 3; i++) {
			context.beginPath();
			context.arc(player.x, player.y - (size * (1.3 - (i * 0.6))), size * 0.1, 0, Math.PI * 2);
			context.fill();
		}

		//Arms
		context.strokeStyle = '#8B4513';
		context.lineWidth = size / 8;
		context.beginPath();
		context.moveTo(player.x - (size * 0.7), player.y - (size * 1.25));
		context.lineTo(player.x - (size * 1.3), player.y - (size * 1.75));
		context.moveTo(player.x + (size * 0.7), player.y - (size * 1.25));
		context.lineTo(player.x + (size * 1.3), player.y - (size * 1.75));
		context.stroke();

		context.font = "15px Verdana";
		var metrics = context.measureText(player.label);
		context.fillText(player.label, player.x - (metrics.width / 2), player.y - (size * 3));

		if ($("#show-debug-info").prop("checked")) {
			context.lineWidth = 2;
			context.strokeStyle = 'black';
			context.beginPath();
			context.arc(player.targetX, player.targetY, 16, 0, Math.PI * 2);
			context.stroke();
		}
	}

	var previousDrawTime;
	function setupDraw(time) {
		if (!previousDrawTime) previousDrawTime = time;
		var dt = (time - previousDrawTime) / 1000;
		previousDrawTime = time;

		draw(context, dt, Date.now());

		window.requestAnimationFrame(setupDraw);
	}
	setupDraw();
}