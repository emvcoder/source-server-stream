var pipe = require('stream').prototype.pipe;
var pack = require('bufferpack');
var EventEmitter = require('events');
var dgram = require('dgram-stream');
var sender = dgram('udp4'), 
		reciver = dgram('udp4');
var decoder = require('./decode');

function SourceStream (options) {
	var server = new EventEmitter();
	var self = this;
	var s_timeout;

	self.servers = {};
	self.options = options;
	self.messages = {
		info: Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x54, 0x53, 0x6F, 0x75, 0x72, 0x63, 0x65, 0x20, 0x45, 0x6E, 0x67, 0x69, 0x6E, 0x65, 0x20, 0x51, 0x75, 0x65, 0x72, 0x79, 0x00]),
		players: Buffer.from([0xff, 0xff, 0xff, 0xff, 0x55]),
		challenge: Buffer.from([0xff, 0xff, 0xff, 0xff])
	};

	server.readable = server.writable = true

	server.write = function (data) {
		if (typeof data === 'string')
			data = JSON.parse(data);
		var address = data.address+':'+data.port;
		self.servers[address] = {
			status: 'created',
			req: data,
			timeout: setTimeout(function () {
				self.servers[address] = { status: 'error', req: data }
				server.emit('server_error', self.servers[address]);
			}, self.options.timeout)
		}
		if (self.servers[address].status === 'created') {
			if (self.options.request_info === true)
				sender.write({ to: { address: data.address, port: data.port },
											 payload: self.messages.info })
			if (self.options.request_players === true) 
				reciver.write({ to: { address: data.address, port: data.port },
												payload: Buffer.concat([self.messages.players, self.messages.challenge]) })
			self.servers[address].status === 'progress';
		}
		return true;
	};


	sender.on('data', (d) => {
		self.decoding(d.from, d.payload, 'info', self.recived)
	});

	reciver.on('data', (d) => {
		var value = pack.unpack('<i(header)c(type)', d.payload);
		switch (value.type) {
			case 'A':
				var players = Buffer.concat([self.messages.players, self.messages.challenge]);
				d.payload.slice(5).copy(players, self.messages.players.length)
				reciver.write({ to: d.from, payload: players })
				break;

			case 'D':
				self.decoding(d.from, d.payload, 'players', self.recived);
				break;
		}
	});

	self.decoding = function (req, buffer, action, callback) {
		callback(req, action, decoder[action](buffer));
	};

	self.recived = function (req, action, data) {
		var address = req.address + ':' + req.port;
		self.servers[address][action] = data;
		var req_1 = self.options.request_info ? "info" : "status";
		var req_2 = self.options.request_players ? "players" : "status";
		if (req_1 in self.servers[address] &&
				req_2 in self.servers[address]) {
			self.servers[address].status = 'finished';
			clearTimeout(self.servers[address].timeout)
			server.emit('data', self.servers[address])
		}

		self.timing(self.servers)
	};

	self.timing = function (servers) {
		clearTimeout(s_timeout);
		s_timeout = setTimeout(function () {
			server.emit('end', self.servers)
		}, self.options.timeout_end)
	};

	server.end = function () { };

	server.pipe = pipe;

	return server;
}

module.exports = SourceStream;