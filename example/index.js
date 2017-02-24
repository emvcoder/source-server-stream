var split = require('split');
var fs = require('fs');
var SourceStream = require('../index');

var i = 1;

var server = new SourceStream({
	request_info: true,
	request_players: true,
	timeout: 2000,
	timeout_end: 500
});

server.on('data', (s) => { 
	console.log('Recived ->', s.req.address+':'+s.req.port, '->', '#'+i++)
})

server.on('server_error', (s) => {
	console.log('Error -> ', s.req.address+':'+s.req.port, '->', '#'+i++)
})

server.on('end', (s) => {
	console.log('End')
})

fs.createReadStream('servers.json')
	.pipe(split())
	.pipe(server)