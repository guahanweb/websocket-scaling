local instanceKey = tostring(KEYS[1]);
local currentStatusKey = tostring(KEYS[2]);
local newStatusKey = tostring(KEYS[3]);

local id = tostring(ARGV[1]);
local newStatus = tostring(ARGV[2]);

local currentStatus = redis.call("HGET", instanceKey, "status");
redis.call("HSET", instanceKey, "status", newStatus);

local currentConnections = redis.call("ZSCORE", currentStatusKey, id);
if currentConnections == nil then
    currentConnections = 0;
end

redis.call("ZREM", currentStatusKey, id);
redis.call("ZADD", newStatusKey, currentConnections, id);

local message = cjson.encode({ id = id, connections = tonumber(currentConnections), status = newStatus });
redis.call("PUBLISH", "instance:status", message);

return message;
