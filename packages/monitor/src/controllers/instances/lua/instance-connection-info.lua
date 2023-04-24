local initializingIndex = KEYS[1];
local activeIndex = KEYS[2];
local drainingIndex = KEYS[3];

local sortedSummary = function(index)
    local connections = 0;
    local instances = tonumber(redis.call("ZCARD", index));

    if instances > 0 then
        local info = redis.call("ZRANGE", index, "-inf", "+inf", "BYSCORE", "WITHSCORES");

        for i, v in ipairs(info) do
            if i % 2 == 0 then
                connections = connections + tonumber(v);
            end
        end
    end
    return { connections = connections, instances = instances };
end

local initializing = sortedSummary(initializingIndex);
local active = sortedSummary(activeIndex);
local draining = sortedSummary(drainingIndex);

return cjson.encode({
    initializing = initializing,
    active = active,
    draining = draining,
});
