import { RedisConnector } from '../dao'
import { initialize as initializeInstances } from './instances'

export async function initialize(config: any): Promise<void> {
    // create redis connection
    const connector = new RedisConnector(config)
    const subscriber = connector.client.duplicate()

    // connect the instance controller to redis
    await connector.connect()
    await initializeInstances(connector)

    // now, let's set up any subscriber activities we need
    await subscriber.connect()
    initializeMonitoring(subscriber)
}

// this is currently a placeholder and needs a bit more love.
// the actions and decision for what comes in via connection
// versus endpoints is completely arbitrary at this point.
async function initializeMonitoring(subscriber) {
    // instance received connection
    await subscriber.subscribe('instance:connected', (message) => {
        const { uuid, connections } = JSON.parse(message)

        // this is where we can apply any ephemeral rules to the current connection count
        console.log(
            'MESSAGE:',
            `[${uuid}] new connection, now has ${connections} connection(s)`
        )
    })

    // instance received disconnection
    await subscriber.subscribe('instance:disconnected', (message) => {
        const { uuid, status, connections } = JSON.parse(message)

        console.log(
            'MESSAGE:',
            `[${uuid}] lost connection, now has ${connections} connection(s)`
        )

        if (status === 'draining' && connections === 0) {
            // now, we can remove from rotation, since we have drained all
            // active connections from a "draining" instance
            console.log('MESSAGE:', `[${uuid}] has been fully drained`)
        }
    })

    // when an instance updates its status, we want to monitor
    await subscriber.subscribe('instance:status', (message) => {
        const { uuid, connections, status } = JSON.parse(message)

        console.log(
            'MESSAGE:',
            `[${uuid}] changed status to "${status}" with ${connections} connection(s)`
        )
    })
}
