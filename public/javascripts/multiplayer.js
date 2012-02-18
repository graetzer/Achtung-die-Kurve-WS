/**
 * @author Simon Grätzer Copyrigth (C) 2012
 * @version 0.1
 * 
 */
var wsHub = "ws://localhost:9000/hub"

Player.prototype.lastSendPathIndex = 0;
Player.prototype.propagate = function() {
  var ws = new WebSocket(url) || new mozWebSocket(url);
  $(window).unload(function () { ws.close(); ws = null });

  function renew(player) {
  	//Send new paths
  }
  setInterval('renew', 100, this);
};

World.prototype.handleNetworkPlayers