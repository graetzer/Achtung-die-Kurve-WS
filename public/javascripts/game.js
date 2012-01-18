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

function Player (name, color, x , y) {
    this.name = name;
    this.color = color;
    
    // The position
    this.x = x;
    this.y = y;
    
    this.score = 0;
    this.alive = true;
    
    this.speed = 1;
    this.radius = 3;
    this.movement = move.straight;
    
    this.path = new Array();
    this.path.push([x, y]);
    
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
    if (this.path) {
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
    }
    
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

// World
function World (width, height, context) {
	this.running = false;
	this.width = width;
	this.height = height;
	this.context = context;
	
	this.paused = false;
	
	this.players = new Array();
	this.paths = new Array();//Array of all paths in this.players[i].path
	this.localControllers = new Array();
	
	this.lastFrame = 0;
	
	this.handleKeydown = function(e) {
		for ( var int = 0; int < this.localControllers.length; int++) {
			var controller = this.localControllers[int];
			var code = e.keyCode || e.which;
			if (controller.handleKeydown(code)) {
				e.preventDefault();
				break;
			}
		}
	}
	
	this.handleKeyup = function(e) {
		for ( var int = 0; int < this.localControllers.length; int++) {
			var controller = this.localControllers[int];
			var code = e.keyCode || e.which;
			if (controller.handleKeyup(code)) {
				e.preventDefault();
				break;
			}
		}
	};
}

World.prototype.start = function () {
	this.running = true;
	$(document).keydown(curry(this.handleKeydown, this));
	$(document).keyup(curry(this.handleKeyup, this));
	
	//Handle animation time
	if (window.mozAnimationStartTime)
		this.lastFrame = window.mozAnimationStartTime;
	else
		this.lastFrame = Date.now();
	
	// Start
	requestAnimationFrame(curry(this.draw, this));
};

World.prototype.stop = function () {
	this.running = false;
}

World.prototype.draw = function (timestamp) {
	if(!this.running)
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
				var otherPlayer;
				var playersAlive = 0;
				for (var i = 0; i < this.players.length; i++) {
					otherPlayer = this.players[i];
					if (otherPlayer.alive) {
						otherPlayer.score += 10;
						playersAlive++;
					}
				}
				if (playersAlive <= 1 && otherPlayer.score >= (this.players.length-1)*10) {
					alert("Konec hry\n: "+ otherPlayer.name + "Wins");
					return;
				}
			}
		}
	}
	
	this.lastFrame = timestamp;
	requestAnimationFrame(curry(this.draw, this));
};

World.prototype.addLocalPlayer = function (player, controller) {
	this.players.push(player);
	this.paths.push(player.path);
	if (controller)
		this.localControllers.push(controller);
};

var world;
function play(players){
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
    	world = new World(width, height, canvas.getContext('2d'));
        
    	var keyL = [65, 37, 89];
    	var keyR = [83, 39, 88]
    	for ( var i = 0; i < players.length; i++) {
    		var r = Math.floor(Math.random()*100);
    		var x = (width/(players.length + 1))*(i+1);
    		var y = (height/(players.length + 1))*(i+1);
    		
			var p = new Player(players[i].name, players[i].color, x + r, y + r);
    		p.setDirection(Math.random()*2*Math.PI);
			var c = new LocalController(p, keyL[i], keyR[i]);
			world.addLocalPlayer(p, c);
		}
    	
        world.start();
        return world;
}