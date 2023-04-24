local initializingIndex = KEYS[1];
local activeIndex = KEYS[2];
local drainingIndex = KEYS[3];

local jsonify = function (bulk)
    local ret = {};
    local nextkey;
    for i, v in ipairs(bulk) do
        if i % 2 == 1 then
            nextkey = v;
        else
            ret[nextkey] = tonumber(v);
        end
    end
    return ret;
end

local initializing = redis.call("ZRANGE", initializingIndex, "+inf", "-inf", "BYSCORE", "REV", "WITHSCORES");
local active = redis.call("ZRANGE", activeIndex, "+inf", "-inf", "BYSCORE", "REV", "WITHSCORES");
local draining = redis.call("ZRANGE", drainingIndex, "+inf", "-inf", "BYSCORE", "REV", "WITHSCORES");

return cjson.encode({
    initializing = jsonify(initializing),
    active = jsonify(active),
    draining = jsonify(draining),
});
