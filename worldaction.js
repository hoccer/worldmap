var http = require('http'), 
      io = require('socket.io');

var WorldAction = function() {
  var that    = {},
      clients = [];
  
  that.addClient = function(client) {
    clients.push(client);
  };
  
  that.removeClient = function(client) {
    for (var i = clients.length; i--;){
      if (clients[i] === client) { clients.splice(i, 1); }
    }
    console.log(clients);
    
    return clients;
  };
  
  that.broadcast = function(data) {
    for (var i = 0; i < clients.length; i++) {
      clients[i].send(data);
    };    
  };
  return that;
};

var server = http.createServer(function(req, res){
  if (req.url.match(/^\/hoc\/?$/) && req.method == "PUT") {
    var body = "";
    req.on("data", function(data) {
      body += data.toString('utf-8');
    });
    req.on("end", function() {
      try {
        var b = JSON.parse(body);
        worldActions.broadcast(b);
      } catch (error) {
        console.log("JSON parse error in " + body);
      }
    });
    
    res.writeHead(201);
    res.end("hoc delivered");
    
    return;
  }
  
  res.writeHead(404);
  res.end("404");
});

server.listen(8080);

var socket       = io.listen(server),
    worldActions = WorldAction();

socket.on('connection', function(client){
  // new client is here!
  worldActions.addClient(client);
  
  client.on('disconnect', function(){
    console.log("disconnected");
    worldActions.removeClient(client);
  });
});
