export const app = {
    host: loadFromEnv('HOST', 'localhost'),
    port: loadFromEnv('PORT', 3000),
}

export const redis = {
    address: loadFromEnv('REDIS_ADDRESS'),
}

function loadFromEnv(key: string, defaultValue: any = undefined): any {
    const value = process.env && process.env[key]
    return value || defaultValue
}
