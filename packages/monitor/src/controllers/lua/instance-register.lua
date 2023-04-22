local instanceKey = tostring(KEYS[1]);
local statusKey = tostring(KEYS[2]);

local id = tostring(ARGV[1]);

-- set the metadata for the instance
redis.call("HSET", instanceKey, "id", id, "status", "initializing");

-- set the status with zero connections
redis.call("ZADD", statusKey, 0, id);

return cjson.encode({
    id = id,
    status = "initializing",
    connections = 0,
});
