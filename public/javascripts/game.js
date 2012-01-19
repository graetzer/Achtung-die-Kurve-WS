// Helper for using partially applied functions
function curry (fn, scope) {
    var scope = scope || window;
    return function() {
	    fn.apply(scope, arguments);
    };
}

// Enum
var move = {
	straight: null,
	left: 1337,
	right: 1338
};

function Player (name, color) {
    this.name = name;
    this.color = color;
    
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
    this.lastGap = 0;// In milliseconds since last time
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
	
	var weight = (timePassed/frameLength)*2;//To reduce effect of different fps
	switch (this.movement) {
	case move.left:
		this.setDirection(this.angle + (Math.PI/80)*weight);
		break;
		
	case move.right:
		this.setDirection(this.angle - (Math.PI/80)*weight);
		break;
		
	default:
		break;
	}
	
	weight = this.speed*3*(timePassed/frameLength);
	this.x += this.deltaX*weight;
    this.y += this.deltaY*weight;
    
    this.lastGap += timePassed;
	if (this.drawLine) {
		this.path.push([this.x, this.y]);
		if (this.lastGap >= 1000/this.speed) {// Care about the occasional gaps
			if (Math.floor(Math.random()*11) % 3 == 0) {// 50% chance to get a gap
				this.drawLine = false;
				this.path.push(null);
			}
			this.lastGap = 0;
    	}
	} else if (this.lastGap >= 180/this.speed){//The gaps should not increase through higher speed
		this.lastGap = 0;// TODO maybe the gap size should be measured in real length, instead of passed time
		this.drawLine = true;
	}
}

var minDistance = 5;//Distance between players
var minDistance2 = minDistance*minDistance;
// Returns true if it collides
Player.prototype.collision = function(paths) {
	//Checking for world bounds
	if (this.x - this.radius < 0 || this.x + this.radius > world.width)
		return true;
	if (this.y - this.radius < 0 || this.y + this.radius > world.height)
		return true;
	
	for (var y = 0; y < paths.length; y++) {
		var path = paths[y];
		for (var i = 0; i < path.length; i++) {
			if (path[i] != null) {
				var divX = Math.pow(this.x - path[i][0], 2);
				var divY = Math.pow(this.y - path[i][1], 2);
				
				var distance = divX + divY - this.radius;// Math.sqr(divX + divY) - this.radius
				if (!(path === this.path && i > path.length - 25/this.speed) && distance < minDistance2)
					return true;
			}
		}
	}
	return false;
}

Player.prototype.draw = function(ctx) {    
    //Draw the path
    ctx.beginPath();
    ctx.lineWidth = this.radius*2;
    ctx.strokeStyle = this.color;
    for(var i = 0; i < this.path.length - 1; i++) {
    	if (this.path[i] != null) {
    		var x = this.path[i][0];
            var y = this.path[i][1];
            ctx.lineTo(x, y);
    	} else if (this.path[i+1] != null){// Leave a gap
    		i++;
    		var x = this.path[i][0];
            var y = this.path[i][1];
            ctx.moveTo(x, y);
    	}
    }
    ctx.stroke();
    ctx.closePath();
    
    // Draw circle
    ctx.beginPath();
    ctx.fillStyle = "yellow";
    ctx.arc(this.x,this.y,this.radius,0,Math.PI*2,true); // Outer circle  
    ctx.fill();
    ctx.closePath();
};

// Handles keycodes for each player
function LocalController(player, leftKeycode, rightKeycode) {
	this.player = player;
	this.leftKeycode = leftKeycode;
	this.rightKeycode = rightKeycode;
}

LocalController.prototype.handleKeydown = function (code) {
	switch (code) {
	case this.leftKeycode:
		this.player.movement = move.left;
		return true;
		break;
		
	case this.rightKeycode:
		this.player.movement = move.right;
		return true;
		break;

	default:
		return false;
		break;
	}
}

LocalController.prototype.handleKeyup = function (code) {
	switch (code) {
	case this.leftKeycode:
		if (this.player.movement == move.left)
			this.player.movement = move.straight;
		return true;
		break;
		
	case this.rightKeycode:
		if (this.player.movement == move.right)
			this.player.movement = move.straight;
		return true;
		break;

	default:
		return false;
		break;
	}
}

var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||  
window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

var runStatus = {
		notRunning: 0,
		running: 1,
		paused: 2
};

