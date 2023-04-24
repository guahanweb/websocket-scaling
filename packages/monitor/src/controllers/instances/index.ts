import { RedisConnector } from '../../dao'
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
    list: {
        file: path.resolve(__dirname, 'lua/instance-list.lua'),
        sha: null,
    },
    connected: {
        file: path.resolve(__dirname, 'lua/instance-connected.lua'),
        sha: null,
    },
    disconnected: {
        file: path.resolve(__dirname, 'lua/instance-disconnected.lua'),
        sha: null,
    },
    status: {
        file: path.resolve(__dirname, 'lua/instance-update-status.lua'),
        sha: null,
    },
    connections: {
        file: path.resolve(__dirname, 'lua/instance-connection-info.lua'),
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

export async function initialize(connector: RedisConnector) {
    conn = connector

    // TODO: use error aggregator and display
    conn.on('error', (err) => {
        console.error(err)
    })

    await conn.loadScripts(scripts)
}

export async function getInstanceIds() {
    requireInitialization()

    const instances = await conn.execScript('list', {
        keys: ['instance/initializing', 'instance/active', 'instance/draining'],
    })

    return JSON.parse(instances)
}

export async function getConnectionSummary() {
    requireInitialization()

    const summary = await conn.execScript('connections', {
        keys: ['instance/initializing', 'instance/active', 'instance/draining'],
    })

    return JSON.parse(summary)
}

export async function getInstanceDetails(
    uuids: { [key: string]: number }[] = []
) {
    requireInitialization()

    let chain = conn.client.multi()
    for (const uuid in uuids) {
        chain = chain.HGETALL(`instances/${uuid}`)
    }

    const result = await chain.exec()
    const output = result.map((res) => ({
        ...res,
        connections: uuids[res.id],
    }))

    return output
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

export async function activateInstance(uuid: string) {
    requireInitialization()

    const reply = await conn.execScript('status', {
        keys: [
            `instances/${uuid}`, // metadata
            `instance/initializing`, // old status
            `instance/active`, // new status
        ],
        arguments: [uuid, 'active'],
    })

    return JSON.parse(reply)
}

export async function startDrainingInstance(uuid: string) {
    requireInitialization()

    const reply = await conn.execScript('status', {
        keys: [
            `instances/${uuid}`, // metadata
            `instance/active`, // old status
            `instance/draining`, // new status
        ],
        arguments: [uuid, 'draining'],
    })

    return JSON.parse(reply)
}

export async function acceptConnection(uuid: string) {
    requireInitialization()

    const connections = await conn.execScript('connected', {
        keys: [`instance/active`],
        arguments: [uuid],
    })

    return connections
}

export async function acceptDisconnection(uuid: string) {
    requireInitialization()

    const connections = await conn.execScript('disconnected', {
        keys: [
            `instances/${uuid}`, // metadata
            `instance/active`, // active instances
            `instance/draining`, // draining instances
        ],
        arguments: [uuid],
    })

    return connections
}

export function shutdown() {
    requireInitialization()
    conn.disconnect()
}
