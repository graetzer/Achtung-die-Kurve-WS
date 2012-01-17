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
	$("#controls").text(timePassed);
	switch (this.movement) {
	case move.left:
		this.setDirection(this.angle + Math.PI/80);
		break;
		
	case move.right:
		this.setDirection(this.angle - Math.PI/80);
		break;
		
	default:
		break;
	}
	
	this.x += this.deltaX*this.speed*3*(timePassed/frameLength);
    this.y += this.deltaY*this.speed*3*(timePassed/frameLength);
    
    this.lastGap += timePassed;
	if (this.drawLine) {
		this.path.push([this.x, this.y]);
		if (this.lastGap >= 750/this.speed) {// Care about the occasional gaps
			if (Math.floor(Math.random()*10) % 3 == 0) {// 50% chance to get a gap
				this.drawLine = false;
				this.path.push(null);
			}
			this.lastGap = 0;
    	}
	} else if (this.lastGap >= 200/this.speed){//The gaps should not increase through higher speed
		this.lastGap = 0;// TODO maybe the gap size should be measured in real length, instead of passed time
		this.drawLine = true;
	}
}

var minDistance = 2.5;//Distance between 
var minDistance2 = 10;
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
	    ctx.lineWidth = this.radius*1.5 ;
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
    ctx.fillStyle = "white";
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

// World namespace
var world = {
	context: null,
	width: null,
	height: null,
	
	players: new Array(),
	paths: new Array(),//Array of all paths in world.players[i].path
	localControllers: new Array(),
	
	handleKeydown: function(e) {
		for ( var int = 0; int < world.localControllers.length; int++) {
			var controller = world.localControllers[int];
			var code = e.keyCode || e.which;
			if (controller.handleKeydown(code)) {
				e.preventDefault();
				break;
			}
		}
	},
	handleKeyup: function(e) {
		for ( var int = 0; int < world.localControllers.length; int++) {
			var controller = world.localControllers[int];
			var code = e.keyCode || e.which;
			if (controller.handleKeyup(code)) {
				e.preventDefault();
				break;
			}
		}
	},
	
	lastTime: 0,
	start: function () {
		$(document).keydown(world.handleKeydown);
		$(document).keyup(world.handleKeyup);
		
		//Handle animation time
		if (window.mozAnimationStartTime)
			world.lastTime = window.mozAnimationStartTime;
		else
			world.lastTime = Date.now();
		
		// Start
		requestAnimationFrame(world.draw);
	},
	
	draw: function (timestamp) {
		var timePassed = timestamp - world.lastTime;
		world.context.clearRect(0, 0, world.width, world.height);
		
		var playersAlive = 0;
		for (var i = 0; i < world.players.length; i++) {
			var p = world.players[i];
			if (p.alive) {
				p.calculateNextFrame(timePassed);
				p.alive = !p.collision(world.paths);
				playersAlive++;
			}
	    	p.draw(world.context);
		}
		
		if (playersAlive <= 1) {
			var p;
			for (var i = 0; i < world.players.length; i++) {
				p = world.players[i];
				if (p.alive)
					break;
			}
			alert("Last player alive: "+ p.name);
		} else {
			world.lastTime = timestamp;
	    	requestAnimationFrame(world.draw);
		}
	},
	addLocalPlayer: function (player, controller) {
		world.players.push(player);
		world.paths.push(player.path);
		if (controller)
			world.localControllers.push(controller);
	}
}

function play(){
	var stage = $("#stage");
	world.width = stage.css("width").replace(/[^0-9]+/g,'');
	world.height = stage.css("height").replace(/[^0-9]+/g,'');
    var elem = $("<canvas id='canvas' width="+ world.width +" height="+ world.height +"></canvas>")
    stage.append(elem)
    
    var canvas = elem.get(0);
    if (canvas.getContext) {
    	world.context = canvas.getContext('2d');
        
        var p = new Player("Red Simon", "red", 115, 200);
        world.addLocalPlayer(p);
        p.movement = move.left;
        p.speed = 0.2;
        
        p = new Player("Yellow Pete", "yellow", 190, 30);
        p.setDirection(-Math.PI / 2)
        var controller = new LocalController(p, 65, 83);
        world.addLocalPlayer(p, controller);
        
        p = new Player("Green Mike", "green", 290, 25);
        p.setDirection(-Math.PI*0.1);
        controller = new LocalController(p, 37, 39);
        world.addLocalPlayer(p, controller);
        
        world.start();
    } else {
      alert("Canvas not supported!");
    }
}