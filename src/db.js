const sql = require('mssql');
const path = require('path');
const dbConfig = require(path.join(__dirname, '../config/db-config.json'));
let pool;

const sqlConfig = {
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  server: dbConfig.server,
  pool: {
    max: 100,
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
  .then(pool => {
    console.log('Connected to MSSQL');
    return pool;
  })
  .catch(err => console.log('Connection Failed : ', err));

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

const checkLogin = async account => {
  try {
    const result = await pool
      .request()
      .query(
        `SELECT Top 1 Id FROM UL_ACCOUNT WHERE LoginId = '${account.id}' AND Password = '${account.password}'`,
      );
    return result?.recordset.length > 0 ? result.recordset[0].Id : 0;
  } catch (error) {
    console.log(error);
    return { error };
  }
};

const getVideoFileList = async () => {
  try {
    const result = await pool.request().query(`
      SELECT FileId, AdvertiserId, Name FROM UL_PlayList PL
      INNER JOIN  UL_FileInfo FI ON PL.FileId = FI.Id
      WHERE FileType = 0 AND IsON = 1 AND AccountId = ${process.env.loginId}
      `);
    return result.recordset;
  } catch (error) {
    console.log(error);
    return { error };
  }
};

module.exports = {
  ConnectionPool,
  queryDatabase,
  checkLogin,
  getVideoFileList,
};
