var pack = require('bufferpack');
var iconv = require('iconv-lite');
var Decode = {};

function ord (string) {
	if (string)
		return string.charCodeAt(0);
}

Decode.analysis = function (buffer) {
	var values = pack.unpack('<i(header)c(type)', buffer);
	if (values === undefined) {
		return false;
	}
	if (values.header === -2) {
		return false;
	}
	if (values.header !== -1) {
		return false;
	}

	return buffer.slice(5)
}

Decode.type = function (buffer) {
	var values = pack.unpack('<i(header)c(type)', buffer);
	if (values === undefined) {
		return false;
	}
	if (values.header === -2) {
		return false;
	}
	if (values.header !== -1) {
		return false;
	}

	return values.type;
}

Decode.challange = function (buffer) {
	var data = buffer.slice(5);
	if (data.length !== 4) {
		return new Error('Challenge not 4 bytes');
	}
	return data;
}

Decode.players = function (buffer) {
	var data = buffer.slice(5);

	var player_cnt = data[0], 
			player, ch, str_len, rem, 
			players = [], position = 1;

	while (position < data.length) {
		player = {
			index: 0,
			name: "",
			score: 0,
			duration: 0
		};

		player.index = data[position++];

		ch = data[position];
		str_len = 1;
		while (ch !== 0 && (position + str_len) < data.length) {
			ch = data[position + str_len];
			str_len++;
		}

		player.name = data.toString('utf8', position, position + str_len - 1);
		position += str_len;
		rem = pack.unpack('<l(score)f(duration)', data, position);
		player.score = rem.score;
		player.duration = rem.duration;
		position += 8;

		players.push(player);
	}

	if (player_cnt != players.length) {
		return new Error('Did not receive the expected number of players.' + ' Expected: ' + player_cnt + ' But saw: '  + players.length);
	}

	return players;
}

Decode.rules = function (buffer) {
	var data = buffer.slice(5);
	var rules_cnt = pack.unpack('<H(count)').count, 
			rule, fields = ['S(name)', 'S(value)'], 
			format = '<' + fields.join(''), rules = [], 
			position = 1;

	while (true) {
		rule = pack.unpack(format, data, position);
		if (!rule) {
			break;
		}

		rules.push(rule);

		position += rule.name.length + 1
							+ rule.value.length + 1;
	}

	if (rules_cnt != rules.length) {
		callback(new Error('Did not receive the expected number of rules.'
													 + ' Expected: ' + rules_cnt
													 + ' But saw: '  + rules.length));
		return;
	}

	return rules;
}

Decode.info = function (buffer) {
	var data = Decode.analysis(buffer);

	var fields = [
		'B(netver)',
		'S(servername)',
		'S(map)', 
		'S(gamedirectory)', 
		'S(gamedescription)', 
		'H(appid)', 
		'B(numplayers)', 
		'B(maxplayers)', 
		'B(numbots)', 
		'c(servertype)', 
		'c(os)', 
		'B(password)', 
		'B(vacsecured)', 
		'S(gameversion)', 
		'B(EDF)'
	], 

	format = '<' + fields.join(''),
	server_info = pack.unpack(format, data), 
	position = 1 + server_info.map.length + 1
							 + server_info.gamedirectory.length + 1
							 + server_info.gamedescription.length + 1
							 + 2 + 1 + 1 + 1 + 1 + 1 + 1 + 1
							 + server_info.gameversion.length + 1 + 1;

	if (false) {

		// Depreced, for old game servers

		var serverOutput = data.toString('UTF-8');
		var info = serverOutput.split('\u0000')

		if (info[0].length && info[1].length && 
				info[2].length && info[3].length && 
				info[4].length)
			var place = info[0].length + info[1].length +
									info[2].length + info[3].length + 
									info[4].length + 5;

		server_info.servername = info[1];
		server_info.map = info[2];
		server_info.gamedirectory = info[3];
		server_info.gamedescription = info[4];
		server_info.numplayers = ord(serverOutput[place]);
		server_info.maxplayers = ord(serverOutput[place + 1]);
		server_info.netver = ord(serverOutput[place + 2]);
		server_info.os = ord(serverOutput[place + 4]);

		// end. 

	} else {

		if ( server_info.EDF & 0x80 ) {
			server_info.port = pack.unpack('<H(port)', data, position).port;
			position += 2;
		}

		if ( server_info.EDF & 0x10 ) {
			server_info.steamID = data.slice(position, position + 8);
			position += 8;
		}

		if ( server_info.EDF & 0x40 ) {
			server_info.sourceTV = pack.unpack('<H(port)S(name)', data, position);
			position += 2 + server_info.sourceTV.name.length + 1; // null terminator
		}

		if ( server_info.EDF & 0x20 ) {
			server_info.keywords = pack.unpack('<S', data, position)[0];
			position += server_info.keywords.length + 1;
		}

		if ( server_info.EDF & 0x01 ) {
			server_info.gameID = data.slice(position, position + 8);
			position += 8;
		}

		iconv.skipDecodeWarning = true;

		server_info.servername = iconv.decode(server_info.servername, 'utf8');
		server_info.gamedescription = iconv.decode(server_info.gamedescription, 'utf8');
	}

	return server_info;
}

module.exports = Decode;