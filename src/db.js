const sql = require('mssql');
const dbConfig = require('../config/db-config.json');
let pool;

const sqlConfig = {
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  server: dbConfig.server,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  // stream: true,
  options: {
    encrypt: true, // for azure
    trustServerCertificate: false, // change to true for local dev / self-signed certs
  },
};

const poolPromise = new sql.ConnectionPool(sqlConfig)
  .connect()
  .then((pool) => {
    console.log('Connected to MSSQL');
    return pool;
  })
  .catch((err) => console.log('Connection Failed : ', err));

const ConnectionPool = async () => {
  pool = await poolPromise;
};

const queryDatabase = async () => {
  // return await pool
  //   .request()
  //   .query('SELECT * FROM ACCOUNT ', (err, profileset) => {
  //     if (err) {
  //       console.log(`fail : ${err}`);
  //     } else {
  //       const sendData = profileset.recordset;
  //       console.log('success');
  //       console.log(sendData);

  //       return sendData;
  //     }
  //   });

  try {
    const result = await pool.request().query('SELECT * FROM ACCOUNT ');
    return result.recordset;
  } catch (error) {
    console.log(error);
    return null;
  }
};

module.exports = {
  ConnectionPool,
  queryDatabase,
};
