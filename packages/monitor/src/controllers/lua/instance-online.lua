local instanceKey = tostring(KEYS[1]);
local initializationKey = tostring(KEYS[2]);
local activeKey = tostring(KEYS[3]);

local id = tostring(ARGV[1]);
local newStatus = "active";

local currentStatus = redis.call("HGET", instanceKey, "status");
if currentStatus ~= "initializing" then
    return nil;
end

-- set the metadata for the
redis.call("HSET", instanceKey, "status", newStatus);

local currentConnections = redis.call("ZSCORE", initializationKey, id);
if currentConnections == nil then
    currentConnections = 0;
end

redis.call("ZREM", initializationKey, id);
redis.call("ZADD", activeKey, currentConnections, id);

return cjson.encode({
    id = id,
    connections = tonumber(currentConnections),
    status = newStatus,
});
