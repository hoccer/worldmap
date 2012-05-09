var http = require('http'),
      io = require('socket.io'),
  daemon = require('daemon');

var opts = require('tav').set();

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

var world = new WorldAction();

var server = http.createServer(function(req, res){
  console.log("request " + req.method + " for " + req.url);
  if (req.url.match(/^\/hoc\/?$/) && req.method == "PUT") {
    var body = "";
    req.on("data", function(data) {
      body += data.toString('utf-8');
    });
    req.on("end", function() {
      try {
        var b = JSON.parse(body);
        console.log(b);
        world.broadcast(b);
      } catch (error) {
        console.log("error processing " + body);
		console.log("error was " + error);
      }
    });

    res.writeHead(201);
    res.end("hoc delivered");

    return;
  }

  res.writeHead(404);
  res.end("404");
});

var listenPort = opts["port"];
if(!listenPort) {
    listenPort = 9414;
    console.log('Defaulting port to ' + listenPort);
}

var listenAddress = opts["address"];
if(!listenAddress) {
    listenAddress = '0.0.0.0';
    console.log('Defaulting address to ' + listenAddress);
}

var pidFile = opts["pid"];
if(!pidFile) {
    pidFile = "worldmap.pid";
    console.log('Defaulting pid file to ' + pidFile);
}

var logFile = opts["log"];
if(!logFile) {
    logFile = "worldmap.log";
    console.log('Defaulting log file to ' + logFile);
}

var user = opts["user"];
if(!user) {
    user = "hoccer-worldmap";
	console.log("Defaulting user to " + user);
}

var daemonize = false;

function banner() {
    console.log(">>>>>>>>>> Hoccer Worldmap <<<<<<<<<<");
    console.log("Server running at http://" + listenAddress + ":" + listenPort + "/");
}

function serve() {
    server.listen(listenPort, listenAddress);

    var socket       = io.listen(server);

    process.setuid(user);

    socket.on('connection', function(client){
                  // new client is here!
				  console.log("new client!");
                  world.addClient(client);
                  
                  client.on('disconnect', function(){
                                console.log("disconnected");
                                world.removeClient(client);
                            });
              });
}

function start() {

    console.log("Attempting to start worldmap");

    if(daemonize) {
        var fileDescriptors = {
            stdout: logFile, stderr: logFile
        };
        function daemonizeDone(err, started) {
            if(err) {
                console.log("Error starting daemon: " + err);
                return;
            }

            banner();
            serve();
        }
        daemon.daemonize(fileDescriptors, pidFile, daemonizeDone);
    } else {
        banner();
        serve();
    }
}

function stop() {

    console.log("Attempting to stop worldmap");

    function killDone(err, pid) {
        if(err) {
            console.log("Error stopping daemon with pid " + pid + ": " + err);
        } else {
            console.log("Stopped daemon with pid " + pid);
        }
    }

    daemon.kill(pidFile, killDone);
}

switch(opts.args[0]) {
default:
    daemonize = false;
    start();
    break;
case "start":
    daemonize = true;
    start();
    break;
case "stop":
    daemonize = true;
    stop();
    break;
}
