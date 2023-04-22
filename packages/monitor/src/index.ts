import { app as appConfig, redis as redisConfig } from './config'

import { createServer } from './server'
import * as instances from './controllers/instance-monitor'

main()

async function main(): Promise<void> {
    // set up server
    const server = createServer()
    await server.listen(appConfig.port)
    console.log('listening on:', appConfig.port)

    // connect to redis
    await instances.initialize(redisConfig)
    console.log('connected to:', redisConfig.address)

    // test initialization
    const details = await instances.registerNewInstance()
    console.log('instance:', details)

    setTimeout(async function () {
        // after 5 seconds, we will activate the instance
        const newDetails = await instances.activateInstance(details.id)
        console.log('activated:', newDetails)
    }, 5000)
}
