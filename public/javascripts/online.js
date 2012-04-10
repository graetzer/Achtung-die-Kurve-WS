/**
 * @author Copyrigth (C) 2012 Simon Grätzer 
 * @version 0.1
 *
 */

World.prototype.start = function() {
	this.status = runStatus.running;

	//Handle animation time
	this.lastFrame = window.mozAnimationStartTime || Date.now();
	// Start
	requestAnimationFrame(curry(this.animate, this));
};

World.prototype.pause = function() {
	// An online game can't stop
	if(this.status == runStatus.waiting) {
		this.start();
	}
};

// Each websocket connection is associated with a game. You have to supply a valid game ID to connect successfully
var msgTypes = {
		join:1,/*
				* Add a person that play through this connection  msg = {type:1, name:"Player Name"}
				* 
				*/
		quit:2,//type
		testLatency: 3,// Latency between server and client. (Client identified by connection)
		/* msg = {type:3, sTime:123}
		 * answer = {type: 3, rTime:123, sTime:123}
		 */
		update: 4//Update local player status, collison's based on your calculation
		/*
		 * msg = {type:4, salt:"ABC123", players:[{pID:123, direction:{xD, yD}, path:[{x,y},..]}], 
		 * world:[{pID:121, alive:true}, {pID:122, alive:false}, ...]}
		 * path only contains, the updates since last time.
		 * World contains the current player status, according to your calculation,
		 * the server will determine if your calculation is correct, by comparing it with others.
		 * 
		 * answer = {type:4, }
		 * 
		 */
};

World.prototype.connect = function(url) {
	this.ws = new WebSocket(routes.connect(name)) || new mozWebSocket(url);
	$(window).unload(function () { ws.close(); ws = null });
	
	var me = this;
	
	this.ws.onopen = function() {
        me.testLatency();
    };
    
    this.ws.onmessage = function (evt) { 
        var msg = JSON.parse(evt.data);
        switch(msg.type) {
        case msgTypes.join:
        	this.joinHandler(msg)
        	break;
        case msgTypes.testLatency:
        	this.latencyHandler(msg);
        	break;
        case msgTypes.update:
        	
        	break;
        default:
        	break;
        }
    };
}

World.prototype.disconnect = function () {
	this.ws.close();
}

World.prototype.join = function(username) {
	var msg = {type:msgTypes.join, user:username};
	this.ws.send(JSON.stringify(msg));
}

World.prototyp.joinHandler = function(message) {
	
}

World.prototype.testLatency = function() {
	for (var i=0; i < 100; i++) {
	  var msg = {type: msgTypes.testLatency, sTime:Date.now()}; 
	  this.ws.send(JSON.stringify(msg));
	}
};

World.prototype.timeBuffer = new Array();
World.prototype.latencyHandler = function(message) {
	var now = Date.now();
	this.timeBuffer.push(now - message.sTime);
}

World.prototype.update = function() {
	var updates = new Array();
	for ( var i = 0; i < this.players.length; i++) {
		var player = this.players[i];
		var tmp = {name:player.name, direction:[player.deltaX, player.deltaY], path:player.path};
		updates.push(tmp);
	}
	var msg = {type:msgTypes.update, players:updates};
	this.ws.send(JSON.stringify(msg));
}

World.prototypes.updateHandler = function(msg) {
	
}

function playOnline(context, players, updateInterfaceFn) {
	if(!world)
		world = new World(context, updateInterfaceFn);
	else
		world.players = new Array();

	for(var i = 0; i < players.length; i++) {
		var p = new Player(players[i].name, players[i].color, players[i].left, players[i].right);
		world.players.push(p);
		world.join(players[i].name);
	}

	world.prepareStart();
	return world;
}
	
}
