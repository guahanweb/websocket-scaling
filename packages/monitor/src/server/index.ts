import express, { Express } from 'express'
import { instanceRouter } from './routes/instances'

export function createServer(): Express {
    const app = express()

    // any configuration here
    app.use('/instances', instanceRouter)

    return app
}