// World
function World (context) {
	this.status = runStatus.notRunning;
	this.width = context.canvas.width;
	this.height = context.canvas.height;
	this.context = context;
		
	this.players = new Array();
	this.paths = new Array();//Array of all paths in this.players[i].path
	this.localControllers = new Array();
	
	this.lastFrame = 0;
	
	this.handleKeydown = function(e) {
		var code = e.keyCode || e.which;
		if (code == 32 && this.status != runStatus.notRunning) {
			this.pause();
			e.preventDefault();
		} else if (code == 32 && this.status == runStatus.notRunning) {
			this.start();
			e.preventDefault();
		}
		for ( var int = 0; int < this.localControllers.length; int++) {
			var controller = this.localControllers[int];
			if (controller.handleKeydown(code)) {
				e.preventDefault();
				break;
			}
		}
	}
	
	this.handleKeyup = function(e) {
		var code = e.keyCode || e.which;
		for ( var int = 0; int < this.localControllers.length; int++) {
			var controller = this.localControllers[int];
			if (controller.handleKeyup(code)) {
				e.preventDefault();
				break;
			}
		}
	};
	
	$(document).keydown(curry(this.handleKeydown, this));
	$(document).keyup(curry(this.handleKeyup, this));
}

World.prototype.prepareStart = function () {
	var pX = this.width/(this.players.length + 1);
	var pY = this.height/(this.players.length + 1);
	for ( var i = 0; i < this.players.length; i++) {
		var r = Math.floor(Math.random()*100);
		var x = pX*(i+1);
		var y = pY*(i+1);
		
		var p = this.players[i];
		p.x = x+r;
		p.y = y+r;
		p.setDirection(Math.random()*2*Math.PI);
		p.path = new Array();
		p.alive = true;
		this.paths[i] = p.path;
	}
};

World.prototype.start = function () {
	if (this.status == runStatus.notRunning) { // If it's a new round
		this.prepareStart();
	}
	
	this.status = runStatus.running;
	
	//Handle animation time
	if (window.mozAnimationStartTime)
		this.lastFrame = window.mozAnimationStartTime;
	else
		this.lastFrame = Date.now();

	// Start
	requestAnimationFrame(curry(this.draw, this));
};

World.prototype.pause = function() {
	if (this.status == runStatus.running) {
		this.status = runStatus.paused;
		
		this.context.font = "40pt Arial";
		this.context.fillStyle = "Yellow";
		var text = "Paused";
		var textWidth = this.context.measureText(text).width;
		this.context.fillText(text, (this.width-textWidth)/2, this.height/2)
	} else if (this.status == runStatus.paused) {
		this.start();
	}
};

World.prototype.draw = function (timestamp) {
	if(this.status != runStatus.running)
		return;
	
	var timePassed = timestamp - this.lastFrame;
	this.context.clearRect(0, 0, this.width, this.height);
	
	for (var i = 0; i < this.players.length; i++) {
		var p = this.players[i];
		p.draw(this.context);
		
		if (p.alive) {
			p.calculateNextFrame(timePassed);
			p.alive = !p.collision(this.paths);
			//Care about scores and the winning player
			if (!p.alive) {
				this.calcScores();
			}
		}
	}
	
	this.lastFrame = timestamp;
	requestAnimationFrame(curry(this.draw, this));
};

World.prototype.calcScores = function () {
	var player;
	var playersAlive = 0;
	for (var i = 0; i < this.players.length; i++) {
		if (this.players[i].alive) {
			player = this.players[i];
			player.score += 10;
			playersAlive++;
		}
	}
	if (playersAlive <= 1) {
		this.status = runStatus.notRunning;
		if (player.score >= (this.players.length-1)*10) {
			this.context.font = "40pt Arial";
			this.context.fillStyle = "Yellow";
			var text = "Konec hry\n";
			var textWidth = this.context.measureText(text).width;
			this.context.fillText(text, (this.width-textWidth)/2, this.height/2)
			text = player.name + " Wins!"
			var textWidth = this.context.measureText(text).width;
			this.context.font = "30pt Arial";
			this.context.fillText(text, (this.width-textWidth)/2, this.height/2 + 60)
		}
	}
}

World.prototype.addLocalPlayer = function (player, controller) {
	this.players.push(player);
	if (controller)
		this.localControllers.push(controller);
};

var world;
function play(players, updateFn){
	if (world)
		world.stop();
	
	var stage = $("#stage");
	var width = parseInt(stage.css("width").replace(/[^0-9]+/g,''));
	var height = parseInt(stage.css("height").replace(/[^0-9]+/g,''));
    var elem = $("<canvas id='canvas' width="+ width +" height="+ height +"></canvas>")
    stage.html(elem)
    
    var canvas = elem.get(0);
    if (!canvas.getContext) {
        alert("Canvas not supported!");
        return;
    }
    	world = new World(canvas.getContext('2d'));
        
    	var keyL = [65, 37, 89];
    	var keyR = [83, 39, 88]
    	for ( var i = 0; i < players.length; i++) {
			var p = new Player(players[i].name, players[i].color);
			var c = new LocalController(p, keyL[i], keyR[i]);
			world.addLocalPlayer(p, c);
		}
    	
        world.start();
        return world;
}