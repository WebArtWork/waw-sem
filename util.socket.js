const socketIo = require("socket.io");

module.exports = function (waw) {
	// must have server from util.express
	const server = waw.server;
	if (!server) {
		throw new Error("util.socket requires waw.server (call util.express first)");
	}

	const io = socketIo(server, {
		cors: {
			origins: "*:*",
			transports: ["websocket", "polling"],
			credentials: false,
		},
		allowEIO3: true,
	});

	/*
	 *	Sockets API (same behavior)
	 */
	let connections = [
		function (socket) {
			socket.on("create", function (content) {
				socket.broadcast.emit("create", content);
			});
			socket.on("update", function (content) {
				socket.broadcast.emit("update", content);
			});
			socket.on("unique", function (content) {
				socket.broadcast.emit("unique", content);
			});
			socket.on("delete", function (content) {
				socket.broadcast.emit("delete", content);
			});
		},
	];

	waw.socket = {
		io: io,
		emit: function (to, message, room = false) {
			if (room) {
				io.in(room).emit(to, message);
			} else {
				io.emit(to, message);
			}
		},
		add: function (connection) {
			if (typeof connection == "function") connections.push(connection);
		},
	};

	io.on("connection", function (socket) {
		for (var i = 0; i < connections.length; i++) {
			if (typeof connections[i] == "function") {
				connections[i](socket);
			}
		}
	});
};



/*
waw.socket.add(function(socket){
	if (socket.request.user) {
		socket.join(socket.request.user._id);
	}
})

/*
// sending to sender-client only
socket.emit('message', "this is a test");
// sending to all clients, include sender
io.emit('message', "this is a test");
// sending to all clients except sender
socket.broadcast.emit('message', "this is a test");
// sending to all clients in 'game' room(channel) except sender
socket.broadcast.to('game').emit('message', 'nice game');
// sending to all clients in 'game' room(channel), include sender
io.in('game').emit('message', 'cool game');
// sending to sender client, only if they are in 'game' room(channel)
socket.to('game').emit('message', 'enjoy the game');
// sending to all clients in namespace 'myNamespace', include sender
io.of('myNamespace').emit('message', 'gg');
// sending to individual socketid
socket.broadcast.to(socketid).emit('message', 'for your eyes only');
*/
