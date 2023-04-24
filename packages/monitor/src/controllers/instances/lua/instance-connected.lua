local activeIndex = KEYS[1];
local uuid = ARGV[1];

local connections = tonumber(redis.call("ZINCRBY", activeIndex, 1, uuid));
local message = { uuid = uuid, connections = connections };

redis.call("PUBLISH", "instance:connected", cjson.encode(message));
return connections;