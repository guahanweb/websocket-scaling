import { EventEmitter } from 'events'
import fs from 'fs'
import { RedisClientOptions } from 'redis'
import redis = require('redis')

interface ScriptDefinition {
    [key: string]: {
        file: string
        sha: string | null
    }
}

export class RedisConnector extends EventEmitter {
    client: any
    scripts: ScriptDefinition | undefined

    constructor(opts) {
        super()
        const client = redis.createClient({
            url: opts.address,
        } as RedisClientOptions)

        // bubble up the error for handling
        client.on('error', (err: any) => this.emit('error', err))
        this.client = client
    }

    async loadScripts(scripts: ScriptDefinition) {
        this.scripts = scripts

        // parallelize the upload of all scripts for this controller
        return Promise.all(
            Object.keys(scripts).map((key) => {
                const { file } = scripts[key]
                const contents = fs.readFileSync(file, 'utf-8')
                const result = this.client.scriptLoad(contents).then((sha) => {
                    scripts[key].sha = sha
                    console.log('script loaded:', sha, `[${file}]`)
                })
                return result
            })
        )
    }

    async execScript(key: string, opts) {
        const script = this.scripts && this.scripts[key]
        const sha = script && script.sha

        if (!sha) {
            this.emit('error', new Error(`unknown script: ${key}`))
            return false
        }

        // we try to evalute it
        return this.client.evalSha(sha, opts)
    }

    async connect() {
        return this.client.connect()
    }

    async disconnect() {
        return this.client.disconnect()
    }
}
