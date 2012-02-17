// Helper for using partially applied functions
function curry(fn, scope) {
	var scope = scope || window;
	return function() {
		fn.apply(scope, arguments);
	};
}

// Enum
var move = {
	straight : null,
	left : 1337,
	right : 1338
};

function Player(name, color, leftKeycode, rightKeycode) {
	this.name = name;
	this.color = color;

	this.leftKeycode = leftKeycode;
	this.rightKeycode = rightKeycode;

	// The position
	this.x = 0;
	this.y = 0;

	this.score = 0;
	this.alive = true;

	this.speed = 1;
	this.radius = 3;
	this.movement = move.straight;

	this.path = null;

	// A vector of length 1 which represents the direction of the player
	// Use setDirection to modifiy
	this.deltaX = 0;
	this.deltaY = 0;
	this.setDirection(0);

	// Leave random gaps along the way
	this.drawLine = true;
	this.lastGap = 0;
	// In milliseconds since last time
}

// Angle in a value between 0 and Math.PI*2
Player.prototype.setDirection = function(angle) {
	this.angle = angle;
	this.deltaX = Math.cos(-angle);
	this.deltaY = Math.sin(-angle);
}
// Frame length in milliseconds. For keeping an linear speed
// on different frame rates
var frameLength = 40;
Player.prototype.calculateNextFrame = function(timePassed) {
	//	$("#controls").text(timePassed);

	var weight = (timePassed / frameLength) * 2;
	//To reduce effect of different fps
	switch (this.movement) {
		case move.left:
			this.setDirection(this.angle + (Math.PI / 60) * weight);
			break;

		case move.right:
			this.setDirection(this.angle - (Math.PI / 60) * weight);
			break;

		default:
			break;
	}
	weight = this.speed * 4 * (timePassed / frameLength);
	this.x += this.deltaX * weight;
	this.y += this.deltaY * weight;

	this.lastGap += timePassed;
	if(this.drawLine) {
		this.path.push([this.x, this.y]);
		if(this.lastGap >= 1000 / this.speed) {// Care about the occasional gaps
			if(Math.floor(Math.random() * 10) % 3 == 0) {// 33% chance to get a gap
				this.drawLine = false;
				this.path.push(null);
			}
			this.lastGap = 0;
		}
	} else if(this.lastGap >= 135 / this.speed) {//The gaps should not increase through higher speed
		this.lastGap = 0;
		// TODO maybe the gap size should be measured in real length, instead of passed time
		this.drawLine = true;
	}
}

Player.prototype.draw = function(ctx) {
	//Draw the path
	ctx.beginPath();
	ctx.lineWidth = this.radius * 2;
	ctx.strokeStyle = this.color;
	for(var i = 0; i < this.path.length - 1; i++) {
		if(this.path[i] != null) {
			var x = this.path[i][0];
			var y = this.path[i][1];
			ctx.lineTo(x, y);
		} else if(this.path[i + 1] != null) {// Leave a gap
			i++;
			var x = this.path[i][0];
			var y = this.path[i][1];
			ctx.moveTo(x, y);
		}
	}
	ctx.stroke();
	ctx.closePath();

	// Draw player head
	ctx.beginPath();
	ctx.fillStyle = "yellow";
	ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
	ctx.fill();
	ctx.closePath();
};

// Returns true if it collides
Player.prototype.collision = function(players, world) {
	//Checking for world bounds
	if(this.x - this.radius < 0 || this.x + this.radius > world.width)
		return true;//crash
	if(this.y - this.radius < 0 || this.y + this.radius > world.height)
		return true;//crash

	for(var t = 0; t < players.length; t++) {
		var path = players[t].path;
		for(var i = 2; i < path.length; i++) {
			if(path[i] != null) {
				var divX = Math.pow(this.x - path[i][0], 2);
				var divY = Math.pow(this.y - path[i][1], 2);

				var distance = Math.sqrt(divX + divY) - this.radius;//Not the accurate distance, but faster than with Math.sqr
				// Math.sqr(divX + divY) - this.radius
				if(!(path === this.path && i > path.length - 20 / this.speed) && distance <  players[t].radius)
					return true;//crash
			}
		}
	}
	return false;//no crash
}

Player.prototype.handleKeydown = function(code) {
	switch (code) {
		case this.leftKeycode:
			this.movement = move.left;
			return true;
			break;

		case this.rightKeycode:
			this.movement = move.right;
			return true;
			break;

		default:
			return false;
			break;
	}
}

Player.prototype.handleKeyup = function(code) {
	switch (code) {
		case this.leftKeycode:
			if(this.movement == move.left)
				this.movement = move.straight;
			return true;
			break;

		case this.rightKeycode:
			if(this.movement == move.right)
				this.movement = move.straight;
			return true;
			break;

		default:
			return false;
			break;
	}
}
var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

var runStatus = {
	notRunning : 0,
	ready: 1,
	running : 2,
	paused : 3
};

