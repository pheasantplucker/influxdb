const {
  success,
  failure,
  isFailure,
  payload,
} = require(`@pheasantplucker/failables`)
const Influx = require('influx')
const { map } = require('ramda')
let client

const createClient = config => {
  try {
    client = new Influx.InfluxDB(config)
    return success(client)
  } catch (e) {
    return failure(e.toString())
  }
}

const getDatabaseNames = async () => {
  try {
    const result = await client.getDatabaseNames()
    return success(result)
  } catch (e) {
    return failure(e.toString())
  }
}

const createDatabase = async name => {
  try {
    await client.createDatabase(name)
    return success(name)
  } catch (e) {
    return failure(e.toString())
  }
}

const dropDatabase = async name => {
  try {
    await client.dropDatabase(name)
    return success(name)
  } catch (e) {
    return failure(e.toString())
  }
}

const writePoints = async (measurement, data) => {
  if (!Array.isArray(data)) return writePoints(measurement, [data])
  const newData = map(
    d =>
      Object.assign({}, d, {
        measurement,
      }),
    data
  )
  try {
    const result = await client.writePoints(newData)
    if (isFailure(result)) return result
    return success(`${data.length} points written`)
  } catch (e) {
    return failure(e.toString())
  }
}

const write = writePoints

const queryOne = async statement => {
  const result = await query(statement)
  if (isFailure(result)) return result
  const list = payload(result)
  return success(list[0])
}

const query = async statement => {
  try {
    const result = await client.query(statement)
    return success(result)
  } catch (e) {
    return failure(e.toString())
  }
}

const search = async (measurement, fields, limit = 1) => {
  const fieldBits = map(f => `${f}=${fields[f]}`, Object.keys(fields))
  const statement = `select * from ${measurement} where ${fieldBits.join(
    ' and '
  )} limit ${limit}`
  return query(statement)
}

module.exports = {
  createClient,
  getDatabaseNames,
  createDatabase,
  dropDatabase,
  write,
  writePoints,
  query,
  queryOne,
  search,
}
