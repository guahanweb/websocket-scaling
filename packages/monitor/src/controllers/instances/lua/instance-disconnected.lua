local instanceIndex = KEYS[1];
local activeIndex = KEYS[2];
local drainingIndex = KEYS[3];
local uuid = ARGV[1];

local status = redis.call("HGET", instanceIndex, "status");
local connections;

if status == "draining" then
    connections = tonumber(redis.call("ZSCORE", drainingIndex, uuid));
    if connections > 0 then
        connections = tonumber(redis.call("ZINCRBY", drainingIndex, -1, uuid));
    else
        -- WARNING: connections already at 0
    end
else
    connections = tonumber(redis.call("ZSCORE", activeIndex, uuid));
    if connections > 0 then
        connections = tonumber(redis.call("ZINCRBY", activeIndex, -1, uuid));
    else
        -- WARNING: connections already at 0
    end
end

local message = { uuid = uuid, connections = connections, status = status };
redis.call("PUBLISH", "instance:disconnected", cjson.encode(message));

-- if we are draining, publish when we're empty
if connections == 0 then
    if status == "draining" then
        redis.call("PUBLISH", "instance:drained", cjson.encode({ uuid = uuid }));
    end
end

return connections;