// World
function World(context, updateInterfaceFn) {
	this.context = context;
	this.updateInterfaceFn = updateInterfaceFn;
	this.status = runStatus.notRunning;
	this.width = context.canvas.width;
	this.height = context.canvas.height;

	this.players = new Array();
	this.round = 1;

	//Timecode of the last frame painted
	this.lastFrame = 0;

	function handleKeydown(e) {
		var code = e.keyCode || e.which;

		if(code == 32) {
			if (this.status == runStatus.notRunning)
				this.prepareStart();
			else if (this.status == runStatus.ready)
				this.start();
			else
				this.pause();
		} else {
			for(var i = 0; i < this.players.length; i++) {
				var player = this.players[i];
				if(player.handleKeydown(code))
					break;
			}		
		}
		e.preventDefault();
	}

	function handleKeyup(e) {
		var code = e.keyCode || e.which;
		for(var i = 0; i < this.players.length; i++) {
			var player = this.players[i];
			if(player.handleKeyup(code)) {
				break;
			}
		}
		e.preventDefault();
	};

	$(document).keydown(curry(handleKeydown, this));
	$(document).keyup(curry(handleKeyup, this));
}

World.prototype.prepareStart = function() {
	this.status = runStatus.ready;
	this.context.clearRect(0, 0, this.width, this.height);
	var pX = this.width / (this.players.length + 1);
	var pY = this.height / (this.players.length + 1);
	var div = Math.min(this.width, this.height)/(this.players.length + 3);
	for(var i = 0; i < this.players.length; i++) {
		var p = this.players[i];
		var r = Math.floor((Math.random() - 0.5) * div);
		p.x = pX * (i + 1) + r;
		p.y = pY * (i + 1) + r;
		p.setDirection(Math.random() * 2 * Math.PI);
		p.path = new Array();
		p.alive = true;
		
		p.calculateNextFrame(80);
		p.calculateNextFrame(120);
		p.calculateNextFrame(1);
		p.draw(this.context);
	}
	this.updateInterfaceFn(this);
};

World.prototype.start = function() {
	// if(this.status == runStatus.notRunning) {// If it's a new round
		// this.prepareStart();
	// }
// 
	this.status = runStatus.running;

	//Handle animation time
	if(window.mozAnimationStartTime)
		this.lastFrame = window.mozAnimationStartTime;
	else
		this.lastFrame = Date.now();

	// Start
	requestAnimationFrame(curry(this.animate, this));
};

World.prototype.pause = function() {
	if(this.status == runStatus.running) {
		this.status = runStatus.paused;

		this.context.font = "40pt Arial";
		this.context.fillStyle = "Yellow";
		var text = "Paused";
		var textWidth = this.context.measureText(text).width;
		this.context.fillText(text, (this.width - textWidth) / 2, this.height / 2)
	} else if(this.status == runStatus.paused) {
		this.start();
	}
};

World.prototype.animate = function(timestamp) {
	if(this.status != runStatus.running)
		return;

	var timePassed = timestamp - this.lastFrame;
	this.context.clearRect(0, 0, this.width, this.height);

	var alive = 0;
	var winner;
	for(var i = 0; i < this.players.length; i++) {
		var p = this.players[i];
		p.draw(this.context);

		if(p.alive) {
			winner = p;
			alive++;
			
			p.calculateNextFrame(timePassed);
			p.alive = !p.collision(this.players, this);
			//Care about scores
			if(!p.alive) {
				this.increaseScores();
			}
		}
	}
	
	if (alive <= 1) {
		this.status = runStatus.notRunning;
		this.round++;
		if (this.round > this.players.length*2) {
			this.showWinner(winner);
		}
		
		return;
	}
		

	this.lastFrame = timestamp;
	requestAnimationFrame(curry(this.animate, this));
};

World.prototype.increaseScores = function() {
	for(var i = 0; i < this.players.length; i++) {
		if(this.players[i].alive) {
			this.players[i].score += 10;
		}
	}
	this.updateInterfaceFn(this);
	return false;
	//Continue
};

World.prototype.showWinner = function(player) {
	this.context.font = "40pt Arial";
	this.context.fillStyle = "Yellow";
	var text = "Konec hry\n";
	var textWidth = this.context.measureText(text).width;
	this.context.fillText(text, (this.width - textWidth) / 2, this.height / 2);
	text = player.name + " Wins!";
	this.context.font = "30pt Arial";
	var textWidth = this.context.measureText(text).width;
	this.context.fillText(text, (this.width - textWidth) / 2, this.height / 2 + 60);
	for (var i=0; i < this.players.length; i++) {
	  this.players[i].score = 0;
	};
	this.round = 1;
}

var world;
function play(context, players, updateInterfaceFn) {
	if (!world)
		world = new World(context, updateInterfaceFn);
	else
		world.players = new Array();

	for(var i = 0; i < players.length; i++) {
		var p = new Player(players[i].name, players[i].color, players[i].left, players[i].right);
		world.players.push(p);
	}

	world.prepareStart();
	return world;
}