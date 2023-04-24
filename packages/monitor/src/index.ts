import { app as appConfig, redis as redisConfig } from './config'

import { createServer } from './server'
import { initialize as initializeControllers } from './controllers'

main()

async function main(): Promise<void> {
    // set up server
    const server = createServer()
    await server.listen(appConfig.port)
    console.log('listening on:', appConfig.port)

    // initialize all controllers
    await initializeControllers(redisConfig)
}
