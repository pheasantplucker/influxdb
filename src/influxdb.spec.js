const equal = require('assert').deepEqual
const {
  assertSuccess,
  assertFailure,
  payload,
} = require('@pheasantplucker/failables')
const {
  createClient,
  getDatabaseNames,
  createDatabase,
  dropDatabase,
  write,
  writePoints,
  query,
  queryOne,
  search,
} = require('./influxdb')
const Influx = require('influx')
const uuid = require('uuid')

const INFLUXDB_PORT = process.env.INFLUXDB_PORT
const INFLUXDB_NAME = process.env.INFLUXDB_NAME
const envExists = (varName) => {
  equal(process.env[varName] !== undefined, true)
}
describe(`influxdb.js`, () => {
  describe(`ENV Variables`, () => {
    envExists('INFLUXDB_PORT')
    envExists('INFLUXDB_NAME')
  })
  const _createClient = async () => {
    const config = {
      // host: 'localhost',
      host: process.env.INFLUXDB_HOST,
      database: INFLUXDB_NAME,
      port: INFLUXDB_PORT,
      username: process.env.INFLUXDB_USERNAME,
      password: process.env.INFLUXDB_PASSWORD,
    }
    const createClientResult = createClient(config)
    assertSuccess(createClientResult)

    const getDatabaseNamesResult = await getDatabaseNames()
    assertSuccess(getDatabaseNamesResult)
  }

  describe(`createClient()`, () => {
    it(`should create client`, async () => {
      _createClient()
    })

    it.skip(`should fail with bad client`, async () => {
      const config = {
        host: 'localtoast',
        database: 123,
        port: 'asd',
      }
      const createClientResult = createClient(config)
      assertSuccess(createClientResult)

      const getDatabaseNamesResult = await getDatabaseNames()
      assertFailure(getDatabaseNamesResult)
    })
  })

  describe(`createDatabase() & dropDatabase()`, () => {
    it(`should create client`, async () => {
      _createClient()
    })

    const dbName = `createDb_test_${uuid.v4()}`

    it(`should create the db`, async () => {
      const result = await createDatabase(dbName)
      assertSuccess(result, dbName)
    })

    it(`should succeed even if database already exists`, async () => {
      const result = await createDatabase(dbName)
      assertSuccess(result, dbName)
    })

    it(`should drop db`, async () => {
      const result = await dropDatabase(dbName)
      assertSuccess(result, dbName)
    })

    it(`should have dropped the database`, async () => {
      const result = await getDatabaseNames()
      assertSuccess(result)
      const dbNames = payload(result)
      equal(false, dbNames.includes(dbName))
    })
  })

  describe(`write() & read()`, () => {
    it(`should create client: write/read`, async () => {
      _createClient()
    })

    const measurement = 'server_stats'
    const fields = { cpu: 0.9 } // highly variant
    const tags = { zot: '1234' } // low cardinality
    const data = { tags, fields }

    it(`should write to the db`, async () => {
      const result = await writePoints(measurement, data)
      assertSuccess(result)
    })

    it(`should queryOne the db`, async () => {
      const foo = `select * from ${measurement} where zot=${Influx.escape.stringLit(
        tags.zot
      )} limit 1`
      const result = await queryOne(foo)
      assertSuccess(result)
      const { cpu, zot } = payload(result)
      equal(tags.zot, zot)
      equal(fields.cpu, cpu)
    })

    it(`should query the db`, async () => {
      const foo = `select * from ${measurement} where zot=${Influx.escape.stringLit(
        tags.zot
      )} limit 1`
      const result = await query(foo)
      assertSuccess(result)
      const a = payload(result)
      const { cpu, zot } = a[0]
      equal(tags.zot, zot)
      equal(fields.cpu, cpu)
    })

    it(`should search the db`, async () => {
      const limit = 10
      const result = await search(measurement, fields, limit)
      assertSuccess(result)
      const a = payload(result)
      const { cpu, zot } = a[0]
      equal(tags.zot, zot)
      equal(fields.cpu, cpu)
    })
  })

  describe(`writePoints()`, () => {
    const zot = uuid.v4()

    it(`should create client: write/read`, async () => {
      _createClient()
    })
    const measurement = 'server_stats'
    const data = [
      { fields: { cpu: 0.91 }, tags: { zot, foo: 'f1' } },
      { fields: { cpu: 0.92 }, tags: { zot, foo: 'f2' } },
      { fields: { cpu: 0.93 }, tags: { zot, foo: 'f3' } },
    ]

    it(`should write to the db`, async () => {
      const result = await write(measurement, data)
      assertSuccess(result)
    })

    it(`should query the db`, async () => {
      const foo = `select * from ${measurement} where zot=${Influx.escape.stringLit(
        zot
      )} limit 5`
      const result = await query(foo)
      assertSuccess(result)
      const a = payload(result)
      equal(a.length, 3)
      const { zot: newZot } = a[0]
      equal(zot, newZot)
    })
  })
})
