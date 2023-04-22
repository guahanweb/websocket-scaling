import { RedisConnector } from '../dao'
import path from 'path'
import crypto from 'crypto'

/**
 * Data design for optimized lookup
 *
 * Instance metadata by ID:
 *      list  -
 *      read  - HGET instance/${id}
 *      write - HSET instance/${id}
 *
 * Instance listings by state, scored by connections:
 * status: initializing | active | draining
 *      list   - ZRANGE instances/${status} 0 -1 BYSCORE WITHSCORES
 *      delete - ZREM instances/${status} ${id}
 *      create - ZADD instances/${status} ${id} 0
 *      verify - ZSCORE instances/${status} ${id}
 *      update
 *          connect    - ZINCRBY instances/${status} 1 ${id}
 *          disconnect - ZINCRBY instances/${status} -1 ${id}
 *
 * Example logical scenarios:
 *      New instance deployed:
 *          1. generate ${id}
 *          2. write instance metadata: instance/${id}
 *          3. add instance to initializing state: instances/initializing (0 connections)
 *
 *      Instance initialized:
 *          1. update status in metadata: instance/${id}
 *          2. remove instance from initializing: instances/initializing
 *          3. add instance to active: instances/active
 *
 *      New connection received:
 *          1. If instance is not active, or if connection count >= max, surface error
 *          2. Increment connection count for ${id}
 *
 *      Connection disconnected from ${id}:
 *          1. Check status of ${id} from metadata
 *          2. Decrement the connections from that status listing
 *          3. If "draining" and connections is now 0, signal ready for deletion
 */

let conn
const scripts = {
    register: {
        file: path.resolve(__dirname, 'lua/instance-register.lua'),
        sha: null,
    },
    online: {
        file: path.resolve(__dirname, 'lua/instance-online.lua'),
        sha: null,
    },
}

function requireInitialization() {
    if (typeof conn === 'undefined') {
        throw new Error(
            'cannot execute redis-orchestrator actions before initialization'
        )
    }
}

export async function initialize(opts) {
    conn = new RedisConnector(opts)

    // TODO: use error aggregator and display
    conn.on('error', (err) => {
        console.error(err)
    })

    await conn.connect()
    await conn.loadScripts(scripts)
}

export async function registerNewInstance() {
    requireInitialization()

    const uuid = crypto.randomUUID()
    const reply = await conn.execScript('register', {
        keys: [
            `instances/${uuid}`, // metadata
            `instance/initializing`, // set status
        ],
        arguments: [uuid],
    })

    return JSON.parse(reply)
}

export async function activateInstance(id: string) {
    requireInitialization()

    const reply = await conn.execScript('online', {
        keys: [`instances/${id}`, `instance/initializing`, `instance/active`],
        arguments: [id],
    })

    return JSON.parse(reply)
}

export function shutdown() {
    requireInitialization()
    conn.disconnect()
}
