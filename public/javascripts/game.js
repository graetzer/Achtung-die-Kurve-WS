var move = {
	straight: null,
	left: 1337,
	right: 1338
};

function Player (name, color, x , y) {
    this.name = name;
    this.color = color;
    this.score = 0;
    // The position
    this.x = x;
    this.y = y;
    
    this.speed = 1;
    this.size = 3;
    this.direction = move.straight;
    
    this.path = new Array();
    this.path.push([x, y]);
    
    this.deltaX = 1;
    this.deltaY = 1;
    
    this.alive = true;
    // Leave a gap
    this.drawLine = true;
    this.lastGap = 0;
}

var frameLength = 30;
Player.prototype.calculateNextFrame = function(timePassed) {
	this.x += this.deltaX*this.speed*(timePassed/frameLength);
    this.y += this.deltaY*this.speed*(timePassed/frameLength);
    
    if (this.drawLine)
    	this.path.push([this.x, this.y]);
    else
    	this.path.push(null);
}

var maxDistance = 2.5;
var maxDistance2 = maxDistance*maxDistance;
// Returns true if it collides
Player.prototype.collision = function(paths) {
	if (this.x < maxDistance || this.x > world.width - maxDistance)
		return true;
	if (this.y < maxDistance || this.y > world.height - maxDistance)
		return true;
	
	for (var y = 0; y < paths.length; y++) {
		var path = paths[y];
		for (var i = 0; i < path.length; i++) {
			if (path[i] != null) {
				var divX = Math.pow(this.x - path[i][0], 2);
				var divY = Math.pow(this.y - path[i][1], 2);
				
				var distance = divX + divY;// Math.sqr(divX + divY) 
				
				if (!(path === this.path && i > path.length - 50) && distance < maxDistance2)
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
	    ctx.lineWidth = this.size*1.5 ;
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
    ctx.arc(this.x,this.y,this.size,0,Math.PI*2,true); // Outer circle  
    ctx.fill();
    ctx.closePath();
};

var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||  
window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;  

var world = {
	context: null,
	width: null,
	height: null,
	
	players: new Array(),
	paths: new Array(),//Array of all paths in world.players[i].path
	
	lastTime: 0,
	start: function () {
		if (window.mozAnimationStartTime)
			world.lastTime = window.mozAnimationStartTime;
		else
			world.lastTime = Date.now();
		
		requestAnimationFrame(world.draw);
	},
	
	draw: function (timestamp) {
		if (world.context) {
			var timePassed = timestamp - world.lastTime;
			world.context.clearRect(0, 0, world.width, world.height);
			
			for (var i = 0; i < world.players.length; i++) {
				var p = world.players[i];
				if (p.alive) {
					p.calculateNextFrame(timePassed);
					p.alive = !p.collision(world.paths);
					
					// Care about the gaps
					p.lastGap += timePassed;
					if (p.drawLine) {
						if (p.lastGap >= 1500) {
							if (Math.floor(Math.random()*11) % 2 == 0)// 50% chance to get a gap after 1.5s 
								p.drawLine = false;
							p.lastGap = 0;
				    	}
					} else if (p.lastGap >= 300/p.speed){//The gaps should not increase through higher speed
						p.lastGap = 0;// TODO maybe the gap size should be measured in real length, instead of passed time
						p.drawLine = true;
					}
				}
		    	p.draw(world.context);
			}
			
			world.lastTime = timestamp;
	    	requestAnimationFrame(world.draw);
		}
	},
	addPlayer: function (player) {
		world.players.push(player);
		world.paths.push(player.path);// Simplification
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
        
        var p = new Player("Simon", "red", 10, 10);
        world.addPlayer(p);
        p = new Player("Simon", "yellow", 190, 30);
        p.deltaX = -1;
        p.deltaY = 1.7;
        world.addPlayer(p);
        p = new Player("Simon", "green", 290, 25);
        p.deltaX = -1;
        p.deltaY = 1.7;
        p.speed = 2;
        world.addPlayer(p);
        
        world.start();
    } else {
      alert("Canvas not supported!");
    }
}