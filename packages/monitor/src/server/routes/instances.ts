import { Router, Request, Response, NextFunction } from 'express'
import * as instances from '../../controllers/instances'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
    try {
        const { initializing, active, draining } =
            await instances.getInstanceIds()
        const result = {
            initializing: await instances.getInstanceDetails(initializing),
            active: await instances.getInstanceDetails(active),
            draining: await instances.getInstanceDetails(draining),
        }

        return res.send(result)
    } catch (err: any) {
        return res.send(err).status(500)
    }
})

router.get('/summary', async (req: Request, res: Response) => {
    try {
        const result = await instances.getConnectionSummary()
        return res.send(result)
    } catch (err: any) {
        return res.send(err).status(500)
    }
})

router.post('/', async (req: Request, res: Response) => {
    try {
        const result = await instances.registerNewInstance()

        return res.send(result)
    } catch (err: any) {
        return res.send(err).status(500)
    }
})

router.put(
    '/:uuid([0-9a-fA-F-]+)/:action',
    async (req: Request, res: Response) => {
        const { uuid, action } = req.params

        try {
            switch (action) {
                case 'activate': {
                    // signals this instance is now ready to receive connections
                    const result = await instances.activateInstance(uuid)
                    return res.send(result)
                }

                case 'drain': {
                    // signals this instance is now draining connections for shutdown
                    const result = await instances.startDrainingInstance(uuid)
                    return res.send(result)
                }

                case 'connected': {
                    // signals instance received a new client connection
                    const connections = await instances.acceptConnection(uuid)
                    return res.send({ uuid, connections })
                }

                case 'disconnected': {
                    // signals instance received a client disconnection
                    const connections = await instances.acceptDisconnection(
                        uuid
                    )
                    return res.send({ uuid, connections })
                }

                default:
                    throw new Error(`unsupported action: ${action}`)
            }
        } catch (err) {
            return res.send(err).status(500)
        }
    }
)

export { router as instanceRouter }
