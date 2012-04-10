/**
 * @author Copyrigth (C) 2012 Simon Grätzer 
 * @version 0.1
 *
 */


World.prototype.start = function() {
	this.status = runStatus.running;

	//Handle animation time
	this.lastFrame = window.mozAnimationStartTime || Date.now();
	// if(window.mozAnimationStartTime)
	// this.lastFrame = window.mozAnimationStartTime;
	// else
	// this.lastFrame = Date.now();

	// Start
	requestAnimationFrame(curry(this.animate, this));
};

World.prototype.pause = function() {
	if(this.status == runStatus.running) {
		this.status = runStatus.waiting;

		this.context.font = "40pt Arial";
		this.context.fillStyle = "Yellow";
		var text = "Paused";
		var textWidth = this.context.measureText(text).width;
		this.context.fillText(text, (this.width - textWidth) / 2, this.height / 2)
	} else if(this.status == runStatus.waiting) {
		this.start();
	}
};

var world;
function playOffline(context, players, updateInterfaceFn) {
	if(!world)
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