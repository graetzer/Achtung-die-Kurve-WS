/**
 * @author Simon Grätzer Copyrigth (C) 2012
 * @version 0.1
 * 
 */

var msgTypes = {
		gameList: 1,
		/* msg = {type:3} 
		 * answer = {type:3, games:[{name:"", id:123}, ...]}
		 */
		createGame: 2,
		/* msg = {type:1, title:"game_title", name:"your Name"} 
		answer = {type:1, pID:player_id, gID:game_id} */
		
		joinGame: 3,
		/*msg = {type:2, gID:game_id, name:"your Name"}
		 answer = {type:2, pID:123} */
		
		testLatency: 4,// Latency between server and client. (Client identified by ip)
		/* msg = {type:4, sTime:123}
		 * answer = {type: 4, rTime:123, sTime:123}
		 */
		update: 5//Update local player status, collison's based on your calculation
		/*
		 * msg = {type:5, gID: 123, players:[{pID:123, pPos:[x,y], direction:{xD, yD}, path:[{x,y},..]}], 
		 * world:[{pID:121, alive:true}, {pID:122, alive:false}, ...]}
		 * path only contains, the updates since last time.
		 * World contains the current player status, according to your calculation,
		 * the server will determine if your calculation is correct, by comparing it with others.
		 * 
		 * answer = {type:5, }
		 * 
		 */
};

World.prototype.startConnection = function() {
	var url = "ws://localhost:9000/hub";
	this.ws = new WebSocket(url) || new mozWebSocket(url);
	$(window).unload(function () { ws.close(); ws = null });
	
	var me = this;
	
	this.ws.onopen = function() {
        me.testLatency();
    };
    
    this.ws.onmessage = function (evt) { 
        var msg = JSON.parse(evt.data);
        switch(msg.type) {
        case msgTypes.gameList:
        	this.gameListHandler(message);
        	break;
        case msgTypes.createGame:
        	this.createGameHandler(msg);
        	break;
        case msgTypes.joinGame:
        	this.joinGameHandler(msg)
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

World.prototype.requestGameList = function() {
	var msg = {type:msgTypes.gameList};
	this.ws.send(JSON.stringify(msg));
}

World.prototype.gameListHandler = function(message) {
	
}

World.prototype.createGame = function(gameTitle, playerName) {
	var msg = {type:msgTypes.createGame, title:gameTitle, name:playerName};
	this.ws.send(JSON.stringify(msg));
}

World.prototype.createGameHandler = function(message) {
	
}

World.prototype.joinGame = function(id) {
	var msg = {type:msgTypes.joinGame, gID:id};
	this.ws.send(JSON.stringify(msg));
}

World.prototyp.joinGameHandler = function(message) {
	
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
	
}
