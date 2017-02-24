Source Server Stream
=============================

This library save your time when you need to write a tool which returns main information and gets players list from Valve game servers.

```shell
npm install source-server-stream
```

###Supported games:
* Half-life
* Counter-Strike 1.6
* Counter-Strike: Source
* Counter-Strike: Global Offensive

###Example usage

```javascript
var SourceStream = require('source-server-stream');
var server = new SourceStream({
  request_info: true,
  request_players: true,
  timeout_server: 500,
  timeout_end: 500
});

server.write({ address: '123.123.123.123', port: 27015 });

server.on('data', (data) => {
  console.log('Success!');
});

server.on('server_error', (data) => {
  console.log('Oh, error!');
});

server.on('end', (data) => {
  console.log('End!');
});
```

##Input data
* server address
* server port

##Output data
* the title of the server
* сurrent map
* number of players and players list
